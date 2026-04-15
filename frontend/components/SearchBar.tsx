"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SearchResult } from "@/lib/types";
import { api } from "@/lib/api";

const TYPE_LABEL: Record<string, string> = { stock: "Ação", fii: "FII", crypto: "Cripto" };

export default function SearchBar() {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router  = useRouter();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q) { setResults([]); setOpen(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.search(q);
      setResults(res); setOpen(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro na busca.");
      setResults([]);
    } finally { setLoading(false); }
  }, []);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(v), 350);
  }

  function select(r: SearchResult) {
    setQuery(""); setOpen(false);
    // Rota usa id canônico: coin_id para crypto, ticker para outros
    router.push(`/asset/${r.type}/${r.id}`);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", maxWidth: 400 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "#0f0f1a", border: "1px solid #1e1e32", borderRadius: 10,
        padding: "8px 12px", transition: "border-color 0.2s",
      }}>
        <svg width={14} height={14} fill="none" stroke="#4a4a6a" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input value={query} onChange={onChange}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={e => {
            if (e.key === "Escape") { setOpen(false); setQuery(""); }
            if (e.key === "Enter" && results[0]) select(results[0]);
          }}
          placeholder="Buscar ativo, empresa, cripto..."
          style={{ flex: 1, background: "transparent", border: "none", outline: "none",
            fontFamily: "monospace", fontSize: 12, color: "#e2e8f0" }}
        />
        {loading && (
          <svg style={{ animation: "spin 0.7s linear infinite", flexShrink: 0 }}
            width={14} height={14} fill="none" viewBox="0 0 24 24">
            <circle opacity={0.25} cx={12} cy={12} r={10} stroke="#00d4aa" strokeWidth={4} />
            <path fill="#00d4aa" opacity={0.75} d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
      </div>

      {open && (results.length > 0 || error) && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
          background: "#131320", border: "1px solid #1e1e32", borderRadius: 10,
          overflow: "hidden", boxShadow: "0 8px 32px #00000060",
        }}>
          {error && <div style={{ padding: "10px 14px", fontSize: 12, color: "#f87171" }}>{error}</div>}
          {results.map((r, i) => (
            <button key={`${r.id}-${i}`} onClick={() => select(r)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", background: "none", border: "none",
                borderBottom: "1px solid #1e1e32", cursor: "pointer", textAlign: "left",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#1a1a2e")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              {r.thumb
                ? <img src={r.thumb} alt={r.nome} style={{ width: 24, height: 24, borderRadius: "50%" }} />
                : <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1e1e32",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontFamily: "monospace", color: "#00d4aa" }}>
                    {r.ticker.slice(0, 2)}
                  </div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 13, color: "#fff" }}>{r.ticker}</div>
                <div style={{ fontSize: 11, color: "#4a4a6a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nome}</div>
              </div>
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4,
                background: "#1e1e32", color: "#4a4a6a", fontFamily: "monospace", flexShrink: 0 }}>
                {TYPE_LABEL[r.type] ?? r.type}
              </span>
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
