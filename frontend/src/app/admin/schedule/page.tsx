"use client";

import React, { useState, useEffect } from "react";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  formatDate,
  getWeekStart,
  getWeekDates,
  localDateStr,
  cn,
} from "@/lib/utils";
import { api } from "@/lib/api";
import type { WeekSchedule } from "@/types";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

export default function SchedulePage() {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null);
  const [weekendsEnabled, setWeekendsEnabled] = useState(false);
  const [hidePrices, setHidePrices] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blockWeekDialogOpen, setBlockWeekDialogOpen] = useState(false);
  const [weekBlockReason, setWeekBlockReason] = useState("");

  // Fetch schedule on mount and when weekStart changes
  useEffect(() => {
    fetchSchedule();
  }, [weekStart]);

  async function fetchSchedule() {
    setLoading(true);
    try {
      const [data, settings] = await Promise.all([
        api.getSchedule(weekStart),
        api.getPublicSettings(),
      ]);
      if (data) {
        setSchedule(data);
        setWeekendsEnabled(data.weekends_enabled);
      }
      setHidePrices(settings?.hide_prices ?? false);
    } catch (err) {
      console.error("Error fetching schedule:", err);
    }
    setLoading(false);
  }

  async function handleToggleHidePrices(hide: boolean) {
    setHidePrices(hide);
    try {
      await api.toggleHidePrices(hide);
    } catch (err: any) {
      setHidePrices(!hide);
      toast({ title: "Error", description: err?.message || "Failed to update price visibility.", variant: "destructive" });
    }
  }

  async function handleToggleWeekends(enabled: boolean) {
    setWeekendsEnabled(enabled);
    try {
      await api.toggleWeekends(enabled);
      await fetchSchedule();
    } catch (err: any) {
      console.error("Error toggling weekends:", err);
      setWeekendsEnabled(!enabled);
      toast({ title: "Error", description: err?.message || "Failed to update weekends setting.", variant: "destructive" });
    }
  }

  async function handleBlockDay(dayOfWeek: number) {
    if (schedule) {
      const day = schedule.days.find(d => d.day_of_week === dayOfWeek);
      if (day) {
        try {
          await api.updateDay({
            date: day.date,
            blocked: true,
            block_reason: undefined,
          });
          await fetchSchedule();
        } catch (err: any) {
          console.error("Error blocking day:", err);
          toast({ title: "Error", description: err?.message || "Failed to block day.", variant: "destructive" });
        }
      }
    }
  }

  async function handleUnblockDay(dayOfWeek: number) {
    if (schedule) {
      const day = schedule.days.find(d => d.day_of_week === dayOfWeek);
      if (day) {
        try {
          await api.updateDay({
            date: day.date,
            blocked: false,
          });
          await fetchSchedule();
        } catch (err: any) {
          console.error("Error unblocking day:", err);
          toast({ title: "Error", description: err?.message || "Failed to unblock day.", variant: "destructive" });
        }
      }
    }
  }

  async function handleBlockWeek() {
    try {
      await api.updateWeek({
        week_start: weekStart,
        blocked: true,
        block_reason: weekBlockReason || undefined,
      });
      setWeekBlockReason("");
      setBlockWeekDialogOpen(false);
      await fetchSchedule();
    } catch (err: any) {
      console.error("Error blocking week:", err);
      toast({ title: "Error", description: err?.message || "Failed to block week.", variant: "destructive" });
    }
  }

  async function handleUnblockWeek() {
    try {
      await api.updateWeek({
        week_start: weekStart,
        blocked: false,
      });
      await fetchSchedule();
    } catch (err: any) {
      console.error("Error unblocking week:", err);
      toast({ title: "Error", description: err?.message || "Failed to unblock week.", variant: "destructive" });
    }
  }

  const weekDates = getWeekDates(weekStart);
  const weekEndDate = new Date(weekDates[6]);
  const weekRange = `${formatDate(weekDates[0])} - ${formatDate(weekEndDate)}`;

  const previousWeek = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() - 7);
    setWeekStart(localDateStr(date));
  };

  const nextWeek = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + 7);
    setWeekStart(localDateStr(date));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Schedule Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage weekly availability and block days as needed
        </p>
      </div>

      {/* Weekend Toggle */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-semibold">
                Weekend Bookings Enabled
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow customers to book meals on weekends
              </p>
            </div>
            <Switch
              checked={weekendsEnabled}
              onCheckedChange={handleToggleWeekends}
            />
          </div>
        </CardContent>
      </Card>

      {/* Hide Prices Toggle */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-semibold">
                Hide Prices from Customers
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, customers will not see prices on the menu or in their cart
              </p>
            </div>
            <Switch
              checked={hidePrices}
              onCheckedChange={handleToggleHidePrices}
            />
          </div>
        </CardContent>
      </Card>

      {/* Week Navigator */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Week of {weekRange}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={previousWeek}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextWeek}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Schedule Calendar */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">Loading schedule...</p>
        </div>
      ) : (
        <>
          <ScheduleCalendar
            weekStart={weekStart}
            schedule={schedule}
            onBlockDay={handleBlockDay}
            onUnblockDay={handleUnblockDay}
            weekendsEnabled={weekendsEnabled}
          />

          {/* Week Actions */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-sm text-orange-900">
                      Block Entire Week
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      Disable bookings for all days in this week
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={blockWeekDialogOpen} onOpenChange={setBlockWeekDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          Block Week
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Block Entire Week</DialogTitle>
                          <DialogDescription>
                            Add a reason for blocking this week (optional)
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Reason (e.g., Kitchen maintenance)"
                            value={weekBlockReason}
                            onChange={(e) => setWeekBlockReason(e.target.value)}
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setBlockWeekDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleBlockWeek}
                          >
                            Block Week
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUnblockWeek}
                    >
                      Unblock Week
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
