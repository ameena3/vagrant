"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnalyticsCards } from "@/components/AnalyticsCards";
import { HoneycombBackdrop } from "@/components/HoneycombBackdrop";
import { api } from "@/lib/api";
import { AnalyticsSummary, OrderTrend, PopularItem } from "@/types";
import { formatCurrency, localDateStr } from "@/lib/utils";

const OrderTrendsChart = dynamic(
  () =>
    import("@/components/OrderTrendsChart").then((m) => ({
      default: m.OrderTrendsChart,
    })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
);
const RevenueChart = dynamic(
  () =>
    import("@/components/RevenueChart").then((m) => ({
      default: m.RevenueChart,
    })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
);

function get30DaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return localDateStr(d);
}

function getToday() {
  return localDateStr(new Date());
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<OrderTrend[]>([]);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const [fromDate, setFromDate] = useState(get30DaysAgo());
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

  const revenueByDay = trends.map((trend) => ({
    date: new Date(trend.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    revenue: trend.revenue,
    orders: trend.order_count,
  }));

  return (
    <div className="relative space-y-8">
      <HoneycombBackdrop
        className="hidden md:block -top-8 -right-16 opacity-20 dark:opacity-15"
        rows={4}
        cols={5}
        cellSize={72}
      />
      <div className="relative">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back. Here's what's happening with Fresh Kitchen today.
        </p>
      </div>

      <AnalyticsCards summary={summary} loading={loading} />

      {/* Period summary */}
      {!trendsLoading && trends.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Period ({fromDate} – {toDate}):{" "}
          {trends.reduce((sum, t) => sum + t.order_count, 0)} orders,{" "}
          {formatCurrency(trends.reduce((sum, t) => sum + t.revenue, 0))}{" "}
          revenue
        </p>
      )}

      {/* Date range controls */}
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label className="text-sm text-muted-foreground">From</Label>
          <Input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-sm text-muted-foreground">To</Label>
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
              <OrderTrendsChart data={revenueByDay} />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
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
              <RevenueChart data={revenueByDay} />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
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
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {item.meal_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {item.order_count} orders
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No popular items data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
