"""
scoring/engine.py — Motor de análise quantitativa
Scoring por tipo de ativo (ação, FII, crypto).
Sem IA externa. Valores sempre em 0–10. Nunca retorna NaN.
"""

import math
from typing import Optional


# ── Utilitários ───────────────────────────────────────────────────────────────

def _safe(v: Optional[float], default: float = 5.0) -> float:
    """Retorna default se valor é None/NaN/Inf."""
    if v is None:
        return default
    try:
        f = float(v)
        return default if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return default


def _clamp(v: float, lo: float = 0.0, hi: float = 10.0) -> float:
    return round(max(lo, min(hi, v)), 2)


def _linear(v: float, best: float, worst: float) -> float:
    """
    Normaliza v entre best e worst → [0, 10].
    Se v == best → 10. Se v == worst → 0.
    """
    if best == worst:
        return 5.0
    raw = (v - worst) / (best - worst) * 10
    return _clamp(raw)


def _score_from_breakpoints(v: float, breakpoints: list[tuple[float, float]]) -> float:
    """
    Mapeia v para score via tabela de breakpoints [(threshold, score)...].
    Os breakpoints devem estar em ordem decrescente de threshold.
    """
    for threshold, score in breakpoints:
        if v >= threshold:
            return score
    return breakpoints[-1][1]


# ── Score de ações ─────────────────────────────────────────────────────────────

