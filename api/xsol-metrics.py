"""
Vercel Serverless Function for xSOL Metrics
Fetches real-time data from Hylo API with blockchain fallback

Primary: Hylo API (accurate CollateralRatio)
Fallback: Solana blockchain + Jupiter API (if Hylo is rate-limited)
"""

from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
from datetime import datetime
import time
import random

HYLO_API = "https://api.hylo.so/stats"
JUPITER_PRICE_API = "https://lite-api.jup.ag/price/v3"
SOL_MINT = "So11111111111111111111111111111111111111112"
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
XSOL_MINT = "4sWNB8zGWHkh6UnmwiEtzNxL4XrN7uK9tosbESbJFfVs"

# Solana RPC endpoints for blockchain fallback
SOLANA_RPC_ENDPOINTS = [
    "https://api.mainnet-beta.solana.com",
    "https://rpc.ankr.com/solana",
]

def fetch_with_retry(url, headers=None, max_retries=3):
    """Fetch URL with exponential backoff retry"""
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers=headers or {})
            with urllib.request.urlopen(req, timeout=15) as response:
                return json.loads(response.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:  # Rate limited
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(wait_time)
                    continue
            raise
        except Exception:
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            raise
    return None

def fetch_sol_price():
    """Fetch SOL price from Jupiter API"""
    price_url = f"{JUPITER_PRICE_API}?ids={SOL_MINT}&vsToken={USDC_MINT}"
    data = fetch_with_retry(price_url)
    return data.get(SOL_MINT, {}).get('usdPrice', 0)

def fetch_xsol_price():
    """Fetch xSOL price from Jupiter API"""
    price_url = f"{JUPITER_PRICE_API}?ids={XSOL_MINT}&vsToken={USDC_MINT}"
    data = fetch_with_retry(price_url)
    return data.get(XSOL_MINT, {}).get('usdPrice', 0)

def fetch_token_supply(mint_address):
    """Fetch token supply from Solana blockchain"""
    for rpc in SOLANA_RPC_ENDPOINTS:
        try:
            payload = json.dumps({
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getTokenSupply",
                "params": [mint_address]
            }).encode()
            
            req = urllib.request.Request(
                rpc,
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
                return float(data['result']['value']['uiAmount'])
        except Exception:
            continue
    return None

def fetch_hylo_api():
    """Try to fetch from Hylo API (primary source)"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
    }
    return fetch_with_retry(HYLO_API, headers)

def fetch_blockchain_fallback():
    """Fallback: fetch data from Solana blockchain + Jupiter"""
    # Get xSOL supply from blockchain
    xSOL_supply = fetch_token_supply(XSOL_MINT)
    if not xSOL_supply:
        raise Exception("Failed to fetch xSOL supply from blockchain")
    
    # Get prices from Jupiter
    SOL_price = fetch_sol_price()
    xSOL_price = fetch_xsol_price()
    
    if not SOL_price or not xSOL_price:
        raise Exception("Failed to fetch prices from Jupiter")
    
    # Note: CollateralRatio and HYusd are not available from blockchain
    # Use approximate values
    HYusd_supply = 18000000  # Approximate, update periodically
    CollateralRatio = None  # Not available
    
    Collateral_TVL = HYusd_supply + (xSOL_price * xSOL_supply)
    Collateral_TVL_SOL = Collateral_TVL / SOL_price
    Effective_Leverage = Collateral_TVL / (xSOL_price * xSOL_supply)
    
    return {
        "HYusd_supply": HYusd_supply,
        "xSOL_price": xSOL_price,
        "xSOL_supply": xSOL_supply,
        "CollateralRatio": CollateralRatio,
        "SOL_price": SOL_price,
        "StabilityMode": {},
        "Collateral_TVL": Collateral_TVL,
        "Collateral_TVL_SOL": Collateral_TVL_SOL,
        "Effective_Leverage": Effective_Leverage,
        "xSOL_icon_url": None,
        "lastFetched": datetime.utcnow().isoformat() + "Z",
        "source": "blockchain-fallback",
        "note": "CollateralRatio unavailable - using blockchain approximation"
    }

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            metrics = None
            source = None
            
            # Try Hylo API first (accurate data)
            try:
                hylo_data = fetch_hylo_api()
                stats = hylo_data['exchangeStats']
                
                HYusd_supply = stats['stablecoinSupply']
                xSOL_price = stats['levercoinNav']
                xSOL_supply = stats['levercoinSupply']
                CollateralRatio = stats['collateralRatio']
                StabilityMode = stats.get('stabilityMode', {})
                
                SOL_price = fetch_sol_price()
                
                Collateral_TVL = HYusd_supply + (xSOL_price * xSOL_supply)
                Collateral_TVL_SOL = Collateral_TVL / SOL_price
                Effective_Leverage = Collateral_TVL / (xSOL_price * xSOL_supply)
                
                metrics = {
                    "HYusd_supply": HYusd_supply,
                    "xSOL_price": xSOL_price,
                    "xSOL_supply": xSOL_supply,
                    "CollateralRatio": CollateralRatio,
                    "SOL_price": SOL_price,
                    "StabilityMode": StabilityMode,
                    "Collateral_TVL": Collateral_TVL,
                    "Collateral_TVL_SOL": Collateral_TVL_SOL,
                    "Effective_Leverage": Effective_Leverage,
                    "xSOL_icon_url": None,
                    "lastFetched": datetime.utcnow().isoformat() + "Z",
                    "source": "hylo-api"
                }
                source = "hylo-api"
                
            except Exception as hylo_error:
                # Fallback to blockchain
                metrics = fetch_blockchain_fallback()
                source = "blockchain-fallback"
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'public, max-age=60')
            self.end_headers()
            self.wfile.write(json.dumps(metrics).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": str(e),
                "message": "Failed to fetch xSOL metrics",
                "suggestion": "Try again later or use cached Gist data"
            }).encode())
