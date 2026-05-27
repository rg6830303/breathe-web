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
