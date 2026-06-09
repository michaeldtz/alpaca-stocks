import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Portfolio } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const portfolios = db
    .prepare("SELECT * FROM portfolios ORDER BY created_at DESC")
    .all() as unknown as Portfolio[];
  return NextResponse.json(portfolios);
}

export async function POST(req: Request) {
  const { name, description, currency = "USD" } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const db = getDb();
  const result = db
    .prepare("INSERT INTO portfolios (name, description, currency) VALUES (?, ?, ?)")
    .run(name.trim(), description ?? null, currency);
  const portfolio = db
    .prepare("SELECT * FROM portfolios WHERE id = ?")
    .get(result.lastInsertRowid) as unknown as Portfolio;
  return NextResponse.json(portfolio, { status: 201 });
}
