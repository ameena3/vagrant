"use client";

import { Coffee, Sun, Moon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItemCard } from "@/components/MenuItemCard";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DayMenu as DayMenuType, OrderItem } from "@/types";

interface DayMenuProps {
  menu?: DayMenuType;
  loading?: boolean;
  onAddToCart: (item: OrderItem) => void;
  date: string;
  hidePrices?: boolean;
}

export function DayMenu({
  menu,
  loading,
  onAddToCart,
  date,
  hidePrices,
}: DayMenuProps) {
  if (loading) {
    return (
      <div className="space-y-6 p-4">
        {[1, 2, 3].map((section) => (
          <div key={section} className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((item) => (
                <Skeleton key={item} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!menu || !menu.enabled) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <div className="text-4xl">🚫</div>
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">No Menu Available</p>
          <p className="text-sm text-slate-600">
            This day is not available for ordering.
          </p>
        </div>
      </div>
    );
  }

  const mealSections = [
    {
      type: "breakfast" as const,
      label: "Breakfast",
      icon: Coffee,
      items: menu.meals?.breakfast || [],
    },
    {
      type: "lunch" as const,
      label: "Lunch",
      icon: Sun,
      items: menu.meals?.lunch || [],
    },
    {
      type: "dinner" as const,
      label: "Dinner",
      icon: Moon,
      items: menu.meals?.dinner || [],
    },
  ];

  return (
    <div className="space-y-8 p-4">
      {mealSections.map((section, index) => {
        const Icon = section.icon;
        const hasItems = section.items && section.items.length > 0;

        return (
          <div key={section.type} className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center gap-3 pt-4">
              <Icon className="h-6 w-6 text-orange-500" />
              <h2 className="text-xl font-semibold text-slate-900">
                {section.label}
              </h2>
              <span className="text-sm text-slate-500">
                ({hasItems ? section.items.length : 0} items)
              </span>
            </div>

            {/* Items Grid */}
            {hasItems ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item, itemIndex) => (
                  <MenuItemCard
                    key={`${section.type}-${itemIndex}`}
                    item={item}
                    mealType={section.type}
                    date={date}
                    dayOfWeek={menu.day_of_week}
                    onAddToCart={onAddToCart}
                    hidePrices={hidePrices}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 p-8 text-center">
                <p className="text-sm text-slate-600">
                  No items available for {section.label.toLowerCase()}
                </p>
              </div>
            )}

            {/* Separator */}
            {index < mealSections.length - 1 && (
              <Separator className="mt-6" />
            )}
          </div>
        );
      })}
    </div>
  );
}
