"use client";

import { useState } from "react";

const REPORT_CONTENT_ID = "report-pdf-content";

type SavedStyle = { el: HTMLElement; maxHeight: string; overflow: string };

/** 临时展开页面上的报告区域（滚动区 + 实验配置），导出后恢复 */
function expandForPdf(el: HTMLElement): SavedStyle[] {
  const saved: SavedStyle[] = [];
  const scrollAreas = el.querySelectorAll<HTMLElement>("[data-pdf-expand=\"scroll\"]");
  scrollAreas.forEach((node) => {
    saved.push({
      el: node,
      maxHeight: node.style.maxHeight,
      overflow: node.style.overflow
    });
    node.style.maxHeight = "none";
    node.style.overflow = "visible";
  });
  const detailsEl = el.querySelector<HTMLDetailsElement>("[data-pdf-expand=\"details\"]");
  if (detailsEl) detailsEl.setAttribute("open", "");
  return saved;
}

function restoreAfterPdf(saved: SavedStyle[]) {
  saved.forEach(({ el, maxHeight, overflow }) => {
    el.style.maxHeight = maxHeight;
    el.style.overflow = overflow;
  });
  const el = document.getElementById(REPORT_CONTENT_ID);
  if (!el) return;
  const detailsEl = el.querySelector<HTMLDetailsElement>("[data-pdf-expand=\"details\"]");
  if (detailsEl) detailsEl.removeAttribute("open");
}

export function ExportReportButton({ reportId }: { reportId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    const el = document.getElementById(REPORT_CONTENT_ID);
    if (!el) return;
    setLoading(true);
    let saved: SavedStyle[] = [];
    try {
      saved = expandForPdf(el);
      el.scrollIntoView({ behavior: "instant", block: "start" });
      await new Promise((r) => setTimeout(r, 300));

      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 12,
          filename: `分析报告-${reportId.slice(0, 8)}.pdf`,
          image: { type: "jpeg", quality: 0.9 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        })
        .from(el)
        .save();
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      restoreAfterPdf(saved);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
    >
      {loading ? "生成中…" : "导出 PDF"}
    </button>
  );
}

export const REPORT_PDF_CONTENT_ID = REPORT_CONTENT_ID;
