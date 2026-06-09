import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Holding } from "@/types";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const holdings = db
    .prepare("SELECT * FROM holdings WHERE portfolio_id = ? ORDER BY ticker ASC")
    .all(id) as unknown as Holding[];
  return NextResponse.json(holdings);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const portfolio = db.prepare("SELECT id FROM portfolios WHERE id = ?").get(id);
  if (!portfolio) return NextResponse.json({ error: "portfolio not found" }, { status: 404 });

  const { ticker, shares, avg_cost, purchase_date, notes } = await req.json();
  if (!ticker?.trim() || !shares) {
    return NextResponse.json({ error: "ticker and shares are required" }, { status: 400 });
  }

  const result = db
    .prepare(
      "INSERT INTO holdings (portfolio_id, ticker, shares, avg_cost, purchase_date, notes) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(id, ticker.trim().toUpperCase(), shares, avg_cost ?? null, purchase_date ?? null, notes ?? null);

  const holding = db.prepare("SELECT * FROM holdings WHERE id = ?").get(result.lastInsertRowid) as unknown as Holding;
  return NextResponse.json(holding, { status: 201 });
}
