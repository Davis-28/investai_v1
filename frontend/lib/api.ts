// lib/api.ts — cliente HTTP + formatadores

import { Asset, SearchResult, CategoryName, AssetType } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "APIError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new APIError(0,
      "Não foi possível conectar ao servidor. Certifique-se de que o backend está rodando em localhost:8000.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new APIError(res.status, body?.detail || `Erro ${res.status}`);
  }
  return res.json();
}

export const api = {
  search:   (q: string)                                => request<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
  category: (name: CategoryName, limit = 25)           => request<Asset[]>(`/category/${name}?limit=${limit}`),
  asset:    (type: AssetType, id: string)              => request<Asset>(`/asset/${type}/${encodeURIComponent(id)}`),
  compare:  (assets: { id: string; type: AssetType }[]) => request<Asset[]>("/compare", {
    method: "POST",
    body: JSON.stringify({ assets }),
  }),
};

// ── Formatadores ──────────────────────────────────────────────────────────────

export function fmtPrice(price: number | null | undefined, currency = "BRL"): string {
  if (price == null) return "—";
  const decimals = price < 0.01 ? 6 : price < 1 ? 4 : 2;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
}

export function fmtNum(v: number | null | undefined, decimals = 2, suffix = ""): string {
  if (v == null) return "—";
  return `${v.toFixed(decimals)}${suffix}`;
}

export function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}%`;
}

export function fmtBig(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `${(v / 1e6).toFixed(1)}M`;
  return v.toLocaleString("pt-BR");
}

export function scoreColor(s: number): string {
  if (s >= 8)   return "#00d4aa";
  if (s >= 6.5) return "#a78bfa";
  if (s >= 5)   return "#f59e0b";
  return "#ef4444";
}

export function badgeStyle(color: string): { bg: string; text: string; border: string } {
  const m: Record<string, { bg: string; text: string; border: string }> = {
    teal:   { bg: "#00d4aa18", text: "#00d4aa",  border: "#00d4aa33" },
    green:  { bg: "#10b98118", text: "#10b981",  border: "#10b98133" },
    amber:  { bg: "#f59e0b18", text: "#f59e0b",  border: "#f59e0b33" },
    purple: { bg: "#a78bfa18", text: "#a78bfa",  border: "#a78bfa33" },
    blue:   { bg: "#3b82f618", text: "#60a5fa",  border: "#3b82f633" },
    red:    { bg: "#ef444418", text: "#ef4444",  border: "#ef444433" },
  };
  return m[color] ?? m.teal;
}
