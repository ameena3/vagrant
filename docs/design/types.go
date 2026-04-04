package design

import . "goa.design/goa/v3/dsl"

var _ = Type("MenuItem", func() {
	Attribute("name", String, "Menu item name", func() {
		Meta("struct:tag:json", "name")
	})
	Attribute("description", String, "Menu item description", func() {
		Meta("struct:tag:json", "description")
	})
	Attribute("price", Float64, "Menu item price", func() {
		Meta("struct:tag:json", "price")
	})
	Attribute("image_path", String, "Path to menu item image", func() {
		Meta("struct:tag:json", "image_path")
	})
	Required("name", "price")
})

var _ = Type("MealSet", func() {
	Attribute("breakfast", ArrayOf(MenuItem), "Breakfast items", func() {
		Meta("struct:tag:json", "breakfast")
	})
	Attribute("lunch", ArrayOf(MenuItem), "Lunch items", func() {
		Meta("struct:tag:json", "lunch")
	})
	Attribute("dinner", ArrayOf(MenuItem), "Dinner items", func() {
		Meta("struct:tag:json", "dinner")
	})
})

var _ = ResultType("DayMenu", func() {
	Attribute("id", String, "Menu ID", func() {
		Meta("struct:tag:json", "id")
	})
	Attribute("week_start", String, "Week start date (YYYY-MM-DD)", func() {
		Meta("struct:tag:json", "week_start")
	})
	Attribute("day_of_week", Int, "Day of week (0=Sunday, 6=Saturday)", func() {
		Meta("struct:tag:json", "day_of_week")
	})
	Attribute("date", String, "Date (YYYY-MM-DD)", func() {
		Meta("struct:tag:json", "date")
	})
	Attribute("meals", MealSet, "Meals for the day", func() {
		Meta("struct:tag:json", "meals")
	})
	Attribute("enabled", Boolean, "Whether this menu is enabled", func() {
		Meta("struct:tag:json", "enabled")
	})
	Attribute("created_by", String, "Admin who created this menu", func() {
		Meta("struct:tag:json", "created_by")
	})
	Attribute("updated_at", String, "Last update timestamp", func() {
		Meta("struct:tag:json", "updated_at")
	})
	Required("week_start", "day_of_week", "date", "enabled")
})

var _ = Type("OrderItem", func() {
	Attribute("date", String, "Order date (YYYY-MM-DD)", func() {
		Meta("struct:tag:json", "date")
	})
	Attribute("day_of_week", Int, "Day of week (0=Sunday, 6=Saturday)", func() {
		Meta("struct:tag:json", "day_of_week")
	})
	Attribute("meal_type", String, "Meal type (breakfast, lunch, dinner)", func() {
		Meta("struct:tag:json", "meal_type")
		Enum("breakfast", "lunch", "dinner")
	})
	Attribute("menu_item_name", String, "Menu item name", func() {
		Meta("struct:tag:json", "menu_item_name")
	})
	Attribute("price", Float64, "Item price at time of order", func() {
		Meta("struct:tag:json", "price")
	})
	Attribute("comment", String, "Special instructions or comments", func() {
		Meta("struct:tag:json", "comment")
	})
	Required("date", "day_of_week", "meal_type", "menu_item_name", "price")
})

var _ = ResultType("Order", func() {
	Attribute("id", String, "Order ID", func() {
		Meta("struct:tag:json", "id")
	})
	Attribute("customer_id", String, "Customer ID", func() {
		Meta("struct:tag:json", "customer_id")
	})
	Attribute("customer_name", String, "Customer name", func() {
		Meta("struct:tag:json", "customer_name")
	})
	Attribute("customer_email", String, "Customer email", func() {
		Meta("struct:tag:json", "customer_email")
	})
	Attribute("week_start", String, "Week start date (YYYY-MM-DD)", func() {
		Meta("struct:tag:json", "week_start")
	})
	Attribute("items", ArrayOf(OrderItem), "Order items", func() {
		Meta("struct:tag:json", "items")
	})
	Attribute("total_amount", Float64, "Total order amount", func() {
		Meta("struct:tag:json", "total_amount")
	})
	Attribute("stripe_payment_id", String, "Stripe payment ID", func() {
		Meta("struct:tag:json", "stripe_payment_id")
	})
	Attribute("stripe_session_id", String, "Stripe checkout session ID", func() {
		Meta("struct:tag:json", "stripe_session_id")
	})
	Attribute("status", String, "Order status (pending, paid, cancelled, refunded)", func() {
		Meta("struct:tag:json", "status")
		Enum("pending", "paid", "cancelled", "refunded")
	})
	Attribute("created_at", String, "Order creation timestamp", func() {
		Meta("struct:tag:json", "created_at")
	})
})

