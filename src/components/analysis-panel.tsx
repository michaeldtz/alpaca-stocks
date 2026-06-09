"use client";

import { useState, useEffect, useCallback } from "react";
import PriceChart from "./price-chart";
import type { TechnicalAnalysis, AICommentary } from "@/types";

interface Props {
  ticker: string;
}

function RSIGauge({ rsi }: { rsi: number }) {
  const pct = Math.min(Math.max(rsi, 0), 100);
  const color = rsi >= 70 ? "#ef4444" : rsi <= 30 ? "#22c55e" : "#3b82f6";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
      <div style={{ position: "relative", width: "80px", height: "40px", overflow: "hidden" }}>
        <svg viewBox="0 0 80 40" width="80" height="40">
          <path d="M 4 40 A 36 36 0 0 1 76 40" fill="none" stroke="var(--surface2)" strokeWidth="8" strokeLinecap="round" />
          <path
            d="M 4 40 A 36 36 0 0 1 76 40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 113} 113`}
          />
        </svg>
      </div>
      <span style={{ fontSize: "1.125rem", fontWeight: 700, color }}>{rsi.toFixed(1)}</span>
      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>RSI (14)</span>
    </div>
  );
}

function SignalBadge({ label, value }: { label: string; value: string }) {
  const colorMap: Record<string, string> = {
    bullish: "badge-green", uptrend: "badge-green",
    bearish: "badge-red", downtrend: "badge-red",
    overbought: "badge-red", oversold: "badge-green",
    neutral: "badge-gray", mixed: "badge-yellow",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{label}</span>
      <span className={`badge ${colorMap[value] ?? "badge-gray"}`}>{value}</span>
    </div>
  );
}

export default function AnalysisPanel({ ticker }: Props) {
  const [analysis, setAnalysis] = useState<TechnicalAnalysis | null>(null);
  const [commentary, setCommentary] = useState<AICommentary | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/${ticker}`);
      if (!res.ok) throw new Error("Failed to load analysis");
      setAnalysis(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

  async function loadCommentary() {
    setCommentaryLoading(true);
    try {
      const res = await fetch(`/api/ai/commentary/${ticker}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to get AI commentary");
      setCommentary(await res.json());
    } catch (e) {
      alert(e instanceof Error ? e.message : "error");
    } finally {
      setCommentaryLoading(false);
    }
  }

  if (loading) return <div style={{ padding: "2rem", color: "var(--text-muted)", textAlign: "center" }}>Loading analysis...</div>;
  if (error) return <div style={{ padding: "1rem", color: "var(--red)" }}>{error}</div>;
  if (!analysis) return null;

  const recBadge: Record<string, string> = { buy: "badge-green", hold: "badge-blue", watch: "badge-yellow", avoid: "badge-red" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>${analysis.currentPrice.toFixed(2)}</span>
          <span style={{ marginLeft: "0.75rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
            52w: ${analysis.low52w.toFixed(2)} – ${analysis.high52w.toFixed(2)}
          </span>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <SignalBadge label="RSI" value={analysis.rsiSignal} />
          <SignalBadge label="MACD" value={analysis.macdSignal} />
          <SignalBadge label="Trend" value={analysis.trendSignal} />
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ padding: "0.75rem" }}>
        <PriceChart
          history={analysis.history}
          sma20={analysis.sma20}
          sma50={analysis.sma50}
          sma200={analysis.sma200}
          stopBuyPrice={analysis.stopBuySuggestions[0]?.stopBuyPrice}
        />
      </div>

      {/* Indicators row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
        <div className="card" style={{ display: "flex", justifyContent: "center" }}>
          {analysis.rsi != null ? <RSIGauge rsi={analysis.rsi} /> : <span style={{ color: "var(--text-muted)" }}>RSI N/A</span>}
        </div>
        {[
          { label: "SMA 20", val: analysis.sma20, pct: analysis.priceVsSma20Pct },
          { label: "SMA 50", val: analysis.sma50, pct: analysis.priceVsSma50Pct },
          { label: "SMA 200", val: analysis.sma200, pct: analysis.priceVsSma200Pct },
        ].map(({ label, val, pct }) => (
          <div key={label} className="card">
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{label}</div>
            <div style={{ fontWeight: 700 }}>{val != null ? `$${val.toFixed(2)}` : "N/A"}</div>
            {pct != null && (
              <div className={pct >= 0 ? "positive" : "negative"} style={{ fontSize: "0.75rem", marginTop: "0.125rem" }}>
                {pct >= 0 ? "+" : ""}{pct.toFixed(1)}% vs price
              </div>
            )}
          </div>
        ))}
        {analysis.macd && (
          <div className="card">
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>MACD Histogram</div>
            <div style={{ fontWeight: 700, color: analysis.macd.histogram >= 0 ? "var(--green)" : "var(--red)" }}>
              {analysis.macd.histogram >= 0 ? "+" : ""}{analysis.macd.histogram.toFixed(3)}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>
              MACD {analysis.macd.macd.toFixed(3)} / Sig {analysis.macd.signal.toFixed(3)}
            </div>
          </div>
        )}
      </div>

      {/* Stop-buy suggestions */}
      {analysis.stopBuySuggestions.length > 0 && (
        <div>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Stop-Buy Suggestions
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {analysis.stopBuySuggestions.map((s) => (
              <div
                key={s.type}
                className="card"
                style={{ display: "flex", gap: "1rem", alignItems: "flex-start", borderLeft: "3px solid var(--green)" }}
              >
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--green)" }}>
                    ${s.stopBuyPrice.toFixed(2)}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>stop-buy</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{s.type.replace(/_/g, " ")}</span>
                    <span className={`badge ${s.confidence === "high" ? "badge-green" : s.confidence === "medium" ? "badge-yellow" : "badge-gray"}`}>
                      {s.confidence}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>{s.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Commentary */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
            AI Commentary
          </h3>
          {!commentary && (
            <button className="btn btn-ghost" onClick={loadCommentary} disabled={commentaryLoading} style={{ fontSize: "0.8rem" }}>
              {commentaryLoading ? "Analyzing..." : "Get AI Commentary"}
            </button>
          )}
        </div>
        {commentary && (
          <div className="card" style={{ borderLeft: "3px solid var(--blue)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <span className={`badge ${recBadge[commentary.recommendation] ?? "badge-gray"}`} style={{ fontSize: "0.875rem" }}>
                {commentary.recommendation.toUpperCase()}
              </span>
              <button className="btn btn-ghost" onClick={loadCommentary} disabled={commentaryLoading} style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}>
                Refresh
              </button>
            </div>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", lineHeight: 1.6 }}>{commentary.assessment}</p>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
              Key risk: {commentary.keyRisk}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
