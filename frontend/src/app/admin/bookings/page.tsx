"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BookingTable } from "@/components/BookingTable";
import { BookingForm } from "@/components/BookingForm";
import { api } from "@/lib/api";
import { Order } from "@/types";
import { Download, Plus } from "lucide-react";

function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function BookingsPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const months = useMemo(() => getMonthOptions(), []);

  const orders = useMemo(() => {
    if (!selectedMonth) return allOrders;
    return allOrders.filter((o) => {
      const d = new Date(o.created_at);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return m === selectedMonth;
    });
  }, [allOrders, selectedMonth]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getOrders();
      setAllOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleExport = () => {
    if (orders.length === 0) return;

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
    a.download = `bookings-${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  async function handleFormSubmit(data: {
    customer_name: string;
    customer_email: string;
    week_start: string;
    status: string;
    items: Array<{
      date: string;
      day_of_week: number;
      meal_type: string;
      menu_item_name: string;
      price: number;
      comment?: string;
    }>;
  }) {
    try {
      if (editingOrder) {
        await api.updateOrder(editingOrder.id, data);
      } else {
        await api.adminCreateOrder(data);
      }
      await fetchOrders();
      setEditingOrder(null);
    } catch (error) {
      console.error("Failed to save booking:", error);
      throw error;
    }
  }

  async function handleDeleteOrder(order: Order) {
    try {
      await api.deleteOrder(order.id);
      await fetchOrders();
    } catch (error) {
      console.error("Failed to delete booking:", error);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bookings</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all customer bookings and orders.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:w-64">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Select a month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              setEditingOrder(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={orders.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <BookingTable
        orders={orders}
        loading={loading}
        onRefresh={fetchOrders}
        pageSize={50}
        onEdit={(order) => {
          setEditingOrder(order);
          setFormOpen(true);
        }}
        onDelete={handleDeleteOrder}
      />

      <BookingForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editingOrder}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
