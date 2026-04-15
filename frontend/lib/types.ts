// lib/types.ts — fonte única de verdade para todos os tipos

export type AssetType = "stock" | "fii" | "crypto";

export interface Scores {
  total:        number;
  // Stock scores
  valuation?:   number;
  qualidade?:   number;
  crescimento?: number;
  risco?:       number;
  momentum?:    number;
  // FII scores
  rendimento?:  number;
  // Crypto scores
  market_cap?:  number;
  liquidez?:    number;
}

export interface Analysis {
  resumo:     string;
  forcas:     string[];
  riscos:     string[];
  destaques:  string[];
}

export interface Badge {
  label: string;
  color: "teal" | "green" | "amber" | "purple" | "blue" | "red";
}

export interface Asset {
  // ── Identificadores ──────────────────────────────────────────────────
  id:      string;       // ticker para stocks/FIIs, coin_id para crypto
  ticker:  string;       // símbolo exibível (sempre)
  type:    AssetType;

  // ── Dados gerais ──────────────────────────────────────────────────────
  nome:         string;
  setor?:       string;
  industria?:   string;
  moeda:        string;
  pais?:        string;
  preco:        number | null;
  market_cap?:  number | null;
  volume?:      number | null;
  website?:     string | null;
  descricao?:   string | null;
  thumb?:       string | null;

  // ── Análise ───────────────────────────────────────────────────────────
  scores:   Scores;
  analysis: Analysis;
  badge?:   Badge | null;

  // ── Stock / FII common ───────────────────────────────────────────────
  div_yield?:      number | null;
  momentum_52w?:   number | null;
  volatility?:     number | null;
  high_52w?:       number | null;
  low_52w?:        number | null;
  beta?:           number | null;

  // ── Stock only ───────────────────────────────────────────────────────
  pl?:             number | null;
  pb?:             number | null;
  ev_ebitda?:      number | null;
  ps?:             number | null;
  roe?:            number | null;
  roa?:            number | null;
  margem_bruta?:   number | null;
  margem_liquida?: number | null;
  debt_equity?:    number | null;
  current_ratio?:  number | null;
  rev_growth?:     number | null;
  earn_growth?:    number | null;
  payout_ratio?:   number | null;

  // ── FII only ──────────────────────────────────────────────────────────
  tipo_fundo?:     string;
  dividendos_12m?: number | null;
  pvp?:            number | null;
  vacancia?:       number | null;
  num_cotas?:      number | null;
  patrimonio_liq?: number | null;

  // ── Crypto only ───────────────────────────────────────────────────────
  market_cap_rank?: number | null;
  volume_24h?:      number | null;
  volume_mc_ratio?: number | null;
  change_1h?:       number | null;
  change_24h?:      number | null;
  change_7d?:       number | null;
  change_30d?:      number | null;
  change_1y?:       number | null;
  high_24h?:        number | null;
  low_24h?:         number | null;
  ath?:             number | null;
  ath_change_pct?:  number | null;
  circulating_supply?: number | null;
  total_supply?:    number | null;
}

export interface SearchResult {
  id:       string;     // coin_id para crypto, ticker para outros
  ticker:   string;
  nome:     string;
  type:     AssetType;
  thumb?:   string;
}

export type CategoryName =
  | "opportunities" | "brazil" | "global"
  | "fiis" | "crypto" | "dividends" | "growth";

export const CATEGORY_META: Record<CategoryName, { label: string; emoji: string }> = {
  opportunities: { label: "Melhores Oportunidades", emoji: "🏆" },
  brazil:        { label: "Ações Brasil",            emoji: "🇧🇷" },
  global:        { label: "Ações Globais",           emoji: "🌎" },
  fiis:          { label: "FIIs",                    emoji: "🏢" },
  crypto:        { label: "Cripto",                  emoji: "🪙" },
  dividends:     { label: "Dividendos",              emoji: "💰" },
  growth:        { label: "Growth",                  emoji: "🚀" },
};

// Rota canônica para um ativo
export function assetHref(asset: Pick<Asset, "type" | "id">): string {
  return `/asset/${asset.type}/${asset.id}`;
}
