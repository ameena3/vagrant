"use client";

import { Plus } from "lucide-react";
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
}

export function MenuItemCard({
  item,
  mealType,
  date,
  dayOfWeek,
  onAddToCart,
}: MenuItemCardProps) {
  function handleAdd() {
    onAddToCart({
      date,
      day_of_week: dayOfWeek,
      meal_type: mealType,
      menu_item_name: item.name,
      price: item.price,
    });
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
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {/* Image or Placeholder */}
      <div
        className={cn(
          "aspect-video w-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-center px-4",
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

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-slate-900 line-clamp-2">
            {item.name}
          </h3>
          <p className="text-sm text-slate-600 line-clamp-2 mt-1">
            {item.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-lg font-bold text-green-600">
            {formatCurrency(item.price)}
          </span>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
