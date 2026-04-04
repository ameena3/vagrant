package design

import . "goa.design/goa/v3/dsl"

var _ = Service("order", func() {
	Description("Order management service")

	Method("createOrder", func() {
		Description("Create a new order")
		Payload(func() {
			Attribute("week_start", String, "Week start date (YYYY-MM-DD)", func() {
				Meta("struct:tag:json", "week_start")
			})
			Attribute("items", ArrayOf(OrderItemType), "Order items", func() {
				Meta("struct:tag:json", "items")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("week_start", "items", "auth_token")
		})
		Result(OrderResult)
		HTTP(func() {
			POST("/api/orders")
			Header("auth_token:Authorization")
			Response(StatusCreated)
		})
	})

	Method("getOrder", func() {
		Description("Get order details")
		Payload(func() {
			Attribute("id", String, "Order ID", func() {
				Meta("struct:tag:json", "id")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("id", "auth_token")
		})
		Result(OrderResult)
		HTTP(func() {
			GET("/api/orders/{id}")
			Header("auth_token:Authorization")
			Response(StatusOK)
		})
	})

	Method("listOrders", func() {
		Description("List all orders (admin only)")
		Payload(func() {
			Attribute("week", String, "Filter by week (YYYY-MM-DD)", func() {
				Meta("struct:tag:json", "week")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("auth_token")
		})
		Result(ArrayOf(OrderResult))
		HTTP(func() {
			GET("/api/admin/orders")
			Header("auth_token:Authorization")
			Param("week")
			Response(StatusOK)
		})
	})

	Method("checkout", func() {
		Description("Create Stripe checkout session for order")
		Payload(func() {
			Attribute("order_id", String, "Order ID", func() {
				Meta("struct:tag:json", "order_id")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("order_id", "auth_token")
		})
		Result(CheckoutResultRT)
		HTTP(func() {
			POST("/api/orders/checkout")
			Header("auth_token:Authorization")
			Response(StatusOK)
		})
	})

	Method("stripeWebhook", func() {
		Description("Handle Stripe webhook events")
		HTTP(func() {
			POST("/api/webhooks/stripe")
			SkipRequestBodyEncodeDecode()
			Response(StatusOK)
		})
	})
})
