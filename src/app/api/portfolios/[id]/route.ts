import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Portfolio } from "@/types";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const portfolio = db.prepare("SELECT * FROM portfolios WHERE id = ?").get(id) as unknown as Portfolio | undefined;
  if (!portfolio) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(portfolio);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const existing = db.prepare("SELECT * FROM portfolios WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { name, description, currency } = await req.json();
  db.prepare(
    "UPDATE portfolios SET name = COALESCE(?, name), description = COALESCE(?, description), currency = COALESCE(?, currency), updated_at = datetime('now') WHERE id = ?"
  ).run(name ?? null, description ?? null, currency ?? null, id);

  const updated = db.prepare("SELECT * FROM portfolios WHERE id = ?").get(id) as unknown as Portfolio;
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM portfolios WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
