import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Holding } from "@/types";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; hid: string }> }) {
  const { id, hid } = await params;
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM holdings WHERE id = ? AND portfolio_id = ?")
    .get(hid, id) as unknown as Holding | undefined;
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { shares, avg_cost, purchase_date, notes } = await req.json();
  db.prepare(
    "UPDATE holdings SET shares = COALESCE(?, shares), avg_cost = COALESCE(?, avg_cost), purchase_date = COALESCE(?, purchase_date), notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?"
  ).run(shares ?? null, avg_cost ?? null, purchase_date ?? null, notes ?? null, hid);

  const updated = db.prepare("SELECT * FROM holdings WHERE id = ?").get(hid) as unknown as Holding;
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; hid: string }> }) {
  const { id, hid } = await params;
  const db = getDb();
  db.prepare("DELETE FROM holdings WHERE id = ? AND portfolio_id = ?").run(hid, id);
  return NextResponse.json({ ok: true });
}
