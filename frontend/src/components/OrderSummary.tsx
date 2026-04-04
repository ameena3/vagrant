"use client";

import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, cn, DAY_NAMES, MEAL_TYPES } from "@/lib/utils";
import type { OrderItem } from "@/types";

interface OrderSummaryProps {
  items: OrderItem[];
  onRemoveItem: (index: number) => void;
  onUpdateComment: (index: number, comment: string) => void;
  onCheckout: () => void;
  loading?: boolean;
  stripeDisabled?: boolean;
}

export function OrderSummary({
  items,
  onRemoveItem,
  onUpdateComment,
  onCheckout,
  loading,
  stripeDisabled,
}: OrderSummaryProps) {
  const [expandedCommentIndex, setExpandedCommentIndex] = useState<number | null>(null);

  const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

  if (items.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex h-40 flex-col items-center justify-center gap-3">
          <div className="text-4xl">🛒</div>
          <div className="text-center">
            <p className="font-semibold text-slate-900">Your cart is empty</p>
            <p className="text-sm text-slate-600">
              Add items from the menu to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mealTypeBadgeColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    breakfast: "default",
    lunch: "secondary",
    dinner: "default",
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Order Summary</span>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Items List */}
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {items.map((item, index) => (
            <div key={`${index}`} className="space-y-2 rounded-lg bg-slate-50 p-3">
              {/* Item Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-900">
                      {item.menu_item_name}
                    </h4>
                    <Badge
                      variant={mealTypeBadgeColor[item.meal_type] || "outline"}
                      className="text-xs"
                    >
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
                <button
                  onClick={() => onRemoveItem(index)}
                  className="text-slate-400 transition-colors hover:text-red-500"
                  aria-label="Remove item"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Item Footer */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="font-semibold text-green-600">
                  {formatCurrency(item.price)}
                </span>
                <button
                  onClick={() =>
                    setExpandedCommentIndex(
                      expandedCommentIndex === index ? null : index
                    )
                  }
                  className="text-xs text-slate-500 transition-colors hover:text-slate-700"
                >
                  {item.comment ? "Edit note" : "Add note"}
                </button>
              </div>

              {/* Comment Section */}
              {expandedCommentIndex === index && (
                <div className="border-t border-slate-200 pt-2">
                  <Textarea
                    value={item.comment || ""}
                    onChange={(e) => onUpdateComment(index, e.target.value)}
                    placeholder="Add special instructions or notes..."
                    className="text-xs"
                    rows={2}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    e.g., No onions, extra spicy, etc.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex-col gap-4 border-t border-slate-200">
        {/* Total */}
        <div className="flex w-full items-center justify-between pt-4">
          <span className="text-lg font-semibold text-slate-900">Total</span>
          <span className="text-2xl font-bold text-green-600">
            {formatCurrency(totalAmount)}
          </span>
        </div>

        {/* Checkout Button */}
        <Button
          onClick={onCheckout}
          disabled={items.length === 0 || loading}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-2 h-auto"
          size="lg"
        >
          {loading ? "Processing..." : stripeDisabled ? "Place Order" : "Proceed to Checkout"}
        </Button>

        {stripeDisabled && (
          <p className="text-xs text-center text-slate-600">
            Payment processing is currently disabled. Your order will be placed and payment details will be sent separately.
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
