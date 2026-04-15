"""
explainer.py — Motor de explicação baseado em regras
Gera texto em português natural com base nos dados e scores.
Sem IA externa. Lógica determinística + templates dinâmicos.
"""

import random
from typing import Optional


# ── Templates por nível de score ─────────────────────────────────────────────

_INTROS_EXCELENTE = [
    "Ativo com perfil excepcional",
    "Destaque absoluto da categoria",
    "Um dos mais sólidos do mercado",
    "Fundamentals de primeira linha",
    "Excelente combinação de qualidade e valor",
]
_INTROS_BOM = [
    "Ativo com bons fundamentos",
    "Perfil equilibrado e consistente",
    "Boa relação risco-retorno",
    "Empresa com fundamentos sólidos",
    "Oportunidade com boa base de qualidade",
]
_INTROS_MEDIANO = [
    "Ativo com perfil neutro",
    "Fundamentos dentro da média do mercado",
    "Empresa em transição de ciclo",
    "Resultados mistos com pontos positivos e negativos",
]
_INTROS_FRACO = [
    "Ativo com pontos de atenção relevantes",
    "Fundamentos abaixo da média do setor",
    "Cautela recomendada neste momento",
    "Perfil de maior risco no contexto atual",
]


def _pick(lst: list[str], seed: str = "") -> str:
    """Seleciona item da lista de forma determinística (sem randomness real)."""
    idx = sum(ord(c) for c in seed) % len(lst)
    return lst[idx]


# ── Análise de ações ─────────────────────────────────────────────────────────

def explain_stock(data: dict, scores: dict) -> dict:
    total = scores.get("total", 5)
    seed  = data.get("ticker", "X")

    if total >= 8:
        intro = _pick(_INTROS_EXCELENTE, seed)
    elif total >= 6.5:
        intro = _pick(_INTROS_BOM, seed)
    elif total >= 5:
        intro = _pick(_INTROS_MEDIANO, seed)
    else:
        intro = _pick(_INTROS_FRACO, seed)

    forcas, riscos, destaques = [], [], []

    # Valuation
    val = scores.get("valuation", 5)
    pl  = data.get("pl")
    if val >= 8 and pl:
        forcas.append(f"valuation atrativo (P/L de {pl:.1f}x)")
    elif val <= 4:
        riscos.append("valuation esticado em relação ao setor")

    # Qualidade/ROE
    qual = scores.get("qualidade", 5)
    roe  = data.get("roe")
    if qual >= 8 and roe:
        forcas.append(f"alta rentabilidade sobre o patrimônio (ROE de {roe:.1f}%)")
    elif qual <= 4:
        riscos.append("rentabilidade abaixo do esperado para o setor")

    # Crescimento
    cresc = scores.get("crescimento", 5)
    rg    = data.get("rev_growth")
    if cresc >= 8 and rg:
        forcas.append(f"crescimento expressivo de receita ({rg:+.1f}%)")
    elif cresc <= 4 and rg is not None:
        if rg < 0:
            riscos.append(f"queda na receita ({rg:.1f}% no último período)")
        else:
            riscos.append("expansão de receita abaixo das expectativas")

    # Risco/Endividamento
    risco  = scores.get("risco", 5)
    de     = data.get("debt_equity")
    beta   = data.get("beta")
    if risco >= 8:
        forcas.append("balanço saudável com dívida controlada")
    elif risco <= 4 and de is not None:
        riscos.append(f"endividamento elevado (D/E de {de:.1f}x)")
    if beta is not None and beta > 1.8:
        riscos.append(f"alta volatilidade histórica (beta de {beta:.1f})")

    # Momentum
    mom   = scores.get("momentum", 5)
    m52w  = data.get("momentum_52w")
    if mom >= 8 and m52w:
        destaques.append(f"tendência de alta consistente nos últimos 12 meses (+{m52w:.1f}%)")
    elif mom <= 4 and m52w is not None and m52w < -20:
        riscos.append(f"queda significativa de preço nos últimos 12 meses ({m52w:.1f}%)")

    # Dividendos
    dy = data.get("div_yield")
    if dy and dy > 4:
        destaques.append(f"dividend yield interessante de {dy:.1f}%")

    return _compose(intro, forcas, riscos, destaques, total)


