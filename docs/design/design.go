package design

import . "goa.design/goa/v3/dsl"

var _ = API("freshkitchen", func() {
	Title("Fresh Kitchen API")
	Description("Homemade meal booking platform API")
	Server("freshkitchen", func() {
		Host("localhost", func() {
			URI("http://localhost:8080")
		})
	})
})
