"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Order } from "@/types";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      api.getOrder(orderId)
        .then(setOrder)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderId]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
      {/* Confetti particles */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {[
          { emoji: "🎉", left: "10%", delay: "0s", dur: "9s" },
          { emoji: "✨", left: "22%", delay: "1.2s", dur: "10s" },
          { emoji: "🥗", left: "35%", delay: "2.4s", dur: "11s" },
          { emoji: "🎊", left: "48%", delay: "0.8s", dur: "9s" },
          { emoji: "✨", left: "62%", delay: "3.1s", dur: "10s" },
          { emoji: "🍃", left: "75%", delay: "1.8s", dur: "12s" },
          { emoji: "🎉", left: "88%", delay: "4s", dur: "11s" },
        ].map((p, i) => (
          <span
            key={i}
            className="rise-particle animate-rise text-2xl"
            style={{ left: p.left, animationDelay: p.delay, animationDuration: p.dur }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      {/* Header */}
      <div className="relative border-b border-green-200 dark:border-green-900/50 bg-card/90 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex-1" />
          <h1 className="text-lg font-bold text-green-900 dark:text-green-300">Order Confirmation</h1>
          <div className="flex-1" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6">
        {/* Success Animation */}
        <div className="flex justify-center">
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 animate-pulse rounded-full bg-green-200 dark:bg-green-800" />
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400 drop-shadow-lg animate-bounce" />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold text-green-900 dark:text-green-300">
            Your Order Is Confirmed!
          </h2>
          <p className="text-lg text-muted-foreground">
            Thank you for your order. We'll prepare your fresh meals with care.
          </p>
        </div>

        {/* Order Details Card */}
        {orderId && (
          <Card className="border-green-200 dark:border-green-900/50 bg-card">
            <CardHeader>
              <CardTitle className="text-green-900 dark:text-green-300">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Order ID</p>
                <p className="font-mono text-sm font-semibold text-foreground break-all">
                  {orderId}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-800">
                    ✓ Confirmed
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Order Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {order
                      ? formatDate(order.created_at)
                      : new Date().toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                  </p>
                </div>
              </div>

              {!loading && order && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {item.menu_item_name}{" "}
                          <span className="text-muted-foreground capitalize">({item.meal_type})</span>
                        </span>
                        <span className="font-medium">{formatCurrency(item.price)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {loading && (
                <p className="text-sm text-muted-foreground text-center py-2">Loading order details...</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Helpful Info */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20">
          <CardContent className="pt-6 space-y-2">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              💡 Need to make changes?
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Contact us at support@freshkitchen.com. We'll be happy to help!
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Link href="/" className="block">
            <Button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 h-auto text-base gap-2">
              <Home className="h-5 w-5" />
              Back to Menu
            </Button>
          </Link>
          <button
            onClick={() => {
              if (orderId) {
                navigator.clipboard.writeText(orderId);
                alert("Order ID copied to clipboard!");
              }
            }}
            className="w-full py-2 px-4 rounded-md border border-border hover:bg-muted/50 text-foreground font-medium transition-colors"
          >
            Copy Order ID
          </button>
        </div>

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>Thank you for choosing Fresh Kitchen!</p>
          <p>We're excited to prepare your meals.</p>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <OrderSuccessContent />
    </Suspense>
  );
}
