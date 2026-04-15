"""
sources/crypto.py — CoinGecko API
Identificador canônico: coin_id (ex: "bitcoin", "ethereum")
Nunca usar ticker como ID para chamar a API.
"""
import re
import httpx
from cache import cache, sanitize

BASE = "https://api.coingecko.com/api/v3"
TIMEOUT = 20

def _get(path: str, params: dict = None):
    try:
        r = httpx.get(f"{BASE}{path}", params=params or {}, timeout=TIMEOUT,
                      headers={"Accept": "application/json"})
    except httpx.TimeoutException:
        raise RuntimeError("CoinGecko: timeout. Tente novamente.")
    except httpx.ConnectError:
        raise RuntimeError("CoinGecko: sem conexão. Verifique sua internet.")
    if r.status_code == 429:
        raise RuntimeError("CoinGecko: rate limit. Aguarde 1 minuto.")
    if r.status_code != 200:
        raise RuntimeError(f"CoinGecko: status {r.status_code}.")
    return r.json()

def fetch_crypto_market(coin_ids: list[str]) -> list[dict]:
    """Busca múltiplas cryptos via /coins/markets (eficiente)."""
    if not coin_ids:
        return []
    key = f"crypto_market:{','.join(sorted(coin_ids))}"
    cached = cache.get(key)
    if cached: return cached

    data = _get("/coins/markets", {
        "vs_currency": "usd",
        "ids": ",".join(coin_ids),
        "order": "market_cap_desc",
        "per_page": 50,
        "price_change_percentage": "1h,24h,7d,30d",
    })
    results = [_parse_market(c) for c in data]
    cache.set(key, results)
    return results

def fetch_crypto(coin_id: str) -> dict:
    """Busca dados detalhados por coin_id."""
    key = f"crypto:{coin_id}"
    cached = cache.get(key)
    if cached: return cached

    try:
        data = _get(f"/coins/{coin_id}", {
            "localization": "false", "tickers": "false",
            "market_data": "true", "community_data": "false",
            "developer_data": "false",
        })
    except RuntimeError:
        raise
    if "error" in data:
        raise RuntimeError(f"Crypto coin_id '{coin_id}' não encontrado no CoinGecko.")
    result = _parse_detail(data)
    cache.set(key, result)
    return result

def search_crypto(query: str) -> list[dict]:
    key = f"crypto_search:{query.lower()}"
    cached = cache.get(key)
    if cached: return cached
    data = _get("/search", {"query": query})
    results = [{
        "id":      c["id"],          # coin_id — identificador canônico
        "ticker":  c["symbol"].upper(),
        "nome":    c["name"],
        "type":    "crypto",
        "thumb":   c.get("thumb"),
    } for c in data.get("coins", [])[:8]]
    cache.set(key, results)
    return results

def _parse_market(c: dict) -> dict:
    mc  = c.get("market_cap") or 0
    vol = c.get("total_volume") or 0
    return {
        "id":            c["id"],               # coin_id canônico
        "ticker":        c["symbol"].upper(),
        "type":          "crypto",
        "nome":          c["name"],
        "setor":         "Criptomoeda",
        "moeda":         "USD",
        "preco":         sanitize(c.get("current_price"), 6),
        "market_cap":    sanitize(mc),
        "market_cap_rank": c.get("market_cap_rank"),
        "volume_24h":    sanitize(vol),
        "volume_mc_ratio": sanitize(vol / mc, 4) if mc > 0 else None,
        "change_1h":     sanitize(c.get("price_change_percentage_1h_in_currency"), 2),
        "change_24h":    sanitize(c.get("price_change_percentage_24h_in_currency"), 2),
        "change_7d":     sanitize(c.get("price_change_percentage_7d_in_currency"), 2),
        "change_30d":    sanitize(c.get("price_change_percentage_30d_in_currency"), 2),
        "high_24h":      sanitize(c.get("high_24h"), 6),
        "low_24h":       sanitize(c.get("low_24h"), 6),
        "ath":           sanitize(c.get("ath"), 6),
        "ath_change_pct":sanitize(c.get("ath_change_percentage"), 2),
        "circulating_supply": sanitize(c.get("circulating_supply")),
        "total_supply":  sanitize(c.get("total_supply")),
        "thumb":         c.get("image"),
        "descricao":     None,
        "website":       None,
    }

def _parse_detail(c: dict) -> dict:
    md  = c.get("market_data", {})
    usd = lambda k: sanitize(md.get(k, {}).get("usd"))
    pct = lambda k: sanitize(md.get(k, {}).get("usd"), 2)
    mc  = usd("market_cap") or 0
    vol = usd("total_volume") or 0
    desc_raw = c.get("description", {}).get("en") or ""
    desc = re.sub(r"<[^>]+>", "", desc_raw)[:600]
    links = c.get("links") or {}
    website = (links.get("homepage") or [None])[0] or None
    return {
        "id":            c["id"],
        "ticker":        c["symbol"].upper(),
        "type":          "crypto",
        "nome":          c["name"],
        "setor":         "Criptomoeda",
        "moeda":         "USD",
        "preco":         usd("current_price"),
        "market_cap":    mc,
        "market_cap_rank": md.get("market_cap_rank"),
        "volume_24h":    vol,
        "volume_mc_ratio": sanitize(vol / mc, 4) if mc > 0 else None,
        "change_1h":     pct("price_change_percentage_1h_in_currency"),
        "change_24h":    pct("price_change_percentage_24h_in_currency"),
        "change_7d":     pct("price_change_percentage_7d_in_currency"),
        "change_30d":    pct("price_change_percentage_30d_in_currency"),
        "change_1y":     pct("price_change_percentage_1y_in_currency"),
        "high_24h":      usd("high_24h"),
        "low_24h":       usd("low_24h"),
        "ath":           usd("ath"),
        "ath_change_pct":pct("ath_change_percentage"),
        "circulating_supply": sanitize(md.get("circulating_supply")),
        "total_supply":  sanitize(md.get("total_supply")),
        "thumb":         (c.get("image") or {}).get("large"),
        "descricao":     desc or None,
        "website":       website,
    }
