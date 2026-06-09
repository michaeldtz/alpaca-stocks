"use client";

import { useState } from "react";
import AnalysisPanel from "./analysis-panel";
import type { Holding, Quote } from "@/types";

interface HoldingRow extends Holding {
  quote?: Quote | null;
}

interface Props {
  holdings: HoldingRow[];
  onDelete: (id: number) => void;
  onEdit: (holding: Holding) => void;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n: number) {
  return "$" + fmt(n);
}

export default function HoldingsTable({ holdings, onDelete, onEdit }: Props) {
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  if (holdings.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>
        No holdings yet. Add your first position or import from a PDF.
      </div>
    );
  }

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Ticker</th>
            <th style={{ textAlign: "right" }}>Shares</th>
            <th style={{ textAlign: "right" }}>Avg Cost</th>
            <th style={{ textAlign: "right" }}>Price</th>
            <th style={{ textAlign: "right" }}>Day</th>
            <th style={{ textAlign: "right" }}>Value</th>
            <th style={{ textAlign: "right" }}>Gain/Loss</th>
            <th style={{ textAlign: "right" }}>G/L %</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const price = h.quote?.price ?? null;
            const change = h.quote?.changePercent ?? null;
            const value = price != null ? price * h.shares : null;
            const cost = h.avg_cost != null ? h.avg_cost * h.shares : null;
            const gainLoss = value != null && cost != null ? value - cost : null;
            const gainLossPct = cost != null && gainLoss != null ? (gainLoss / cost) * 100 : null;
            const isExpanded = expandedTicker === h.ticker;

            return (
              <>
                <tr key={h.id} style={{ cursor: "pointer" }}>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 700 }}>{h.ticker}</span>
                      {h.quote?.name && (
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {h.quote.name.length > 24 ? h.quote.name.slice(0, 24) + "…" : h.quote.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>{fmt(h.shares, h.shares % 1 === 0 ? 0 : 4)}</td>
                  <td style={{ textAlign: "right" }}>
                    {h.avg_cost != null ? fmtCurrency(h.avg_cost) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {price != null ? fmtCurrency(price) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {change != null ? (
                      <span className={change >= 0 ? "positive" : "negative"}>
                        {change >= 0 ? "+" : ""}{fmt(change)}%
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {value != null ? fmtCurrency(value) : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {gainLoss != null ? (
                      <span className={gainLoss >= 0 ? "positive" : "negative"}>
                        {gainLoss >= 0 ? "+" : ""}{fmtCurrency(gainLoss)}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {gainLossPct != null ? (
                      <span className={gainLossPct >= 0 ? "positive" : "negative"}>
                        {gainLossPct >= 0 ? "+" : ""}{fmt(gainLossPct)}%
                      </span>
                    ) : "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem" }}
                        onClick={() => setExpandedTicker(isExpanded ? null : h.ticker)}
                      >
                        {isExpanded ? "Close" : "Analyze"}
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => onEdit(h)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => onDelete(h.id)}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${h.id}-analysis`}>
                    <td colSpan={9} style={{ padding: "1rem", background: "rgba(15,23,42,0.5)" }}>
                      <div style={{ maxWidth: "860px" }}>
                        <AnalysisPanel ticker={h.ticker} />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
