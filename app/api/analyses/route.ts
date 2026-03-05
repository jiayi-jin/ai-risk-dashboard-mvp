import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getPersonasByIndustry } from "@/lib/personas";
import { runSimulationForAll, OPENAI_MODEL, GEMINI_MODEL } from "@/lib/llm";
import type {
  AnalysisResult,
  IndustryKey,
  VariantInput,
  VariantResult,
  Weights
} from "@/lib/types";

const PROMPT_VERSION = "v1";

function calcStatsForVariant(
  weights: Weights,
  variantLabel: "A" | "B" | "C",
  responses: any[]
) {
  const scores: number[] = responses.map((r) => {
    const liking = Number(r.likingScore ?? 0);
    const purchase = Number(r.purchaseIntentScore ?? 0);
    const trust = Number(r.trustScore ?? 0);
    const total =
      (liking * weights.liking +
        purchase * weights.purchase +
        trust * weights.trust) /
      Math.max(weights.liking + weights.purchase + weights.trust, 1);
    return total;
  });

  if (!scores.length) {
    return {
      variantLabel,
      weightedMean: 0,
      weightedStd: 0,
      ci95Low: 0,
      ci95High: 0
    };
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((acc, s) => acc + (s - mean) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance);
  const z = 1.96;
  const margin = (z * std) / Math.sqrt(scores.length);

  return {
    variantLabel,
    weightedMean: mean,
    weightedStd: std,
    ci95Low: mean - margin,
    ci95High: mean + margin
  };
}

export async function POST(req: Request) {
  if (!supabaseServer) {
    return NextResponse.json(
      { error: "Supabase 未配置，请先在 .env.local 中填入相关配置。" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const industry: IndustryKey = body.industry;
    const personaIds: string[] = body.personaIds;
    const weights: Weights = body.weights;
    const variants: VariantInput[] = body.variants;

    const personasAll = getPersonasByIndustry(industry);
    const personas = personasAll.filter((p) => personaIds.includes(p.id));

    if (!personas.length) {
      return NextResponse.json(
        { error: "至少需要选择一个 Persona" },
        { status: 400 }
      );
    }

    if (!variants.length) {
      return NextResponse.json(
        { error: "至少需要上传一个版本图" },
        { status: 400 }
      );
    }

    // 1. 先创建分析记录（pending）
    const { data: created, error: insertError } = await supabaseServer
      .from("analyses")
      .insert({
        industry,
        variant_count: variants.length,
        personas: personaIds,
        weights,
        status: "running"
      })
      .select("id")
      .single();

    if (insertError || !created) {
      console.error(insertError);
      return NextResponse.json(
        { error: "创建分析记录失败" },
        { status: 500 }
      );
    }

    const analysisId = created.id as string;

    // 2. 将图片上传至 Supabase Storage，获取公开 URL
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;
    if (!bucket) {
      return NextResponse.json(
        { error: "SUPABASE_STORAGE_BUCKET 未配置" },
        { status: 500 }
      );
    }

    const uploadedVariants: VariantInput[] = [];
    const imageUrls: Record<string, string> = {};
    const imageHashes: Record<string, string> = {};

    for (const v of variants) {
      const buffer = Buffer.from(v.base64Data, "base64");
      const hash = createHash("sha256").update(buffer).digest("hex");
      imageHashes[v.label] = hash;
      const path = `${analysisId}/${v.label}-${Date.now()}-${v.fileName}`;
      const { error: uploadError } = await supabaseServer.storage
        .from(bucket)
        .upload(path, buffer, {
          contentType: v.mimeType,
          upsert: false
        });

      if (uploadError) {
        console.error("Supabase Storage upload error:", uploadError);
        const message =
          uploadError.message ||
          (typeof uploadError === "object" && (uploadError as any).error_description) ||
          "上传图片到 Supabase 失败";
        return NextResponse.json(
          {
            error: "上传图片到 Supabase 失败",
            detail: message,
            hint: "请确认：1) 在 Supabase 控制台 Storage 中已创建 bucket（名称与 .env 中 SUPABASE_STORAGE_BUCKET 一致）；2) bucket 已设为 Public 或已配置允许上传的策略。"
          },
          { status: 500 }
        );
      }

      const {
        data: { publicUrl }
      } = supabaseServer.storage.from(bucket).getPublicUrl(path);

      imageUrls[v.label] = publicUrl;
      uploadedVariants.push(v);
    }

    // 3. 调用双 Agent 模拟
    const simulation = await runSimulationForAll({
      industry,
      personas,
      variants: uploadedVariants,
      weights
    });

    // 4. 计算每个版本的统计指标
    const variantResults: VariantResult[] = Object.entries(imageUrls).map(
      ([label, url]) => {
        const variantLabel = label as "A" | "B" | "C";
        const responses = simulation.agentAResponses.filter(
          (r) => r.variantLabel === variantLabel
        );
        const assessments = simulation.agentBAssessments.filter(
          (a) => a.variantLabel === variantLabel
        );
        const stats = calcStatsForVariant(
          weights,
          variantLabel,
          responses
        );
        return {
          variantLabel,
          imageUrl: url,
          agentAResponses: responses,
          agentBAssessments: assessments,
          stats
        };
      }
    );

    // 5. 推荐版本（加权均值最高）
    let recommended: "A" | "B" | "C" | null = null;
    let bestScore = -Infinity;
    for (const v of variantResults) {
      if (v.stats.weightedMean > bestScore) {
        bestScore = v.stats.weightedMean;
        recommended = v.variantLabel;
      }
    }

    const result: AnalysisResult = {
      industry,
      personasUsed: personaIds,
      weights,
      variants: variantResults,
      recommendedVariant: recommended,
      meta: {
        agentAModel: OPENAI_MODEL,
        agentBModel: GEMINI_MODEL,
        promptVersion: PROMPT_VERSION,
        personaIds,
        weights,
        imageHashes
      }
    };

    // 6. 更新分析记录为完成
    const { error: updateError } = await supabaseServer
      .from("analyses")
      .update({
        status: "completed",
        result
      })
      .eq("id", analysisId);

    if (updateError) {
      console.error(updateError);
    }

    return NextResponse.json({
      id: analysisId,
      result
    });
  } catch (err: any) {
    console.error("Analysis API error:", err);
    const message = err?.message || String(err);
    return NextResponse.json(
      {
        error: "分析过程中发生错误",
        detail: message,
        hint:
          message.includes("Connection") || message.includes("ECONNREFUSED") || message.includes("fetch")
            ? "连接失败：请确认本机已开 VPN/代理，且「系统或终端」走代理（不只浏览器）。Node 进程需能访问 api.openai.com 与 Google AI。"
            : message.includes("OPENAI") || message.includes("OpenAI")
            ? "请检查 .env.local 中的 OPENAI_API_KEY 是否正确，以及网络/VPN 是否能访问 OpenAI。"
            : message.includes("GEMINI") || message.includes("Gemini") || message.includes("generative")
            ? "请检查 .env.local 中的 GEMINI_API_KEY 是否正确，以及网络/VPN 是否能访问 Google AI。"
            : "请查看终端或服务器日志中的完整报错，或检查 Supabase 表 analyses 是否已创建。"
      },
      { status: 500 }
    );
  }
}

