"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Portfolio, Holding, Quote } from "@/types";

interface PortfolioCard extends Portfolio {
  holdings: Holding[];
  quotes: Quote[];
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const [cards, setCards] = useState<PortfolioCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const portfolios: Portfolio[] = await fetch("/api/portfolios").then((r) => r.json());

      const enriched = await Promise.all(
        portfolios.map(async (p) => {
          const holdings: Holding[] = await fetch(`/api/portfolios/${p.id}/holdings`).then((r) => r.json());
          const tickers = [...new Set(holdings.map((h) => h.ticker))];
          const quotes = await Promise.all(
            tickers.map((t) =>
              fetch(`/api/prices/${t}`)
                .then((r) => r.json())
                .then((d) => d.quote as Quote)
                .catch(() => null)
            )
          );
          return { ...p, holdings, quotes: quotes.filter(Boolean) as Quote[] };
        })
      );

      setCards(enriched);
      setLoading(false);
    }
    load();
  }, []);

  function calcStats(card: PortfolioCard) {
    let totalValue = 0, totalCost = 0, dayChange = 0;
    for (const h of card.holdings) {
      const q = card.quotes.find((q) => q.ticker === h.ticker);
      if (!q) continue;
      const value = q.price * h.shares;
      totalValue += value;
      dayChange += q.change * h.shares;
      if (h.avg_cost) totalCost += h.avg_cost * h.shares;
    }
    const gainLoss = totalCost > 0 ? totalValue - totalCost : null;
    const gainLossPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : null;
    return { totalValue, totalCost, gainLoss, gainLossPct, dayChange };
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
        Loading portfolios...
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>No portfolios yet</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Create a portfolio to start tracking your positions.
        </p>
        <Link href="/portfolios" className="btn btn-primary">Create Portfolio</Link>
      </div>
    );
  }

  const totals = cards.map(calcStats);
  const grandTotal = totals.reduce((a, s) => a + s.totalValue, 0);
  const grandGainLoss = totals.reduce((a, s) => a + (s.gainLoss ?? 0), 0);
  const grandDayChange = totals.reduce((a, s) => a + s.dayChange, 0);

  return (
    <div>
      {/* Grand total banner */}
      <div className="card" style={{ marginBottom: "1.5rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Total Value</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>${fmt(grandTotal)}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Total Gain/Loss</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700 }} className={grandGainLoss >= 0 ? "positive" : "negative"}>
            {grandGainLoss >= 0 ? "+" : ""}${fmt(Math.abs(grandGainLoss))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Today</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700 }} className={grandDayChange >= 0 ? "positive" : "negative"}>
            {grandDayChange >= 0 ? "+" : ""}${fmt(Math.abs(grandDayChange))}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/portfolios" className="btn btn-ghost">Manage</Link>
          <Link href="/import" className="btn btn-primary">Import</Link>
        </div>
      </div>

      {/* Portfolio cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {cards.map((card, i) => {
          const stats = totals[i];
          return (
            <Link key={card.id} href={`/portfolios/${card.id}`} style={{ textDecoration: "none" }}>
              <div className="card" style={{ cursor: "pointer", transition: "border-color 0.15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{card.name}</div>
                    {card.description && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>{card.description}</div>
                    )}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{card.holdings.length} positions</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Value</div>
                    <div style={{ fontWeight: 700 }}>${fmt(stats.totalValue)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Today</div>
                    <div className={stats.dayChange >= 0 ? "positive" : "negative"} style={{ fontWeight: 600 }}>
                      {stats.dayChange >= 0 ? "+" : ""}${fmt(Math.abs(stats.dayChange))}
                    </div>
                  </div>
                  {stats.gainLoss != null && (
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Gain/Loss</div>
                      <div className={stats.gainLoss >= 0 ? "positive" : "negative"} style={{ fontWeight: 600 }}>
                        {stats.gainLoss >= 0 ? "+" : ""}${fmt(Math.abs(stats.gainLoss))}
                      </div>
                    </div>
                  )}
                  {stats.gainLossPct != null && (
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Return</div>
                      <div className={stats.gainLossPct >= 0 ? "positive" : "negative"} style={{ fontWeight: 600 }}>
                        {stats.gainLossPct >= 0 ? "+" : ""}{fmt(stats.gainLossPct)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
