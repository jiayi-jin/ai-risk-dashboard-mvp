import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { DashboardTable } from "@/components/DashboardTable";

async function getAnalyses() {
  if (!supabaseServer) return [];
  const { data } = await supabaseServer
    .from("analyses")
    .select("id, created_at, industry, variant_count, status, result")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

const INDUSTRY_LABELS: Record<string, string> = {
  fmcg: "快消",
  beauty: "美妆",
  food: "食品"
};

export default async function DashboardPage() {
  const analyses = await getAnalyses();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            欢迎回来，品牌团队
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            跟踪设计评估进度，快速回顾历史分析，随时发起新的 Persona 模拟。
          </p>
        </div>
        <Link href="/new-analysis" className="button-primary">
          新建分析
        </Link>
      </div>

      {!supabaseServer && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          检测到 Supabase 环境变量未配置。请先在
          <code className="mx-1 rounded bg-white px-1 py-0.5 text-xs">
            .env.local
          </code>
          中填入 Supabase 配置，并运行
          <code className="mx-1 rounded bg-white px-1 py-0.5 text-xs">
            npm run dev
          </code>
          后再刷新页面。
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr),minmax(0,1.2fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">
              历史分析记录
            </h2>
            <span className="text-xs text-slate-500">
              共 {analyses.length} 条
            </span>
          </div>
          <DashboardTable analyses={analyses} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">
            分析概览
          </h2>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-slate-500">累计分析</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {analyses.length}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-slate-500">近期行业</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {analyses[0]?.industry
                  ? INDUSTRY_LABELS[analyses[0].industry] ?? analyses[0].industry
                  : "—"}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-slate-500">推荐方案</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {(analyses[0]?.result as any)?.recommendedVariant ?? "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