var _ = ResultType("ScheduleDay", func() {
	Attribute("id", String, "Schedule day ID", func() {
		Meta("struct:tag:json", "id")
	})
	Attribute("date", String, "Date (YYYY-MM-DD)", func() {
		Meta("struct:tag:json", "date")
	})
	Attribute("day_of_week", Int, "Day of week (0=Sunday, 6=Saturday)", func() {
		Meta("struct:tag:json", "day_of_week")
	})
	Attribute("blocked", Boolean, "Whether this day is blocked", func() {
		Meta("struct:tag:json", "blocked")
	})
	Attribute("block_reason", String, "Reason for blocking the day", func() {
		Meta("struct:tag:json", "block_reason")
	})
	Attribute("updated_at", String, "Last update timestamp", func() {
		Meta("struct:tag:json", "updated_at")
	})
})

var _ = ResultType("Announcement", func() {
	Attribute("id", String, "Announcement ID", func() {
		Meta("struct:tag:json", "id")
	})
	Attribute("message", String, "Announcement message", func() {
		Meta("struct:tag:json", "message")
	})
	Attribute("type", String, "Announcement type (info, warning, urgent)", func() {
		Meta("struct:tag:json", "type")
		Enum("info", "warning", "urgent")
	})
	Attribute("active", Boolean, "Whether announcement is active", func() {
		Meta("struct:tag:json", "active")
	})
	Attribute("start_date", String, "Start date (YYYY-MM-DD)", func() {
		Meta("struct:tag:json", "start_date")
	})
	Attribute("end_date", String, "End date (YYYY-MM-DD)", func() {
		Meta("struct:tag:json", "end_date")
	})
	Attribute("created_at", String, "Creation timestamp", func() {
		Meta("struct:tag:json", "created_at")
	})
})

var _ = ResultType("User", func() {
	Attribute("id", String, "User ID", func() {
		Meta("struct:tag:json", "id")
	})
	Attribute("email", String, "User email", func() {
		Meta("struct:tag:json", "email")
	})
	Attribute("name", String, "User name", func() {
		Meta("struct:tag:json", "name")
	})
	Attribute("picture", String, "User profile picture URL", func() {
		Meta("struct:tag:json", "picture")
	})
	Attribute("role", String, "User role", func() {
		Meta("struct:tag:json", "role")
	})
	Attribute("created_at", String, "Account creation timestamp", func() {
		Meta("struct:tag:json", "created_at")
	})
})

var _ = ResultType("AnalyticsSummary", func() {
	Attribute("total_orders", Int, "Total number of orders", func() {
		Meta("struct:tag:json", "total_orders")
	})
	Attribute("total_revenue", Float64, "Total revenue", func() {
		Meta("struct:tag:json", "total_revenue")
	})
	Attribute("total_customers", Int, "Total number of unique customers", func() {
		Meta("struct:tag:json", "total_customers")
	})
	Attribute("orders_this_week", Int, "Number of orders this week", func() {
		Meta("struct:tag:json", "orders_this_week")
	})
	Attribute("revenue_this_week", Float64, "Revenue this week", func() {
		Meta("struct:tag:json", "revenue_this_week")
	})
})

var _ = ResultType("PopularItem", func() {
	Attribute("name", String, "Menu item name", func() {
		Meta("struct:tag:json", "name")
	})
	Attribute("meal_type", String, "Meal type (breakfast, lunch, dinner)", func() {
		Meta("struct:tag:json", "meal_type")
		Enum("breakfast", "lunch", "dinner")
	})
	Attribute("order_count", Int, "Number of times ordered", func() {
		Meta("struct:tag:json", "order_count")
	})
})

var _ = ResultType("OrderTrend", func() {
	Attribute("date", String, "Date (YYYY-MM-DD)", func() {
		Meta("struct:tag:json", "date")
	})
	Attribute("order_count", Int, "Number of orders on this date", func() {
		Meta("struct:tag:json", "order_count")
	})
	Attribute("revenue", Float64, "Revenue on this date", func() {
		Meta("struct:tag:json", "revenue")
	})
})

var _ = ResultType("CheckoutResult", func() {
	Attribute("checkout_url", String, "Stripe checkout URL", func() {
		Meta("struct:tag:json", "checkout_url")
	})
	Attribute("session_id", String, "Stripe session ID", func() {
		Meta("struct:tag:json", "session_id")
	})
	Attribute("order_id", String, "Associated order ID", func() {
		Meta("struct:tag:json", "order_id")
	})
	Required("checkout_url", "session_id", "order_id")
})