def score_stock(data: dict) -> dict:
    """
    Calcula 5 subscores para uma ação e retorna score total.
    Todos os valores em 0–10.
    """
    pl          = _safe(data.get("pl"), None)
    pb          = _safe(data.get("pb"), None)
    ev_ebitda   = _safe(data.get("ev_ebitda"), None)
    roe         = _safe(data.get("roe"), None)
    roa         = _safe(data.get("roa"), None)
    margem_liq  = _safe(data.get("margem_liquida"), None)
    debt_eq     = _safe(data.get("debt_equity"), None)
    cur_ratio   = _safe(data.get("current_ratio"), None)
    beta        = _safe(data.get("beta"), None)
    rev_growth  = _safe(data.get("rev_growth"), None)
    earn_growth = _safe(data.get("earn_growth"), None)
    mom_52w     = _safe(data.get("momentum_52w"), None)
    volatility  = _safe(data.get("volatility"), None)

    # ── 1. Valuation (P/E, P/B, EV/EBITDA) — menor é melhor ──────────────
    val_scores = []

    if pl is not None:
        if pl <= 0:
            val_scores.append(1.0)   # negativo = empresa com prejuízo
        else:
            val_scores.append(_score_from_breakpoints(pl, [
                (0.1, 10), (5, 9.5), (10, 8.5), (15, 7.5), (20, 6.5),
                (25, 5.5), (30, 4.5), (40, 3.5), (60, 2.5), (100, 1.5),
            ]))

    if pb is not None and pb > 0:
        val_scores.append(_score_from_breakpoints(pb, [
            (0.1, 10), (1, 9), (1.5, 8), (2, 7), (3, 6),
            (4, 5), (6, 4), (10, 3), (15, 2),
        ]))

    if ev_ebitda is not None and ev_ebitda > 0:
        val_scores.append(_score_from_breakpoints(ev_ebitda, [
            (0.1, 10), (5, 9), (8, 8), (10, 7), (12, 6),
            (15, 5), (20, 4), (30, 3), (50, 2),
        ]))

    valuation = float(sum(val_scores) / len(val_scores)) if val_scores else 5.0

    # ── 2. Qualidade (ROE, ROA, margem) — maior é melhor ──────────────────
    qual_scores = []

    if roe is not None:
        qual_scores.append(_score_from_breakpoints(roe, [
            (25, 10), (20, 9), (15, 8), (12, 7), (10, 6),
            (7, 5), (5, 4), (2, 3), (0, 2), (-100, 0.5),
        ]))

    if roa is not None:
        qual_scores.append(_score_from_breakpoints(roa, [
            (15, 10), (10, 9), (7, 8), (5, 7), (3, 6),
            (2, 5), (1, 4), (0, 3), (-100, 1),
        ]))

    if margem_liq is not None:
        qual_scores.append(_score_from_breakpoints(margem_liq, [
            (30, 10), (20, 9), (15, 8), (10, 7), (7, 6),
            (5, 5), (3, 4), (1, 3), (0, 2), (-100, 0.5),
        ]))

    qualidade = float(sum(qual_scores) / len(qual_scores)) if qual_scores else 5.0

    # ── 3. Crescimento (receita e lucro) — maior é melhor ─────────────────
    growth_scores = []

    if rev_growth is not None:
        growth_scores.append(_score_from_breakpoints(rev_growth, [
            (50, 10), (30, 9.5), (20, 9), (15, 8), (10, 7),
            (5, 6), (2, 5), (0, 4), (-5, 3), (-15, 2), (-100, 1),
        ]))

    if earn_growth is not None:
        growth_scores.append(_score_from_breakpoints(earn_growth, [
            (50, 10), (30, 9), (20, 8), (10, 7), (5, 6),
            (0, 5), (-10, 4), (-25, 3), (-100, 1.5),
        ]))

    crescimento = float(sum(growth_scores) / len(growth_scores)) if growth_scores else 5.0

    # ── 4. Risco (dívida, liquidez, beta) — menor risco → maior score ─────
    risk_scores = []

    if debt_eq is not None:
        # D/E: muito baixo é bom, muito alto é ruim
        # Para bancos, D/E alto é normal — não penalizamos demais
        risk_scores.append(_score_from_breakpoints(debt_eq, [
            (0, 10), (0.1, 9.5), (0.3, 9), (0.5, 8), (0.8, 7),
            (1.0, 6), (1.5, 5), (2.0, 4), (3.0, 3), (5.0, 2), (100, 1),
        ]))

    if cur_ratio is not None:
        risk_scores.append(_score_from_breakpoints(cur_ratio, [
            (3.0, 10), (2.5, 9), (2.0, 8.5), (1.5, 7.5), (1.2, 6.5),
            (1.0, 5.5), (0.8, 4), (0.6, 3), (0, 2),
        ]))

    if beta is not None:
        # Beta próximo de 1 é neutro; muito acima = risco maior
        b = abs(beta)
        risk_scores.append(_score_from_breakpoints(b, [
            (0.0, 8), (0.3, 9), (0.6, 10), (0.8, 9.5), (1.0, 8.5),
            (1.2, 7), (1.5, 5.5), (2.0, 4), (2.5, 3), (100, 2),
        ]))

    risco = float(sum(risk_scores) / len(risk_scores)) if risk_scores else 5.0

    # ── 5. Momentum (retorno 52w, volatilidade) ───────────────────────────
    mom_scores = []

    if mom_52w is not None:
        mom_scores.append(_score_from_breakpoints(mom_52w, [
            (60, 10), (40, 9), (25, 8), (15, 7), (5, 6),
            (0, 5.5), (-5, 5), (-15, 4), (-25, 3), (-40, 2), (-100, 1),
        ]))

    if volatility is not None:
        # Volatilidade anualizada: menor é melhor
        mom_scores.append(_score_from_breakpoints(volatility, [
            (0, 10), (10, 9.5), (15, 9), (20, 8), (25, 7),
            (30, 6), (40, 5), (50, 4), (60, 3), (100, 2),
        ]))

    momentum = float(sum(mom_scores) / len(mom_scores)) if mom_scores else 5.0

    # ── Score total ponderado ─────────────────────────────────────────────
    weights = {
        "valuation":   0.25,
        "qualidade":   0.25,
        "crescimento": 0.20,
        "risco":       0.20,
        "momentum":    0.10,
    }

    total = (
        valuation   * weights["valuation"]   +
        qualidade   * weights["qualidade"]   +
        crescimento * weights["crescimento"] +
        risco       * weights["risco"]       +
        momentum    * weights["momentum"]
    )

    return {
        "total":       _clamp(total),
        "valuation":   _clamp(valuation),
        "qualidade":   _clamp(qualidade),
        "crescimento": _clamp(crescimento),
        "risco":       _clamp(risco),
        "momentum":    _clamp(momentum),
    }


# ── Score de FIIs ─────────────────────────────────────────────────────────────