# ── Análise de FIIs ──────────────────────────────────────────────────────────

def explain_fii(data: dict, scores: dict) -> dict:
    total  = scores.get("total", 5)
    seed   = data.get("ticker", "X")
    tipo   = data.get("tipo_fundo", "FII")

    if total >= 8:
        intro = f"{tipo} com perfil excepcional de renda"
    elif total >= 6.5:
        intro = f"{tipo} com bom histórico de distribuição"
    elif total >= 5:
        intro = f"{tipo} com rendimento dentro da média do segmento"
    else:
        intro = f"{tipo} com pontos de atenção importantes"

    forcas, riscos, destaques = [], [], []

    dy  = data.get("div_yield")
    pvp = data.get("pvp")
    m52 = data.get("momentum_52w")

    # Yield
    rend = scores.get("rendimento", 5)
    if rend >= 8 and dy:
        forcas.append(f"dividend yield elevado de {dy:.1f}% ao ano")
    elif rend <= 4 and dy is not None:
        if dy < 5:
            riscos.append(f"yield abaixo da média dos FIIs ({dy:.1f}%)")
        elif dy > 20:
            riscos.append(f"yield muito alto ({dy:.1f}%) pode indicar problema no fundo")

    # P/VP
    val = scores.get("valuation", 5)
    if val >= 8 and pvp:
        forcas.append(f"cotas negociando com desconto ao patrimônio (P/VP {pvp:.2f})")
    elif val <= 5 and pvp and pvp > 1.2:
        riscos.append(f"cotas negociando com prêmio ao valor patrimonial (P/VP {pvp:.2f})")

    # Momentum
    if m52 is not None:
        if m52 > 10:
            destaques.append(f"boa performance de preços nos últimos 12 meses (+{m52:.1f}%)")
        elif m52 < -15:
            riscos.append(f"desvalorização das cotas nos últimos 12 meses ({m52:.1f}%)")

    # Vacância (se disponível)
    vac = data.get("vacancia")
    if vac is not None:
        if vac < 5:
            forcas.append(f"baixa vacância do portfólio ({vac:.1f}%)")
        elif vac > 20:
            riscos.append(f"vacância elevada ({vac:.1f}%) pressiona os rendimentos")

    return _compose(intro, forcas, riscos, destaques, total)


# ── Análise de Crypto ─────────────────────────────────────────────────────────

def explain_crypto(data: dict, scores: dict) -> dict:
    total    = scores.get("total", 5)
    nome     = data.get("nome", data.get("ticker", "Cripto"))
    mc_rank  = data.get("market_cap_rank")
    ch24     = data.get("change_24h")
    ch7      = data.get("change_7d")
    ch30     = data.get("change_30d")
    ath_chg  = data.get("ath_change_pct")

    if total >= 8:
        intro = f"{nome}: ativo digital consolidado com momentum favorável"
    elif total >= 6.5:
        intro = f"{nome}: perfil de risco-retorno equilibrado no segmento cripto"
    elif total >= 5:
        intro = f"{nome}: desempenho neutro, movimento lateral recente"
    else:
        intro = f"{nome}: ativo com volatilidade elevada e pontos de atenção"

    forcas, riscos, destaques = [], [], []

    # Market cap
    mc_s = scores.get("market_cap", 5)
    if mc_s >= 8 and mc_rank:
        forcas.append(f"alta capitalização de mercado (#{mc_rank} globalmente)")
    elif mc_s <= 4:
        riscos.append("baixa capitalização aumenta risco de manipulação")

    # Liquidez
    liq = scores.get("liquidez", 5)
    if liq >= 8:
        forcas.append("excelente liquidez de mercado")
    elif liq <= 4:
        riscos.append("liquidez reduzida pode dificultar saídas grandes")

    # Momentum
    mom = scores.get("momentum", 5)
    if mom >= 8:
        if ch7 is not None and ch7 > 0:
            destaques.append(f"forte momentum positivo: +{ch7:.1f}% em 7 dias")
        if ch30 is not None and ch30 > 0:
            destaques.append(f"+{ch30:.1f}% nos últimos 30 dias")
    elif mom <= 4:
        if ch30 is not None and ch30 < -20:
            riscos.append(f"correção expressiva: {ch30:.1f}% em 30 dias")

    # Distância da ATH
    if ath_chg is not None:
        dist = abs(ath_chg)
        if dist < 15:
            destaques.append("próximo da máxima histórica (ATH)")
        elif dist > 70:
            destaques.append(f"{dist:.0f}% abaixo da ATH — potencial de recuperação histórico")

    return _compose(intro, forcas, riscos, destaques, total)


