"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnalyticsCards } from "@/components/AnalyticsCards";
import { api } from "@/lib/api";
import { AnalyticsSummary, OrderTrend, PopularItem } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<OrderTrend[]>([]);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const [fromDate, setFromDate] = useState(getMonthStart());
  const [toDate, setToDate] = useState(getToday());

  useEffect(() => {
    const fetchStatic = async () => {
      try {
        setLoading(true);
        const [summaryData, itemsData] = await Promise.all([
          api.getAnalyticsSummary(),
          api.getPopularItems(),
        ]);
        setSummary(summaryData);
        setPopularItems(itemsData || []);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatic();
  }, []);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setTrendsLoading(true);
        const trendsData = await api.getOrderTrends(fromDate, toDate);
        setTrends(trendsData || []);
      } catch (error) {
        console.error("Error fetching trends:", error);
      } finally {
        setTrendsLoading(false);
      }
    };
    if (fromDate && toDate && fromDate <= toDate) {
      fetchTrends();
    }
  }, [fromDate, toDate]);

  const periodOrders = trends.reduce((sum, t) => sum + t.order_count, 0);
  const periodRevenue = trends.reduce((sum, t) => sum + t.revenue, 0);
  const periodLabel = `${fromDate} – ${toDate}`;

  const revenueByDay = trends.map((trend) => ({
    date: new Date(trend.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    revenue: trend.revenue,
    orders: trend.order_count,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Welcome back. Here's what's happening with Fresh Kitchen today.
        </p>
      </div>

      <AnalyticsCards
        summary={summary}
        loading={loading || trendsLoading}
        periodOrders={periodOrders}
        periodRevenue={periodRevenue}
        periodLabel={periodLabel}
      />

      {/* Date range controls */}
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label className="text-sm text-slate-600">From</Label>
          <Input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-sm text-slate-600">To</Label>
          <Input
            type="date"
            value={toDate}
            min={fromDate}
            max={getToday()}
            onChange={(e) => setToDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || trendsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueByDay}>
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
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Day</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || trendsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : revenueByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Popular Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : popularItems.length > 0 ? (
            <div className="space-y-3">
              {popularItems.slice(0, 10).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500 capitalize">
                      {item.meal_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {item.order_count} orders
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-500">
              No popular items data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
