# API Reference

Base URL: `http://localhost:8080`

All endpoints that modify data or access user/admin information require authentication.

## Authentication

Include a Google ID token as a Bearer token in every authenticated request:

```
Authorization: Bearer <google_id_token>
```

The token comes from the NextAuth.js session (`session.idToken`). From the frontend this is handled automatically by `src/lib/api.ts`.

---

## Menu Service

### Get week's menus

```
GET /api/menus/week/{weekStart}
```

Returns all menu entries for the given week.

**Path parameters:**

| Parameter | Format | Description |
|-----------|--------|-------------|
| `weekStart` | `YYYY-MM-DD` | Monday of the target week |

**Auth:** Required (any authenticated user)

**Response `200`:**

```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "week_start": "2024-11-04",
    "day_of_week": "monday",
    "date": "2024-11-04",
    "enabled": true,
    "meals": [
      {
        "type": "lunch",
        "name": "Butter Chicken",
        "description": "Slow-cooked chicken in a rich tomato-cream sauce",
        "price": 12.50,
        "image_url": "/uploads/butter-chicken.jpg"
      }
    ]
  }
]
```

---

### Create or update a menu (admin)

```
POST /api/admin/menus
```

**Auth:** Required (admin only)

**Request body:**

```json
{
  "week_start": "2024-11-04",
  "day_of_week": "monday",
  "date": "2024-11-04",
  "enabled": true,
  "meals": [
    {
      "type": "lunch",
      "name": "Butter Chicken",
      "description": "Slow-cooked chicken in a rich tomato-cream sauce",
      "price": 12.50
    }
  ]
}
```

**Response `200`:** Updated menu object (same shape as GET response)

---

### Delete a menu (admin)

```
DELETE /api/admin/menus/{id}
```

**Auth:** Required (admin only)

**Response `200`:** `{}`

---

### Upload menu image (admin)

```
POST /api/admin/menus/upload
```

**Auth:** Required (admin only)

**Request:** `multipart/form-data` with field `image` (JPEG/PNG, max 5 MB)

**Response `200`:**

```json
{ "url": "/uploads/butter-chicken.jpg" }
```

---

## Order Service

### Create an order

```
POST /api/orders
```

**Auth:** Required (any authenticated user)

**Request body:**

```json
{
  "week_start": "2024-11-04",
  "items": [
    {
      "menu_id": "507f1f77bcf86cd799439011",
      "day_of_week": "monday",
      "meal_type": "lunch",
      "meal_name": "Butter Chicken",
      "quantity": 2,
      "price": 12.50
    }
  ],
  "comment": "No spice please"
}
```

**Response `201`:**

```json
{
  "id": "507f191e810c19729de860ea",
  "status": "pending",
  "total_amount": 25.00,
  "created_at": "2024-11-04T10:30:00Z"
}
```

---

### Get order details

```
GET /api/orders/{id}
```

**Auth:** Required. Customers can only retrieve their own orders; admins can retrieve any.

**Response `200`:**

```json
{
  "id": "507f191e810c19729de860ea",
  "customer_email": "user@example.com",
  "customer_name": "Jane Doe",
  "week_start": "2024-11-04",
  "items": [ ... ],
  "total_amount": 25.00,
  "status": "pending",
  "comment": "No spice please",
  "created_at": "2024-11-04T10:30:00Z"
}
```

---

### List all orders (admin)

```
GET /api/admin/orders?week=YYYY-MM-DD
```

**Auth:** Required (admin only)

**Query parameters:**

| Parameter | Format | Description |
|-----------|--------|-------------|
| `week` | `YYYY-MM-DD` | Filter by week start date (optional) |

**Response `200`:** Array of order objects

---

### Create Stripe checkout session

```
POST /api/orders/checkout
```

Only available when `STRIPE_ENABLED=true`.

**Auth:** Required (any authenticated user)

**Request body:**

```json
{ "order_id": "507f191e810c19729de860ea" }
```

**Response `200`:**

```json
{ "checkout_url": "https://checkout.stripe.com/pay/cs_test_..." }
```

---

### Stripe webhook

```
POST /api/webhooks/stripe
```

Called by Stripe after payment events. Validates the `Stripe-Signature` header. Marks matching orders as `status: paid` on `checkout.session.completed` events.

**Auth:** None (verified via Stripe signature)

---

## Schedule Service

### Get week schedule

```
GET /api/schedule/week/{weekStart}
```

Returns availability for each day of the given week.

**Auth:** Required (any authenticated user)

**Response `200`:**

```json
[
  {
    "date": "2024-11-04",
    "day_of_week": "monday",
    "blocked": false,
    "block_reason": ""
  }
]
```

---

