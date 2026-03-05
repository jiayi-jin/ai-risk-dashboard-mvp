import "./globals.css";
import type { ReactNode } from "react";
import { UnlockProvider } from "@/context/UnlockContext";
import { HeaderWithUnlock } from "@/components/HeaderWithUnlock";
import { SidebarNav } from "@/components/SidebarNav";

export const metadata = {
  title: "AI 设计稳定性与风险评估系统",
  description: "基于多 Persona 的设计稳定性筛选与风险评估"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-background text-foreground">
        <UnlockProvider>
          <div className="min-h-screen flex">
            <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-white/90 px-6 py-6">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
                  AI
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    设计稳定性实验室
                  </div>
                  <div className="text-xs text-slate-400">
                    Risk · Persona · Insight
                  </div>
                </div>
              </div>

              <SidebarNav />

              <div className="mt-auto rounded-2xl border border-dashed border-indigo-100 bg-indigo-50/70 px-4 py-4 text-xs text-slate-700">
                <div className="mb-1 text-[11px] font-semibold text-indigo-700">
                  Beta · 内部测试版
                </div>
                <p className="leading-relaxed">
                  当前为轻量 MVP，已支持多版本设计评估与 Persona 模拟，后续将接入更多指标与导出功能。
                </p>
              </div>
            </aside>

            <div className="flex-1 bg-subtle/60">
              <header className="border-b border-border/80 bg-white/80 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                      AI DESIGN RISK DASHBOARD
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      AI 设计稳定性与风险评估系统
                    </div>
                  </div>
                  <HeaderWithUnlock />
                </div>
              </header>

              <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
            </div>
          </div>
        </UnlockProvider>
      </body>
    </html>
  );
}

