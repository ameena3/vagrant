package design

import . "goa.design/goa/v3/dsl"

var _ = Service("menu", func() {
	Description("Menu management service")

	Method("getWeekMenus", func() {
		Description("Get all menus for a specific week")
		Payload(func() {
			Attribute("weekStart", String, "Week start date (YYYY-MM-DD)", func() {
				Meta("struct:tag:json", "weekStart")
			})
			Required("weekStart")
		})
		Result(ArrayOf(DayMenu))
		HTTP(func() {
			GET("/api/menus/week/{weekStart}")
			Response(StatusOK)
		})
	})

	Method("createMenu", func() {
		Description("Create or update menu for a day")
		Payload(func() {
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
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("week_start", "day_of_week", "date", "meals", "enabled", "auth_token")
		})
		Result(DayMenu)
		HTTP(func() {
			POST("/api/admin/menus")
			Header("auth_token:Authorization")
			Response(StatusCreated)
		})
	})

	Method("deleteMenu", func() {
		Description("Delete a menu")
		Payload(func() {
			Attribute("id", String, "Menu ID", func() {
				Meta("struct:tag:json", "id")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("id", "auth_token")
		})
		HTTP(func() {
			DELETE("/api/admin/menus/{id}")
			Header("auth_token:Authorization")
			Response(StatusNoContent)
		})
	})

	Method("uploadImage", func() {
		Description("Upload a menu item image")
		Payload(func() {
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("auth_token")
		})
		Result(func() {
			Attribute("image_path", String, "Path to uploaded image", func() {
				Meta("struct:tag:json", "image_path")
			})
			Required("image_path")
		})
		HTTP(func() {
			POST("/api/admin/menus/upload")
			Header("auth_token:Authorization")
			SkipRequestBodyEncodeDecode()
			Response(StatusOK)
		})
	})
})
