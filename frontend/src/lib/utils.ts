import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a Date as YYYY-MM-DD using LOCAL time (avoids UTC midnight shift). */
export function localDateStr(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function formatDate(date: string | Date): string {
  // Bare YYYY-MM-DD strings are parsed as UTC midnight by JS, shifting the day in
  // non-UTC timezones. Parse them at local noon instead. Full ISO timestamps
  // (already contain "T") are passed through unchanged.
  const d = typeof date === "string"
    ? new Date(date.length === 10 ? date + "T12:00:00" : date)
    : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return localDateStr(d); // local date string, not UTC
}

export function getWeekDates(weekStart: string): Date[] {
  const start = new Date(weekStart + "T00:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;
