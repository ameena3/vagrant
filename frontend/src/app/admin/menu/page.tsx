"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuEditor } from "@/components/MenuEditor";
import { api } from "@/lib/api";
import { DayMenu } from "@/types";
import {
  DAY_NAMES,
  formatDate,
  getWeekStart,
  getWeekDates,
  localDateStr,
} from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function MenuManagement() {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [menus, setMenus] = useState<DayMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);

  const weekDates = getWeekDates(weekStart);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        setLoading(true);
        const data = await api.getWeekMenus(weekStart);
        setMenus(data);
      } catch (error) {
        console.error("Error fetching menus:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, [weekStart]);

  const handlePrevWeek = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() - 7);
    setWeekStart(localDateStr(date));
  };

  const handleNextWeek = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + 7);
    setWeekStart(localDateStr(date));
  };

  const getMenuForDay = (dayOfWeek: number): DayMenu | null => {
    return menus.find((m) => m.day_of_week === dayOfWeek) || null;
  };

  const handleSave = async () => {
    const data = await api.getWeekMenus(weekStart);
    setMenus(data);
  };

  const handleDelete = async () => {
    const data = await api.getWeekMenus(weekStart);
    setMenus(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Menu Management</h1>
        <p className="text-slate-600 mt-2">
          Create and manage menus for each day of the week.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Week View</CardTitle>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevWeek}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous Week
              </Button>

              <div className="text-center min-w-48">
                <p className="text-sm text-slate-600">Selected Week</p>
                <p className="font-semibold text-lg">
                  {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
              >
                Next Week
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : (
            <Tabs
              value={selectedDay.toString()}
              onValueChange={(val) => setSelectedDay(parseInt(val))}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-7 mb-6">
                {DAY_NAMES.map((day, idx) => {
                  const menu = getMenuForDay(idx);
                  return (
                    <TabsTrigger key={idx} value={idx.toString()}>
                      <div className="text-center">
                        <p className="text-xs sm:text-sm">{day.slice(0, 3)}</p>
                        {menu?.enabled && (
                          <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mt-1" />
                        )}
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {DAY_NAMES.map((day, idx) => {
                const menu = getMenuForDay(idx);
                const date = weekDates[idx];
                const dateStr = localDateStr(date);

                return (
                  <TabsContent key={idx} value={idx.toString()}>
                    <MenuEditor
                      weekStart={weekStart}
                      dayOfWeek={idx}
                      date={dateStr}
                      menu={menu}
                      onSave={handleSave}
                      onDelete={handleDelete}
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
