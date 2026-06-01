export type NoticeType = "daily" | "weekly" | "monthly";

export type Slot = {
  court: number;
  time: string;
  status: "open" | "booked" | "blocked";
  price: number;
};

export type Notice = {
  id: string | number;
  title: string;
  content: string;
  type: NoticeType;
  created_at: string;
  updated_at: string;
};


export type DbUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type DbBooking = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  court_number: number;
  slot_date: string;
  slot_time: string;
  duration_minutes: number;
  price: number;
  addons: string;
  subtotal: number;
  gst: number;
  total_amount: number;
  status: "pending" | "confirmed" | "cancelled";
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  created_at: string;
  updated_at: string;
};
