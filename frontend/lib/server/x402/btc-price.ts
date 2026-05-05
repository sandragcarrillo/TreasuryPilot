import "server-only";

const CACHE_TTL_MS = 60_000;

let cached: { btcUsd: number; expiresAt: number } | null = null;

async function fetchCoinbase(): Promise<number> {
  const res = await fetch(
    "https://api.coinbase.com/v2/prices/BTC-USD/spot",
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`Coinbase ${res.status}`);
  const json = (await res.json()) as { data?: { amount?: string } };
  const amount = json?.data?.amount;
  if (!amount) throw new Error("Coinbase missing data.amount");
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid BTC price");
  return n;
}

async function fetchKraken(): Promise<number> {
  const res = await fetch(
    "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`Kraken ${res.status}`);
  const json = (await res.json()) as { result?: Record<string, { c: string[] }> };
  const pair = json.result && Object.values(json.result)[0];
  const last = pair?.c?.[0];
  if (!last) throw new Error("Kraken missing ticker");
  const n = Number(last);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid Kraken price");
  return n;
}

export async function getBtcUsd(): Promise<number> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.btcUsd;

  let price: number;
  try {
    price = await fetchCoinbase();
  } catch (err) {
    console.warn("[btc-price] coinbase failed, falling back to kraken", err);
    price = await fetchKraken();
  }

  cached = { btcUsd: price, expiresAt: now + CACHE_TTL_MS };
  return price;
}
