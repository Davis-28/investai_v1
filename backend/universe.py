"""
universe.py — Universo de ativos por categoria
Crypto usa coin_id do CoinGecko como identificador canônico.
"""

BRAZIL_STOCKS = [
    "PETR4","VALE3","WEGE3","ITUB4","BBDC4","ABEV3","B3SA3","RENT3","SUZB3","LREN3",
    "JBSS3","HAPV3","RADL3","EGIE3","TAEE11","ENGI11","SBSP3","ELET3","CPLE6","TOTS3",
    "PRIO3","CMIN3","VBBR3","EMBR3","EQTL3","BRFS3","UGPA3","YDUQ3","LWSA3","MULT3",
    "CYRE3","MRVE3","EVEN3","CCRO3","ECOR3","RAIZ4","BBAS3","SANB11","ITSA4","BRSR6",
]

GLOBAL_STOCKS = [
    "AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","BRK-B","JPM","JNJ",
    "XOM","V","WMT","PG","HD","BAC","KO","DIS","NFLX","AMD",
    "INTC","CRM","PYPL","ADBE","ORCL","CSCO","QCOM","TXN","AVGO","MU",
    "SBUX","NKE","MCD","UNH","CVX","GE","BA","CAT","MMM","GS",
]

FIIS = [
    "MXRF11","HGLG11","XPML11","KNRI11","BTLG11","VISC11","BCFF11","CPTS11",
    "RBRF11","XPLG11","KNCR11","IRDM11","HFOF11","VILG11","BRCO11","PVBI11",
    "TRXF11","RBRP11","HSML11","VGIP11","MALL11","VRTA11","RZTR11","RECR11",
    "HCTR11","GTWR11","RCRB11","BPFF11","BCIA11","MGFF11",
]

# Crypto usa coin_id do CoinGecko (não ticker)
CRYPTO_IDS = [
    "bitcoin","ethereum","binancecoin","solana","ripple","cardano","polkadot",
    "avalanche-2","chainlink","dogecoin","matic-network","uniswap","litecoin",
    "stellar","cosmos","near","algorand","filecoin","vechain","aave",
]

TICKER_NAMES: dict[str, str] = {
    # Brasil
    "PETR4":"Petrobras PN","VALE3":"Vale S.A.","WEGE3":"WEG S.A.",
    "ITUB4":"Itaú Unibanco PN","BBDC4":"Bradesco PN","ABEV3":"Ambev S.A.",
    "B3SA3":"B3 S.A.","RENT3":"Localiza Rent a Car","SUZB3":"Suzano S.A.",
    "LREN3":"Lojas Renner","JBSS3":"JBS S.A.","HAPV3":"Hapvida S.A.",
    "RADL3":"Raia Drogasil","EGIE3":"Engie Brasil","TAEE11":"Taesa",
    "ENGI11":"Energisa","SBSP3":"Sabesp","ELET3":"Eletrobras ON",
    "CPLE6":"Copel PNB","TOTS3":"TOTVS S.A.","PRIO3":"PRIO S.A.",
    "CMIN3":"CSN Mineração","VBBR3":"Vibra Energia","EMBR3":"Embraer",
    "EQTL3":"Equatorial Energia","BRFS3":"BRF S.A.","UGPA3":"Ultrapar",
    "YDUQ3":"Yduqs Participações","LWSA3":"Locaweb","MULT3":"Multiplan",
    "CYRE3":"Cyrela","MRVE3":"MRV Engenharia","CCRO3":"CCR S.A.",
    "RAIZ4":"Raízen","BBAS3":"Banco do Brasil","SANB11":"Santander BR",
    "ITSA4":"Itaúsa","BRSR6":"Banrisul",
    # FIIs
    "MXRF11":"Maxi Renda FII","HGLG11":"CSHG Logística FII","XPML11":"XP Malls FII",
    "KNRI11":"Kinea Renda Imob. FII","BTLG11":"BTG Pactual Logística FII",
    "VISC11":"Vinci Shopping Centers FII","BCFF11":"BC Fundo de Fundos FII",
    "CPTS11":"Capitânia Securities II FII","RBRF11":"RBR Alpha FoF FII",
    "XPLG11":"XP Log FII","KNCR11":"Kinea Recebíveis FII",
    "IRDM11":"Iridium Recebíveis FII","HFOF11":"Hedge Top FOFII 3",
    "VILG11":"Vinci Logística FII","BRCO11":"Bresco Logística FII",
    "PVBI11":"VBI Prime Properties FII","TRXF11":"TRX Real Estate FII",
    "RBRP11":"RBR Properties FII","HSML11":"HSI Malls FII","VGIP11":"Valora CRI FII",
    "MALL11":"Malls Brasil Plural FII","VRTA11":"Fator Verita FII",
    "RZTR11":"Riza Terrax FII","RECR11":"REC Recebíveis Imob. FII",
    # Global
    "AAPL":"Apple Inc.","MSFT":"Microsoft Corp.","GOOGL":"Alphabet Inc.",
    "AMZN":"Amazon.com Inc.","NVDA":"NVIDIA Corp.","META":"Meta Platforms Inc.",
    "TSLA":"Tesla Inc.","BRK-B":"Berkshire Hathaway B","JPM":"JPMorgan Chase & Co.",
    "JNJ":"Johnson & Johnson","XOM":"Exxon Mobil Corp.","V":"Visa Inc.",
    "WMT":"Walmart Inc.","PG":"Procter & Gamble","HD":"Home Depot Inc.",
    "BAC":"Bank of America Corp.","KO":"Coca-Cola Co.","DIS":"Walt Disney Co.",
    "NFLX":"Netflix Inc.","AMD":"Advanced Micro Devices","INTC":"Intel Corp.",
    "CRM":"Salesforce Inc.","PYPL":"PayPal Holdings Inc.","ADBE":"Adobe Inc.",
    "ORCL":"Oracle Corp.","CSCO":"Cisco Systems","QCOM":"Qualcomm Inc.",
    "TXN":"Texas Instruments","AVGO":"Broadcom Inc.","MU":"Micron Technology",
    "SBUX":"Starbucks Corp.","NKE":"Nike Inc.","MCD":"McDonald's Corp.",
    "UNH":"UnitedHealth Group","CVX":"Chevron Corp.","GS":"Goldman Sachs",
}

