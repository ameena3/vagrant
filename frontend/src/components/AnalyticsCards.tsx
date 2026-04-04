"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { AnalyticsSummary } from "@/types";
import {
  ShoppingCart,
  DollarSign,
  Users,
  TrendingUp,
} from "lucide-react";

interface AnalyticsCardsProps {
  summary: AnalyticsSummary | null;
  loading: boolean;
  periodOrders?: number;
  periodRevenue?: number;
  periodLabel?: string;
}

export function AnalyticsCards({ summary, loading, periodOrders, periodRevenue, periodLabel }: AnalyticsCardsProps) {
  const cards = [
    {
      label: periodLabel ? `Orders (${periodLabel})` : "Total Orders",
      value: periodOrders ?? summary?.total_orders ?? 0,
      icon: ShoppingCart,
      color: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: periodLabel ? `Revenue (${periodLabel})` : "Total Revenue",
      value: formatCurrency(periodRevenue ?? summary?.total_revenue ?? 0),
      icon: DollarSign,
      color: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Customers",
      value: summary?.total_customers ?? 0,
      icon: Users,
      color: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "This Week's Orders",
      value: summary?.orders_this_week ?? 0,
      icon: TrendingUp,
      color: "bg-orange-50",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className={card.color}>
            <CardContent className="p-6">
              {loading ? (
                <>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">{card.label}</p>
                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {card.value}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
