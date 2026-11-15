"use client";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { report } from "@/server/domain/report";
import { usd } from "@/server/domain/money";
import { SectionTitle, type S } from "./ui";
export function SpendingChart({ s, month }: { s: S; month: string }) {
  const [mode, setMode] = useState("Cumulative");
  const r = report(s, month);
  const days =
    month === s.now.slice(0, 7)
      ? Number(s.now.slice(8, 10))
      : new Date(
          Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0),
        ).getUTCDate();
  const data = Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    const rows = r.entries.filter((p) =>
      mode === "Cumulative"
        ? Number(p.at.slice(8, 10)) <= d
        : Number(p.at.slice(8, 10)) === d,
    );
    const actual = rows.reduce((n, p) => n + p.amount, 0),
      retail = rows.reduce((n, p) => n + p.market, 0);
    return { day: d, actual: actual / 100, market: retail / 100 };
  });
  return (
    <section className="panel trend">
      <SectionTitle title="Spending trend">
        <div
          className="chart-switch"
          role="group"
          aria-label="Chart aggregation"
        >
          {["Cumulative", "Daily"].map((option) => (
            <button
              key={option}
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </SectionTitle>
      <div className="chart-meta">
        <div className="chart-amount">
          <strong>{usd(r.fuel)}</strong>
          <small>Total paid at the pump</small>
        </div>
        <div className="legend">
          <span>
            <i />
            Paid at pump
          </span>
          <span>
            <i />
            Pump value
          </span>
        </div>
      </div>
      <div
        className="chart"
        role="group"
        aria-label={mode + " fuel spending compared with pump prices"}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 510, height: 170 }}
        >
          <AreaChart
            data={data}
            margin={{ top: 8, right: 10, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="fuelFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1c8e92" stopOpacity=".23" />
                <stop offset="100%" stopColor="#1c8e92" stopOpacity=".01" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="2 5"
              vertical={false}
              stroke="#dce3df"
            />
            <XAxis
              dataKey="day"
              tickFormatter={(d) =>
                new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                }).format(
                  new Date(
                    month + "-" + String(d).padStart(2, "0") + "T12:00:00Z",
                  ),
                )
              }
              tickLine={false}
              axisLine={false}
              minTickGap={34}
              tick={{ fill: "#667b80", fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => "$" + v}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#667b80", fontSize: 11 }}
            />
            <Tooltip
              formatter={(v) => "$" + Number(v).toFixed(2)}
              labelFormatter={(d) => month + "-" + String(d).padStart(2, "0")}
            />
            <Area
              name="Pump value"
              dataKey="market"
              type="monotone"
              stroke="#a5b8b9"
              strokeDasharray="5 5"
              strokeWidth={2}
              fill="none"
              isAnimationActive={false}
            />
            <Area
              name="Paid at pump"
              dataKey="actual"
              type="monotone"
              stroke="#057077"
              strokeWidth={3}
              fill="url(#fuelFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
