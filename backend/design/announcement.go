package design

import . "goa.design/goa/v3/dsl"

var _ = Service("announcement", func() {
	Description("Announcement management service")

	Method("listActive", func() {
		Description("List all active announcements")
		HTTP(func() {
			GET("/api/announcements")
			Response(StatusOK)
		})
		Result(ArrayOf(AnnouncementResult))
	})

	Method("create", func() {
		Description("Create a new announcement")
		Payload(func() {
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
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("message", "type", "active", "start_date", "end_date", "auth_token")
		})
		Result(AnnouncementResult)
		HTTP(func() {
			POST("/api/admin/announcements")
			Header("auth_token:Authorization")
			Response(StatusCreated)
		})
	})

	Method("update", func() {
		Description("Update an existing announcement")
		Payload(func() {
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
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("id", "message", "type", "active", "start_date", "end_date", "auth_token")
		})
		Result(AnnouncementResult)
		HTTP(func() {
			PUT("/api/admin/announcements/{id}")
			Header("auth_token:Authorization")
			Response(StatusOK)
		})
	})

	Method("delete", func() {
		Description("Delete an announcement")
		Payload(func() {
			Attribute("id", String, "Announcement ID", func() {
				Meta("struct:tag:json", "id")
			})
			Attribute("auth_token", String, "Authorization token", func() {
				Meta("struct:tag:json", "auth_token")
			})
			Required("id", "auth_token")
		})
		HTTP(func() {
			DELETE("/api/admin/announcements/{id}")
			Header("auth_token:Authorization")
			Response(StatusNoContent)
		})
	})
})
