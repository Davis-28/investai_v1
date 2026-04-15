"""
sources/stocks.py — yfinance para ações e ETFs
Campo `id` = ticker (identificador canônico para stocks/FIIs).
"""
import yfinance as yf
from cache import cache, sanitize

def _yf_sym(ticker: str) -> str:
    t = ticker.strip().upper()
    if "." not in t and t[-1].isdigit():
        return t + ".SA"
    return t

def fetch_stock(ticker_raw: str) -> dict:
    key = f"stock:{ticker_raw.upper()}"
    cached = cache.get(key)
    if cached: return cached

    yf_sym = _yf_sym(ticker_raw)
    try:
        info = yf.Ticker(yf_sym).info
    except Exception as e:
        raise RuntimeError(f"yfinance falhou para {ticker_raw}: {e}")

    preco = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
    if not preco:
        raise RuntimeError(f"Sem dados de preço para '{ticker_raw}'. Verifique o ticker.")

    roe_raw  = info.get("returnOnEquity")
    rev_raw  = info.get("revenueGrowth")
    earn_raw = info.get("earningsGrowth")
    debt_raw = info.get("debtToEquity")
    margin   = info.get("profitMargins")
    gross    = info.get("grossMargins")

    momentum_52w = None
    volatility   = None
    try:
        hist = yf.Ticker(yf_sym).history(period="1y", interval="1d")
        if not hist.empty and len(hist) >= 5:
            s = float(hist["Close"].iloc[0])
            e = float(hist["Close"].iloc[-1])
            if s > 0:
                momentum_52w = round((e / s - 1) * 100, 2)
            dr = hist["Close"].pct_change().dropna()
            if len(dr) >= 20:
                volatility = round(float(dr.std()) * (252 ** 0.5) * 100, 2)
    except Exception:
        pass

    result = {
        "id":            ticker_raw.upper(),   # canonical id
        "ticker":        ticker_raw.upper(),
        "type":          "stock",
        "nome":          info.get("longName") or info.get("shortName") or ticker_raw.upper(),
        "setor":         info.get("sector", "N/A"),
        "industria":     info.get("industry", "N/A"),
        "moeda":         info.get("currency", "BRL" if yf_sym.endswith(".SA") else "USD"),
        "pais":          info.get("country", "N/A"),
        "preco":         sanitize(preco, 2),
        "market_cap":    sanitize(info.get("marketCap")),
        "volume":        sanitize(info.get("regularMarketVolume")),
        "website":       info.get("website") or None,
        "descricao":     (info.get("longBusinessSummary") or "")[:500] or None,
        # Valuation
        "pl":            sanitize(info.get("trailingPE") or info.get("forwardPE"), 2),
        "pb":            sanitize(info.get("priceToBook"), 2),
        "ev_ebitda":     sanitize(info.get("enterpriseToEbitda"), 2),
        "ps":            sanitize(info.get("priceToSalesTrailing12Months"), 2),
        # Qualidade
        "roe":           sanitize(roe_raw * 100, 2) if roe_raw is not None else None,
        "roa":           sanitize(info.get("returnOnAssets", 0) * 100, 2) if info.get("returnOnAssets") is not None else None,
        "margem_bruta":  sanitize((gross or 0) * 100, 2) if gross is not None else None,
        "margem_liquida":sanitize((margin or 0) * 100, 2) if margin is not None else None,
        "debt_equity":   sanitize(debt_raw / 100, 2) if debt_raw is not None else None,
        "current_ratio": sanitize(info.get("currentRatio"), 2),
        # Crescimento
        "rev_growth":    sanitize(rev_raw * 100, 2) if rev_raw is not None else None,
        "earn_growth":   sanitize(earn_raw * 100, 2) if earn_raw is not None else None,
        # Dividendos
        "div_yield":     sanitize((info.get("dividendYield") or 0) * 100, 2),
        "payout_ratio":  sanitize((info.get("payoutRatio") or 0) * 100, 2),
        # Momentum
        "beta":          sanitize(info.get("beta"), 3),
        "momentum_52w":  momentum_52w,
        "volatility":    volatility,
        "high_52w":      sanitize(info.get("fiftyTwoWeekHigh"), 2),
        "low_52w":       sanitize(info.get("fiftyTwoWeekLow"), 2),
    }
    cache.set(key, result)
    return result

def search_stocks(query: str, universe: list[str], names: dict[str, str]) -> list[dict]:
    q = query.strip().upper()
    return [
        {"id": t, "ticker": t, "nome": names.get(t, t), "type": "stock"}
        for t in universe
        if q in t or q in names.get(t, "").upper()
    ][:10]
