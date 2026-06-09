import { getDb } from "./db";
import type { PriceData, Quote, HistoricalBar } from "@/types";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
};

export async function getPriceData(ticker: string): Promise<PriceData> {
  const db = getDb();
  const upperTicker = ticker.toUpperCase();

  const cached = db
    .prepare("SELECT data, fetched_at FROM price_cache WHERE ticker = ?")
    .get(upperTicker) as unknown as { data: string; fetched_at: string } | undefined;

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < CACHE_TTL_MS) {
      return JSON.parse(cached.data) as PriceData;
    }
  }

  const data = await fetchFromYahoo(upperTicker);

  db.prepare(
    "INSERT OR REPLACE INTO price_cache (ticker, data, fetched_at) VALUES (?, ?, datetime('now'))"
  ).run(upperTicker, JSON.stringify(data));

  return data;
}

async function fetchFromYahoo(ticker: string): Promise<PriceData> {
  // v8 chart API — returns 1y daily history + current quote meta in one request
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y&includePrePost=false`;
  const res = await fetch(url, { headers: YF_HEADERS });

  if (!res.ok) {
    // Try query2 as fallback
    const url2 = url.replace("query1", "query2");
    const res2 = await fetch(url2, { headers: YF_HEADERS });
    if (!res2.ok) throw new Error(`Yahoo Finance returned ${res.status}`);
    return parseChartResponse(ticker, await res2.json());
  }

  return parseChartResponse(ticker, await res.json());
}

function parseChartResponse(ticker: string, json: Record<string, unknown>): PriceData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (json as any).chart?.result?.[0];
  if (!result) throw new Error("Empty response from Yahoo Finance");

  const meta = result.meta ?? {};
  const timestamps: number[] = result.timestamp ?? [];
  const ohlcv = result.indicators?.quote?.[0] ?? {};

  const quote: Quote = {
    ticker,
    name: String(meta.longName ?? meta.shortName ?? ticker),
    price: Number(meta.regularMarketPrice ?? 0),
    change: Number(meta.regularMarketPrice ?? 0) - Number(meta.chartPreviousClose ?? meta.previousClose ?? 0),
    changePercent: 0,
    high52w: Number(meta.fiftyTwoWeekHigh ?? 0),
    low52w: Number(meta.fiftyTwoWeekLow ?? 0),
    volume: Number(meta.regularMarketVolume ?? 0),
    marketCap: null,
  };
  // Calculate changePercent from change and previous close
  const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? 0);
  quote.changePercent = prevClose > 0 ? (quote.change / prevClose) * 100 : 0;

  const history: HistoricalBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = ohlcv.close?.[i];
    if (close == null) continue;
    const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
    history.push({
      date,
      open: Number(ohlcv.open?.[i] ?? close),
      high: Number(ohlcv.high?.[i] ?? close),
      low: Number(ohlcv.low?.[i] ?? close),
      close: Number(close),
      volume: Number(ohlcv.volume?.[i] ?? 0),
    });
  }
  history.sort((a, b) => a.date.localeCompare(b.date));

  return { quote, history };
}
