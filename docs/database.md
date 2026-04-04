# Database

Fresh Kitchen uses MongoDB 7. In Docker Compose the database is the `mongodb` service; locally it expects MongoDB on `localhost:27017`. The database name is `freshkitchen`.

Initial setup (collections, indexes, seed data) runs automatically on first container start from `mongo-init/init.js`.

---

## Collections

### `users`

Stores every user who has signed in via Google OAuth.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `email` | string | Google account email (unique) |
| `name` | string | Display name from Google profile |
| `picture` | string | URL of Google profile picture |
| `role` | string | `"customer"` or `"admin"` |
| `created_at` | Date | First sign-in timestamp |
| `last_login` | Date | Most recent sign-in timestamp |

**Indexes:**
- `{ email: 1 }` — unique

**Notes:**
- The first user to sign in is automatically assigned `role: "admin"`.
- Subsequent users get `role: "customer"` and can be promoted to admin via the Admin Users UI.

---

### `menus`

One document per day per week. Each document holds all meal slots for that day.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `week_start` | string | ISO date of the Monday for this week (`YYYY-MM-DD`) |
| `day_of_week` | string | `"monday"` – `"sunday"` |
| `date` | string | Exact date for this menu entry (`YYYY-MM-DD`) |
| `enabled` | boolean | Whether this day is open for ordering |
| `meals` | array | Array of meal objects (see below) |
| `created_by` | string | Email of admin who created this entry |
| `updated_at` | Date | Last modification timestamp |

**Meal object:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"breakfast"`, `"lunch"`, or `"dinner"` |
| `name` | string | Meal name |
| `description` | string | Short description |
| `price` | number | Price in the local currency |
| `image_url` | string | Path to uploaded image (e.g., `/uploads/meal.jpg`) |

**Indexes:**
- `{ week_start: 1, day_of_week: 1 }`
- `{ date: 1 }`

---

### `orders`

One document per customer order.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `customer_id` | ObjectId | Reference to `users._id` |
| `customer_email` | string | Denormalized customer email |
| `customer_name` | string | Denormalized customer name |
| `week_start` | string | Monday of the ordered week (`YYYY-MM-DD`) |
| `items` | array | Array of order item objects (see below) |
| `total_amount` | number | Sum of all item prices × quantities |
| `comment` | string | Optional special instructions |
| `status` | string | `"pending"`, `"paid"`, `"cancelled"`, `"refunded"` |
| `stripe_session_id` | string | Stripe Checkout Session ID (when Stripe is enabled) |
| `stripe_payment_id` | string | Stripe Payment Intent ID (after payment) |
| `created_at` | Date | Order creation timestamp |

**Order item object:**

| Field | Type | Description |
|-------|------|-------------|
| `menu_id` | ObjectId | Reference to `menus._id` |
| `day_of_week` | string | Day of the ordered meal |
| `meal_type` | string | `"breakfast"`, `"lunch"`, or `"dinner"` |
| `meal_name` | string | Snapshot of the meal name at time of order |
| `quantity` | number | Number of portions |
| `price` | number | Snapshot of unit price at time of order |

**Indexes:**
- `{ customer_email: 1 }`
- `{ week_start: 1 }`
- `{ status: 1 }`

---

### `schedule`

Controls which days are available for ordering. One document per calendar date.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `date` | string | Calendar date (`YYYY-MM-DD`, unique) |
| `day_of_week` | string | `"monday"` – `"sunday"` |
| `blocked` | boolean | `true` if ordering is disabled for this day |
| `block_reason` | string | Admin-provided reason (e.g., "Public holiday") |
| `updated_at` | Date | Last modification timestamp |

**Indexes:**
- `{ date: 1 }` — unique

**Notes:**
- Absence of a document means the day is not explicitly blocked.
- Weekend availability is also controlled by the `settings` collection (`weekends_enabled`).

---

### `announcements`

Admin-created banners displayed to customers on the home page.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `message` | string | Announcement text |
| `type` | string | `"info"`, `"warning"`, or `"urgent"` |
| `active` | boolean | Whether the announcement is currently active |
| `start_date` | string | Date from which the announcement is shown (`YYYY-MM-DD`) |
| `end_date` | string | Date after which the announcement is hidden (`YYYY-MM-DD`) |
| `created_at` | Date | Creation timestamp |

**Indexes:**
- `{ active: 1, end_date: 1 }`

**Notes:**
- The `GET /api/announcements` endpoint filters for documents where `active: true` and `end_date >= today`.

---

### `settings`

Key-value store for admin-configurable application settings.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `key` | string | Setting name (unique) |
| `value` | mixed | Setting value |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last modification timestamp |

**Seed values (created by `mongo-init/init.js`):**

| Key | Default value | Description |
|-----|---------------|-------------|
| `weekends_enabled` | `false` | Whether Saturday and Sunday appear as orderable days |

---

## Connecting Directly

**From the host machine (Docker Compose running):**

```bash
docker compose exec mongodb mongosh freshkitchen
```

**Useful queries:**

```js
// List all admin users
db.users.find({ role: "admin" })

// List this week's orders
db.orders.find({ week_start: "2024-11-04" })

// List active announcements
db.announcements.find({ active: true })

// View current settings
db.settings.find()

// Manually promote a user to admin
db.users.updateOne({ email: "user@example.com" }, { $set: { role: "admin" } })
```
