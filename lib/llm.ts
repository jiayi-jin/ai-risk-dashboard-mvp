import OpenAI from "openai";
import { fetch as undiciFetch, ProxyAgent, setGlobalDispatcher } from "undici";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AgentAResponse,
  AgentBAssessment,
  IndustryKey,
  Persona,
  VariantInput,
  Weights
} from "./types";

export const OPENAI_MODEL = "gpt-4o-mini";
export const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const GEMINI_429_RETRY_DELAY_MS = 6000;

// 代理：优先 OPENAI_PROXY / GEMINI_PROXY，否则 HTTPS_PROXY / HTTP_PROXY（同一条即可让 OpenAI 与 Gemini 都走代理）
const proxyUrl =
  process.env.OPENAI_PROXY ||
  process.env.GEMINI_PROXY ||
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY;
const hasProxy =
  proxyUrl && typeof proxyUrl === "string" && proxyUrl.length > 0;
const proxyAgent = hasProxy ? new ProxyAgent(proxyUrl) : undefined;

// OpenAI 使用自定义 fetch 走代理
const openaiFetch = proxyAgent
  ? (input: RequestInfo | URL, init?: RequestInit) =>
      undiciFetch(input, {
        ...init,
        dispatcher: proxyAgent,
      } as RequestInit)
  : undefined;

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  ...(openaiFetch && { fetch: openaiFetch }),
});

// Gemini SDK 使用全局 fetch，通过 setGlobalDispatcher 让全局 fetch 走代理
if (proxyAgent) {
  setGlobalDispatcher(proxyAgent);
}

const geminiClient = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ""
);

export interface SimulationParams {
  industry: IndustryKey;
  personas: Persona[];
  variants: VariantInput[];
  weights: Weights;
}

export interface SimulationOutputs {
  agentAResponses: AgentAResponse[];
  agentBAssessments: AgentBAssessment[];
}

export async function runSimulationForAll(
  params: SimulationParams
): Promise<SimulationOutputs> {
  const perPersonaCount = 5; // 1 轮 × 每 persona 5 人

  const agentAResponses: AgentAResponse[] = [];
  const agentBAssessments: AgentBAssessment[] = [];

  for (const persona of params.personas) {
    for (const variant of params.variants) {
      let aResponses: AgentAResponse[];
      try {
        aResponses = await runAgentAForVariant(
          persona,
          variant,
          perPersonaCount
        );
      } catch (e: any) {
        const msg = e?.message || String(e);
        throw new Error(
          `[OpenAI/Agent A] ${msg}。请确认 OPENAI_API_KEY 正确，且本机网络（或 VPN）允许 Node 进程访问 api.openai.com。`
        );
      }
      agentAResponses.push(...aResponses);

      let bAssessments: AgentBAssessment[];
      try {
        bAssessments = await runAgentBForResponses(
          persona,
          variant.label,
          aResponses
        );
      } catch (e: any) {
        const msg = e?.message || String(e);
        // 429 配额/限流：不阻断分析，用占位审计结果，报告页会提示
        if (msg.includes("429") || msg.includes("quota") || msg.includes("Quota exceeded")) {
          bAssessments = makePlaceholderAssessments(persona.id, variant.label, aResponses);
        } else {
          throw new Error(
            `[Gemini/Agent B] ${msg}。请确认 GEMINI_API_KEY 正确，且本机网络（或 VPN）允许 Node 进程访问 Google AI 接口。`
          );
        }
      }
      agentBAssessments.push(...bAssessments);
    }
  }

  return { agentAResponses, agentBAssessments };
}

