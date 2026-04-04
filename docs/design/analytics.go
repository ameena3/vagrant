package design

import . "goa.design/goa/v3/dsl"

var _ = Service("analytics", func() {
	Description("Analytics service")

	Method("summary", func() {
		Description("Get analytics summary")
		Payload(func() {
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("auth_token")
		})
		Result(AnalyticsSummary)
		HTTP(func() {
			GET("/api/admin/analytics/summary")
			Header("auth_token:Authorization")
			Response(StatusOK)
		})
	})

	Method("orderTrends", func() {
		Description("Get order trends for a date range")
		Payload(func() {
			Attribute("from", String, "Start date (YYYY-MM-DD)", func() {
				Meta("struct:tag:json", "from")
			})
			Attribute("to", String, "End date (YYYY-MM-DD)", func() {
				Meta("struct:tag:json", "to")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("auth_token")
		})
		Result(ArrayOf(OrderTrend))
		HTTP(func() {
			GET("/api/admin/analytics/orders")
			Header("auth_token:Authorization")
			Param("from")
			Param("to")
			Response(StatusOK)
		})
	})

	Method("popularItems", func() {
		Description("Get most popular menu items")
		Payload(func() {
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("auth_token")
		})
		Result(ArrayOf(PopularItem))
		HTTP(func() {
			GET("/api/admin/analytics/popular-items")
			Header("auth_token:Authorization")
			Response(StatusOK)
		})
	})
})
