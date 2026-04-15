import type { Metadata } from "next";
import "./globals.css";
import { CompareProvider } from "@/store/compare";
import Header from "@/components/Header";
import CompareBar from "@/components/CompareBar";

export const metadata: Metadata = {
  title: "InvestAI — Plataforma de Análise de Investimentos",
  description: "Dados reais, score quantitativo e análise profunda para ações, FIIs e criptomoedas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#080810", color: "#e2e8f0",
        fontFamily: "'Sora', system-ui, sans-serif", WebkitFontSmoothing: "antialiased" }}>
        <CompareProvider>
          <Header />
          <main>{children}</main>
          <CompareBar />
        </CompareProvider>
      </body>
    </html>
  );
}
