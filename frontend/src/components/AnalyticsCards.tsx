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
}

export function AnalyticsCards({ summary, loading }: AnalyticsCardsProps) {
  const cards = [
    {
      label: "Total Orders",
      value: summary?.total_orders ?? 0,
      icon: ShoppingCart,
      color: "bg-blue-50 dark:bg-blue-950/40",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(summary?.total_revenue ?? 0),
      icon: DollarSign,
      color: "bg-green-50 dark:bg-green-950/40",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      label: "Customers",
      value: summary?.total_customers ?? 0,
      icon: Users,
      color: "bg-purple-50 dark:bg-purple-950/40",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "This Week's Orders",
      value: summary?.orders_this_week ?? 0,
      icon: TrendingUp,
      color: "bg-orange-50 dark:bg-orange-950/40",
      iconColor: "text-orange-600 dark:text-orange-400",
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
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
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
