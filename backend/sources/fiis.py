"""
sources/fiis.py — FIIs via yfinance
Campo `id` = ticker (ex: MXRF11). Identificador canônico.
"""
import yfinance as yf
from cache import cache, sanitize

_SECTOR_MAP = {
    "REIT - Retail": "Shoppings", "REIT - Industrial": "Logística",
    "REIT - Office": "Lajes Corp.", "REIT - Mortgage": "Recebíveis (CRI)",
    "REIT - Diversified": "Fundo de Fundos", "Real Estate": "Fundo Imobiliário",
}

def fetch_fii(ticker_raw: str) -> dict:
    key = f"fii:{ticker_raw.upper()}"
    cached = cache.get(key)
    if cached: return cached

    yf_sym = ticker_raw.upper()
    if not yf_sym.endswith(".SA"):
        yf_sym = yf_sym + ".SA"

    try:
        stock = yf.Ticker(yf_sym)
        info  = stock.info
    except Exception as e:
        raise RuntimeError(f"yfinance falhou para FII {ticker_raw}: {e}")

    preco = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
    if not preco:
        raise RuntimeError(f"Sem dados de preço para o FII '{ticker_raw}'.")

    div_raw = info.get("dividendYield")
    div_yield = sanitize(div_raw * 100, 2) if div_raw is not None else None

    dividendos_12m = None
    try:
        divs = stock.dividends
        if divs is not None and not divs.empty:
            dividendos_12m = sanitize(float(divs.last("365D").sum()), 4)
    except Exception:
        pass

    momentum_52w = None
    volatility   = None
    try:
        hist = stock.history(period="1y")
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

    sector_raw = info.get("quoteType", "") or info.get("sector", "Real Estate")
    tipo = _SECTOR_MAP.get(sector_raw, "Fundo Imobiliário")

    result = {
        "id":           ticker_raw.upper(),
        "ticker":       ticker_raw.upper(),
        "type":         "fii",
        "nome":         info.get("longName") or info.get("shortName") or ticker_raw.upper(),
        "tipo_fundo":   tipo,
        "setor":        sector_raw,
        "moeda":        "BRL",
        "pais":         "Brasil",
        "preco":        sanitize(preco, 2),
        "market_cap":   sanitize(info.get("marketCap")),
        "volume":       sanitize(info.get("regularMarketVolume")),
        "website":      info.get("website") or None,
        "descricao":    (info.get("longBusinessSummary") or "")[:500] or None,
        # FII-specific
        "div_yield":    div_yield,
        "dividendos_12m": dividendos_12m,
        "pvp":          sanitize(info.get("priceToBook"), 2),
        "vacancia":     None,
        "num_cotas":    sanitize(info.get("sharesOutstanding")),
        "patrimonio_liq": sanitize(info.get("totalAssets")),
        # Momentum
        "momentum_52w": momentum_52w,
        "volatility":   volatility,
        "high_52w":     sanitize(info.get("fiftyTwoWeekHigh"), 2),
        "low_52w":      sanitize(info.get("fiftyTwoWeekLow"), 2),
    }
    cache.set(key, result)
    return result
