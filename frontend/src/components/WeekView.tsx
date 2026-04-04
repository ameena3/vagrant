"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, localDateStr, getWeekDates, DAY_NAMES } from "@/lib/utils";
import type { WeekSchedule } from "@/types";

interface WeekViewProps {
  weekStart: string;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  onNavigateWeek: (direction: number) => void;
  schedule?: WeekSchedule | null;
}

export function WeekView({
  weekStart,
  selectedDay,
  onSelectDay,
  onNavigateWeek,
  schedule,
}: WeekViewProps) {
  const dates = getWeekDates(weekStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigateWeek(-1)}
          className="hover:bg-green-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold text-slate-600">
          {dates[0].toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}{" "}
          -{" "}
          {dates[6].toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigateWeek(1)}
          className="hover:bg-green-100"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-2 px-2">
        {dates.map((date, dayIndex) => {
          const dateStr = localDateStr(date);
          const scheduleDay = schedule?.days?.find(
            (d) => d.day_of_week === dayIndex
          );
          const isBlocked = scheduleDay?.blocked || false;
          const isWeekend = dayIndex === 0 || dayIndex === 6;
          const isWeekendDisabled = isWeekend && !schedule?.weekends_enabled;
          const isToday = dateStr === localDateStr(today);
          const isSelected = selectedDay === dayIndex;
          const isDisabled = isBlocked || isWeekendDisabled;

          return (
            <button
              key={dayIndex}
              onClick={() => !isDisabled && onSelectDay(dayIndex)}
              disabled={isDisabled}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all duration-200",
                isSelected
                  ? "border-green-500 bg-green-50 shadow-md"
                  : "border-slate-200 bg-white hover:border-slate-300",
                isDisabled && "cursor-not-allowed opacity-50",
                isToday && !isSelected && "ring-2 ring-orange-300 ring-offset-1"
              )}
            >
              <span className="text-xs font-semibold text-slate-600">
                {DAY_NAMES[dayIndex].slice(0, 3)}
              </span>
              <span className={cn(
                "text-sm font-bold",
                isSelected ? "text-green-600" : "text-slate-900"
              )}>
                {date.getDate()}
              </span>
              {isDisabled && (
                <span className="text-[10px] text-slate-500">
                  {isBlocked ? "Closed" : "N/A"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
