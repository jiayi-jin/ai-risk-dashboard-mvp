"use client";

import { useState } from "react";
import { useUnlock } from "@/context/UnlockContext";

export function HeaderWithUnlock() {
  const { isUnlocked, checkPassword, lock } = useUnlock();
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleUnlock() {
    setError("");
    const ok = await checkPassword(password);
    if (ok) {
      setShowModal(false);
      setPassword("");
    } else {
      setError("密码错误，请重试");
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500">
          本地
        </span>
        {isUnlocked ? (
          <button
            type="button"
            onClick={lock}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100"
          >
            已解锁
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 hover:bg-amber-100"
          >
            解锁
          </button>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex min-h-screen min-w-full items-center justify-center overflow-y-auto bg-black/40 py-8 px-4"
          onClick={() => {
            setShowModal(false);
            setError("");
            setPassword("");
          }}
        >
          <div
            className="my-auto w-full max-w-sm shrink-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900">输入密码以解锁</h3>
            <p className="mt-1 text-sm text-slate-500">
              解锁后可调用 API 并生成分析报告；未解锁时仍可浏览各页面。
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setError("");
                  setPassword("");
                }}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleUnlock}
                className="flex-1 rounded-xl bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
