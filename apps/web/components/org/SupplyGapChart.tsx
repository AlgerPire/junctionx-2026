"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SupplyGapRow {
  skill: string;
  cluster: string;
  demand: number;
  supply: number;
  gap: number;
  suppressed: boolean;
}

export function SupplyGapChart({ rows }: { rows: SupplyGapRow[] }) {
  const data = rows.slice(0, 12).map((r) => ({
    name: r.skill.length > 18 ? `${r.skill.slice(0, 16)}…` : r.skill,
    demand: r.demand,
    supply: r.suppressed ? 0 : r.supply,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4}>
          <CartesianGrid vertical={false} stroke="#d5e5db" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#5a7264" }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={70}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 12, fill: "#5a7264" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(45,122,82,0.06)" }} />
          <Legend iconType="circle" />
          <Bar dataKey="demand" fill="#2d7a52" name="Demand" radius={[6, 6, 0, 0]} maxBarSize={18} />
          <Bar dataKey="supply" fill="#4aad72" name="Supply" radius={[6, 6, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
