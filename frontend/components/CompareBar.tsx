"use client";
import { useRouter } from "next/navigation";
import { useCompare } from "@/store/compare";

export default function CompareBar() {
  const { items, remove, clear } = useCompare();
  const router = useRouter();

  if (items.length === 0) return null;

  const href = `/compare?assets=${items.map(i => `${i.type}:${i.id}`).join(",")}`;

  return (
    <div style={{
      position: "sticky", bottom: 0, left: 0, right: 0, zIndex: 40,
      background: "rgba(15,15,26,0.97)", backdropFilter: "blur(12px)",
      borderTop: "1px solid #00d4aa22", padding: "10px 16px",
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 11, color: "#4a4a6a", fontFamily: "monospace", flexShrink: 0 }}>
        Comparar ({items.length}/4):
      </span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
        {items.map(item => (
          <div key={item.id} style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "#1a1a2e", border: "1px solid #1e1e32", borderRadius: 6,
            padding: "3px 8px", fontSize: 11, fontFamily: "monospace",
          }}>
            <span style={{ color: "#e2e8f0" }}>{item.ticker}</span>
            <button onClick={() => remove(item.id)}
              style={{ background: "none", border: "none", cursor: "pointer",
                color: "#4a4a6a", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={clear} style={{
          fontSize: 11, fontFamily: "monospace", padding: "6px 12px", borderRadius: 8,
          border: "1px solid #1e1e32", color: "#4a4a6a", background: "none", cursor: "pointer",
        }}>Limpar</button>
        <button onClick={() => router.push(href)} style={{
          fontSize: 11, fontFamily: "monospace", padding: "6px 16px", borderRadius: 8,
          background: "#00d4aa", color: "#080810", fontWeight: 600, border: "none", cursor: "pointer",
        }}>Ver comparação →</button>
      </div>
    </div>
  );
}
