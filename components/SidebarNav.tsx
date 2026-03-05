"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/new-analysis", label: "新建分析" },
  { href: "/reports", label: "分析报告" }
];

export function SidebarNav() {
  const pathname = usePathname();
  const isReportActive =
    pathname === "/reports" || (pathname.startsWith("/analyses/") && pathname.length > 10);

  return (
    <nav className="space-y-1 text-sm font-medium text-slate-500">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : item.href === "/reports"
              ? isReportActive
              : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition",
              active
                ? "bg-slate-100 font-medium text-slate-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
