import { NextResponse } from "next/server";
import { getPriceData } from "@/lib/yahoo-finance";
import { analyze } from "@/lib/technical-analysis";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  try {
    const { quote, history } = await getPriceData(ticker.toUpperCase());
    const result = analyze(ticker.toUpperCase(), history, quote.price);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "analysis failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
