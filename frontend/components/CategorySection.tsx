"use client";
import { useState, useEffect } from "react";
import { Asset, CategoryName, CATEGORY_META } from "@/lib/types";
import { api, APIError } from "@/lib/api";
import AssetCard from "@/components/AssetCard";

function Skeleton() {
  return (
    <div style={{ width: 220, flexShrink: 0, height: 200, background: "#0f0f1a",
      border: "1px solid #1e1e32", borderRadius: 12, animation: "pulse 1.2s ease-in-out infinite" }} />
  );
}

export default function CategorySection({ name }: { name: CategoryName }) {
  const [assets,  setAssets]  = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const meta = CATEGORY_META[name];

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    api.category(name, 25)
      .then(d => { if (!cancelled) { setAssets(d); setLoading(false); } })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof APIError ? e.message : "Erro ao carregar.");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [name]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 2px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>{meta.emoji}</span>
          {meta.label}
          {!loading && assets.length > 0 && (
            <span style={{ fontSize: 13, color: "#4a4a6a", fontWeight: 400 }}>— {assets.length} ativos</span>
          )}
        </h2>
      </div>

      {error && (
        <div style={{ background: "#300a0a", border: "1px solid #7f1d1d44",
          borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "#fca5a5" }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
          : assets.map(asset => (
              <div key={asset.id} style={{ width: 220, flexShrink: 0 }}>
                <AssetCard asset={asset} />
              </div>
            ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.8} }`}</style>
    </section>
  );
}
