export type IndustryKey = "fmcg" | "beauty" | "food";

export interface Persona {
  id: string;
  industry: IndustryKey;
  name: string;
  description: string;
  /** 短标签，用于卡片快速扫视，如 "25–35 一线城市白领｜重视品牌与设计感" */
  tagLine?: string;
  systemPrompt: string;
  biasKeywords: string[];
  toneRules: string[];
  bannedPhrases: string[];
}

export interface Weights {
  liking: number;
  purchase: number;
  trust: number;
}

export interface VariantInput {
  label: "A" | "B" | "C";
  fileName: string;
  mimeType: string;
  base64Data: string;
}

export interface AgentAResponse {
  respondentId: string;
  personaId: string;
  variantLabel: "A" | "B" | "C";
  comment: string;
  likingScore: number;
  purchaseIntentScore: number;
  trustScore: number;
}

export interface AgentBAssessment {
  respondentId: string;
  personaId: string;
  variantLabel: "A" | "B" | "C";
  naturalnessScore: number;
  personaFitScore: number;
  overallScore: number;
  comment: string;
}

export interface VariantStats {
  variantLabel: "A" | "B" | "C";
  weightedMean: number;
  weightedStd: number;
  ci95Low: number;
  ci95High: number;
}

export interface VariantResult {
  variantLabel: "A" | "B" | "C";
  imageUrl: string;
  agentAResponses: AgentAResponse[];
  agentBAssessments: AgentBAssessment[];
  stats: VariantStats;
}

/** 可复现信息：模型、prompt 版本、persona、权重、图片 hash */
export interface AnalysisMeta {
  agentAModel: string;
  agentBModel: string;
  promptVersion: string;
  personaIds: string[];
  weights: Weights;
  imageHashes: Record<string, string>;
}

export interface AnalysisResult {
  industry: IndustryKey;
  personasUsed: string[];
  weights: Weights;
  variants: VariantResult[];
  recommendedVariant: "A" | "B" | "C" | null;
  meta?: AnalysisMeta;
}