def score_fii(data: dict) -> dict:
    """
    Scoring específico para Fundos de Investimento Imobiliário.
    Subcategorias: Yield, P/VP, Momentum, Risco.
    """
    div_yield  = _safe(data.get("div_yield"), None)
    pvp        = _safe(data.get("pvp"), None)
    mom_52w    = _safe(data.get("momentum_52w"), None)
    volatility = _safe(data.get("volatility"), None)

    # ── Yield score ───────────────────────────────────────────────────────
    yield_scores = []
    if div_yield is not None:
        # FII com yield muito alto pode indicar problema
        if div_yield > 20:
            yield_scores.append(5.0)   # suspeito
        else:
            yield_scores.append(_score_from_breakpoints(div_yield, [
                (14, 9), (12, 9.5), (10, 9), (9, 8.5), (8, 8),
                (7, 7.5), (6, 7), (5, 6), (4, 5), (3, 4), (0, 2),
            ]))

    rendimento = float(sum(yield_scores) / len(yield_scores)) if yield_scores else 5.0

    # ── P/VP (Preço/Valor Patrimonial) ────────────────────────────────────
    pvp_scores = []
    if pvp is not None and pvp > 0:
        # P/VP < 1 = desconto, P/VP = 1 = justo, P/VP > 1 = prêmio
        pvp_scores.append(_score_from_breakpoints(pvp, [
            (0.1, 10), (0.7, 9.5), (0.85, 9), (0.95, 8.5), (1.0, 8),
            (1.05, 7.5), (1.1, 7), (1.2, 6), (1.3, 5), (1.5, 4), (2.0, 3),
        ]))

    valuation = float(sum(pvp_scores) / len(pvp_scores)) if pvp_scores else 5.0

    # ── Qualidade (combinação rendimento + P/VP) ──────────────────────────
    qualidade = round((rendimento + valuation) / 2, 2)

    # ── Momentum ──────────────────────────────────────────────────────────
    mom_scores = []
    if mom_52w is not None:
        mom_scores.append(_score_from_breakpoints(mom_52w, [
            (40, 10), (25, 9), (15, 8), (5, 7), (0, 6),
            (-5, 5), (-15, 4), (-30, 3), (-100, 2),
        ]))
    if volatility is not None:
        mom_scores.append(_score_from_breakpoints(volatility, [
            (0, 10), (10, 9.5), (15, 8), (20, 7), (25, 6),
            (30, 5), (40, 4), (60, 3),
        ]))

    momentum = float(sum(mom_scores) / len(mom_scores)) if mom_scores else 5.0

    # ── Risco (volatilidade) ──────────────────────────────────────────────
    risco = 5.0
    if volatility is not None:
        risco = _score_from_breakpoints(volatility, [
            (0, 10), (8, 9.5), (12, 9), (15, 8), (20, 7),
            (25, 6), (30, 5), (40, 4), (60, 3),
        ])

    weights = {
        "rendimento": 0.35,
        "valuation":  0.30,
        "qualidade":  0.15,
        "momentum":   0.10,
        "risco":      0.10,
    }

    total = (
        rendimento * weights["rendimento"] +
        valuation  * weights["valuation"]  +
        qualidade  * weights["qualidade"]  +
        momentum   * weights["momentum"]   +
        risco      * weights["risco"]
    )

    return {
        "total":      _clamp(total),
        "rendimento": _clamp(rendimento),
        "valuation":  _clamp(valuation),
        "qualidade":  _clamp(qualidade),
        "momentum":   _clamp(momentum),
        "risco":      _clamp(risco),
    }


# ── Score de Criptomoedas ──────────────────────────────────────────────────────

