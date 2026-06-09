import { NextResponse } from "next/server";
import { getPriceData } from "@/lib/yahoo-finance";
import { analyze } from "@/lib/technical-analysis";
import { getAICommentary } from "@/lib/claude";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  try {
    const { quote, history } = await getPriceData(ticker.toUpperCase());
    const analysis = analyze(ticker.toUpperCase(), history, quote.price);
    const commentary = await getAICommentary(analysis);
    return NextResponse.json(commentary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "commentary failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
