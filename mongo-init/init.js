// Switch to freshkitchen database
db = db.getSiblingDB('freshkitchen');

// Create collections
db.createCollection('users');
db.createCollection('menus');
db.createCollection('orders');
db.createCollection('schedule');
db.createCollection('settings');
db.createCollection('announcements');

// Create indexes for users collection
db.users.createIndex({ email: 1 }, { unique: true });

// Create indexes for menus collection
db.menus.createIndex({ week_start: 1, day_of_week: 1 });
db.menus.createIndex({ date: 1 });

// Create indexes for orders collection
db.orders.createIndex({ customer_email: 1 });
db.orders.createIndex({ week_start: 1 });
db.orders.createIndex({ status: 1 });

// Create indexes for schedule collection
db.schedule.createIndex({ date: 1 }, { unique: true });

// Create indexes for announcements collection
db.announcements.createIndex({ active: 1, end_date: 1 });

// TTL indexes for automatic cleanup
db.menus.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
db.announcements.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Insert default settings
db.settings.insertOne({
  key: 'weekends_enabled',
  value: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
