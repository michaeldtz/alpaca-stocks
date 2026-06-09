import { NextResponse } from "next/server";
import { parseOrderNotification } from "@/lib/claude";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const order = await parseOrderNotification(text);
    return NextResponse.json(order);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "parsing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
