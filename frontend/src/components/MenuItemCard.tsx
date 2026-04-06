"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import type { MenuItem, OrderItem } from "@/types";

interface MenuItemCardProps {
  item: MenuItem;
  mealType: "breakfast" | "lunch" | "dinner";
  date: string;
  dayOfWeek: number;
  onAddToCart: (item: OrderItem) => void;
  hidePrices?: boolean;
}

export function MenuItemCard({
  item,
  mealType,
  date,
  dayOfWeek,
  onAddToCart,
  hidePrices,
}: MenuItemCardProps) {
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    onAddToCart({
      date,
      day_of_week: dayOfWeek,
      meal_type: mealType,
      menu_item_name: item.name,
      price: item.price,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  // Gradient backgrounds for placeholder images
  const gradients = [
    "from-green-400 to-green-600",
    "from-orange-400 to-orange-600",
    "from-amber-400 to-amber-600",
    "from-emerald-400 to-emerald-600",
  ];
  const gradientIndex = item.name.charCodeAt(0) % gradients.length;
  const gradient = gradients[gradientIndex];

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02]">
      {/* Decorative hex badge */}
      <div
        className="pointer-events-none absolute -top-3 -left-3 z-10 h-10 w-10 group-hover:animate-hex-float"
        aria-hidden="true"
      >
        <div className="hex h-full w-full" />
      </div>
      {/* Sparkle */}
      <span
        className="pointer-events-none absolute top-2 right-2 z-10 text-lg animate-sway"
        aria-hidden="true"
      >
        ✨
      </span>
      {/* Image or Placeholder */}
      <div className="relative aspect-video w-full overflow-hidden">
        <div
          className={cn(
            "h-full w-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-center px-4 transition-transform duration-500 group-hover:scale-105",
            `from-green-400 to-green-600`
          )}
        >
          {item.image_path ? (
            <img
              src={item.image_path}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm">{item.name}</span>
          )}
        </div>
        {/* Shimmer overlay on hover */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent bg-[length:200%_100%] opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"
          aria-hidden="true"
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-2">
            {item.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {item.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {!hidePrices && (
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(item.price)}
            </span>
          )}
          <Button
            size="sm"
            className={justAdded
              ? "bg-green-500 hover:bg-green-600 active:scale-90 transition-transform text-white animate-add-pop gap-1"
              : "bg-orange-500 hover:bg-orange-600 active:scale-90 transition-transform text-white"}
            onClick={handleAdd}
          >
            {justAdded ? (
              <>
                <Check className="h-4 w-4" />
                Added
              </>
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