### Block or unblock a day (admin)

```
PUT /api/admin/schedule/day
```

**Auth:** Required (admin only)

**Request body:**

```json
{
  "date": "2024-11-04",
  "blocked": true,
  "block_reason": "Public holiday"
}
```

**Response `200`:** `{}`

---

### Block or unblock a week (admin)

```
PUT /api/admin/schedule/week
```

**Auth:** Required (admin only)

**Request body:**

```json
{
  "week_start": "2024-11-04",
  "blocked": true,
  "block_reason": "Kitchen maintenance"
}
```

**Response `200`:** `{}`

---

### Toggle weekend availability (admin)

```
PUT /api/admin/schedule/weekends
```

**Auth:** Required (admin only)

**Request body:**

```json
{ "enabled": true }
```

**Response `200`:** `{}`

---

## Announcement Service

### List active announcements

```
GET /api/announcements
```

Returns announcements that are active (current date is within their `start_date`–`end_date` range).

**Auth:** Not required

**Response `200`:**

```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "message": "We will be closed on Nov 11 for Remembrance Day",
    "type": "info",
    "active": true,
    "start_date": "2024-11-01",
    "end_date": "2024-11-11"
  }
]
```

Announcement `type` values: `info`, `warning`, `urgent`

---

### Create announcement (admin)

```
POST /api/admin/announcements
```

**Auth:** Required (admin only)

**Request body:**

```json
{
  "message": "Kitchen closed next Monday",
  "type": "warning",
  "active": true,
  "start_date": "2024-11-04",
  "end_date": "2024-11-10"
}
```

**Response `201`:** Created announcement object

---

### Update announcement (admin)

```
PUT /api/admin/announcements/{id}
```

**Auth:** Required (admin only)

**Request body:** Same fields as create (all optional — send only fields to update)

**Response `200`:** Updated announcement object

---

### Delete announcement (admin)

```
DELETE /api/admin/announcements/{id}
```

**Auth:** Required (admin only)

**Response `200`:** `{}`

---

## Admin Service

### List admin users (admin)

```
GET /api/admin/users
```

**Auth:** Required (admin only)

**Response `200`:**

```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "email": "admin@example.com",
    "name": "Admin User",
    "picture": "https://...",
    "role": "admin",
    "created_at": "2024-11-01T00:00:00Z",
    "last_login": "2024-11-04T08:00:00Z"
  }
]
```

---

### Add admin user (admin)

```
POST /api/admin/users
```

**Auth:** Required (admin only)

**Request body:**

```json
{ "email": "newadmin@example.com" }
```

The target user must already have an account (must have signed in at least once).

**Response `200`:** `{}`

---

### Remove admin role (admin)

```
DELETE /api/admin/users/{id}
```

**Auth:** Required (admin only). An admin cannot remove their own admin role.

**Response `200`:** `{}`

---

### Get admin settings (admin)

```
GET /api/admin/settings
```

**Auth:** Required (admin only)

**Response `200`:**

```json
{
  "weekends_enabled": false,
  "stripe_enabled": false
}
```

---

## Analytics Service

All analytics endpoints require admin access.

### Dashboard summary

```
GET /api/admin/analytics/summary
```

**Response `200`:**

```json
{
  "total_orders": 142,
  "total_revenue": 1893.50,
  "unique_customers": 38,
  "orders_this_week": 12
}
```

---

### Order trends

```
GET /api/admin/analytics/orders?from=YYYY-MM-DD&to=YYYY-MM-DD
```

**Query parameters:**

| Parameter | Format | Description |
|-----------|--------|-------------|
| `from` | `YYYY-MM-DD` | Start of date range (optional) |
| `to` | `YYYY-MM-DD` | End of date range (optional) |

**Response `200`:**

```json
[
  { "date": "2024-11-04", "order_count": 8, "revenue": 124.00 }
]
```

---

### Popular items

```
GET /api/admin/analytics/popular-items
```

**Response `200`:**

```json
[
  { "meal_name": "Butter Chicken", "order_count": 47 },
  { "meal_name": "Dal Tadka", "order_count": 34 }
]
```

---

## Utility Endpoints

### Health check

```
GET /health
```

**Auth:** Not required

**Response `200`:**

```json
{ "status": "ok" }
```

---

### Serve uploaded images

```
GET /uploads/{filename}
```

**Auth:** Not required

Returns the uploaded image file (JPEG/PNG).

---

## Error Responses

All error responses follow this shape:

```json
{
  "message": "human-readable description",
  "id": "error_code"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Bad request — missing or invalid fields |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — valid token but insufficient role |
| `404` | Not found |
| `409` | Conflict — e.g., promoting a user that doesn't exist |
| `500` | Internal server error |
