export interface Portfolio {
  id: number;
  name: string;
  description: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Holding {
  id: number;
  portfolio_id: number;
  ticker: string;
  shares: number;
  avg_cost: number | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  high52w: number;
  low52w: number;
  volume: number;
  marketCap: number | null;
  name: string;
}

export interface HistoricalBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceData {
  quote: Quote;
  history: HistoricalBar[];
}

export interface StopBuySuggestion {
  type: "breakout_52w" | "golden_cross" | "ma_reclaim";
  stopBuyPrice: number;
  rationale: string;
  confidence: "high" | "medium" | "low";
}

export interface TechnicalAnalysis {
  ticker: string;
  currentPrice: number;
  rsi: number | null;
  macd: { macd: number; signal: number; histogram: number } | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  high52w: number;
  low52w: number;
  priceVsSma20Pct: number | null;
  priceVsSma50Pct: number | null;
  priceVsSma200Pct: number | null;
  rsiSignal: "overbought" | "neutral" | "oversold";
  macdSignal: "bullish" | "bearish" | "neutral";
  trendSignal: "uptrend" | "downtrend" | "mixed";
  stopBuySuggestions: StopBuySuggestion[];
  history: HistoricalBar[];
}

export interface HoldingWithPrice extends Holding {
  quote: Quote | null;
  gainLoss: number | null;
  gainLossPct: number | null;
  currentValue: number | null;
  costBasis: number | null;
}

export interface PortfolioWithStats extends Portfolio {
  totalValue: number | null;
  totalCost: number | null;
  totalGainLoss: number | null;
  totalGainLossPct: number | null;
  dayChange: number | null;
  holdingCount: number;
}

export interface ParsedHolding {
  ticker: string;
  shares: number;
  avgCost: number | null;
  currentValue: number | null;
}

export interface ParsedOrder {
  ticker: string;
  action: "BUY" | "SELL";
  shares: number;
  price: number | null;
  date: string | null;
}

export interface AICommentary {
  assessment: string;
  recommendation: "buy" | "hold" | "watch" | "avoid";
  keyRisk: string;
}
