"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";

const NAV = [
  { href: "/",              label: "Home",      key: "home" },
  { href: "/?cat=brazil",   label: "🇧🇷 Brasil", key: "brazil" },
  { href: "/?cat=global",   label: "🌎 Global",  key: "global" },
  { href: "/?cat=fiis",     label: "🏢 FIIs",    key: "fiis" },
  { href: "/?cat=crypto",   label: "🪙 Cripto",  key: "crypto" },
  { href: "/?cat=dividends",label: "💰 Div.",    key: "dividends" },
  { href: "/?cat=growth",   label: "🚀 Growth",  key: "growth" },
];

export default function Header() {
  const path = usePathname();
  const searchParams = useSearchParams();
  const currentCat = searchParams.get("cat");
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 30,
      background: "rgba(15,15,26,0.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid #1e1e32",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, background: "#00d4aa", borderRadius: 7,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "monospace", fontWeight: 700, color: "#080810", fontSize: 14,
            }}>↑</div>
            <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#fff", fontSize: 15 }}>
              InvestAI
            </span>
          </Link>
          <div style={{ flex: 1 }}>
            <SearchBar />
          </div>
        </div>
        <nav style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {NAV.map(n => {
            const active =
              n.key === "home"
                ? path === "/" && !currentCat
                : currentCat === n.key;
            return (
              <Link key={n.key} href={n.href} style={{
                flexShrink: 0, fontSize: 12, fontFamily: "monospace", padding: "8px 12px",
                borderBottom: `2px solid ${active ? "#00d4aa" : "transparent"}`,
                color: active ? "#00d4aa" : "#4a4a6a", textDecoration: "none",
                whiteSpace: "nowrap", transition: "color 0.15s",
              }}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
