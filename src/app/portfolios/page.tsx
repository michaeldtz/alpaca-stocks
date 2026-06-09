"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Portfolio } from "@/types";

export default function PortfoliosPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await fetch("/api/portfolios").then((r) => r.json());
    setPortfolios(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, currency }),
    });
    setName("");
    setDescription("");
    setCurrency("USD");
    setShowForm(false);
    setSaving(false);
    await load();
  }

  async function deletePortfolio(id: number) {
    if (!confirm("Delete this portfolio and all its holdings?")) return;
    await fetch(`/api/portfolios/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Portfolios</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Portfolio"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card" style={{ marginBottom: "1.5rem", maxWidth: "480px" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>New Portfolio</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label>Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Growth Fund" required />
            </div>
            <div>
              <label>Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional note" />
            </div>
            <div>
              <label>Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Creating..." : "Create Portfolio"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>Loading...</div>
      ) : portfolios.length === 0 ? (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>
          No portfolios yet. Create your first one above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {portfolios.map((p) => (
            <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <Link href={`/portfolios/${p.id}`} style={{ fontWeight: 700, textDecoration: "none", color: "var(--text)" }}>
                  {p.name}
                </Link>
                {p.description && (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>{p.description}</div>
                )}
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{p.currency}</span>
              <Link href={`/portfolios/${p.id}`} className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>Open</Link>
              <button
                className="btn btn-danger"
                style={{ fontSize: "0.8rem", padding: "0.375rem 0.625rem" }}
                onClick={() => deletePortfolio(p.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
