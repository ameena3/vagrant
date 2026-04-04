package design

import . "goa.design/goa/v3/dsl"

// MenuItem represents a single food item on the menu
var MenuItem = Type("MenuItem", func() {
	Attribute("name", String, "Menu item name")
	Attribute("description", String, "Menu item description")
	Attribute("price", Float64, "Menu item price")
	Attribute("image_path", String, "Path to menu item image")
	Required("name", "price")
})

// MealSet groups meals by type for a given day
var MealSet = Type("MealSet", func() {
	Attribute("breakfast", ArrayOf(MenuItem), "Breakfast items")
	Attribute("lunch", ArrayOf(MenuItem), "Lunch items")
	Attribute("dinner", ArrayOf(MenuItem), "Dinner items")
})

// DayMenu represents the menu for a specific day
var DayMenu = ResultType("application/vnd.daymenu", func() {
	TypeName("DayMenu")
	Attributes(func() {
		Attribute("id", String, "Menu ID")
		Attribute("week_start", String, "Week start date (YYYY-MM-DD)")
		Attribute("day_of_week", Int, "Day of week (0=Sunday, 6=Saturday)")
		Attribute("date", String, "Date (YYYY-MM-DD)")
		Attribute("meals", MealSet, "Meals for the day")
		Attribute("enabled", Boolean, "Whether this menu is enabled")
		Attribute("created_by", String, "Admin who created this menu")
		Attribute("updated_at", String, "Last update timestamp")
		Required("week_start", "day_of_week", "date", "enabled")
	})
})

// OrderItemType represents a single item in an order
var OrderItemType = Type("OrderItem", func() {
	Attribute("date", String, "Order date (YYYY-MM-DD)")
	Attribute("day_of_week", Int, "Day of week")
	Attribute("meal_type", String, "Meal type", func() {
		Enum("breakfast", "lunch", "dinner")
	})
	Attribute("menu_item_name", String, "Menu item name")
	Attribute("price", Float64, "Item price")
	Attribute("comment", String, "Special instructions")
	Required("date", "day_of_week", "meal_type", "menu_item_name", "price")
})

// OrderResult represents a customer order
var OrderResult = ResultType("application/vnd.order", func() {
	TypeName("Order")
	Attributes(func() {
		Attribute("id", String, "Order ID")
		Attribute("customer_id", String)
		Attribute("customer_name", String)
		Attribute("customer_email", String)
		Attribute("week_start", String)
		Attribute("items", ArrayOf(OrderItemType))
		Attribute("total_amount", Float64)
		Attribute("stripe_payment_id", String)
		Attribute("stripe_session_id", String)
		Attribute("status", String, func() {
			Enum("pending", "paid", "cancelled", "refunded")
		})
		Attribute("created_at", String)
	})
})

// ScheduleDayResult represents a day's schedule
var ScheduleDayResult = ResultType("application/vnd.scheduleday", func() {
	TypeName("ScheduleDay")
	Attributes(func() {
		Attribute("id", String)
		Attribute("date", String)
		Attribute("day_of_week", Int)
		Attribute("blocked", Boolean)
		Attribute("block_reason", String)
		Attribute("updated_at", String)
	})
})

// WeekScheduleResult wraps schedule days with settings
var WeekScheduleResult = ResultType("application/vnd.weekschedule", func() {
	TypeName("WeekSchedule")
	Attributes(func() {
		Attribute("days", ArrayOf(ScheduleDayResult))
		Attribute("weekends_enabled", Boolean)
	})
})

// AnnouncementResult represents an announcement/banner
var AnnouncementResult = ResultType("application/vnd.announcement", func() {
	TypeName("Announcement")
	Attributes(func() {
		Attribute("id", String)
		Attribute("message", String)
		Attribute("type", String, func() {
			Enum("info", "warning", "urgent")
		})
		Attribute("active", Boolean)
		Attribute("start_date", String)
		Attribute("end_date", String)
		Attribute("created_at", String)
	})
})

// UserResult represents a user
var UserResult = ResultType("application/vnd.user", func() {
	TypeName("User")
	Attributes(func() {
		Attribute("id", String)
		Attribute("email", String)
		Attribute("name", String)
		Attribute("picture", String)
		Attribute("role", String)
		Attribute("created_at", String)
	})
})

// AnalyticsSummaryResult represents dashboard stats
var AnalyticsSummaryResult = ResultType("application/vnd.analyticssummary", func() {
	TypeName("AnalyticsSummary")
	Attributes(func() {
		Attribute("total_orders", Int)
		Attribute("total_revenue", Float64)
		Attribute("total_customers", Int)
		Attribute("orders_this_week", Int)
		Attribute("revenue_this_week", Float64)
	})
})

// PopularItemResult represents a popular menu item
var PopularItemRT = ResultType("application/vnd.popularitem", func() {
	TypeName("PopularItem")
	Attributes(func() {
		Attribute("name", String)
		Attribute("meal_type", String)
		Attribute("order_count", Int)
	})
})

// OrderTrendResult represents order trends by date
var OrderTrendRT = ResultType("application/vnd.ordertrend", func() {
	TypeName("OrderTrend")
	Attributes(func() {
		Attribute("date", String)
		Attribute("order_count", Int)
		Attribute("revenue", Float64)
	})
})

// CheckoutResultRT represents Stripe checkout result
var CheckoutResultRT = ResultType("application/vnd.checkoutresult", func() {
	TypeName("CheckoutResult")
	Attributes(func() {
		Attribute("checkout_url", String)
		Attribute("session_id", String)
		Attribute("order_id", String)
	})
})

// SettingsResult represents admin settings
var SettingsResult = ResultType("application/vnd.settings", func() {
	TypeName("Settings")
	Attributes(func() {
		Attribute("weekends_enabled", Boolean)
		Attribute("stripe_enabled", Boolean)
	})
})

// ImageUploadResult represents the result of an image upload
var ImageUploadResult = ResultType("application/vnd.imageupload", func() {
	TypeName("ImageUpload")
	Attributes(func() {
		Attribute("image_path", String)
		Required("image_path")
	})
})

// WeekendsToggleResult
var WeekendsToggleResult = ResultType("application/vnd.weekendstoggle", func() {
	TypeName("WeekendsToggle")
	Attributes(func() {
		Attribute("enabled", Boolean)
	})
})
