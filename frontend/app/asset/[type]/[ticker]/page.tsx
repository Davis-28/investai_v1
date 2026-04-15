"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Asset, AssetType, assetHref } from "@/lib/types";
import { api, APIError, fmtPrice, fmtNum, fmtPct, fmtBig, badgeStyle, scoreColor } from "@/lib/api";
import { ScoreRing, ScoreBar } from "@/components/ScoreDisplay";
import { useCompare } from "@/store/compare";

const SCORE_LABELS: Record<string, string> = {
  valuation:"Valuation", qualidade:"Qualidade", crescimento:"Crescimento",
  risco:"Risco", momentum:"Momentum", rendimento:"Rendimento",
  market_cap:"Market Cap", liquidez:"Liquidez",
};

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "9px 0", borderBottom: "1px solid #1e1e32" }}>
      <span style={{ fontSize: 13, color: "#4a4a6a" }}>{label}</span>
      <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 500, color: color ?? "#e2e8f0" }}>{value}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0f0f1a", border: "1px solid #1e1e32", borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 12, color: "#4a4a6a", fontFamily: "monospace",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

export default function AssetPage() {
  const params  = useParams<{ type: string; ticker: string }>();
  const [asset,   setAsset]   = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const { toggle, has } = useCompare();

  // params.ticker is the canonical id (coin_id for crypto, ticker for others)
  const assetId   = decodeURIComponent(params.ticker ?? "");
  const assetType = (params.type ?? "stock") as AssetType;

  useEffect(() => {
    if (!assetId || !assetType) return;
    setLoading(true); setError(null);
    api.asset(assetType, assetId)
      .then(d => { setAsset(d); setLoading(false); })
      .catch(e => { setError(e instanceof APIError ? e.message : "Erro ao carregar."); setLoading(false); });
  }, [assetId, assetType]);

  if (loading) return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ height: 80 + i * 20, background: "#0f0f1a", border: "1px solid #1e1e32",
          borderRadius: 12, animation: "pulse 1.2s infinite" }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:0.8}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <div style={{ background: "#300a0a", border: "1px solid #7f1d1d44", borderRadius: 12, padding: 20 }}>
        <p style={{ color: "#fca5a5", marginBottom: 8 }}>Erro ao carregar ativo</p>
        <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>
        <Link href="/" style={{ color: "#00d4aa", fontSize: 13, display: "inline-block", marginTop: 12 }}>
          ← Voltar ao início
        </Link>
      </div>
    </div>
  );

  if (!asset) return null;

  const inCompare = has(asset.id);
  const curr = asset.moeda === "USD" ? "USD" : "BRL";
  const subscores = Object.entries(asset.scores)
    .filter(([k]) => k !== "total")
    .map(([k, v]) => ({ key: k, label: SCORE_LABELS[k] ?? k, value: v as number }));

  const bstyle = asset.badge ? badgeStyle(asset.badge.color) : null;
  const primaryChange = asset.change_24h ?? asset.momentum_52w;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 120px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#4a4a6a", fontFamily: "monospace" }}>
        <Link href="/" style={{ color: "#4a4a6a", textDecoration: "none" }}>Home</Link>
        <span>/</span>
        <Link href={`/?cat=${assetType === "fii" ? "fiis" : assetType === "crypto" ? "crypto" : "brazil"}`}
          style={{ color: "#4a4a6a", textDecoration: "none", textTransform: "capitalize" }}>
          {assetType === "fii" ? "FIIs" : assetType === "crypto" ? "Cripto" : "Ações"}
        </Link>
        <span>/</span>
        <span style={{ color: "#e2e8f0" }}>{asset.ticker}</span>
      </div>

      {/* Hero */}
      <div style={{
        background: "#0f0f1a", border: "1px solid #1e1e32", borderRadius: 16, padding: "24px 28px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(135deg, #00d4aa06 0%, transparent 60%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {asset.thumb && (
              <img src={asset.thumb} alt={asset.nome} style={{ width: 48, height: 48, borderRadius: "50%" }} />
            )}
            <ScoreRing score={asset.scores.total} size={88} stroke={6} />
            <span style={{ fontSize: 11, color: "#4a4a6a", fontFamily: "monospace" }}>Score</span>
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
              <h1 style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 32, color: "#fff" }}>{asset.ticker}</h1>
              {bstyle && asset.badge && (
                <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, fontFamily: "monospace", fontWeight: 600,
                  background: bstyle.bg, color: bstyle.text, border: `1px solid ${bstyle.border}` }}>
                  {asset.badge.label}
                </span>
              )}
            </div>
            <p style={{ color: "#4a4a6a", fontSize: 14, marginBottom: 8 }}>{asset.nome}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {asset.setor && <span style={{ fontSize: 11, background: "#1a1a2e", border: "1px solid #1e1e32",
                borderRadius: 5, padding: "2px 8px", color: "#4a4a6a", fontFamily: "monospace" }}>{asset.setor}</span>}
              {asset.pais && <span style={{ fontSize: 11, background: "#1a1a2e", border: "1px solid #1e1e32",
                borderRadius: 5, padding: "2px 8px", color: "#4a4a6a", fontFamily: "monospace" }}>{asset.pais}</span>}
              {asset.tipo_fundo && <span style={{ fontSize: 11, background: "#1a1a2e", border: "1px solid #1e1e32",
                borderRadius: 5, padding: "2px 8px", color: "#4a4a6a", fontFamily: "monospace" }}>{asset.tipo_fundo}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontFamily: "monospace", fontSize: 32, fontWeight: 700, color: "#fff" }}>
                {fmtPrice(asset.preco, curr)}
              </span>
              {primaryChange != null && (
                <span style={{ fontSize: 14, fontFamily: "monospace",
                  color: primaryChange >= 0 ? "#4ade80" : "#f87171" }}>
                  {fmtPct(primaryChange)} {asset.change_24h != null ? "24h" : "52s"}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => toggle({ id: asset.id, ticker: asset.ticker, type: assetType, nome: asset.nome })}
              style={{
                fontSize: 12, fontFamily: "monospace", padding: "10px 18px", borderRadius: 10,
                border: `1px solid ${inCompare ? "#00d4aa44" : "#1e1e32"}`,
                background: inCompare ? "#00d4aa1a" : "#1a1a2e",
                color: inCompare ? "#00d4aa" : "#4a4a6a", cursor: "pointer",
              }}>
              {inCompare ? "✓ Na comparação" : "+ Comparar"}
            </button>
            {asset.website && (
              <a href={asset.website} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, fontFamily: "monospace", textAlign: "center",
                  padding: "8px 14px", borderRadius: 10, border: "1px solid #1e1e32",
                  color: "#4a4a6a", textDecoration: "none" }}>
                Site oficial ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Scores + Analysis grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title="Scores detalhados">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {subscores.map(({ key, label, value }) => (
              <ScoreBar key={key} label={label} value={value} color={scoreColor(value)} />
            ))}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card title="Análise automática">
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{asset.analysis?.resumo}</p>
          </Card>
          {(asset.analysis?.forcas?.length ?? 0) > 0 && (
            <div style={{ background: "#0a1a12", border: "1px solid #064e3b44", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#4ade80", marginBottom: 8, fontFamily: "monospace" }}>✅ Pontos fortes</div>
              {asset.analysis!.forcas.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: "#d1fae5", display: "flex", gap: 6, marginBottom: 4 }}>
                  <span style={{ color: "#4ade80", flexShrink: 0 }}>·</span>{f}
                </div>
              ))}
            </div>
          )}
          {(asset.analysis?.riscos?.length ?? 0) > 0 && (
            <div style={{ background: "#1a0a0a", border: "1px solid #7f1d1d44", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8, fontFamily: "monospace" }}>⚠️ Atenção</div>
              {asset.analysis!.riscos.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: "#fecaca", display: "flex", gap: 6, marginBottom: 4 }}>
                  <span style={{ color: "#f87171", flexShrink: 0 }}>·</span>{r}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metrics tables */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>

        {/* Valuation */}
        {(asset.type === "stock") && (
          <Card title="Valuation">
            <Row label="P/L"        value={fmtNum(asset.pl, 1, "x")} />
            <Row label="P/VP"       value={fmtNum(asset.pb, 2, "x")} />
            <Row label="EV/EBITDA"  value={fmtNum(asset.ev_ebitda, 1, "x")} />
            <Row label="P/S"        value={fmtNum(asset.ps, 2, "x")} />
            <Row label="Market Cap" value={fmtBig(asset.market_cap)} />
          </Card>
        )}
        {(asset.type === "fii") && (
          <Card title="Valuation FII">
            <Row label="P/VP"           value={fmtNum(asset.pvp, 2, "x")} />
            <Row label="Dividend Yield" value={fmtNum(asset.div_yield, 2, "%")} color="#f59e0b" />
            <Row label="Dividendos 12m" value={fmtNum(asset.dividendos_12m, 4)} />
            <Row label="Patrimônio Liq" value={fmtBig(asset.patrimonio_liq)} />
            <Row label="Market Cap"     value={fmtBig(asset.market_cap)} />
          </Card>
        )}
        {(asset.type === "crypto") && (
          <Card title="Mercado">
            <Row label="Rank MC"     value={asset.market_cap_rank ? `#${asset.market_cap_rank}` : "—"} />
            <Row label="Market Cap"  value={fmtBig(asset.market_cap)} />
            <Row label="Volume 24h"  value={fmtBig(asset.volume_24h)} />
            <Row label="Vol/MC"      value={fmtNum(asset.volume_mc_ratio, 4)} />
            <Row label="ATH"         value={fmtPrice(asset.ath, "USD")} />
          </Card>
        )}

        {/* Qualidade */}
        {asset.type === "stock" && (
          <Card title="Qualidade">
            <Row label="ROE"            value={fmtNum(asset.roe, 1, "%")} color={(asset.roe ?? 0) > 15 ? "#4ade80" : undefined} />
            <Row label="ROA"            value={fmtNum(asset.roa, 1, "%")} />
            <Row label="Margem líquida" value={fmtNum(asset.margem_liquida, 1, "%")} />
            <Row label="Margem bruta"   value={fmtNum(asset.margem_bruta, 1, "%")} />
            <Row label="D/E"            value={fmtNum(asset.debt_equity, 2, "x")} color={(asset.debt_equity ?? 0) > 2 ? "#f87171" : undefined} />
            <Row label="Current Ratio"  value={fmtNum(asset.current_ratio, 2)} />
          </Card>
        )}

        {/* Performance */}
        <Card title="Desempenho & Risco">
          {asset.type === "stock" && <>
            <Row label="Cresc. receita" value={fmtPct(asset.rev_growth)}   color={(asset.rev_growth ?? 0) >= 0 ? "#4ade80" : "#f87171"} />
            <Row label="Cresc. lucro"   value={fmtPct(asset.earn_growth)}   color={(asset.earn_growth ?? 0) >= 0 ? "#4ade80" : "#f87171"} />
            <Row label="Dividend Yield" value={fmtNum(asset.div_yield, 2, "%")} color="#f59e0b" />
            <Row label="Beta"           value={fmtNum(asset.beta, 2)} />
          </>}
          {asset.type === "fii" && <>
            <Row label="Momentum 52s" value={fmtPct(asset.momentum_52w)} color={(asset.momentum_52w ?? 0) >= 0 ? "#4ade80" : "#f87171"} />
            <Row label="Vacância"     value={asset.vacancia != null ? fmtNum(asset.vacancia, 1, "%") : "N/D"} />
          </>}
          {asset.type === "crypto" && <>
            <Row label="24h"  value={fmtPct(asset.change_24h)}  color={(asset.change_24h ?? 0) >= 0 ? "#4ade80" : "#f87171"} />
            <Row label="7d"   value={fmtPct(asset.change_7d)}   color={(asset.change_7d ?? 0) >= 0 ? "#4ade80" : "#f87171"} />
            <Row label="30d"  value={fmtPct(asset.change_30d)}  color={(asset.change_30d ?? 0) >= 0 ? "#4ade80" : "#f87171"} />
            <Row label="1a"   value={fmtPct(asset.change_1y)}   color={(asset.change_1y ?? 0) >= 0 ? "#4ade80" : "#f87171"} />
            <Row label="vs ATH" value={fmtPct(asset.ath_change_pct)} color="#f87171" />
          </>}
          {asset.type !== "crypto" && <>
            <Row label="Volatilidade" value={fmtNum(asset.volatility, 1, "%")} />
            <Row label="Máx 52s"      value={fmtPrice(asset.high_52w, curr)} />
            <Row label="Mín 52s"      value={fmtPrice(asset.low_52w, curr)} />
          </>}
        </Card>

        {/* Crypto supply */}
        {asset.type === "crypto" && (
          <Card title="Supply & ATH">
            <Row label="Circ. Supply" value={fmtBig(asset.circulating_supply)} />
            <Row label="Total Supply" value={asset.total_supply ? fmtBig(asset.total_supply) : "∞"} />
            <Row label="ATH"          value={fmtPrice(asset.ath, "USD")} />
            <Row label="vs ATH"       value={fmtPct(asset.ath_change_pct)} color="#f87171" />
          </Card>
        )}
      </div>

      {/* Description */}
      {asset.descricao && (
        <Card title="Sobre">
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>{asset.descricao}</p>
        </Card>
      )}

      <p style={{ textAlign: "center", fontSize: 11, color: "#2a2a42" }}>
        Dados via yfinance e CoinGecko · Não constitui recomendação de investimento
      </p>
    </div>
  );
}
