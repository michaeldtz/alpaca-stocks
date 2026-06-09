"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import type { HistoricalBar } from "@/types";

interface Props {
  history: HistoricalBar[];
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  stopBuyPrice?: number | null;
}

export default function PriceChart({ history, sma20, sma50, sma200, stopBuyPrice }: Props) {
  const last90 = history.slice(-90);
  const minPrice = Math.min(...last90.map((b) => b.low)) * 0.995;
  const maxPrice = Math.max(...last90.map((b) => b.high)) * 1.005;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    const bar = last90.find((b) => b.date === label);
    if (!bar) return null;
    return (
      <div className="card" style={{ padding: "0.75rem", fontSize: "0.75rem", minWidth: "140px" }}>
        <div style={{ color: "var(--text-muted)", marginBottom: "0.25rem" }}>{label}</div>
        <div>O: <b>${bar.open.toFixed(2)}</b></div>
        <div>H: <b style={{ color: "var(--green)" }}>${bar.high.toFixed(2)}</b></div>
        <div>L: <b style={{ color: "var(--red)" }}>${bar.low.toFixed(2)}</b></div>
        <div>C: <b>${bar.close.toFixed(2)}</b></div>
      </div>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={last90} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(71,85,105,0.2)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            tickFormatter={(v: string) => v.slice(5)}
            interval={14}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={54}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={2}
          />
          {sma20 && (
            <ReferenceLine y={sma20} stroke="#eab308" strokeDasharray="4 2" label={{ value: "SMA20", fill: "#eab308", fontSize: 10 }} />
          )}
          {sma50 && (
            <ReferenceLine y={sma50} stroke="#f97316" strokeDasharray="4 2" label={{ value: "SMA50", fill: "#f97316", fontSize: 10 }} />
          )}
          {sma200 && (
            <ReferenceLine y={sma200} stroke="#a855f7" strokeDasharray="4 2" label={{ value: "SMA200", fill: "#a855f7", fontSize: 10 }} />
          )}
          {stopBuyPrice && (
            <ReferenceLine y={stopBuyPrice} stroke="#22c55e" strokeDasharray="6 2" label={{ value: "Stop-buy", fill: "#22c55e", fontSize: 10 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Volume bar */}
      <ResponsiveContainer width="100%" height={50}>
        <ComposedChart data={last90} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <Bar
            dataKey="volume"
            fill="rgba(59,130,246,0.25)"
            radius={[2, 2, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
