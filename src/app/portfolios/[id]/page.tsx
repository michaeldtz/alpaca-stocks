"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import HoldingsTable from "@/components/holdings-table";
import type { Portfolio, Holding, Quote } from "@/types";

interface HoldingRow extends Holding {
  quote?: Quote | null;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PortfolioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // add-holding form
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // edit modal
  const [editHolding, setEditHolding] = useState<Holding | null>(null);
  const [editShares, setEditShares] = useState("");
  const [editAvgCost, setEditAvgCost] = useState("");

  const loadData = useCallback(async () => {
    const [p, h] = await Promise.all([
      fetch(`/api/portfolios/${id}`).then((r) => r.json()),
      fetch(`/api/portfolios/${id}/holdings`).then((r) => r.json()),
    ]);
    setPortfolio(p);

    // Fetch quotes for all unique tickers
    const tickers = [...new Set((h as Holding[]).map((x) => x.ticker))];
    const quoteMap = new Map<string, Quote>();
    await Promise.all(
      tickers.map(async (t) => {
        try {
          const pd = await fetch(`/api/prices/${t}`).then((r) => r.json());
          if (pd.quote) quoteMap.set(t, pd.quote);
        } catch {
          // skip on error
        }
      })
    );

    setHoldings((h as Holding[]).map((x) => ({ ...x, quote: quoteMap.get(x.ticker) ?? null })));
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function addHolding(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim() || !shares) return;
    setSaving(true);
    await fetch(`/api/portfolios/${id}/holdings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: ticker.trim().toUpperCase(),
        shares: parseFloat(shares),
        avg_cost: avgCost ? parseFloat(avgCost) : null,
        purchase_date: purchaseDate || null,
        notes: notes || null,
      }),
    });
    setTicker(""); setShares(""); setAvgCost(""); setPurchaseDate(""); setNotes("");
    setShowAddForm(false);
    setSaving(false);
    await loadData();
  }

  async function deleteHolding(hid: number) {
    if (!confirm("Remove this holding?")) return;
    await fetch(`/api/portfolios/${id}/holdings/${hid}`, { method: "DELETE" });
    await loadData();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editHolding) return;
    setSaving(true);
    await fetch(`/api/portfolios/${id}/holdings/${editHolding.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shares: editShares ? parseFloat(editShares) : undefined,
        avg_cost: editAvgCost ? parseFloat(editAvgCost) : undefined,
      }),
    });
    setEditHolding(null);
    setSaving(false);
    await loadData();
  }

  if (loading) return <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>Loading...</div>;
  if (!portfolio) return <div style={{ padding: "2rem", color: "var(--red)" }}>Portfolio not found.</div>;

  // Stats
  let totalValue = 0, totalCost = 0, dayChange = 0;
  for (const h of holdings) {
    if (!h.quote) continue;
    totalValue += h.quote.price * h.shares;
    dayChange += h.quote.change * h.shares;
    if (h.avg_cost) totalCost += h.avg_cost * h.shares;
  }
  const gainLoss = totalCost > 0 ? totalValue - totalCost : null;
  const gainLossPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <Link href="/portfolios" style={{ fontSize: "0.8rem", color: "var(--text-muted)", textDecoration: "none" }}>← Portfolios</Link>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.25rem 0 0" }}>{portfolio.name}</h1>
          {portfolio.description && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>{portfolio.description}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/import" className="btn btn-ghost">Import PDF</Link>
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? "Cancel" : "+ Add Holding"}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {[
          { label: "Total Value", value: `$${fmt(totalValue)}`, cls: "" },
          { label: "Today", value: `${dayChange >= 0 ? "+" : ""}$${fmt(Math.abs(dayChange))}`, cls: dayChange >= 0 ? "positive" : "negative" },
          ...(gainLoss != null ? [{ label: "Gain/Loss", value: `${gainLoss >= 0 ? "+" : ""}$${fmt(Math.abs(gainLoss))}`, cls: gainLoss >= 0 ? "positive" : "negative" }] : []),
          ...(gainLossPct != null ? [{ label: "Return", value: `${gainLossPct >= 0 ? "+" : ""}${fmt(gainLossPct)}%`, cls: gainLossPct >= 0 ? "positive" : "negative" }] : []),
          { label: "Positions", value: `${holdings.length}`, cls: "" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "0.875rem 1.25rem" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{s.label}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }} className={s.cls}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Add holding form */}
      {showAddForm && (
        <form onSubmit={addHolding} className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Add Holding</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label>Ticker *</label>
              <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="AAPL" required />
            </div>
            <div>
              <label>Shares *</label>
              <input type="number" step="any" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="100" required />
            </div>
            <div>
              <label>Avg Cost / Share</label>
              <input type="number" step="any" value={avgCost} onChange={(e) => setAvgCost(e.target.value)} placeholder="150.00" />
            </div>
            <div>
              <label>Purchase Date</label>
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Adding..." : "Add Holding"}
          </button>
        </form>
      )}

      {/* Holdings table */}
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <HoldingsTable
          holdings={holdings}
          onDelete={deleteHolding}
          onEdit={(h) => {
            setEditHolding(h);
            setEditShares(String(h.shares));
            setEditAvgCost(h.avg_cost != null ? String(h.avg_cost) : "");
          }}
        />
      </div>

      {/* Edit modal */}
      {editHolding && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditHolding(null); }}
        >
          <form onSubmit={saveEdit} className="card" style={{ width: "100%", maxWidth: "400px" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Edit {editHolding.ticker}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <label>Shares</label>
                <input type="number" step="any" value={editShares} onChange={(e) => setEditShares(e.target.value)} />
              </div>
              <div>
                <label>Avg Cost / Share</label>
                <input type="number" step="any" value={editAvgCost} onChange={(e) => setEditAvgCost(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditHolding(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
