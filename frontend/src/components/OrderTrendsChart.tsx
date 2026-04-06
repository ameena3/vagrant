"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface OrderTrendsChartProps {
  data: Array<{ date: string; revenue: number; orders: number }>;
}

export function OrderTrendsChart({ data }: OrderTrendsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="orders"
          stroke="#3b82f6"
          name="Orders"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
