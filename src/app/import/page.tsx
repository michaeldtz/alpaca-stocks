"use client";

import { useEffect, useRef, useState } from "react";
import type { ParsedHolding, ParsedOrder, Portfolio } from "@/types";

type Tab = "pdf" | "notification";

export default function ImportPage() {
  const [tab, setTab] = useState<Tab>("pdf");
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("");

  // PDF state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsedHoldings, setParsedHoldings] = useState<ParsedHolding[] | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  // Notification state
  const [notifText, setNotifText] = useState("");
  const [parsedOrder, setParsedOrder] = useState<ParsedOrder | null>(null);
  const [notifParsing, setNotifParsing] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifImporting, setNotifImporting] = useState(false);
  const [notifDone, setNotifDone] = useState(false);

  useEffect(() => {
    fetch("/api/portfolios").then((r) => r.json()).then((data: Portfolio[]) => {
      setPortfolios(data);
      if (data.length > 0) setSelectedPortfolio(String(data[0].id));
    });
  }, []);

  // ---- PDF ----
  async function parsePDF() {
    if (!pdfFile) return;
    setPdfParsing(true); setPdfError(null); setParsedHoldings(null); setImportDone(false);
    try {
      const fd = new FormData();
      fd.append("file", pdfFile);
      const res = await fetch("/api/import/pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "parse failed");
      setParsedHoldings(data.holdings);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "error");
    } finally {
      setPdfParsing(false);
    }
  }

  async function confirmImport() {
    if (!parsedHoldings || !selectedPortfolio) return;
    setImporting(true);
    for (const h of parsedHoldings) {
      if (!h.ticker || !h.shares) continue;
      await fetch(`/api/portfolios/${selectedPortfolio}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: h.ticker,
          shares: h.shares,
          avg_cost: h.avgCost,
        }),
      });
    }
    setImporting(false);
    setImportDone(true);
    setParsedHoldings(null);
    setPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeHolding(idx: number) {
    setParsedHoldings((prev) => prev ? prev.filter((_, i) => i !== idx) : null);
  }

  function updateHolding(idx: number, field: keyof ParsedHolding, value: string) {
    setParsedHoldings((prev) => {
      if (!prev) return null;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: field === "ticker" ? value.toUpperCase() : parseFloat(value) || 0 };
      return updated;
    });
  }

  // ---- Notification ----
  async function parseNotif() {
    if (!notifText.trim()) return;
    setNotifParsing(true); setNotifError(null); setParsedOrder(null); setNotifDone(false);
    try {
      const res = await fetch("/api/import/notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: notifText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "parse failed");
      setParsedOrder(data);
    } catch (e) {
      setNotifError(e instanceof Error ? e.message : "error");
    } finally {
      setNotifParsing(false);
    }
  }

  async function confirmNotif() {
    if (!parsedOrder || !selectedPortfolio || parsedOrder.action !== "BUY") return;
    setNotifImporting(true);
    await fetch(`/api/portfolios/${selectedPortfolio}/holdings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: parsedOrder.ticker,
        shares: parsedOrder.shares,
        avg_cost: parsedOrder.price,
        purchase_date: parsedOrder.date,
      }),
    });
    setNotifImporting(false);
    setNotifDone(true);
    setParsedOrder(null);
    setNotifText("");
  }

  const tabStyle = (t: Tab) => ({
    padding: "0.5rem 1.25rem",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    fontWeight: 500 as const,
    cursor: "pointer" as const,
    border: "none",
    background: tab === t ? "var(--blue)" : "var(--surface2)",
    color: tab === t ? "white" : "var(--text-muted)",
  });

  return (
    <div style={{ maxWidth: "720px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Import Holdings</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button style={tabStyle("pdf")} onClick={() => setTab("pdf")}>PDF Statement</button>
        <button style={tabStyle("notification")} onClick={() => setTab("notification")}>Order Notification</button>
      </div>

      {/* Portfolio selector */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <label>Target Portfolio</label>
        <select value={selectedPortfolio} onChange={(e) => setSelectedPortfolio(e.target.value)}>
          {portfolios.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
        {portfolios.length === 0 && (
          <p style={{ fontSize: "0.8rem", color: "var(--red)", marginTop: "0.5rem" }}>
            No portfolios found. Create one first.
          </p>
        )}
      </div>

      {/* ---- PDF tab ---- */}
      {tab === "pdf" && (
        <div>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <label>Upload Brokerage PDF</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => {
                setPdfFile(e.target.files?.[0] ?? null);
                setParsedHoldings(null);
                setImportDone(false);
                setPdfError(null);
              }}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Claude will extract tickers, shares, and cost basis from the statement.
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: "0.75rem" }}
              onClick={parsePDF}
              disabled={!pdfFile || pdfParsing}
            >
              {pdfParsing ? "Parsing PDF..." : "Parse PDF"}
            </button>
          </div>

          {pdfError && <div className="card" style={{ borderLeft: "3px solid var(--red)", color: "var(--red)", marginBottom: "1rem" }}>{pdfError}</div>}

          {importDone && (
            <div className="card" style={{ borderLeft: "3px solid var(--green)", color: "var(--green)", marginBottom: "1rem" }}>
              Holdings imported successfully.
            </div>
          )}

          {parsedHoldings && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Preview ({parsedHoldings.length} holdings)</h2>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setParsedHoldings((p) => p ? [...p, { ticker: "", shares: 0, avgCost: null, currentValue: null }] : p)}
                    style={{ fontSize: "0.8rem" }}
                  >
                    + Add Row
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={confirmImport}
                    disabled={importing || !selectedPortfolio}
                  >
                    {importing ? "Importing..." : "Confirm Import"}
                  </button>
                </div>
              </div>
              <div style={{ overflow: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th style={{ textAlign: "right" }}>Shares</th>
                      <th style={{ textAlign: "right" }}>Avg Cost</th>
                      <th style={{ textAlign: "right" }}>Current Value</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedHoldings.map((h, i) => (
                      <tr key={i}>
                        <td>
                          <input
                            value={h.ticker}
                            onChange={(e) => updateHolding(i, "ticker", e.target.value)}
                            style={{ width: "80px" }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            value={h.shares}
                            onChange={(e) => updateHolding(i, "shares", e.target.value)}
                            style={{ width: "100px", textAlign: "right" }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            value={h.avgCost ?? ""}
                            onChange={(e) => updateHolding(i, "avgCost", e.target.value)}
                            style={{ width: "100px", textAlign: "right" }}
                          />
                        </td>
                        <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {h.currentValue != null ? `$${h.currentValue.toLocaleString()}` : "—"}
                        </td>
                        <td>
                          <button className="btn btn-danger" style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem" }} onClick={() => removeHolding(i)}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Notification tab ---- */}
      {tab === "notification" && (
        <div>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <label>Paste Order Notification</label>
            <textarea
              rows={6}
              value={notifText}
              onChange={(e) => { setNotifText(e.target.value); setParsedOrder(null); setNotifDone(false); setNotifError(null); }}
              placeholder="Paste email / push notification text here, e.g.:
Your order has been executed: BUY 25 shares of MSFT at $420.50 on 2024-11-15"
            />
            <button
              className="btn btn-primary"
              style={{ marginTop: "0.75rem" }}
              onClick={parseNotif}
              disabled={!notifText.trim() || notifParsing}
            >
              {notifParsing ? "Parsing..." : "Parse Notification"}
            </button>
          </div>

          {notifError && (
            <div className="card" style={{ borderLeft: "3px solid var(--red)", color: "var(--red)", marginBottom: "1rem" }}>{notifError}</div>
          )}

          {notifDone && (
            <div className="card" style={{ borderLeft: "3px solid var(--green)", color: "var(--green)", marginBottom: "1rem" }}>
              Order imported successfully.
            </div>
          )}

          {parsedOrder && (
            <div className="card">
              <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Parsed Order</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                {[
                  { label: "Ticker", value: parsedOrder.ticker },
                  { label: "Action", value: parsedOrder.action },
                  { label: "Shares", value: String(parsedOrder.shares) },
                  { label: "Price", value: parsedOrder.price != null ? `$${parsedOrder.price}` : "—" },
                  { label: "Date", value: parsedOrder.date ?? "—" },
                ].map((f) => (
                  <div key={f.label}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.125rem" }}>{f.label}</div>
                    <div style={{ fontWeight: 600 }}>{f.value}</div>
                  </div>
                ))}
              </div>
              {parsedOrder.action === "BUY" ? (
                <button
                  className="btn btn-primary"
                  onClick={confirmNotif}
                  disabled={notifImporting || !selectedPortfolio}
                >
                  {notifImporting ? "Importing..." : "Add to Portfolio"}
                </button>
              ) : (
                <p style={{ fontSize: "0.8rem", color: "var(--yellow)" }}>
                  SELL orders are not automatically imported — please update your holding manually.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
