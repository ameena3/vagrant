"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, DAY_NAMES, getWeekDates, cn } from "@/lib/utils";
import type { WeekSchedule } from "@/types";
import { Check, Ban } from "lucide-react";

interface ScheduleCalendarProps {
  weekStart: string;
  schedule: WeekSchedule | null;
  onBlockDay: (dayOfWeek: number) => void;
  onUnblockDay: (dayOfWeek: number) => void;
  weekendsEnabled: boolean;
}

export function ScheduleCalendar({
  weekStart,
  schedule,
  onBlockDay,
  onUnblockDay,
  weekendsEnabled,
}: ScheduleCalendarProps) {
  const weekDates = getWeekDates(weekStart);
  const isWeekend = (dayOfWeek: number) => dayOfWeek === 0 || dayOfWeek === 6;

  if (!schedule) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {schedule.days.map((day, index) => {
        const isWeekendDay = isWeekend(day.day_of_week);
        const isBlocked = day.blocked;
        const date = weekDates[index];

        return (
          <Card
            key={day.id}
            className={cn(
              "transition-all hover:shadow-lg",
              isBlocked
                ? "border-red-300 bg-red-50"
                : "border-green-300 bg-green-50"
            )}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div>
                  <p className="font-semibold text-sm">
                    {DAY_NAMES[day.day_of_week]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(date)}
                  </p>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  {isBlocked ? (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                      <Ban className="h-3 w-3 mr-1" />
                      Blocked
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      <Check className="h-3 w-3 mr-1" />
                      Open
                    </Badge>
                  )}

                  {isWeekendDay && !weekendsEnabled && (
                    <Badge variant="outline" className="text-gray-600">
                      Weekends Off
                    </Badge>
                  )}
                </div>

                {/* Block Reason */}
                {isBlocked && day.block_reason && (
                  <p className="text-xs bg-red-100 p-2 rounded text-red-700">
                    {day.block_reason}
                  </p>
                )}

                {/* Toggle Button */}
                <Button
                  variant={isBlocked ? "outline" : "destructive"}
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    isBlocked ? onUnblockDay(day.day_of_week) : onBlockDay(day.day_of_week)
                  }
                  disabled={isWeekendDay && !weekendsEnabled}
                >
                  {isBlocked ? "Unblock" : "Block"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
