"use client";

import { useMemo, useState } from "react";
import { INDUSTRY_OPTIONS, getPersonasByIndustry } from "@/lib/personas";
import type { IndustryKey, Weights } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUnlock } from "@/context/UnlockContext";

type LocalVariant = {
  label: "A" | "B" | "C";
  file: File;
  previewUrl: string;
};

const DEFAULT_WEIGHTS: Weights = {
  liking: 30,
  purchase: 40,
  trust: 30
};

const WEIGHT_PRESETS: { name: string; weights: Weights }[] = [
  { name: "均衡", weights: { liking: 33, purchase: 34, trust: 33 } },
  { name: "风险优先（偏保守）", weights: { liking: 25, purchase: 30, trust: 45 } },
  { name: "转化优先（偏增长）", weights: { liking: 30, purchase: 55, trust: 15 } },
  { name: "默认（通用）", weights: DEFAULT_WEIGHTS }
];

export default function NewAnalysisPage() {
  const [industry, setIndustry] = useState<IndustryKey>("fmcg");
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [variants, setVariants] = useState<LocalVariant[]>([]);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personaDetailId, setPersonaDetailId] = useState<string | null>(null);
  const { isUnlocked } = useUnlock();

  const personas = useMemo(
    () => getPersonasByIndustry(industry),
    [industry]
  );

  const totalWeight = weights.liking + weights.purchase + weights.trust;
  const weightValid = totalWeight === 100;
  const canStart =
    isUnlocked &&
    variants.length >= 1 &&
    selectedPersonaIds.length >= 1 &&
    weightValid &&
    !isSubmitting;

  const checklist = {
    upload: variants.length,
    uploadMax: 3,
    industry: true,
    persona: selectedPersonaIds.length,
    personaMax: personas.length,
    weight: weightValid
  };

  function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 3);
    const labels: ("A" | "B" | "C")[] = ["A", "B", "C"];
    const mapped: LocalVariant[] = arr.map((file, index) => ({
      label: labels[index],
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setVariants(mapped);
  }

  function removeVariant(label: "A" | "B" | "C") {
    setVariants((prev) => {
      const next = prev.filter((v) => v.label !== label);
      return next.map((v, i) => ({ ...v, label: ["A", "B", "C"][i] as "A" | "B" | "C" }));
    });
  }

  function moveVariant(index: number, dir: -1 | 1) {
    setVariants((prev) => {
      const i2 = index + dir;
      if (i2 < 0 || i2 >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[i2]] = [next[i2], next[index]];
      return next.map((v, i) => ({ ...v, label: ["A", "B", "C"][i] as "A" | "B" | "C" }));
    });
  }

  function replaceVariant(label: "A" | "B" | "C", file: File) {
    setVariants((prev) =>
      prev.map((v) =>
        v.label === label
          ? { ...v, file, previewUrl: URL.createObjectURL(file) }
          : v
      )
    );
  }

  function togglePersona(id: string) {
    setSelectedPersonaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    setError(null);
    if (!canStart) return;

    setIsSubmitting(true);
    try {
      const variantPayload = await Promise.all(
        variants.map(
          (v) =>
            new Promise<any>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result;
                if (typeof result === "string") {
                  const base64 = result.split(",").pop() || "";
                  resolve({
                    label: v.label,
                    fileName: v.file.name,
                    mimeType: v.file.type,
                    base64Data: base64
                  });
                } else reject(new Error("文件读取失败"));
              };
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(v.file);
            })
        )
      );

      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          personaIds: selectedPersonaIds,
          weights,
          variants: variantPayload
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const parts = [data.error || "分析失败，请稍后重试。"];
        if (data.detail) parts.push(data.detail);
        if (data.hint) parts.push(data.hint);
        setError(parts.join("\n\n"));
        return;
      }
      window.location.href = `/analyses/${data.id}`;
    } catch (e: any) {
      setError(e?.message || "分析过程中发生错误。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 标题 + 步骤提示 */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">新建分析</h1>
        <p className="mt-2 text-sm text-slate-500">
          上传图片 → 选行业 → 选 Persona（可多选）→ 配权重 → 开始分析
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 whitespace-pre-line">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr,1fr]">
        {/* 上传区 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">
              上传包装图（2–3 张）
            </h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                variants.length >= 1
                  ? "bg-primary/10 text-primary"
                  : "bg-slate-100 text-slate-500"
              )}
            >
              已上传 {variants.length}/3
            </span>
          </div>

          {variants.length === 0 ? (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center transition hover:border-primary/40 hover:bg-slate-50">
              <span className="mb-1 text-sm font-medium text-primary">
                点击或拖拽图片到此处
              </span>
              <span className="text-xs text-slate-500">
                支持 JPG/PNG，单张 ≤10MB，最多 3 张
              </span>
              <span className="mt-3 text-xs text-slate-400">
                建议上传正面 / 侧面 / 货架场景各一张，结果更稳
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </label>
          ) : (
            <>
              <p className="mb-3 text-xs text-slate-500">
                支持 JPG/PNG，单张 ≤10MB。建议正面/侧面/货架场景各一张，结果更稳。
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {variants.map((v, index) => (
                  <div
                    key={`${v.label}-${index}`}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                        {v.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveVariant(index, -1)}
                          disabled={index === 0}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                          aria-label="上移"
                        >
                          <span className="text-xs">上移</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveVariant(index, 1)}
                          disabled={index === variants.length - 1}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                          aria-label="下移"
                        >
                          <span className="text-xs">下移</span>
                        </button>
                        <label className="cursor-pointer rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <span className="text-xs">替换</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) replaceVariant(v.label, f);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeVariant(v.label)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="删除"
                        >
                          <span className="text-xs">删除</span>
                        </button>
                      </div>
                    </div>
                    <div className="relative aspect-[4/3] bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.previewUrl}
                        alt={v.file.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="truncate px-3 py-2 text-xs text-slate-500">
                      {v.file.name}
                    </p>
                  </div>
                ))}
              </div>
              {variants.length < 3 && (
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-3 text-sm text-slate-500 hover:border-primary/40 hover:text-primary">
                  继续添加图片
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files?.length) return;
                      const existing = variants.map((v) => v.label);
                      const labels: ("A" | "B" | "C")[] = ["A", "B", "C"];
                      const nextLabel = labels.find((l) => !existing.includes(l));
                      if (!nextLabel) return;
                      const newOne: LocalVariant = {
                        label: nextLabel,
                        file: files[0],
                        previewUrl: URL.createObjectURL(files[0])
                      };
                      setVariants((prev) => [...prev, newOne]);
                    }}
                  />
                </label>
              )}
            </>
          )}
        </div>

        {/* 右侧：行业、Persona、权重 */}
        <div className="space-y-6">
          {/* 行业选择 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800">
              行业选择
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              将影响推荐 Persona 组合与风险偏好权重
            </p>
            <select
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              value={industry}
              onChange={(e) => setIndustry(e.target.value as IndustryKey)}
            >
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Persona 选择：白卡 + 高对比 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">
                Persona 选择
              </h2>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  selectedPersonaIds.length >= 1
                    ? "bg-primary/10 text-primary"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                已选 {selectedPersonaIds.length}/{personas.length}
              </span>
            </div>
            <div className="space-y-3">
              {personas.map((p) => {
                const checked = selectedPersonaIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => togglePersona(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        togglePersona(p.id);
                      }
                    }}
                    className={cn(
                      "w-full cursor-pointer rounded-xl border bg-white p-4 text-left shadow-sm transition",
                      checked
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900">
                          {p.name}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {p.tagLine || p.description}
                        </p>
                      </div>
                      {checked && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          已选
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPersonaDetailId(personaDetailId === p.id ? null : p.id);
                      }}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      查看详情
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 权重配置：数值 + 预设 + 校验 */}
          <div
            className={cn(
              "rounded-2xl border bg-white p-5 shadow-sm transition",
              selectedPersonaIds.length === 0
                ? "border-slate-200 opacity-75"
                : "border-slate-200"
            )}
          >
            <h2 className="text-base font-semibold text-slate-800">
              权重配置
            </h2>
            {selectedPersonaIds.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                请先选择至少一个 Persona 后再配置权重
              </p>
            ) : (
              <>
                <div
                  className={cn(
                    "mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                    weightValid ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                  )}
                >
                  {weightValid ? (
                    <>总和 = 100%，可以开始分析</>
                  ) : (
                    <>未达到 100% 将无法开始分析，当前：{totalWeight}%</>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {WEIGHT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setWeights(preset.weights)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-4">
                  {[
                    { key: "liking" as const, label: "喜欢度" },
                    { key: "purchase" as const, label: "购买意愿" },
                    { key: "trust" as const, label: "信任度" }
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {label}
                        </span>
                        <span className="font-mono font-semibold text-slate-900">
                          {weights[key]}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={weights[key]}
                        disabled={selectedPersonaIds.length === 0}
                        onChange={(e) =>
                          setWeights((w) => ({
                            ...w,
                            [key]: Number(e.target.value)
                          }))
                        }
                        className="mt-1 h-2 w-full accent-primary disabled:opacity-50"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 完成清单 + 主按钮 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={cn(
              "rounded-full px-2.5 py-1",
              checklist.upload >= 1 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
            )}
          >
            已上传 {checklist.upload}/{checklist.uploadMax}
          </span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
            已选行业
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1",
              checklist.persona >= 1 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
            )}
          >
            已选 Persona {checklist.persona}/{checklist.personaMax}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1",
              checklist.weight ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
            )}
          >
            权重 = 100%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500">
            单次分析约 30–60 秒，请耐心等待
          </p>
          <button
            type="button"
            disabled={!canStart && isUnlocked}
            onClick={handleSubmit}
            className={cn(
              "rounded-xl px-6 py-2.5 text-sm font-medium shadow-sm transition",
              canStart
                ? "bg-primary text-white hover:bg-primary/90"
                : "cursor-not-allowed bg-slate-200 text-slate-500"
            )}
          >
            {isSubmitting
              ? "分析中…"
              : !isUnlocked
                ? "请先解锁以开始分析"
                : canStart
                  ? "生成风险评估报告"
                  : "完成上方步骤后可开始"}
          </button>
        </div>
      </div>

      {/* Persona 详情抽屉 */}
      {personaDetailId && (
        <div
          className="fixed inset-0 z-[100] flex min-h-screen min-w-full items-center justify-center overflow-y-auto bg-black/40 py-8 px-4"
          onClick={() => setPersonaDetailId(null)}
        >
          <div
            className="my-auto max-h-[80vh] w-full max-w-md shrink-0 overflow-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const p = personas.find((x) => x.id === personaDetailId);
              if (!p) return null;
              return (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {p.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setPersonaDetailId(null)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      关闭
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{p.description}</p>
                  <div className="mt-4">
                    <div className="text-xs font-medium text-slate-500">
                      关注关键词
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      {p.biasKeywords.join("、")}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
