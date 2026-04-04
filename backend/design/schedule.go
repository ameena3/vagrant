package design

import . "goa.design/goa/v3/dsl"

var _ = Service("schedule", func() {
	Description("Schedule management service")

	Method("getWeekSchedule", func() {
		Description("Get schedule for a specific week")
		Payload(func() {
			Attribute("weekStart", String, "Week start date (YYYY-MM-DD)", func() {
				Meta("struct:tag:json", "weekStart")
			})
			Required("weekStart")
		})
		Result(WeekScheduleResult)
		HTTP(func() {
			GET("/api/schedule/week/{weekStart}")
			Response(StatusOK)
		})
	})

	Method("updateDay", func() {
		Description("Update schedule for a specific day")
		Payload(func() {
			Attribute("date", String, "Date (YYYY-MM-DD)", func() {
				Meta("struct:tag:json", "date")
			})
			Attribute("blocked", Boolean, "Whether day is blocked", func() {
				Meta("struct:tag:json", "blocked")
			})
			Attribute("block_reason", String, "Reason for blocking (optional)", func() {
				Meta("struct:tag:json", "block_reason")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("date", "blocked", "auth_token")
		})
		Result(ScheduleDayResult)
		HTTP(func() {
			PUT("/api/admin/schedule/day")
			Header("auth_token:Authorization")
			Response(StatusOK)
		})
	})

	Method("updateWeek", func() {
		Description("Update schedule for an entire week")
		Payload(func() {
			Attribute("week_start", String, "Week start date (YYYY-MM-DD)", func() {
				Meta("struct:tag:json", "week_start")
			})
			Attribute("blocked", Boolean, "Whether week is blocked", func() {
				Meta("struct:tag:json", "blocked")
			})
			Attribute("block_reason", String, "Reason for blocking (optional)", func() {
				Meta("struct:tag:json", "block_reason")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("week_start", "blocked", "auth_token")
		})
		Result(ArrayOf(ScheduleDayResult))
		HTTP(func() {
			PUT("/api/admin/schedule/week")
			Header("auth_token:Authorization")
			Response(StatusOK)
		})
	})

	Method("toggleWeekends", func() {
		Description("Enable or disable weekend bookings")
		Payload(func() {
			Attribute("enabled", Boolean, "Whether weekends are enabled", func() {
				Meta("struct:tag:json", "enabled")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("enabled", "auth_token")
		})
		Result(func() {
			Attribute("enabled", Boolean, "Whether weekends are now enabled", func() {
				Meta("struct:tag:json", "enabled")
			})
		})
		HTTP(func() {
			PUT("/api/admin/schedule/weekends")
			Header("auth_token:Authorization")
			Response(StatusOK)
		})
	})
})
