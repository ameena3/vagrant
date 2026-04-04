package design

import . "goa.design/goa/v3/dsl"

var _ = Service("admin", func() {
	Description("Admin management service")

	Method("listAdmins", func() {
		Description("List all admin users")
		Payload(func() {
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("auth_token")
		})
		Result(ArrayOf(UserResult))
		HTTP(func() {
			GET("/api/admin/users")
			Header("auth_token:Authorization")
			Response(StatusOK)
		})
	})

	Method("addAdmin", func() {
		Description("Add a new admin user")
		Payload(func() {
			Attribute("email", String, "User email", func() {
				Meta("struct:tag:json", "email")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("email", "auth_token")
		})
		Result(UserResult)
		HTTP(func() {
			POST("/api/admin/users")
			Header("auth_token:Authorization")
			Response(StatusCreated)
		})
	})

	Method("updateUserRole", func() {
		Description("Update a user's role")
		Payload(func() {
			Attribute("id", String, "User ID", func() {
				Meta("struct:tag:json", "id")
			})
			Attribute("role", String, "New role", func() {
				Meta("struct:tag:json", "role")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("id", "role", "auth_token")
		})
		Result(UserResult)
		HTTP(func() {
			PUT("/api/admin/users/{id}")
			Header("auth_token:Authorization")
			Response(StatusOK)
		})
	})

	Method("removeAdmin", func() {
		Description("Remove an admin user")
		Payload(func() {
			Attribute("id", String, "User ID", func() {
				Meta("struct:tag:json", "id")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("id", "auth_token")
		})
		HTTP(func() {
			DELETE("/api/admin/users/{id}")
			Header("auth_token:Authorization")
			Response(StatusNoContent)
		})
	})

	Method("getSettings", func() {
		Description("Get admin settings")
		Payload(func() {
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("auth_token")
		})
		Result(func() {
			Attribute("weekends_enabled", Boolean, "Whether weekends are enabled for booking", func() {
				Meta("struct:tag:json", "weekends_enabled")
			})
			Attribute("stripe_enabled", Boolean, "Whether Stripe payment is enabled", func() {
				Meta("struct:tag:json", "stripe_enabled")
			})
		})
		HTTP(func() {
			GET("/api/admin/settings")
			Header("auth_token:Authorization")
			Response(StatusOK)
		})
	})
})
