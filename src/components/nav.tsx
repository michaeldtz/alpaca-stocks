"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const path = usePathname();

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/portfolios", label: "Portfolios" },
    { href: "/import", label: "Import" },
  ];

  return (
    <nav
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 1rem",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "2rem",
          height: "3.5rem",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "1.125rem", color: "var(--blue)" }}>
          Alpaca Stocks
        </span>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "0.375rem 0.875rem",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: path === l.href ? "var(--text)" : "var(--text-muted)",
                background: path === l.href ? "var(--surface2)" : "transparent",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
