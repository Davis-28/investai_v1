"use client";
import { scoreColor } from "@/lib/api";

export function ScoreRing({ score, size = 64, stroke = 5 }: { score: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(10, score));
  const offset = circ * (1 - pct / 10);
  const color  = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1e32" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.9s ease" }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "center",
          fill: "#fff", fontFamily: "monospace", fontWeight: 700, fontSize: size * 0.22 }}>
        {score.toFixed(1)}
      </text>
    </svg>
  );
}

export function ScoreBar({ label, value, color }: { label: string; value: number; color?: string }) {
  const c = color || scoreColor(value);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span style={{ color: "#4a4a6a" }}>{label}</span>
        <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ height: 4, background: "#1e1e32", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(value / 10) * 100}%`, background: c,
          borderRadius: 2, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
}

export function ScorePill({ score }: { score: number }) {
  const c = scoreColor(score);
  return (
    <span style={{ color: c, background: `${c}18`, border: `1px solid ${c}33`,
      fontFamily: "monospace", fontWeight: 700, fontSize: 13, padding: "2px 8px", borderRadius: 6 }}>
      {score.toFixed(1)}
    </span>
  );
}
