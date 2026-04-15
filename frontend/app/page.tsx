"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Asset, CategoryName, CATEGORY_META, assetHref } from "@/lib/types";
import { api, APIError, fmtNum, fmtPct, badgeStyle, scoreColor } from "@/lib/api";
import AssetCard from "@/components/AssetCard";
import CategorySection from "@/components/CategorySection";
import { ScoreRing } from "@/components/ScoreDisplay";

const CATS: CategoryName[] = ["brazil","global","fiis","crypto","dividends","growth"];

function OpportunitiesHero() {
  const [assets,  setAssets]  = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    api.category("opportunities", 12)
      .then(d => { setAssets(d); setLoading(false); })
      .catch(e => { setError(e instanceof APIError ? e.message : "Erro."); setLoading(false); });
  }, []);

  const [top, ...rest] = assets;

  if (loading) return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
      {[...Array(7)].map((_,i) => (
        <div key={i} style={{ height: 140, background: "#0f0f1a", border: "1px solid #1e1e32",
          borderRadius: 12, animation: "pulse 1.2s infinite" }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:0.8}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ background: "#300a0a", border: "1px solid #7f1d1d44", borderRadius: 10,
      padding: 16, color: "#fca5a5", fontSize: 13 }}>⚠ {error}</div>
  );

  if (!top) return null;
  const bstyle = top.badge ? badgeStyle(top.badge.color) : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
      {/* #1 hero */}
      <div style={{
        background: "#0f0f1a", border: "1px solid #00d4aa33", borderRadius: 14,
        padding: 20, position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40, width: 140, height: 140,
          background: "#00d4aa06", borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: "#00d4aa14", border: "1px solid #00d4aa33", borderRadius: 20,
          padding: "3px 10px", fontSize: 10, color: "#00d4aa",
          fontFamily: "monospace", marginBottom: 12,
        }}>
          🏆 #1 Top Pick Global
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <ScoreRing score={top.scores.total} size={72} stroke={5} />
          <div>
            <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 24, color: "#fff" }}>{top.ticker}</div>
            <div style={{ fontSize: 11, color: "#4a4a6a", marginTop: 2 }}>{top.nome}</div>
            {bstyle && top.badge && (
              <span style={{ display: "inline-block", marginTop: 6, fontSize: 10, padding: "2px 8px",
                borderRadius: 20, fontFamily: "monospace",
                background: bstyle.bg, color: bstyle.text, border: `1px solid ${bstyle.border}` }}>
                {top.badge.label}
              </span>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, marginBottom: 12 }}>
          {top.analysis?.resumo}
        </p>
        <Link href={assetHref(top)} style={{
          display: "inline-block", fontSize: 11, fontFamily: "monospace", fontWeight: 600,
          padding: "7px 16px", borderRadius: 8, background: "#00d4aa", color: "#080810",
          textDecoration: "none",
        }}>
          Análise completa →
        </Link>
      </div>

      {/* #2–#11 mini grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, alignContent: "start" }}>
        {rest.slice(0, 9).map((a, i) => {
          const sc = scoreColor(a.scores.total);
          const bs = a.badge ? badgeStyle(a.badge.color) : null;
          return (
            <Link key={a.id} href={assetHref(a)} style={{ textDecoration: "none" }}>
              <div style={{
                background: "#0f0f1a", border: "1px solid #1e1e32", borderRadius: 10,
                padding: 12, cursor: "pointer", transition: "border-color 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#00d4aa33")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e1e32")}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: "#2a2a42", fontFamily: "monospace" }}>#{i + 2}</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "#fff" }}>{a.ticker}</span>
                  {bs && a.badge && (
                    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, marginLeft: "auto",
                      background: bs.bg, color: bs.text }}>{a.badge.label}</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "#4a4a6a", marginBottom: 6, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nome}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#e2e8f0" }}>
                    {a.moeda === "USD" ? "$" : "R$"} {fmtNum(a.preco, a.preco! < 1 ? 4 : 2)}
                  </span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: sc }}>
                    {a.scores.total.toFixed(1)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CategoryView({ cat }: { cat: string }) {
  const meta = CATEGORY_META[cat as CategoryName];
  if (!meta) return null;
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 100px" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 24 }}>{meta.emoji}</span>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#fff" }}>{meta.label}</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
        <CategoryGridInner name={cat as CategoryName} />
      </div>
    </div>
  );
}

function CategoryGridInner({ name }: { name: CategoryName }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    api.category(name, 30)
      .then(d => { if (!cancelled) { setAssets(d); setLoading(false); } })
      .catch(e => {
        if (!cancelled) { setError(e instanceof APIError ? e.message : "Erro."); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [name]);

  if (loading) return (
    <>
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{ height: 200, background: "#0f0f1a", border: "1px solid #1e1e32",
          borderRadius: 12, animation: "pulse 1.2s infinite" }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:0.8}}`}</style>
    </>
  );
  if (error) return <div style={{ gridColumn: "1/-1", color: "#fca5a5", fontSize: 13 }}>⚠ {error}</div>;
  return <>{assets.map(a => <AssetCard key={a.id} asset={a} />)}</>;
}

function HomePageInner() {
  const searchParams = useSearchParams();
  const cat = searchParams.get("cat");

  if (cat && CATEGORY_META[cat as CategoryName]) {
    return <CategoryView cat={cat} />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px 100px", display: "flex", flexDirection: "column", gap: 48 }}>
      {/* Hero headline */}
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, color: "#fff", letterSpacing: -1, marginBottom: 8 }}>
          Seu <span style={{ color: "#00d4aa" }}>analista</span> de investimentos
        </h1>
        <p style={{ color: "#4a4a6a", fontSize: 16 }}>
          Dados reais · Score quantitativo · Busca global
        </p>
      </div>

      {/* Opportunities */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>🏆</span>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "#fff" }}>Melhores Oportunidades</h2>
          <span style={{ fontSize: 13, color: "#4a4a6a" }}>— mix global, score por tipo</span>
        </div>
        <OpportunitiesHero />
      </section>

      <div style={{ height: 1, background: "#1e1e32" }} />

      {/* Category horizontal scrolls */}
      {CATS.map(cat => <CategorySection key={cat} name={cat} />)}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "#4a4a6a" }}>Carregando...</div>}>
      <HomePageInner />
    </Suspense>
  );
}
