export type Role = "player" | "admin";
export type NoticeType = "daily" | "weekly" | "monthly";

export type Court = {
  id: number;
  name: string;
  type: string;
};

export type Booking = {
  id: number;
  user_id: string;
  court_id: number;
  start_time: string;
  end_time: string;
  total_amount: number;
  status: string;
};

export type BookingLedgerRow = Booking & {
  player_name?: string;
  player_email?: string;
  base_amount: number;
  tax_amount: number;
  operating_cost: number;
  gross_profit: number;
};

export type PricingRule = {
  id: number;
  label: string;
  court_id: number | null;
  start_time: string;
  end_time: string;
  price: number;
  active: boolean;
};

export type FinanceEntry = {
  id: number;
  entry_date: string;
  category: "revenue" | "expense" | "adjustment";
  label: string;
  amount: number;
  notes: string | null;
};

export type Slot = {
  courtId: number;
  courtName: string;
  type: string;
  startTime: string;
  endTime: string;
  booked: boolean;
  price: number;
};

export type Notice = {
  id: number;
  title: string;
  content: string;
  type: NoticeType;
  created_at: string;
  updated_at: string;
};