# ── Dispatcher e compositor ───────────────────────────────────────────────────

def _compose(intro: str, forcas: list, riscos: list, destaques: list, total: float) -> dict:
    """Monta o texto final e separa por seções."""
    partes = [intro + "."]

    if forcas:
        lista = " e ".join(forcas[:2])
        partes.append(f"Pontos fortes: {lista}.")

    if destaques:
        partes.append(f"Destaque: {destaques[0]}.")

    if riscos:
        lista = " e ".join(riscos[:2])
        partes.append(f"Pontos de atenção: {lista}.")

    if not forcas and not riscos:
        if total >= 6:
            partes.append("Os fundamentos estão dentro da média e não há alertas relevantes.")
        else:
            partes.append("Dados insuficientes para análise mais detalhada.")

    return {
        "resumo":    " ".join(partes),
        "forcas":    forcas[:3],
        "riscos":    riscos[:3],
        "destaques": destaques[:2],
    }


def explain(data: dict, scores: dict) -> dict:
    """Dispatcher: gera explicação baseada no tipo do ativo."""
    t = data.get("type", "stock")
    if t == "fii":
        return explain_fii(data, scores)
    elif t == "crypto":
        return explain_crypto(data, scores)
    else:
        return explain_stock(data, scores)


# ── Badge de classificação ────────────────────────────────────────────────────

def get_badge(scores: dict, data: dict) -> Optional[dict]:
    """
    Retorna badge principal do ativo: Top Pick, High Yield, Growth, Risco, etc.
    """
    total = scores.get("total", 5)
    t     = data.get("type", "stock")

    if total >= 8.5:
        return {"label": "Top Pick", "color": "teal"}
    if total >= 7.5:
        return {"label": "Forte Compra", "color": "green"}

    if t == "stock":
        dy = data.get("div_yield") or 0
        rg = data.get("rev_growth") or 0
        if dy > 6:
            return {"label": "Alto Dividendo", "color": "amber"}
        if rg > 20:
            return {"label": "Growth", "color": "purple"}
        if scores.get("valuation", 5) >= 8:
            return {"label": "Value", "color": "blue"}

    if t == "fii":
        dy = data.get("div_yield") or 0
        if dy > 10:
            return {"label": "High Yield", "color": "amber"}
        pvp = data.get("pvp") or 1
        if pvp < 0.9:
            return {"label": "Desconto", "color": "blue"}

    if t == "crypto":
        mc_rank = data.get("market_cap_rank") or 999
        if mc_rank <= 5:
            return {"label": "Blue Chip Crypto", "color": "blue"}
        mom = scores.get("momentum", 5)
        if mom >= 8:
            return {"label": "Momentum", "color": "purple"}

    if total <= 4:
        return {"label": "Alto Risco", "color": "red"}

    return None
