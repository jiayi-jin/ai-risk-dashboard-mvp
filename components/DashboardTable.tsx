"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const INDUSTRY_LABELS: Record<string, string> = {
  fmcg: "快消",
  beauty: "美妆",
  food: "食品"
};

type Row = {
  id: string;
  created_at: string | null;
  industry: string;
  variant_count: number;
  status: string;
  result: { recommendedVariant?: string } | null;
};

export function DashboardTable({ analyses }: { analyses: Row[] }) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(0);

  function openDelete(id: string) {
    setDeleteId(id);
    setConfirmStep(1);
  }

  function closeDelete() {
    setDeleteId(null);
    setConfirmStep(0);
  }

  async function doDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/analyses/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      closeDelete();
      router.refresh();
    }
  }

  if (analyses.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        暂无分析记录，点击右上角「新建分析」开始第一次模拟。
      </div>
    );
  }

  return (
    <>
      <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium">创建时间</th>
              <th className="px-5 py-3 text-left text-xs font-medium">行业</th>
              <th className="px-5 py-3 text-left text-xs font-medium">版本数</th>
              <th className="px-5 py-3 text-left text-xs font-medium">推荐方案</th>
              <th className="px-5 py-3 text-left text-xs font-medium">状态</th>
              <th className="px-5 py-3 text-right text-xs font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {analyses.map((a) => {
              const createdAt = a.created_at
                ? new Date(a.created_at).toLocaleString("zh-CN", { hour12: false })
                : "-";
              const industryLabel = INDUSTRY_LABELS[a.industry] ?? a.industry;
              const recommended = a.result?.recommendedVariant ?? "-";
              return (
                <tr key={a.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3">{createdAt}</td>
                  <td className="px-5 py-3">{industryLabel}</td>
                  <td className="px-5 py-3">{a.variant_count}</td>
                  <td className="px-5 py-3">
                    {recommended === "-" ? (
                      <span className="text-slate-300">-</span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                        {recommended}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {a.status === "completed" ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                        已完成
                      </span>
                    ) : a.status === "running" ? (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">
                        进行中
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                        {a.status ?? "未知"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/analyses/${a.id}`}
                      className="mr-2 text-xs font-medium text-primary hover:underline"
                    >
                      查看报告
                    </Link>
                    <button
                      type="button"
                      onClick={() => openDelete(a.id)}
                      className="text-xs font-medium text-slate-400 hover:text-red-600"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div
          className="fixed inset-0 z-[100] flex min-h-screen min-w-full items-center justify-center overflow-y-auto bg-black/40 py-8 px-4"
          onClick={closeDelete}
        >
          <div
            className="my-auto w-full max-w-sm shrink-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmStep === 1 ? (
              <>
                <h3 className="text-lg font-semibold text-slate-900">确定删除？</h3>
                <p className="mt-2 text-sm text-slate-500">
                  删除该条分析记录后无法恢复，确定要继续吗？
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={closeDelete}
                    className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmStep(2)}
                    className="flex-1 rounded-xl bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600"
                  >
                    确定删除
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-900">再次确认</h3>
                <p className="mt-2 text-sm text-slate-500">
                  删除后不可恢复，确定要删除该条分析记录吗？
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={closeDelete}
                    className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={doDelete}
                    className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600"
                  >
                    确认删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
