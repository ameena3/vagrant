"use client";

import React, { useState, useMemo } from "react";
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
import { api } from "@/lib/api";
import { ChevronDown, ChevronUp } from "lucide-react";

interface BookingTableProps {
  orders: Order[];
  loading: boolean;
  onRefresh?: () => void;
  pageSize?: number;
  onEdit?: (order: Order) => void;
  onDelete?: (order: Order) => void;
}

export function BookingTable({ orders, loading, onRefresh, pageSize, onEdit, onDelete }: BookingTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

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

  // Reset to page 1 when filters/orders change
  const totalPages = pageSize ? Math.max(1, Math.ceil(filteredAndSortedOrders.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages);
  const pagedOrders = pageSize
    ? filteredAndSortedOrders.slice((safePage - 1) * pageSize, safePage * pageSize)
    : filteredAndSortedOrders;

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

  const handleStatusUpdate = async (orderId: string, status: Order["status"]) => {
    setUpdatingId(orderId);
    try {
      await api.updateOrderStatus(orderId, status);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to update order status:", err);
    } finally {
      setUpdatingId(null);
    }
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
                  {pagedOrders.map((order) => (
                    <React.Fragment key={order.id}>
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
                                  <p className="font-mono text-sm break-all">
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
                                  <p className="text-sm text-slate-600 mb-1">
                                    Update Status
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {(["pending", "paid", "cancelled", "refunded"] as const)
                                      .filter((s) => s !== order.status)
                                      .map((s) => (
                                        <Button
                                          key={s}
                                          size="sm"
                                          variant={
                                            s === "paid"
                                              ? "default"
                                              : s === "cancelled"
                                              ? "destructive"
                                              : "outline"
                                          }
                                          disabled={updatingId === order.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusUpdate(order.id, s);
                                          }}
                                        >
                                          Mark {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </Button>
                                      ))}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {onEdit && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(order);
                                      }}
                                    >
                                      Edit Booking
                                    </Button>
                                  )}
                                  {onDelete && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm("Delete this booking? This cannot be undone.")) {
                                          onDelete(order);
                                        }
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {pageSize && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-slate-500">
                Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredAndSortedOrders.length)} of {filteredAndSortedOrders.length} bookings
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-600">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