def score_crypto(data: dict) -> dict:
    """
    Scoring específico para criptomoedas.
    Subcategorias: Market Cap (segurança), Liquidez, Momentum, Volatilidade.
    """
    mc_rank    = _safe(data.get("market_cap_rank"), None)
    vol_mc     = _safe(data.get("volume_mc_ratio"), None)
    change_24h = _safe(data.get("change_24h"), None)
    change_7d  = _safe(data.get("change_7d"), None)
    change_30d = _safe(data.get("change_30d"), None)
    ath_change = _safe(data.get("ath_change_pct"), None)  # % da ATH (negativo = abaixo da ATH)

    # ── Market Cap Rank (menor rank = maior MC = mais estabelecido) ───────
    rank_score = 5.0
    if mc_rank is not None:
        rank_score = _score_from_breakpoints(mc_rank, [
            (1, 10), (2, 9.8), (3, 9.5), (5, 9), (10, 8.5),
            (20, 7.5), (50, 6.5), (100, 5.5), (200, 4.5), (500, 3.5),
            (1000, 2.5),
        ])
        # Inverte porque menor rank = maior market cap
        rank_score = 10 - (_score_from_breakpoints(mc_rank, [
            (1000, 0), (500, 1), (200, 2), (100, 3), (50, 4),
            (20, 5), (10, 6.5), (5, 8), (3, 9), (1, 10),
        ]))
        rank_score = _clamp(rank_score)

    # Corrige: rank 1 (bitcoin) deve ter 10, rank 1000 deve ter 1
    if mc_rank is not None:
        if mc_rank <= 1:
            rank_score = 10.0
        elif mc_rank <= 3:
            rank_score = 9.5
        elif mc_rank <= 5:
            rank_score = 9.0
        elif mc_rank <= 10:
            rank_score = 8.0
        elif mc_rank <= 20:
            rank_score = 7.0
        elif mc_rank <= 50:
            rank_score = 6.0
        elif mc_rank <= 100:
            rank_score = 5.0
        elif mc_rank <= 200:
            rank_score = 4.0
        else:
            rank_score = 3.0

    # ── Liquidez (volume/market cap) ───────────────────────────────────────
    liq_score = 5.0
    if vol_mc is not None:
        liq_score = _score_from_breakpoints(vol_mc, [
            (0.2, 10), (0.1, 9), (0.05, 8), (0.02, 7),
            (0.01, 6), (0.005, 5), (0.001, 4), (0, 3),
        ])

    # ── Momentum (preços) ─────────────────────────────────────────────────
    mom_scores = []
    if change_24h is not None:
        mom_scores.append(_score_from_breakpoints(change_24h, [
            (10, 10), (5, 9), (3, 8), (1, 7), (0, 6),
            (-1, 5), (-3, 4), (-5, 3), (-10, 2), (-20, 1),
        ]))
    if change_7d is not None:
        mom_scores.append(_score_from_breakpoints(change_7d, [
            (30, 10), (15, 9), (8, 8), (3, 7), (0, 6),
            (-3, 5), (-10, 4), (-20, 3), (-30, 2), (-50, 1),
        ]))
    if change_30d is not None:
        mom_scores.append(_score_from_breakpoints(change_30d, [
            (50, 10), (25, 9), (15, 8), (5, 7), (0, 6),
            (-5, 5), (-15, 4), (-30, 3), (-50, 2), (-75, 1),
        ]))

    momentum = float(sum(mom_scores) / len(mom_scores)) if mom_scores else 5.0

    # ── Risco (distância da ATH — proxy de risco de mercado) ──────────────
    risco = 5.0
    if ath_change is not None:
        # ath_change é negativo (% abaixo da ATH). Ex: -80 = 80% abaixo da ATH
        dist = abs(ath_change)
        risco = _score_from_breakpoints(dist, [
            (0, 10), (10, 9), (20, 8), (30, 7), (40, 6),
            (50, 5), (60, 4.5), (70, 4), (80, 3.5), (90, 3),
        ])

    weights = {
        "market_cap": 0.30,
        "liquidez":   0.20,
        "momentum":   0.35,
        "risco":      0.15,
    }

    total = (
        rank_score * weights["market_cap"] +
        liq_score  * weights["liquidez"]   +
        momentum   * weights["momentum"]   +
        risco      * weights["risco"]
    )

    return {
        "total":      _clamp(total),
        "market_cap": _clamp(rank_score),
        "liquidez":   _clamp(liq_score),
        "momentum":   _clamp(momentum),
        "risco":      _clamp(risco),
    }


# ── Dispatcher ───────────────────────────────────────────────────────────────

def score(data: dict) -> dict:
    """Calcula score baseado no tipo do ativo."""
    t = data.get("type", "stock")
    if t == "fii":
        return score_fii(data)
    elif t == "crypto":
        return score_crypto(data)
    else:
        return score_stock(data)
