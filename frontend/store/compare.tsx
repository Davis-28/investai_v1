"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { AssetType } from "@/lib/types";

interface CompareItem { id: string; ticker: string; type: AssetType; nome: string; }

interface CompareCtx {
  items:  CompareItem[];
  toggle: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear:  () => void;
  has:    (id: string) => boolean;
}

const Ctx = createContext<CompareCtx | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    try {
      const s = localStorage.getItem("investai_compare_v2");
      if (s) setItems(JSON.parse(s));
    } catch {}
  }, []);

  const persist = (next: CompareItem[]) => {
    setItems(next);
    try { localStorage.setItem("investai_compare_v2", JSON.stringify(next)); } catch {}
  };

  const has    = useCallback((id: string) => items.some(i => i.id === id), [items]);
  const remove = useCallback((id: string) => persist(items.filter(i => i.id !== id)), [items]);
  const clear  = useCallback(() => persist([]), []);
  const toggle = useCallback((item: CompareItem) => {
    if (items.some(i => i.id === item.id)) {
      persist(items.filter(i => i.id !== item.id));
    } else if (items.length < 4) {
      persist([...items, item]);
    }
  }, [items]);

  return <Ctx.Provider value={{ items, toggle, remove, clear, has }}>{children}</Ctx.Provider>;
}

export function useCompare() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompare must be inside CompareProvider");
  return ctx;
}
