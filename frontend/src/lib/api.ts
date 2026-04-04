import { getSession } from "next-auth/react";
import type {
  DayMenu, Order, WeekSchedule, Announcement, User,
  AnalyticsSummary, OrderTrend, PopularItem, CheckoutResult, OrderItem
} from "@/types";

const API_BASE = "/api/backend";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  if (session && (session as any).accessToken) {
    return { Authorization: `Bearer ${(session as any).accessToken}` };
  }
  return {};
}

async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || "API request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Menu
  getWeekMenus: (weekStart: string) =>
    fetchAPI<DayMenu[]>(`/menus/week/${weekStart}`),

  createMenu: (data: Partial<DayMenu>) =>
    fetchAPI<DayMenu>("/admin/menus", { method: "POST", body: JSON.stringify(data) }),

  deleteMenu: (id: string) =>
    fetchAPI<void>(`/admin/menus/${id}`, { method: "DELETE" }),

  uploadImage: async (file: File): Promise<string> => {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/admin/menus/upload`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.image_path;
  },

  // Orders
  createOrder: (data: { week_start: string; items: OrderItem[] }) =>
    fetchAPI<Order>("/orders", { method: "POST", body: JSON.stringify(data) }),

  getOrder: (id: string) =>
    fetchAPI<Order>(`/orders/${id}`),

  getProfile: () =>
    fetchAPI<User>("/users/me"),

  getOrders: (week?: string) =>
    fetchAPI<Order[]>(`/admin/orders${week ? `?week=${week}` : ""}`),

  checkout: (orderId: string) =>
    fetchAPI<CheckoutResult>("/orders/checkout", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    }),

  // Schedule
  getSchedule: (weekStart: string) =>
    fetchAPI<WeekSchedule>(`/schedule/week/${weekStart}`),

  updateDay: (data: { date: string; blocked: boolean; block_reason?: string }) =>
    fetchAPI<any>("/admin/schedule/day", { method: "PUT", body: JSON.stringify(data) }),

  updateWeek: (data: { week_start: string; blocked: boolean; block_reason?: string }) =>
    fetchAPI<any>("/admin/schedule/week", { method: "PUT", body: JSON.stringify(data) }),

  toggleWeekends: (enabled: boolean) =>
    fetchAPI<any>("/admin/schedule/weekends", { method: "PUT", body: JSON.stringify({ enabled }) }),

  // Announcements
  getAnnouncements: () =>
    fetchAPI<Announcement[]>("/announcements"),

  getAllAnnouncements: () =>
    fetchAPI<Announcement[]>("/admin/announcements"),

  createAnnouncement: (data: Partial<Announcement>) =>
    fetchAPI<Announcement>("/admin/announcements", { method: "POST", body: JSON.stringify(data) }),

  updateAnnouncement: (id: string, data: Partial<Announcement>) =>
    fetchAPI<Announcement>(`/admin/announcements/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteAnnouncement: (id: string) =>
    fetchAPI<void>(`/admin/announcements/${id}`, { method: "DELETE" }),

  // Admin / Users
  getAdmins: () =>
    fetchAPI<User[]>("/admin/users"),

  createUser: (data: { email: string; name: string; password: string; role: string }) =>
    fetchAPI<User>("/admin/users/create", { method: "POST", body: JSON.stringify(data) }),

  removeAdmin: (id: string) =>
    fetchAPI<void>(`/admin/users/${id}`, { method: "DELETE" }),

  setUserRole: (id: string, role: string) =>
    fetchAPI<User>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify({ role }) }),

  updateOrderStatus: (id: string, status: string) =>
    fetchAPI<{ ok: boolean }>(`/admin/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  adminCreateOrder: (data: {
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
  }) =>
    fetchAPI<Order>("/admin/orders", { method: "POST", body: JSON.stringify(data) }),

  updateOrder: (id: string, data: {
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
  }) =>
    fetchAPI<Order>(`/admin/orders/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteOrder: (id: string) =>
    fetchAPI<{ ok: boolean }>(`/admin/orders/${id}`, { method: "DELETE" }),

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchAPI<void>("/users/me/password", {
      method: "PUT",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),

  adminResetPassword: (userId: string, newPassword: string) =>
    fetchAPI<void>(`/admin/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ new_password: newPassword }),
    }),

  getPublicSettings: () =>
    fetchAPI<{ hide_prices: boolean; weekends_enabled: boolean }>("/settings"),

  toggleHidePrices: (hide_prices: boolean) =>
    fetchAPI<{ hide_prices: boolean }>("/admin/settings/hide-prices", {
      method: "PUT",
      body: JSON.stringify({ hide_prices }),
    }),

  getSettings: () =>
    fetchAPI<{ weekends_enabled: boolean; stripe_enabled: boolean }>("/admin/settings"),

  // Analytics
  getAnalyticsSummary: () =>
    fetchAPI<AnalyticsSummary>("/admin/analytics/summary"),

  getOrderTrends: (from?: string, to?: string) =>
    fetchAPI<OrderTrend[]>(`/admin/analytics/orders?from=${from || ""}&to=${to || ""}`),

  getPopularItems: () =>
    fetchAPI<PopularItem[]>("/admin/analytics/popular-items"),
};
