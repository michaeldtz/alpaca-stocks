import {
  RSI,
  MACD,
  SMA,
} from "technicalindicators";
import type {
  TechnicalAnalysis,
  HistoricalBar,
  StopBuySuggestion,
} from "@/types";

export function analyze(ticker: string, history: HistoricalBar[], currentPrice: number): TechnicalAnalysis {
  const closes = history.map((b) => b.close);
  const n = closes.length;

  // RSI(14)
  let rsi: number | null = null;
  if (n >= 15) {
    const rsiValues = RSI.calculate({ period: 14, values: closes });
    rsi = rsiValues[rsiValues.length - 1] ?? null;
  }

  // MACD(12,26,9)
  let macd: { macd: number; signal: number; histogram: number } | null = null;
  if (n >= 35) {
    const macdValues = MACD.calculate({
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      values: closes,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    const last = macdValues[macdValues.length - 1];
    if (last?.MACD != null && last?.signal != null && last?.histogram != null) {
      macd = { macd: last.MACD, signal: last.signal, histogram: last.histogram };
    }
  }

  // SMAs
  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const sma200 = calcSMA(closes, 200);

  // 52w high/low from history
  const high52w = Math.max(...history.map((b) => b.high));
  const low52w = Math.min(...history.map((b) => b.low));

  // % deviation from MAs
  const priceVsSma20Pct = sma20 ? ((currentPrice - sma20) / sma20) * 100 : null;
  const priceVsSma50Pct = sma50 ? ((currentPrice - sma50) / sma50) * 100 : null;
  const priceVsSma200Pct = sma200 ? ((currentPrice - sma200) / sma200) * 100 : null;

  // Signals
  const rsiSignal = rsi == null ? "neutral" : rsi >= 70 ? "overbought" : rsi <= 30 ? "oversold" : "neutral";
  const macdSignal = macd == null ? "neutral" : macd.histogram > 0 ? "bullish" : macd.histogram < 0 ? "bearish" : "neutral";

  let trendSignal: "uptrend" | "downtrend" | "mixed" = "mixed";
  if (sma20 && sma50) {
    if (currentPrice > sma20 && sma20 > sma50) trendSignal = "uptrend";
    else if (currentPrice < sma20 && sma20 < sma50) trendSignal = "downtrend";
  }

  const stopBuySuggestions = buildStopBuySuggestions(
    currentPrice, rsi, macd, sma20, sma50, sma200, high52w, closes
  );

  return {
    ticker,
    currentPrice,
    rsi,
    macd,
    sma20,
    sma50,
    sma200,
    high52w,
    low52w,
    priceVsSma20Pct,
    priceVsSma50Pct,
    priceVsSma200Pct,
    rsiSignal,
    macdSignal,
    trendSignal,
    stopBuySuggestions,
    history,
  };
}

function calcSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const values = SMA.calculate({ period, values: closes });
  return values[values.length - 1] ?? null;
}

function buildStopBuySuggestions(
  price: number,
  rsi: number | null,
  macd: { macd: number; signal: number; histogram: number } | null,
  sma20: number | null,
  sma50: number | null,
  sma200: number | null,
  high52w: number,
  closes: number[]
): StopBuySuggestion[] {
  const suggestions: StopBuySuggestion[] = [];

  // 1. 52-week high breakout
  const pctFromHigh = (high52w - price) / high52w;
  if (pctFromHigh <= 0.05 && pctFromHigh >= 0 && (rsi == null || rsi < 72)) {
    suggestions.push({
      type: "breakout_52w",
      stopBuyPrice: +(high52w * 1.005).toFixed(2),
      rationale: `Price is within 5% of 52-week high ($${high52w.toFixed(2)}). A stop-buy above this level enters on confirmed breakout into new highs.`,
      confidence: rsi != null && rsi < 65 ? "high" : "medium",
    });
  }

  // 2. Golden cross: SMA20 just crossed above SMA50
  if (sma20 && sma50 && closes.length >= 51) {
    const prevCloses = closes.slice(0, -1);
    const prevSMA20Vals = SMA.calculate({ period: 20, values: prevCloses });
    const prevSMA50Vals = SMA.calculate({ period: 50, values: prevCloses });
    const prevSMA20 = prevSMA20Vals[prevSMA20Vals.length - 1];
    const prevSMA50 = prevSMA50Vals[prevSMA50Vals.length - 1];

    if (prevSMA20 && prevSMA50 && prevSMA20 < prevSMA50 && sma20 >= sma50) {
      suggestions.push({
        type: "golden_cross",
        stopBuyPrice: +(price * 1.01).toFixed(2),
        rationale: `20-day MA just crossed above 50-day MA (golden cross). A stop-buy 1% above current price captures continued upside momentum.`,
        confidence: "high",
      });
    }
  }

  // 3. MA reclaim: price just crossed back above SMA50
  if (sma50 && closes.length >= 2) {
    const prevClose = closes[closes.length - 2];
    if (prevClose < sma50 && price >= sma50) {
      suggestions.push({
        type: "ma_reclaim",
        stopBuyPrice: +(sma50 * 1.005).toFixed(2),
        rationale: `Price just reclaimed the 50-day MA ($${sma50.toFixed(2)}) after trading below it. A stop-buy slightly above confirms the reclaim.`,
        confidence: macd?.histogram != null && macd.histogram > 0 ? "high" : "medium",
      });
    }
  }

  return suggestions;
}
