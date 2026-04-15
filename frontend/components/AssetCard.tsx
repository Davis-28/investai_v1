"use client";
import Link from "next/link";
import { Asset, assetHref } from "@/lib/types";
import { fmtPrice, fmtNum, fmtPct, badgeStyle, scoreColor } from "@/lib/api";
import { ScoreRing } from "@/components/ScoreDisplay";
import { useCompare } from "@/store/compare";

export default function AssetCard({ asset }: { asset: Asset }) {
  const { toggle, has } = useCompare();
  const inCompare = has(asset.id);
  const href = assetHref(asset);
  const curr = asset.moeda === "USD" ? "USD" : "BRL";

  const primaryChange = asset.change_24h ?? asset.momentum_52w;
  const isPos = (primaryChange ?? 0) >= 0;

  return (
    <div style={{
      background: inCompare ? "#0f1a18" : "#0f0f1a",
      border: `1px solid ${inCompare ? "#00d4aa44" : "#1e1e32"}`,
      borderRadius: 12, padding: 14, display: "flex", flexDirection: "column",
      gap: 10, transition: "border-color 0.15s", position: "relative",
    }}>
      {/* Badge */}
      {asset.badge && (() => {
        const s = badgeStyle(asset.badge!.color);
        return (
          <span style={{ position: "absolute", top: 10, right: 10,
            background: s.bg, color: s.text, border: `1px solid ${s.border}`,
            fontSize: 10, padding: "2px 8px", borderRadius: 20, fontFamily: "monospace" }}>
            {asset.badge!.label}
          </span>
        );
      })()}

      {/* Header */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <ScoreRing score={asset.scores.total} size={50} stroke={4} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: "#fff" }}>
            {asset.ticker}
          </div>
          <div style={{ fontSize: 11, color: "#4a4a6a", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
            {asset.nome}
          </div>
          <span style={{ fontSize: 10, background: "#1a1a2e", border: "1px solid #1e1e32",
            borderRadius: 4, padding: "2px 6px", color: "#4a4a6a", fontFamily: "monospace",
            display: "inline-block", marginTop: 4 }}>
            {asset.setor ?? asset.tipo_fundo ?? "Cripto"}
          </span>
        </div>
      </div>

      {/* Price + change */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 600, color: "#fff" }}>
          {fmtPrice(asset.preco, curr)}
        </span>
        {primaryChange != null && (
          <span style={{ fontSize: 11, fontFamily: "monospace", color: isPos ? "#4ade80" : "#f87171" }}>
            {fmtPct(primaryChange)} {asset.change_24h != null ? "24h" : "52s"}
          </span>
        )}
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {asset.type === "stock" && <>
          <Metric label="P/L"    value={fmtNum(asset.pl, 1, "x")} />
          <Metric label="ROE"    value={fmtNum(asset.roe, 1, "%")} />
          <Metric label="Cresc." value={fmtPct(asset.rev_growth)} color={(asset.rev_growth ?? 0) >= 0 ? "#4ade80" : "#f87171"} />
        </>}
        {asset.type === "fii" && <>
          <Metric label="Yield"  value={fmtNum(asset.div_yield, 1, "%")} color="#f59e0b" />
          <Metric label="P/VP"   value={fmtNum(asset.pvp, 2, "x")} />
          <Metric label="Tipo"   value={(asset.tipo_fundo ?? "—").split(" ")[0]} />
        </>}
        {asset.type === "crypto" && <>
          <Metric label="7d"     value={fmtPct(asset.change_7d)} color={(asset.change_7d ?? 0) >= 0 ? "#4ade80" : "#f87171"} />
          <Metric label="30d"    value={fmtPct(asset.change_30d)} color={(asset.change_30d ?? 0) >= 0 ? "#4ade80" : "#f87171"} />
          <Metric label="Rank"   value={asset.market_cap_rank ? `#${asset.market_cap_rank}` : "—"} />
        </>}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
        <Link href={href} style={{
          flex: 1, textAlign: "center", fontSize: 11, padding: "6px 0",
          borderRadius: 8, background: "#1a1a2e", color: "#4a4a6a",
          border: "1px solid #1e1e32", textDecoration: "none", fontFamily: "monospace",
          display: "block",
        }}>
          Ver análise →
        </Link>
        <button onClick={() => toggle({ id: asset.id, ticker: asset.ticker, type: asset.type, nome: asset.nome })}
          style={{
            fontSize: 13, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
            border: `1px solid ${inCompare ? "#00d4aa44" : "#1e1e32"}`,
            background: inCompare ? "#00d4aa1a" : "#1a1a2e",
            color: inCompare ? "#00d4aa" : "#4a4a6a",
          }}>
          {inCompare ? "✓" : "+"}
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 9, color: "#4a4a6a" }}>{label}</span>
      <span style={{ fontSize: 11, fontFamily: "monospace", color: color ?? "#94a3b8" }}>{value}</span>
    </div>
  );
}
