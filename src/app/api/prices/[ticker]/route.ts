import { NextResponse } from "next/server";
import { getPriceData } from "@/lib/yahoo-finance";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  try {
    const data = await getPriceData(ticker.toUpperCase());
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to fetch price data";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
