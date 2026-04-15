# InvestAI — Plataforma Completa de Análise de Investimentos

Dados reais · Score quantitativo · Sem IA externa · Sem mock · Sem NaN

---

## Stack

| Camada   | Tecnologia                              |
|----------|-----------------------------------------|
| Backend  | Python · FastAPI · yfinance · httpx     |
| Frontend | Next.js 14 · React · TailwindCSS · TS  |
| Dados    | yfinance (ações/FIIs) · CoinGecko (crypto) |
| Cache    | In-memory TTL (10 min)                  |

---

## Estrutura

```
investai/
├── backend/
│   ├── main.py              FastAPI — todos os endpoints
│   ├── cache.py             Cache TTL + sanitização anti-NaN
│   ├── universe.py          Universo de tickers por categoria
│   ├── explainer.py         Motor de explicação por regras
│   ├── requirements.txt
│   ├── sources/
│   │   ├── stocks.py        yfinance — ações e ETFs
│   │   ├── fiis.py          yfinance — FIIs brasileiros
│   │   └── crypto.py        CoinGecko — criptomoedas
│   └── scoring/
│       └── engine.py        Score por tipo (ação/FII/crypto)
│
└── frontend/
    ├── app/
    │   ├── layout.tsx        Layout + providers
    │   ├── page.tsx          Home: oportunidades + categorias
    │   ├── globals.css
    │   ├── asset/[type]/[ticker]/page.tsx   Análise completa
    │   └── compare/page.tsx               Comparação lado a lado
    ├── components/
    │   ├── Header.tsx        Header com busca global
    │   ├── SearchBar.tsx     Busca com debounce + dropdown
    │   ├── AssetCard.tsx     Card de ativo (grid/scroll)
    │   ├── CategorySection.tsx  Seção de categoria com scroll horizontal
    │   ├── CompareBar.tsx    Barra flutuante de comparação
    │   └── ScoreDisplay.tsx  ScoreRing + ScoreBar + ScorePill
    ├── lib/
    │   ├── api.ts            Cliente HTTP + formatadores
    │   └── types.ts          Tipos TypeScript
    └── store/
        └── compare.tsx       Context de comparação (persistente)
```

---

## Rodando localmente

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
# API em http://localhost:8000
# Docs: http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # já aponta para localhost:8000
npm install
npm run dev
# App em http://localhost:3000
```

---

## API Endpoints

| Método | Rota                         | Descrição                              |
|--------|------------------------------|----------------------------------------|
| GET    | `/health`                    | Status da API                          |
| GET    | `/search?q=PETR4`            | Busca global (ação/FII/crypto)         |
| GET    | `/category/{name}?limit=20`  | Ativos de uma categoria rankeados      |
| GET    | `/asset/{type}/{ticker}`     | Análise completa de um ativo           |
| POST   | `/compare`                   | Comparação de 2–4 ativos              |
| DELETE | `/cache`                     | Limpa o cache                          |

**Categorias disponíveis:** `opportunities`, `brazil`, `global`, `fiis`, `crypto`, `dividends`, `growth`

**Tipos de ativo:** `stock`, `fii`, `crypto`

### Exemplos

```bash
# Busca
curl "http://localhost:8000/search?q=petro"

# Categoria
curl "http://localhost:8000/category/brazil?limit=10"

# Ativo individual
curl "http://localhost:8000/asset/stock/PETR4"
curl "http://localhost:8000/asset/fii/MXRF11"
curl "http://localhost:8000/asset/crypto/bitcoin"

# Comparação
curl -X POST http://localhost:8000/compare \
  -H "Content-Type: application/json" \
  -d '{"assets": [{"ticker":"PETR4","type":"stock"},{"ticker":"VALE3","type":"stock"}]}'
```

---

## Funcionalidades

### Busca Global
- Aceita tickers, nomes de empresas, criptos
- Debounce 350ms — não spamma a API
- Resultado com dropdown interativo

### Score por Tipo de Ativo

Ações: Valuation (25%) · Qualidade (25%) · Crescimento (20%) · Risco (20%) · Momentum (10%)

FIIs: Rendimento (35%) · P/VP (30%) · Qualidade (15%) · Momentum (10%) · Risco (10%)

Crypto: Market Cap (30%) · Liquidez (20%) · Momentum (35%) · Risco (15%)

### Análise Automática
- Gerada por motor de regras em Python
- Sem IA externa (OpenAI/Claude)
- Pontos fortes, riscos e destaques por tipo de ativo

### Comparação
- Selecione até 4 ativos com o botão "+"
- Barra flutuante persiste entre páginas
- Tabela lado a lado com destaque do melhor valor

### Cache TTL
- 10 minutos por ativo
- Thread-safe
- Zero NaN garantido via sanitização

---

## Garantias técnicas

- ❌ Sem dados mock ou demo
- ❌ Sem fallback silencioso — erros explícitos
- ❌ Sem APIs de IA externas
- ✅ NaN/Inf convertidos para `null` antes do JSON
- ✅ Erros sempre retornam mensagem legível ao usuário
- ✅ Cache evita chamadas repetidas (10 min TTL)

---

## Dados não disponíveis

Alguns campos não são fornecidos pelo yfinance:
- **Vacância de FIIs** — exigiria scraping do site da B3/gestora
- **Histórico de dividendos detalhado de FIIs** — parcial via yfinance

Esses campos aparecem como `null` na resposta e são omitidos da análise (não penalizam o score).

---

> Dados via yfinance e CoinGecko. Não constitui recomendação de investimento.
