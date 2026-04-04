"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, localDateStr } from "@/lib/utils";
import { Order } from "@/types";
import { Plus, Trash2 } from "lucide-react";

interface ItemDraft {
  date: string;
  day_of_week: number;
  meal_type: string;
  menu_item_name: string;
  price: string; // string for controlled input
  comment: string;
}

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Order | null;
  onSubmit: (data: {
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
  }) => Promise<void>;
}

function blankItem(): ItemDraft {
  return {
    date: localDateStr(new Date()),
    day_of_week: new Date().getDay(),
    meal_type: "lunch",
    menu_item_name: "",
    price: "",
    comment: "",
  };
}

export function BookingForm({ open, onOpenChange, initial, onSubmit }: BookingFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [weekStart, setWeekStart] = useState(localDateStr(new Date()));
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState<ItemDraft[]>([blankItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (initial) {
        setCustomerName(initial.customer_name);
        setCustomerEmail(initial.customer_email);
        setWeekStart(initial.week_start);
        setStatus(initial.status);
        setItems(
          initial.items.length > 0
            ? initial.items.map((item) => ({
                date: item.date,
                day_of_week: item.day_of_week,
                meal_type: item.meal_type,
                menu_item_name: item.menu_item_name,
                price: String(item.price),
                comment: item.comment || "",
              }))
            : [blankItem()]
        );
      } else {
        setCustomerName("");
        setCustomerEmail("");
        setWeekStart(localDateStr(new Date()));
        setStatus("pending");
        setItems([blankItem()]);
      }
      setError("");
    }
  }, [open, initial]);

  function updateItem(index: number, field: keyof ItemDraft, value: string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === "date") {
          updated.day_of_week = new Date(value + "T12:00:00").getDay();
        }
        return updated;
      })
    );
  }

  function addItem() {
    setItems((prev) => [...prev, blankItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!customerName.trim() || !customerEmail.trim() || !weekStart) {
      setError("Customer name, email, and week start are required.");
      return;
    }
    if (items.length === 0) {
      setError("At least one item is required.");
      return;
    }
    for (const item of items) {
      if (!item.menu_item_name.trim() || !item.date) {
        setError("Each item must have a name and date.");
        return;
      }
    }
    setSaving(true);
    try {
      await onSubmit({
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        week_start: weekStart,
        status,
        items: items.map((item) => ({
          date: item.date,
          day_of_week: item.day_of_week,
          meal_type: item.meal_type,
          menu_item_name: item.menu_item_name.trim(),
          price: parseFloat(item.price) || 0,
          comment: item.comment.trim() || undefined,
        })),
      });
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Failed to save booking.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Booking" : "New Booking"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Customer Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bf-name">Customer Name</Label>
              <Input
                id="bf-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bf-email">Customer Email</Label>
              <Input
                id="bf-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="jane@example.com"
                required
              />
            </div>
          </div>

          {/* Week Start + Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bf-week">Week Start</Label>
              <Input
                id="bf-week"
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Order Items</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item
              </Button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-red-500 hover:bg-red-50"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={item.date}
                      onChange={(e) => updateItem(idx, "date", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Meal Type</Label>
                    <Select value={item.meal_type} onValueChange={(v) => updateItem(idx, "meal_type", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(idx, "price", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Item Name</Label>
                    <Input
                      value={item.menu_item_name}
                      onChange={(e) => updateItem(idx, "menu_item_name", e.target.value)}
                      placeholder="Grilled Chicken"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Comment (optional)</Label>
                    <Input
                      value={item.comment}
                      onChange={(e) => updateItem(idx, "comment", e.target.value)}
                      placeholder="No spice, extra sauce..."
                    />
                  </div>
                </div>
              </div>
            ))}
            {items.length > 0 && (
              <p className="text-right text-sm font-semibold text-slate-700">
                Total: {formatCurrency(total)}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : initial ? "Save Changes" : "Create Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
