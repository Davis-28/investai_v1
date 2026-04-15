"""
cache.py — Cache em memória com TTL
Thread-safe, sem dependências externas.
"""

import time
import threading
import math
from typing import Any, Optional


class TTLCache:
    """Cache simples com expiração por tempo."""

    def __init__(self, ttl: int = 600):
        self._store: dict[str, tuple[Any, float]] = {}
        self._ttl   = ttl
        self._lock  = threading.RLock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, ts = entry
            if time.monotonic() - ts > self._ttl:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._store[key] = (value, time.monotonic())

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def size(self) -> int:
        with self._lock:
            return len(self._store)


# ── Instância global ──────────────────────────────────────────────────────────
cache = TTLCache(ttl=600)   # 10 minutos


# ── Sanitização de valores numéricos ─────────────────────────────────────────

def sanitize(v: Any, decimals: int = 4) -> Optional[float]:
    """
    Converte qualquer valor para float seguro.
    Retorna None para NaN, Inf, None ou tipos inválidos.
    Garante que JSON nunca receba NaN.
    """
    if v is None:
        return None
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, decimals)
    except (TypeError, ValueError):
        return None


def sanitize_dict(d: dict) -> dict:
    """Aplica sanitize recursivamente em todos os valores de um dict."""
    result = {}
    for k, v in d.items():
        if isinstance(v, dict):
            result[k] = sanitize_dict(v)
        elif isinstance(v, (int, float)):
            result[k] = sanitize(v)
        else:
            result[k] = v
    return result
