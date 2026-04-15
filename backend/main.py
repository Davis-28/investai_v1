"""
main.py — InvestAI API v2
Rotas:
  GET  /search?q=         busca global
  GET  /category/{name}   lista rankeada por categoria
  GET  /asset/stock/{ticker}
  GET  /asset/fii/{ticker}
  GET  /asset/crypto/{coin_id}   ← usa coin_id, não ticker
  POST /compare           [{id, type}, ...]
"""
import asyncio, logging, sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from cache import cache
from universe import (
    BRAZIL_STOCKS, GLOBAL_STOCKS, FIIS, CRYPTO_IDS,
    TICKER_NAMES, CRYPTO_SEARCH_MAP, CRYPTO_SYMBOLS,
    ALL_STOCK_TICKERS, is_fii,
)
from sources.stocks import fetch_stock, search_stocks
from sources.fiis   import fetch_fii
from sources.crypto import fetch_crypto, fetch_crypto_market, search_crypto
from scoring.engine import score
from explainer      import explain, get_badge

logging.basicConfig(level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s", stream=sys.stdout)
log = logging.getLogger("investai")

CATEGORIES = {
    "brazil":    {"tickers": BRAZIL_STOCKS,                       "type": "stock"},
    "global":    {"tickers": GLOBAL_STOCKS,                       "type": "stock"},
    "fiis":      {"tickers": FIIS,                                "type": "fii"},
    "crypto":    {"ids":     CRYPTO_IDS,                          "type": "crypto"},
    "dividends": {"tickers": BRAZIL_STOCKS + GLOBAL_STOCKS[:10],  "type": "stock", "sort_by": "div_yield"},
    "growth":    {"tickers": BRAZIL_STOCKS + GLOBAL_STOCKS[:10],  "type": "stock", "sort_by": "rev_growth"},
}

async def _fetch_one(asset_id: str, asset_type: str) -> dict | None:
    loop = asyncio.get_event_loop()
    try:
        if asset_type == "stock":
            data = await loop.run_in_executor(None, fetch_stock, asset_id)
        elif asset_type == "fii":
            data = await loop.run_in_executor(None, fetch_fii, asset_id)
        elif asset_type == "crypto":
            data = await loop.run_in_executor(None, fetch_crypto, asset_id)
        else:
            return None
        sc   = score(data)
        anal = explain(data, sc)
        bdg  = get_badge(sc, data)
        return {**data, "scores": sc, "analysis": anal, "badge": bdg}
    except RuntimeError as e:
        log.warning(f"Falha {asset_id} ({asset_type}): {e}")
        return None
    except Exception as e:
        log.error(f"Erro inesperado {asset_id}: {e}")
        return None

async def _fetch_many_stocks(tickers: list[str], asset_type: str, limit: int) -> list[dict]:
    tasks = [_fetch_one(t, asset_type) for t in tickers[:limit]]
    results = [r for r in await asyncio.gather(*tasks) if r]
    results.sort(key=lambda x: x["scores"]["total"], reverse=True)
    return results

async def _fetch_crypto_batch(coin_ids: list[str], limit: int) -> list[dict]:
    loop = asyncio.get_event_loop()
    try:
        market = await loop.run_in_executor(None, fetch_crypto_market, coin_ids[:limit])
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    results = []
    for data in market:
        sc   = score(data)
        anal = explain(data, sc)
        bdg  = get_badge(sc, data)
        results.append({**data, "scores": sc, "analysis": anal, "badge": bdg})
    results.sort(key=lambda x: x["scores"]["total"], reverse=True)
    return results

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("InvestAI API v2 iniciando...")
    yield
    log.info("Encerrando.")
    cache.clear()

app = FastAPI(title="InvestAI API", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class CompareRequest(BaseModel):
    assets: list[dict]   # [{id: str, type: str}]

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0", "cache_size": cache.size()}

@app.get("/search")
async def search(q: str = Query(..., min_length=1, max_length=60)):
    """Busca global: ações/FIIs por ticker/nome, crypto via CoinGecko."""
    q = q.strip()
    results: list[dict] = []

    # Ações e FIIs — busca local
    hits = search_stocks(q, ALL_STOCK_TICKERS + FIIS, TICKER_NAMES)
    for h in hits:
        h["type"] = "fii" if is_fii(h["ticker"]) else "stock"
        h["id"]   = h["ticker"]
        results.append(h)

    # Crypto — local primeiro, depois CoinGecko
    q_low = q.lower()
    local_id = CRYPTO_SEARCH_MAP.get(q_low)
    if local_id and not any(r.get("id") == local_id for r in results):
        sym = CRYPTO_SYMBOLS.get(local_id, q.upper())
        results.append({"id": local_id, "ticker": sym, "nome": local_id.title(), "type": "crypto"})
    else:
        try:
            loop = asyncio.get_event_loop()
            cr = await loop.run_in_executor(None, search_crypto, q)
            for c in cr[:3]:
                if not any(r.get("id") == c["id"] for r in results):
                    results.append(c)
        except Exception as e:
            log.warning(f"Busca crypto falhou: {e}")

    return results[:12]

@app.get("/category/{name}")
async def category(name: str, limit: int = Query(25, ge=1, le=40)):
    if name == "opportunities":
        return await _opportunities()
    if name not in CATEGORIES:
        raise HTTPException(404, f"Categoria '{name}' inválida.")

    cat = CATEGORIES[name]
    atype = cat["type"]
    sort_by = cat.get("sort_by")

    if atype == "crypto":
        data = await _fetch_crypto_batch(cat["ids"], limit)
    else:
        data = await _fetch_many_stocks(cat["tickers"], atype, limit)

    if sort_by == "div_yield":
        data = [d for d in data if (d.get("div_yield") or 0) > 2]
        data.sort(key=lambda x: x.get("div_yield") or 0, reverse=True)
    elif sort_by == "rev_growth":
        data = [d for d in data if (d.get("rev_growth") or 0) > 5]
        data.sort(key=lambda x: x.get("rev_growth") or 0, reverse=True)

    return data[:limit]

async def _opportunities() -> list[dict]:
    groups = await asyncio.gather(
        _fetch_many_stocks(BRAZIL_STOCKS[:15], "stock", 15),
        _fetch_many_stocks(GLOBAL_STOCKS[:15], "stock", 15),
        _fetch_many_stocks(FIIS[:10],          "fii",   10),
        _fetch_crypto_batch(CRYPTO_IDS[:10],            10),
        return_exceptions=True,
    )
    merged = []
    for g in groups:
        if isinstance(g, list):
            merged.extend(g[:4])
    merged.sort(key=lambda x: x["scores"]["total"], reverse=True)
    return merged[:12]

@app.get("/asset/{asset_type}/{asset_id}")
async def get_asset(asset_type: str, asset_id: str):
    if asset_type not in ("stock", "fii", "crypto"):
        raise HTTPException(400, "Tipo inválido: stock | fii | crypto")
    result = await _fetch_one(asset_id, asset_type)
    if result is None:
        raise HTTPException(404,
            f"Não foi possível obter dados para '{asset_id}' (tipo: {asset_type}). "
            f"Para crypto, use o coin_id (ex: 'bitcoin', 'ethereum').")
    return result

@app.post("/compare")
async def compare(req: CompareRequest):
    if not req.assets:
        raise HTTPException(400, "Informe ao menos um ativo.")
    if len(req.assets) > 4:
        raise HTTPException(400, "Máximo 4 ativos.")
    tasks = [_fetch_one(a["id"], a.get("type", "stock")) for a in req.assets]
    results = [r for r in await asyncio.gather(*tasks) if r]
    if not results:
        raise HTTPException(422, "Nenhum dado válido encontrado.")
    return results

@app.delete("/cache")
def clear_cache():
    cache.clear()
    return {"message": "Cache limpo."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
