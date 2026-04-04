"use client";

import { useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Announcement } from "@/types";

interface AnnouncementBannerProps {
  announcements: Announcement[];
}

export function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAnnouncements = announcements.filter(
    (a) => a.active && !dismissed.has(a.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  return (
    <div className="space-y-2 px-4 py-2">
      {visibleAnnouncements.map((announcement) => {
        let bgColor = "bg-blue-50 border-blue-200 text-blue-800";
        let iconColor = "text-blue-500";
        let Icon = Info;

        if (announcement.type === "warning") {
          bgColor = "bg-yellow-50 border-yellow-200 text-yellow-800";
          iconColor = "text-yellow-500";
          Icon = AlertTriangle;
        } else if (announcement.type === "urgent") {
          bgColor = "bg-red-50 border-red-200 text-red-800";
          iconColor = "text-red-500";
          Icon = AlertCircle;
        }

        return (
          <div
            key={announcement.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 animate-in fade-in duration-300",
              bgColor
            )}
          >
            <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", iconColor)} />
            <p className="flex-1 text-sm font-medium">{announcement.message}</p>
            <button
              onClick={() => dismiss(announcement.id)}
              className="flex-shrink-0 transition-opacity hover:opacity-70"
              aria-label="Dismiss announcement"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
