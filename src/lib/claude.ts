import Anthropic from "@anthropic-ai/sdk";
import type { TechnicalAnalysis, ParsedHolding, ParsedOrder, AICommentary } from "@/types";

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function parsePortfolioPDF(pdfText: string): Promise<ParsedHolding[]> {
  const client = getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Extract all stock/ETF holdings from this brokerage statement. Return ONLY a JSON array (no markdown, no explanation) with objects having these fields:
- ticker (string, uppercase stock symbol, required)
- shares (number, required)
- avgCost (number or null, cost basis per share)
- currentValue (number or null, total current market value of position)

If you cannot find a clear ticker symbol for a position, skip it.

Brokerage statement text:
---
${pdfText.slice(0, 12000)}
---`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as ParsedHolding[];
}

export async function parseOrderNotification(text: string): Promise<ParsedOrder> {
  const client = getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Extract the trade details from this order notification. Return ONLY a JSON object (no markdown):
- ticker (string, uppercase)
- action ("BUY" or "SELL")
- shares (number)
- price (number or null, execution price per share)
- date (string ISO format or null)

Order notification:
---
${text}
---`,
      },
    ],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as ParsedOrder;
}

export async function getAICommentary(analysis: TechnicalAnalysis): Promise<AICommentary> {
  const client = getClient();

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

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as AICommentary;
}
