"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BookingTable } from "@/components/BookingTable";
import { api } from "@/lib/api";
import { Order } from "@/types";
import { formatDate, getWeekStart } from "@/lib/utils";
import { Download } from "lucide-react";

export default function BookingsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(getWeekStart());

  const today = new Date();
  const currentWeekStart = getWeekStart(today);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() - (3 - i) * 7);
    const weekStart = date.toISOString().split("T")[0];
    return {
      label: `Week of ${formatDate(weekStart)}`,
      value: weekStart,
    };
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = selectedWeek
          ? await api.getOrders(selectedWeek)
          : await api.getOrders();
        setOrders(data);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [selectedWeek]);

  const handleExport = () => {
    if (orders.length === 0) {
      return;
    }

    const csv = [
      [
        "Order ID",
        "Customer Name",
        "Customer Email",
        "Date",
        "Items Count",
        "Total Amount",
        "Status",
      ],
      ...orders.map((order) => [
        order.id,
        order.customer_name,
        order.customer_email,
        new Date(order.created_at).toLocaleDateString(),
        order.items.length,
        order.total_amount,
        order.status,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${selectedWeek}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Bookings</h1>
        <p className="text-slate-600 mt-2">
          View and manage all customer bookings and orders.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:w-64">
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger>
              <SelectValue placeholder="Select a week" />
            </SelectTrigger>
            <SelectContent>
              {weeks.map((week) => (
                <SelectItem key={week.value} value={week.value}>
                  {week.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          onClick={handleExport}
          disabled={orders.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <BookingTable orders={orders} loading={loading} />
    </div>
  );
}