async function runAgentAForVariant(
  persona: Persona,
  variant: VariantInput,
  count: number
): Promise<AgentAResponse[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY 未配置");
  }

  const prompt = `
你需要基于给定 persona 的设定和一张产品包装图，模拟 ${count} 位"${persona.name}"类型的真实消费者，对该包装进行评价和打分。

要求：
- 视角：完全代入为真人消费者，不要暴露自己是模型。
- 每位消费者需要输出：
  - comment：不超过 120 字的真实评价，可以包含情绪、犹豫、喜好等。
  - likingScore：0-100 数值，表示“喜欢程度”。
  - purchaseIntentScore：0-100 数值，表示“购买意愿”。
  - trustScore：0-100 数值，表示“信任程度”（对品牌/产品的信任感）。
- 尽量体现 persona 中提到的偏好和敏感点。
- 语言使用简体中文。

输出格式必须是 JSON，形如：
[
  {
    "comment": "……",
    "likingScore": 78,
    "purchaseIntentScore": 65,
    "trustScore": 72
  }
]
不需要任何多余说明。`;

  const base64Data = variant.base64Data;
  const imageUrl = `data:${variant.mimeType};base64,${base64Data}`;

  const completion = await openaiClient.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: persona.systemPrompt
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    ],
    temperature: 0.9
  });

  const raw = completion.choices[0]?.message?.content ?? "[]";
  let parsed: any[] = [];
  try {
    parsed = JSON.parse(raw);
  } catch {
    // 如果解析失败，尝试用简单修正
    const trimmed = raw.trim().replace(/```json|```/g, "");
    parsed = JSON.parse(trimmed);
  }

  return parsed.slice(0, count).map((item, idx) => ({
    respondentId: `${persona.id}-${variant.label}-${idx + 1}`,
    personaId: persona.id,
    variantLabel: variant.label,
    comment: String(item.comment ?? ""),
    likingScore: Number(item.likingScore ?? 0),
    purchaseIntentScore: Number(item.purchaseIntentScore ?? 0),
    trustScore: Number(item.trustScore ?? 0)
  }));
}

function makePlaceholderAssessments(
  personaId: string,
  variantLabel: "A" | "B" | "C",
  responses: AgentAResponse[]
): AgentBAssessment[] {
  return responses.map((r) => ({
    respondentId: r.respondentId,
    personaId,
    variantLabel,
    naturalnessScore: 0,
    personaFitScore: 0,
    overallScore: 0,
    comment: "（Gemini 配额已用尽或限流，未生成审计；请稍后重试或检查 Google AI 配额）"
  }));
}

async function runAgentBForResponses(
  persona: Persona,
  variantLabel: "A" | "B" | "C",
  responses: AgentAResponse[]
): Promise<AgentBAssessment[]> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY 未配置");
  }

  const input = {
    personaSummary: {
      name: persona.name,
      description: persona.description,
      biasKeywords: persona.biasKeywords,
      toneRules: persona.toneRules
    },
    responses: responses.map((r) => ({
      respondentId: r.respondentId,
      comment: r.comment
    }))
  };

  const prompt = `
你是“Agent B”，你的任务是审计一组由 Agent A 生成的“消费者评价文本”，判断这些评价是否像真人、是否符合指定 persona 的设定。

给定：
- persona 描述（目标人群画像）
- 多条该 persona 对同一包装的评价文本（中文）

对每条评价，需要输出：
- naturalnessScore：0-100，文本是否像真人随口说的话，而不是模型腔/官话。
- personaFitScore：0-100，是否符合 persona 的设定和偏好。
- overallScore：0-100，综合判断“这条评价在此次模拟中的可信度”。
- comment：简短中文点评，指出哪里像真人/哪里有违和感。

请严格按 JSON 格式输出一个数组，不要包含额外说明，例如：
[
  {
    "respondentId": "xxx",
    "naturalnessScore": 82,
    "personaFitScore": 75,
    "overallScore": 80,
    "comment": "……"
  }
]

下面是输入数据（JSON）：
${JSON.stringify(input, null, 2)}
`;

  const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });

  const run = async (): Promise<AgentBAssessment[]> => {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    let parsed: any[] = [];
    try {
      parsed = JSON.parse(text);
    } catch {
      const trimmed = text.trim().replace(/```json|```/g, "");
      parsed = JSON.parse(trimmed);
    }
    return parsed.map((item) => ({
      respondentId: String(item.respondentId),
      personaId: persona.id,
      variantLabel,
      naturalnessScore: Number(item.naturalnessScore ?? 0),
      personaFitScore: Number(item.personaFitScore ?? 0),
      overallScore: Number(item.overallScore ?? 0),
      comment: String(item.comment ?? "")
    }));
  };

  try {
    return await run();
  } catch (e: any) {
    const msg = e?.message || String(e);
    const is429 = msg.includes("429") || msg.includes("quota") || msg.includes("Quota exceeded");
    if (is429) {
      await new Promise((r) => setTimeout(r, GEMINI_429_RETRY_DELAY_MS));
      try {
        return await run();
      } catch {
        throw e;
      }
    }
    throw e;
  }
}