# coin_id → símbolo para exibição
CRYPTO_SYMBOLS: dict[str, str] = {
    "bitcoin":"BTC","ethereum":"ETH","binancecoin":"BNB","solana":"SOL",
    "ripple":"XRP","cardano":"ADA","polkadot":"DOT","avalanche-2":"AVAX",
    "chainlink":"LINK","dogecoin":"DOGE","matic-network":"MATIC",
    "uniswap":"UNI","litecoin":"LTC","stellar":"XLM","cosmos":"ATOM",
    "near":"NEAR","algorand":"ALGO","filecoin":"FIL","vechain":"VET","aave":"AAVE",
}

# ticker/nome → coin_id para busca
CRYPTO_SEARCH_MAP: dict[str, str] = {
    "btc":"bitcoin","bitcoin":"bitcoin",
    "eth":"ethereum","ethereum":"ethereum","ether":"ethereum",
    "bnb":"binancecoin","binance":"binancecoin","binancecoin":"binancecoin",
    "sol":"solana","solana":"solana",
    "xrp":"ripple","ripple":"ripple",
    "ada":"cardano","cardano":"cardano",
    "dot":"polkadot","polkadot":"polkadot",
    "avax":"avalanche-2","avalanche":"avalanche-2",
    "link":"chainlink","chainlink":"chainlink",
    "doge":"dogecoin","dogecoin":"dogecoin",
    "matic":"matic-network","polygon":"matic-network",
    "uni":"uniswap","uniswap":"uniswap",
    "ltc":"litecoin","litecoin":"litecoin",
    "xlm":"stellar","stellar":"stellar",
    "atom":"cosmos","cosmos":"cosmos",
    "near":"near",
    "algo":"algorand","algorand":"algorand",
    "fil":"filecoin","filecoin":"filecoin",
    "vet":"vechain","vechain":"vechain",
    "aave":"aave",
}

ALL_STOCK_TICKERS = list(dict.fromkeys(BRAZIL_STOCKS + GLOBAL_STOCKS))
ALL_FII_TICKERS   = FIIS

def is_fii(ticker: str) -> bool:
    t = ticker.upper()
    return t in FIIS or (len(t) == 6 and t.endswith("11"))

def asset_type(ticker: str) -> str:
    """Detecta tipo pelo ticker."""
    return "fii" if is_fii(ticker) else "stock"
