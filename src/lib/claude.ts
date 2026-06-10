import { GoogleGenAI } from "@google/genai";
import type { TechnicalAnalysis, ParsedHolding, ParsedOrder, AICommentary } from "@/types";

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function cleanJson(text: string): string {
  return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

export async function parsePortfolioPDF(pdfText: string): Promise<ParsedHolding[]> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Extract all stock/ETF holdings from this brokerage statement. Return ONLY a JSON array (no markdown, no explanation) with objects having these fields:
- ticker (string, uppercase stock symbol, required)
- shares (number, required)
- avgCost (number or null, cost basis per share)
- currentValue (number or null, total current market value of position)

If you cannot find a clear ticker symbol for a position, skip it.

Brokerage statement text:
---
${pdfText.slice(0, 12000)}
---`,
  });

  const text = response.text ?? "";
  return JSON.parse(cleanJson(text)) as ParsedHolding[];
}

export async function parseOrderNotification(text: string): Promise<ParsedOrder> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Extract the trade details from this order notification. Return ONLY a JSON object (no markdown):
- ticker (string, uppercase)
- action ("BUY" or "SELL")
- shares (number)
- price (number or null, execution price per share)
- date (string ISO format or null)

Order notification:
---
${text}
---`,
  });

  const rawText = response.text ?? "";
  return JSON.parse(cleanJson(rawText)) as ParsedOrder;
}

export async function getAICommentary(analysis: TechnicalAnalysis): Promise<AICommentary> {
  const client = getGeminiClient();

  const stopBuyLines = analysis.stopBuySuggestions.length > 0
    ? analysis.stopBuySuggestions
        .map((s) => `- ${s.type}: stop-buy at $${s.stopBuyPrice} (${s.confidence} confidence) — ${s.rationale}`)
        .join("\n")
    : "None identified";

  const prompt = `You are a concise stock market analyst. Analyze this technical data and provide a brief assessment.

Ticker: ${analysis.ticker}
Current Price: $${analysis.currentPrice.toFixed(2)}
52-Week Range: $${analysis.low52w.toFixed(2)} – $${analysis.high52w.toFixed(2)}
RSI(14): ${analysis.rsi?.toFixed(1) ?? "N/A"} (${analysis.rsiSignal})
MACD Signal: ${analysis.macdSignal}
Price vs SMA20: ${analysis.priceVsSma20Pct?.toFixed(1) ?? "N/A"}%
Price vs SMA50: ${analysis.priceVsSma50Pct?.toFixed(1) ?? "N/A"}%
Price vs SMA200: ${analysis.priceVsSma200Pct?.toFixed(1) ?? "N/A"}%
Trend: ${analysis.trendSignal}
Stop-Buy Suggestions:
${stopBuyLines}

Respond with ONLY a JSON object (no markdown):
{
  "assessment": "2-3 sentence market assessment",
  "recommendation": "buy" | "hold" | "watch" | "avoid",
  "keyRisk": "one sentence describing the key risk to monitor"
}`;

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return JSON.parse(cleanJson(response.text ?? "")) as AICommentary;
}
