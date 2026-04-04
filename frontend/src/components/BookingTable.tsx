"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Order } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface BookingTableProps {
  orders: Order[];
  loading: boolean;
}

export function BookingTable({ orders, loading }: BookingTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter((order) =>
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [orders, searchTerm, sortDirection]);

  const getStatusBadge = (status: Order["status"]) => {
    const variants: Record<Order["status"], "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      cancelled: "destructive",
      refunded: "outline",
    };

    const labels: Record<Order["status"], string> = {
      paid: "Paid",
      pending: "Pending",
      cancelled: "Cancelled",
      refunded: "Refunded",
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Bookings</CardTitle>
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-64"
            />
          </div>
        </CardHeader>

        <CardContent>
          {filteredAndSortedOrders.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              {searchTerm ? "No bookings match your search." : "No bookings yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() =>
                          setSortDirection(
                            sortDirection === "asc" ? "desc" : "asc"
                          )
                        }
                        className="flex items-center gap-1 hover:text-slate-700"
                      >
                        Created
                        {sortDirection === "desc" ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedOrders.map((order) => (
                    <div key={order.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() =>
                          setExpandedOrderId(
                            expandedOrderId === order.id ? null : order.id
                          )
                        }
                      >
                        <TableCell>
                          <button className="p-1">
                            {expandedOrderId === order.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {order.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-sm text-slate-500">
                              {order.customer_email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(order.created_at)}</TableCell>
                        <TableCell className="text-right">
                          {order.items.length}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right text-sm text-slate-500">
                          {formatDate(order.created_at)}
                        </TableCell>
                      </TableRow>

                      {expandedOrderId === order.id && (
                        <TableRow className="bg-slate-50">
                          <TableCell colSpan={8}>
                            <div className="p-4 space-y-4">
                              <div>
                                <h4 className="font-semibold mb-3">
                                  Order Items
                                </h4>
                                <div className="space-y-2">
                                  {order.items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="text-sm border-l-2 border-slate-300 pl-3 py-1"
                                    >
                                      <p className="font-medium">
                                        {item.menu_item_name}
                                      </p>
                                      <p className="text-slate-600">
                                        {item.meal_type} - {formatDate(item.date)}
                                      </p>
                                      {item.comment && (
                                        <p className="text-slate-500 italic">
                                          Comment: {item.comment}
                                        </p>
                                      )}
                                      <p className="font-semibold text-right mt-1">
                                        {formatCurrency(item.price)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm text-slate-600">
                                    Order ID
                                  </p>
                                  <p className="font-mono text-sm">
                                    {order.id}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-600">
                                    Payment ID
                                  </p>
                                  <p className="font-mono text-sm">
                                    {order.stripe_payment_id || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-600">
                                    Status
                                  </p>
                                  <p className="font-semibold">
                                    {order.status.charAt(0).toUpperCase() +
                                      order.status.slice(1)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </div>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
