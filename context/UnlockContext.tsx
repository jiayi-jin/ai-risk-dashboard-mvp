"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

const STORAGE_KEY = "ai-dashboard-unlocked";

type UnlockContextValue = {
  isUnlocked: boolean;
  checkPassword: (password: string) => Promise<boolean>;
  lock: () => void;
};

const UnlockContext = createContext<UnlockContextValue | null>(null);

export function UnlockProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setUnlocked] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setUnlocked(raw === "1");
    } catch {
      setUnlocked(false);
    }
  }, []);

  const checkPassword = useCallback(async (password: string): Promise<boolean> => {
    const res = await fetch("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const data = await res.json().catch(() => ({}));
    if (data?.ok) {
      setUnlocked(true);
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
      return true;
    }
    return false;
  }, []);

  const lock = useCallback(() => {
    setUnlocked(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return (
    <UnlockContext.Provider value={{ isUnlocked, checkPassword, lock }}>
      {children}
    </UnlockContext.Provider>
  );
}

export function useUnlock() {
  const ctx = useContext(UnlockContext);
  return ctx ?? { isUnlocked: true, checkPassword: async () => true, lock: () => {} };
}
