"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Asset, AssetType, assetHref } from "@/lib/types";
import { api, APIError, fmtPrice, fmtNum, fmtPct, fmtBig, badgeStyle, scoreColor } from "@/lib/api";
import { ScoreRing } from "@/components/ScoreDisplay";

const SCORE_LABELS: Record<string, string> = {
  valuation:"Valuation", qualidade:"Qualidade", crescimento:"Crescimento",
  risco:"Risco", momentum:"Momentum", rendimento:"Rendimento",
  market_cap:"Market Cap", liquidez:"Liquidez",
};

// ── Radar Chart SVG ──────────────────────────────────────────────────────────
function RadarChart({ assets }: { assets: Asset[] }) {
  const W = 280, H = 280, CX = 140, CY = 140, R = 100;
  const colors = ["#00d4aa", "#a78bfa", "#f59e0b", "#f87171"];

  // Collect all subscore keys from all assets
  const keys = Array.from(new Set(
    assets.flatMap(a => Object.keys(a.scores).filter(k => k !== "total"))
  )).slice(0, 6);

  if (keys.length < 3) return null;

  const N = keys.length;
  const angle = (i: number) => (i * 2 * Math.PI) / N - Math.PI / 2;

  const pt = (i: number, r: number) => ({
    x: CX + r * Math.cos(angle(i)),
    y: CY + r * Math.sin(angle(i)),
  });

  const assetPath = (a: Asset) => {
    const scores = a.scores as Record<string, number>;
    return keys.map((k, i) => {
      const v = (scores[k] ?? 5) / 10;
      const p = pt(i, v * R);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ") + " Z";
  };

  return (
    <svg width={W} height={H} style={{ maxWidth: "100%" }}>
      {/* Grid circles */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} fill="none" stroke="#1e1e32" strokeWidth={1}
          points={keys.map((_, i) => { const p = pt(i, f * R); return `${p.x},${p.y}`; }).join(" ")} />
      ))}
      {/* Axis lines */}
      {keys.map((k, i) => {
        const end = pt(i, R);
        const lbl = pt(i, R + 18);
        return (
          <g key={k}>
            <line x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="#1e1e32" strokeWidth={1} />
            <text x={lbl.x} y={lbl.y} textAnchor="middle" dominantBaseline="middle"
              style={{ fill: "#4a4a6a", fontSize: 10, fontFamily: "monospace" }}>
              {SCORE_LABELS[k] ?? k}
            </text>
          </g>
        );
      })}
      {/* Asset paths */}
      {assets.map((a, ai) => (
        <path key={a.id} d={assetPath(a)} fill={`${colors[ai]}22`}
          stroke={colors[ai]} strokeWidth={2} strokeLinejoin="round" />
      ))}
      {/* Legend */}
      {assets.map((a, ai) => (
        <g key={a.id} transform={`translate(8, ${H - 20 - ai * 18})`}>
          <line x1={0} y1={0} x2={16} y2={0} stroke={colors[ai]} strokeWidth={2} />
          <text x={20} y={0} dominantBaseline="middle" style={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}>
            {a.ticker}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Score bar comparison ──────────────────────────────────────────────────────
function ScoreCompare({ label, values, colors }: {
  label: string; values: (number | undefined)[]; colors: string[];
}) {
  const valid = values.filter((v): v is number => v != null);
  const max   = valid.length ? Math.max(...valid) : -Infinity;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "#4a4a6a", marginBottom: 6, fontFamily: "monospace" }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {values.map((v, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: "100%", height: 6, background: "#1e1e32", borderRadius: 3, overflow: "hidden", flex: 1 }}>
              {v != null && (
                <div style={{ height: "100%", width: `${(v / 10) * 100}%`, borderRadius: 3,
                  background: colors[i], opacity: v === max && valid.length > 1 ? 1 : 0.5,
                  transition: "width 0.7s ease" }} />
              )}
            </div>
            <span style={{ fontFamily: "monospace", fontSize: 11, minWidth: 28, textAlign: "right",
              color: v != null && v === max && valid.length > 1 ? colors[i] : "#4a4a6a",
              fontWeight: v != null && v === max && valid.length > 1 ? 700 : 400 }}>
              {v != null ? v.toFixed(1) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Metric comparison row ─────────────────────────────────────────────────────
function MetricRow({ label, values, format = "num", higher = "better", colors }: {
  label: string;
  values: (number | null | undefined)[];
  format?: "num" | "pct" | "price";
  higher?: "better" | "worse";
  colors: string[];
}) {
  const valid = values.filter((v): v is number => v != null);
  const best  = valid.length >= 2
    ? (higher === "better" ? Math.max(...valid) : Math.min(...valid))
    : null;

  const fmt = (v: number | null | undefined) => {
    if (v == null) return "—";
    if (format === "pct") return fmtPct(v);
    return fmtNum(v, 2);
  };

  return (
    <div style={{ display: "grid", gap: 8, alignItems: "center", padding: "8px 0",
      borderBottom: "1px solid #1e1e32", gridTemplateColumns: `140px repeat(${values.length}, 1fr)` }}>
      <span style={{ fontSize: 12, color: "#4a4a6a" }}>{label}</span>
      {values.map((v, i) => {
        const isBest = v != null && best != null && v === best && valid.length > 1;
        return (
          <div key={i} style={{
            textAlign: "center", fontFamily: "monospace", fontSize: 12,
            padding: "3px 6px", borderRadius: 6,
            background: isBest ? `${colors[i]}18` : "transparent",
            color: isBest ? colors[i] : "#e2e8f0",
            fontWeight: isBest ? 700 : 400,
          }}>
            {fmt(v)}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Compare Page ─────────────────────────────────────────────────────────
function CompareInner() {
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]  = useState<string | null>(null);

  const COLORS = ["#00d4aa", "#a78bfa", "#f59e0b", "#f87171"];

  useEffect(() => {
    const param = searchParams.get("assets");
    if (!param) { setLoading(false); return; }

    const items = param.split(",")
      .map(s => { const [type, ...rest] = s.split(":"); return { type: type as AssetType, id: rest.join(":") }; })
      .filter(a => a.type && a.id);

    if (!items.length) { setLoading(false); return; }

    api.compare(items)
      .then(d => { setAssets(d); setLoading(false); })
      .catch(e => { setError(e instanceof APIError ? e.message : "Erro."); setLoading(false); });
  }, [searchParams]);

  if (loading) return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ height: 100, background: "#0f0f1a", border: "1px solid #1e1e32",
          borderRadius: 12, animation: "pulse 1.2s infinite" }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:0.8}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 32 }}>
      <div style={{ background: "#300a0a", border: "1px solid #7f1d1d44", borderRadius: 12, padding: 20 }}>
        <p style={{ color: "#fca5a5", marginBottom: 8 }}>{error}</p>
        <Link href="/" style={{ color: "#00d4aa", fontSize: 13 }}>← Voltar</Link>
      </div>
    </div>
  );

  if (!assets.length) return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 32, textAlign: "center" }}>
      <p style={{ color: "#4a4a6a", marginBottom: 12 }}>Nenhum ativo selecionado.</p>
      <Link href="/" style={{ color: "#00d4aa", fontSize: 13 }}>← Ir ao início</Link>
    </div>
  );

  const n = assets.length;
  const gridCols = `160px repeat(${n}, 1fr)`;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px 120px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#fff" }}>⚖️ Comparação de ativos</h1>
        <Link href="/" style={{ fontSize: 12, fontFamily: "monospace", color: "#4a4a6a", textDecoration: "none" }}>← Nova comparação</Link>
      </div>

      {/* Header cards */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {assets.map((a, i) => {
          const bstyle = a.badge ? badgeStyle(a.badge.color) : null;
          const curr   = a.moeda === "USD" ? "USD" : "BRL";
          return (
            <div key={a.id} style={{
              background: "#0f0f1a", border: `1px solid ${COLORS[i]}33`, borderRadius: 14,
              padding: 18, textAlign: "center", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 8,
            }}>
              {a.thumb && <img src={a.thumb} alt={a.nome} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />}
              <ScoreRing score={a.scores.total} size={68} stroke={5} />
              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 20, color: "#fff" }}>{a.ticker}</div>
              <div style={{ fontSize: 12, color: "#4a4a6a" }}>{a.nome}</div>
              <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 600, color: "#fff" }}>
                {fmtPrice(a.preco, curr)}
              </div>
              {bstyle && a.badge && (
                <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, fontFamily: "monospace",
                  background: bstyle.bg, color: bstyle.text, border: `1px solid ${bstyle.border}` }}>
                  {a.badge.label}
                </span>
              )}
              <Link href={assetHref(a)} style={{
                fontSize: 11, fontFamily: "monospace", color: COLORS[i], textDecoration: "none",
                padding: "5px 12px", borderRadius: 8, border: `1px solid ${COLORS[i]}44`,
              }}>
                Ver análise →
              </Link>
            </div>
          );
        })}
      </div>

      {/* Two-column layout: Radar + Score bars */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#0f0f1a", border: "1px solid #1e1e32", borderRadius: 14, padding: 20,
          display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "#4a4a6a", fontFamily: "monospace", marginBottom: 12,
            textTransform: "uppercase", letterSpacing: "0.08em" }}>Radar de performance</div>
          <RadarChart assets={assets} />
        </div>

        <div style={{ background: "#0f0f1a", border: "1px solid #1e1e32", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12, color: "#4a4a6a", fontFamily: "monospace", marginBottom: 16,
            textTransform: "uppercase", letterSpacing: "0.08em" }}>Scores por dimensão</div>
          {/* Legend */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            {assets.map((a, i) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 12, height: 3, borderRadius: 2, background: COLORS[i] }} />
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }}>{a.ticker}</span>
              </div>
            ))}
          </div>
          {/* All score dimensions */}
          {Array.from(new Set(assets.flatMap(a => Object.keys(a.scores).filter(k => k !== "total")))).map(k => (
            <ScoreCompare key={k}
              label={SCORE_LABELS[k] ?? k}
              values={assets.map(a => (a.scores as Record<string, number>)[k])}
              colors={COLORS} />
          ))}
          <ScoreCompare label="SCORE TOTAL" values={assets.map(a => a.scores.total)} colors={COLORS} />
        </div>
      </div>

      {/* Metric table */}
      <div style={{ background: "#0f0f1a", border: "1px solid #1e1e32", borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 12, color: "#4a4a6a", fontFamily: "monospace", marginBottom: 16,
          textTransform: "uppercase", letterSpacing: "0.08em" }}>Métricas comparadas</div>

        {/* Headers */}
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: gridCols, marginBottom: 8 }}>
          <div />
          {assets.map((a, i) => (
            <div key={a.id} style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 700,
              fontSize: 13, color: COLORS[i] }}>{a.ticker}</div>
          ))}
        </div>

        {/* Universal metrics */}
        <MetricRow label="Score total"  values={assets.map(a => a.scores.total)} colors={COLORS} />
        <MetricRow label="Preço"        values={assets.map(a => a.preco)} format="num" colors={COLORS} higher="worse" />
        <MetricRow label="Market Cap"   values={assets.map(a => a.market_cap)} format="num" colors={COLORS} />

        {/* Stock metrics */}
        {assets.some(a => a.type === "stock") && <>
          <MetricRow label="P/L"           values={assets.map(a => a.pl)}           format="num" higher="worse" colors={COLORS} />
          <MetricRow label="ROE (%)"        values={assets.map(a => a.roe)}           format="num" colors={COLORS} />
          <MetricRow label="Cresc. (%)"     values={assets.map(a => a.rev_growth)}    format="pct" colors={COLORS} />
          <MetricRow label="Margem Liq (%)" values={assets.map(a => a.margem_liquida)} format="num" colors={COLORS} />
          <MetricRow label="D/E"            values={assets.map(a => a.debt_equity)}   format="num" higher="worse" colors={COLORS} />
          <MetricRow label="Div. Yield (%)" values={assets.map(a => a.div_yield)}     format="num" colors={COLORS} />
        </>}

        {/* FII metrics */}
        {assets.some(a => a.type === "fii") && <>
          <MetricRow label="P/VP"           values={assets.map(a => a.pvp)}           format="num" higher="worse" colors={COLORS} />
          <MetricRow label="Div. Yield (%)" values={assets.map(a => a.div_yield)}     format="num" colors={COLORS} />
        </>}

        {/* Crypto metrics */}
        {assets.some(a => a.type === "crypto") && <>
          <MetricRow label="Rank MC"        values={assets.map(a => a.market_cap_rank)} format="num" higher="worse" colors={COLORS} />
          <MetricRow label="24h (%)"        values={assets.map(a => a.change_24h)}    format="pct" colors={COLORS} />
          <MetricRow label="7d (%)"         values={assets.map(a => a.change_7d)}     format="pct" colors={COLORS} />
          <MetricRow label="30d (%)"        values={assets.map(a => a.change_30d)}    format="pct" colors={COLORS} />
          <MetricRow label="vs ATH (%)"     values={assets.map(a => a.ath_change_pct)} format="pct" higher="worse" colors={COLORS} />
        </>}

        {/* Common */}
        <MetricRow label="Momentum 52s (%)" values={assets.map(a => a.momentum_52w)} format="pct" colors={COLORS} />
        <MetricRow label="Volatilidade (%)" values={assets.map(a => a.volatility)}   format="num" higher="worse" colors={COLORS} />
      </div>

      {/* Analysis summaries */}
      <div style={{ background: "#0f0f1a", border: "1px solid #1e1e32", borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 12, color: "#4a4a6a", fontFamily: "monospace", marginBottom: 16,
          textTransform: "uppercase", letterSpacing: "0.08em" }}>Análise comparativa</div>
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {assets.map((a, i) => (
            <div key={a.id} style={{ borderLeft: `2px solid ${COLORS[i]}`, paddingLeft: 14 }}>
              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: COLORS[i], marginBottom: 6 }}>
                {a.ticker}
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.65, marginBottom: 10 }}>{a.analysis?.resumo}</p>
              {(a.analysis?.forcas?.length ?? 0) > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {a.analysis!.forcas.map((f, j) => (
                    <div key={j} style={{ fontSize: 11, color: "#4ade80", display: "flex", gap: 4, marginBottom: 3 }}>
                      <span>✓</span><span>{f}</span>
                    </div>
                  ))}
                </div>
              )}
              {(a.analysis?.riscos?.length ?? 0) > 0 && (
                <div>
                  {a.analysis!.riscos.map((r, j) => (
                    <div key={j} style={{ fontSize: 11, color: "#f87171", display: "flex", gap: 4, marginBottom: 3 }}>
                      <span>⚠</span><span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "#4a4a6a" }}>Carregando comparação...</div>}>
      <CompareInner />
    </Suspense>
  );
}
