import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import type { AnalysisResult } from "@/lib/types";
import { INDUSTRY_OPTIONS } from "@/lib/personas";
import { ExportReportButton } from "@/components/ExportReportButton";

function getConfidenceLabel(n: number, std: number): "高置信" | "中置信" | "低置信" {
  if (n < 5 || std > 10) return "低置信";
  if (n >= 20 && std < 6) return "高置信";
  if (n >= 10 && std < 8) return "中置信";
  return "低置信";
}

interface Props {
  params: Promise<{ id: string }>;
}

async function getAnalysis(id: string) {
  if (!supabaseServer) return null;
  const { data } = await supabaseServer
    .from("analyses")
    .select("id, created_at, industry, result")
    .eq("id", id)
    .single();
  return data;
}

export default async function AnalysisReportPage({ params }: Props) {
  const { id } = await params;
  const data = await getAnalysis(id);
  if (!data) notFound();

  const result = data.result as AnalysisResult | null;
  const createdAt = data.created_at
    ? new Date(data.created_at).toLocaleString("zh-CN", { hour12: false })
    : "-";

  const industryLabel =
    INDUSTRY_OPTIONS.find((i) => i.key === data.industry)?.label ??
    data.industry;

  if (!result) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">分析报告</h1>
        <div className="card text-sm text-slate-500">
          该分析尚未生成结果，或结果结构不完整。
        </div>
      </div>
    );
  }

  const recommended = result.recommendedVariant;
  const recommendedVariantData = result.variants.find(
    (v) => v.variantLabel === recommended
  );
  const confidenceN = recommendedVariantData?.agentAResponses.length ?? 0;
  const confidenceStd = recommendedVariantData?.stats.weightedStd ?? 0;
  const confidenceLabel = recommended
    ? getConfidenceLabel(confidenceN, confidenceStd)
    : null;
  const meta = result.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            分析报告 · {id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            行业：{industryLabel} · 创建时间：{createdAt}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportReportButton reportId={id} />
          {recommended && (
          <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xs text-emerald-700">系统推荐方案</div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-emerald-50">
                  {recommended}
                </span>
                <span className="text-xs text-emerald-800">
                  基于喜欢度 / 购买意愿 / 信任度加权得分与稳定性指标。
                </span>
              </div>
              {confidenceLabel && (
                <span
                  className={
                    confidenceLabel === "高置信"
                      ? "rounded-full bg-emerald-200/80 px-2 py-0.5 text-[11px] font-medium text-emerald-900"
                      : confidenceLabel === "中置信"
                        ? "rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-medium text-amber-900"
                        : "rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                  }
                >
                  {confidenceLabel}
                </span>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      <div id="report-pdf-content">
      {/* 方案对比表 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          方案对比（加权总分与稳定性）
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left font-normal">版本</th>
                <th className="px-4 py-2 text-left font-normal">
                  包装预览
                </th>
                <th className="px-4 py-2 text-left font-normal">
                  加权总分
                </th>
                <th className="px-4 py-2 text-left font-normal">
                  <span className="inline-flex items-center gap-1.5">
                    稳定性
                    <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] text-slate-600">
                      越低越稳定
                    </span>
                    <details className="inline">
                      <summary className="cursor-pointer list-none select-none text-slate-500 hover:text-slate-700 [&::-webkit-details-marker]:hidden">
                        ⓘ
                      </summary>
                      <p className="mt-1 max-w-[240px] rounded border border-slate-200 bg-white p-2 text-[11px] leading-relaxed text-slate-600 shadow-sm">
                        本次做了多轮模拟评价与抽样，分数会有一定波动。
                        <br />
                        标准差越小，结果越稳定。
                      </p>
                    </details>
                  </span>
                </th>
                <th className="px-4 py-2 text-left font-normal">
                  预期分数范围（95%）
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {result.variants.map((v) => (
                <tr key={v.variantLabel}>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/25 text-xs font-semibold text-primary">
                      {v.variantLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="overflow-hidden rounded-md border border-border bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.imageUrl}
                        alt={v.variantLabel}
                        className="h-28 w-40 object-contain"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-sm text-slate-900">
                    {v.stats.weightedMean.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-sm text-slate-900">
                    {v.stats.weightedStd.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-xs text-slate-500">
                    {v.stats.ci95Low.toFixed(1)} ~{" "}
                    {v.stats.ci95High.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 抽样展示：虚拟受访者反馈 + Agent B 审计 */}
      <p className="text-center text-sm text-slate-500">
        左侧回答「用户会怎么想」，右侧回答「这段回答像不像这个 persona」。
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-slate-800">
            虚拟受访者样本（Agent A）
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            按版本与 persona 展示全部模拟受访者的真实评价与三项打分。
          </p>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1" data-pdf-expand="scroll">
            {result.variants.map((v) =>
              v.agentAResponses.map((r) => (
                <div
                  key={r.respondentId}
                  className="rounded-xl border border-slate-100 bg-white p-3 text-xs text-slate-800"
                >
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      版本 {v.variantLabel} ·{" "}
                      <span className="font-mono">
                        {r.respondentId.split("-").slice(-1)[0]}
                      </span>
                    </span>
                  </div>
                  <p className="mb-2 text-[11px] leading-relaxed text-slate-800">
                    {r.comment}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                    <span>
                      喜欢度：{" "}
                      <span className="font-mono">
                        {r.likingScore}
                      </span>
                    </span>
                    <span>
                      购买意愿：{" "}
                      <span className="font-mono">
                        {r.purchaseIntentScore}
                      </span>
                    </span>
                    <span>
                      信任度：{" "}
                      <span className="font-mono">
                        {r.trustScore}
                      </span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-slate-800">
            文本审计样本（Agent B 对 Agent A）
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            展示 Agent B 对 Agent A 生成文本的「像真人程度」和「persona
            匹配度」的评分与点评。
          </p>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1" data-pdf-expand="scroll">
            {result.variants.map((v) =>
              v.agentBAssessments.map((a) => (
                <div
                  key={a.respondentId}
                  className="rounded-xl border border-slate-100 bg-white p-3 text-xs text-slate-800"
                >
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      版本 {v.variantLabel} ·{" "}
                      <span className="font-mono">
                        {a.respondentId.split("-").slice(-1)[0]}
                      </span>
                    </span>
                  </div>
                  <p className="mb-2 text-[11px] leading-relaxed text-slate-800">
                    {a.comment}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                    <span>
                      像真人程度：{" "}
                      <span className="font-mono">
                        {a.naturalnessScore}
                      </span>
                    </span>
                    <span>
                      Persona 匹配度：{" "}
                      <span className="font-mono">
                        {a.personaFitScore}
                      </span>
                    </span>
                    <span>
                      综合可信度：{" "}
                      <span className="font-mono">
                        {a.overallScore}
                      </span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 实验配置（可复现信息） */}
      {meta && (
        <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm" data-pdf-expand="details">
          <summary className="cursor-pointer list-none px-6 py-4 text-sm font-medium text-slate-700 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <span className="text-slate-400 group-open:hidden">▶</span>
              <span className="text-slate-400 hidden group-open:inline">▼</span>
              实验配置
            </span>
          </summary>
          <div className="border-t border-slate-100 px-6 pb-5 pt-2">
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Agent A 模型</dt>
                <dd className="font-mono text-slate-800">{meta.agentAModel}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Agent B 模型</dt>
                <dd className="font-mono text-slate-800">{meta.agentBModel}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Prompt 版本</dt>
                <dd className="font-mono text-slate-800">{meta.promptVersion}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Persona ID</dt>
                <dd className="font-mono text-slate-800">
                  {meta.personaIds.join(", ")}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">权重（喜欢 / 购买 / 信任）</dt>
                <dd className="font-mono text-slate-800">
                  {meta.weights.liking}% / {meta.weights.purchase}% /{" "}
                  {meta.weights.trust}%
                </dd>
              </div>
              {Object.keys(meta.imageHashes).length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">图片 Hash（SHA-256）</dt>
                  <dd className="mt-1 space-y-1 font-mono text-[11px] text-slate-700 break-all">
                    {Object.entries(meta.imageHashes).map(([label, hash]) => (
                      <div key={label}>
                        版本 {label}: {hash}
                      </div>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </details>
      )}
      </div>
    </div>
  );
}

