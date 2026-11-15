"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { lineCents, perGallon, usd } from "@/server/domain/money";

export default function PayoffChart({
  cap,
  current,
  volume,
  fees,
  spread,
}: {
  cap: number;
  current: number;
  volume: number;
  fees: number;
  spread: number;
}) {
  const threshold = cap + spread;
  const left = Math.max(0, Math.min(cap - 200000, current));
  const right = Math.max(threshold + 200000, current, cap + 500000);
  const data = [...new Set([left, cap, threshold, current, right])]
    .sort((a, b) => a - b)
    .map((price) => ({
      price,
      net: lineCents(volume, Math.max(0, price - cap)) - fees,
    }));
  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart
        data={data}
        margin={{ top: 16, left: 2, right: 14, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 5" vertical={false} />
        <XAxis
          type="number"
          dataKey="price"
          domain={[left, right]}
          allowDecimals={false}
          tickCount={4}
          tickFormatter={perGallon}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          allowDecimals={false}
          tickFormatter={usd}
          width={56}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(v) => [usd(Number(v)), "Net result"]}
          labelFormatter={(v) => perGallon(Number(v)) + "/gal"}
        />
        <ReferenceLine y={0} stroke="#64847d" />
        <Line
          type="linear"
          dataKey="net"
          stroke="#096b6b"
          strokeWidth={3}
          dot={false}
          isAnimationActive={false}
        />
        <ReferenceDot
          x={threshold}
          y={0}
          r={5}
          fill="#ffcf54"
          stroke="#244941"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
