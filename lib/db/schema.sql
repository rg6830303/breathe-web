CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT DEFAULT 'Club Admin',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_phone TEXT,
  court_number INTEGER NOT NULL CHECK (court_number IN (1, 2, 3)),
  slot_date TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  price REAL NOT NULL,
  addons TEXT DEFAULT '[]',
  subtotal REAL NOT NULL,
  gst REAL NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocked_slots (
  id TEXT PRIMARY KEY,
  court_number INTEGER NOT NULL CHECK (court_number IN (1, 2, 3)),
  slot_date TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  reason TEXT DEFAULT 'Admin block',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(slot_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_date ON blocked_slots(slot_date);
