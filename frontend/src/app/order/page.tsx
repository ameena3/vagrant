"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { ArrowLeft, LogIn, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, DAY_NAMES, getWeekStart } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Order, OrderItem } from "@/types";

function OrderPageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCommentIndex, setExpandedCommentIndex] = useState<number | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    // Load order from API if orderId exists
    if (orderId) {
      loadOrder();
    } else {
      // Check localStorage for cart data
      const cartData = localStorage.getItem("cart");
      if (cartData) {
        try {
          setItems(JSON.parse(cartData));
        } catch (err) {
          console.error("Failed to parse cart data:", err);
        }
      }
      setLoading(false);
    }
  }, [orderId]);

  async function loadOrder() {
    if (!orderId) return;
    setLoading(true);
    try {
      const orderData = await api.getOrder(orderId);
      setOrder(orderData);
    } catch (err) {
      console.error("Failed to load order:", err);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!session?.user) {
      signIn();
      return;
    }

    if (items.length === 0 && !order) {
      setError("No items to checkout");
      return;
    }

    setCheckoutLoading(true);
    try {
      if (order) {
        // Use existing order
        const result = await api.checkout(order.id);
        if (result?.checkout_url) {
          window.location.href = result.checkout_url;
        } else if (!result?.checkout_url) {
          // If Stripe is disabled, redirect to success page
          router.push(`/order/success?orderId=${order.id}`);
        } else {
          setError("Failed to initiate checkout");
        }
      } else {
        // Create new order
        const newOrder = await api.createOrder({
          items,
          week_start: getWeekStart(),
        });

        if (newOrder) {
          // Proceed to checkout
          const result = await api.checkout(newOrder.id);
          if (result?.checkout_url) {
            window.location.href = result.checkout_url;
          } else if (!result?.checkout_url) {
            router.push(`/order/success?orderId=${newOrder.id}`);
          } else {
            setError("Failed to initiate checkout");
          }
        } else {
          setError("Failed to create order");
        }
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError("An error occurred during checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItemComment(index: number, comment: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, comment } : item))
    );
  }

  const displayItems = order?.items || items;
  const totalAmount = order ? order.total_amount : displayItems.reduce((sum, item) => sum + item.price, 0);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back to Menu</span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Order Review</h1>
          <div className="w-12" />
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6">
        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {/* Items */}
        {displayItems.length > 0 ? (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {displayItems.map((item, index) => (
                <div key={`${index}`} className="space-y-2 rounded-lg bg-slate-50 p-4">
                  {/* Item Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-900">
                          {item.menu_item_name}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          {item.meal_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        {DAY_NAMES[item.day_of_week]},{" "}
                        {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(item.price)}
                      </p>
                      {!order && (
                        <button
                          onClick={() => removeItem(index)}
                          className="text-xs text-slate-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment Section */}
                  <div className="border-t border-slate-200 pt-2">
                    {expandedCommentIndex === index ? (
                      <div className="space-y-2">
                        <Textarea
                          value={item.comment || ""}
                          onChange={(e) =>
                            updateItemComment(index, e.target.value)
                          }
                          placeholder="Add special instructions..."
                          className="text-xs"
                          rows={2}
                          disabled={!!order}
                        />
                        <button
                          onClick={() => setExpandedCommentIndex(null)}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setExpandedCommentIndex(index)}
                        className="text-xs text-slate-600 hover:text-slate-900"
                        disabled={!!order}
                      >
                        {item.comment ? (
                          <>
                            <p className="text-slate-700 font-medium">
                              Note: {item.comment}
                            </p>
                            {!order && <p className="text-slate-600">Edit</p>}
                          </>
                        ) : (
                          !order && "Add special instructions"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="flex h-40 flex-col items-center justify-center gap-3">
              <div className="text-4xl">🛒</div>
              <div className="text-center">
                <p className="font-semibold text-slate-900">No items to order</p>
                <p className="text-sm text-slate-600">
                  <Link href="/" className="text-green-600 hover:text-green-700">
                    Go back to menu
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Summary */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-slate-900">Total</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checkout Section */}
        {displayItems.length > 0 && (
          <div className="space-y-3">
            {!session?.user ? (
              <Button
                onClick={() => signIn()}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 h-auto text-base gap-2"
                size="lg"
              >
                <LogIn className="h-5 w-5" />
                Sign In to Place Order
              </Button>
            ) : (
              <Button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 h-auto text-base gap-2"
                size="lg"
              >
                {checkoutLoading && (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
                {checkoutLoading
                  ? "Processing..."
                  : "Proceed to Checkout"}
              </Button>
            )}
            <p className="text-center text-xs text-slate-600">
              {session?.user
                ? `Signed in as ${session.user.email}`
                : "Sign in with Google to continue"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>}>
      <OrderPageContent />
    </Suspense>
  );
}
