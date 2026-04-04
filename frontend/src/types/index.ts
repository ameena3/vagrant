export interface MenuItem {
  name: string;
  description: string;
  price: number;
  image_path?: string;
}

export interface MealSet {
  breakfast: MenuItem[];
  lunch: MenuItem[];
  dinner: MenuItem[];
}

export interface DayMenu {
  id: string;
  week_start: string;
  day_of_week: number;
  date: string;
  meals: MealSet;
  enabled: boolean;
  created_by?: string;
  updated_at?: string;
}

export interface OrderItem {
  date: string;
  day_of_week: number;
  meal_type: "breakfast" | "lunch" | "dinner";
  menu_item_name: string;
  price: number;
  comment?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  week_start: string;
  items: OrderItem[];
  total_amount: number;
  stripe_payment_id?: string;
  stripe_session_id?: string;
  status: "pending" | "paid" | "cancelled" | "refunded";
  created_at: string;
}

export interface ScheduleDay {
  id: string;
  date: string;
  day_of_week: number;
  blocked: boolean;
  block_reason?: string;
  updated_at?: string;
}

export interface WeekSchedule {
  days: ScheduleDay[];
  weekends_enabled: boolean;
}

export interface Announcement {
  id: string;
  message: string;
  type: "info" | "warning" | "urgent";
  active: boolean;
  start_date?: string;
  end_date?: string;
  created_at?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: "customer" | "admin";
  created_at?: string;
}

export interface AnalyticsSummary {
  total_orders: number;
  total_revenue: number;
  total_customers: number;
  orders_this_week: number;
  revenue_this_week: number;
}

export interface OrderTrend {
  date: string;
  order_count: number;
  revenue: number;
}

export interface PopularItem {
  name: string;
  meal_type: string;
  order_count: number;
}

export interface CheckoutResult {
  checkout_url?: string;
  session_id?: string;
  order_id: string;
  stripe_disabled?: boolean;
  order?: Order;
}
