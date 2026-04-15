// ── Auth ─────────────────────────────────────────────
export type UserRole = 'player' | 'venue_owner';

export interface User {
  id: number;
  name: string;
  phone: string;
  avatar: string | null;
  city: string;
  role: UserRole;
  rating: number;
  reliability: number;
  matches_played: number;
  rank: string;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  phone: string;
  password: string;
}

// ── Sports ───────────────────────────────────────────
export type SportId = 'football' | 'basketball' | 'volleyball' | 'tennis' | 'swimming' | 'all';

export interface Sport {
  id: SportId;
  name: string;
}

// ── Games ────────────────────────────────────────────
export type GameStatus = 'confirmed' | 'waiting' | 'completed' | 'cancelled';
export type SkillLevel = 'ANY' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface Game {
  id: number;
  title: string;
  sport_id: SportId;
  venue: Venue;
  date_time: string;
  duration: number;
  players_needed: number;
  players_joined: number;
  players_total: number;
  level: SkillLevel;
  status: GameStatus;
  description: string;
  is_joined: boolean;
  organizer: Pick<User, 'id' | 'name' | 'avatar'>;
  chat_room_id: number | null;
}

export interface CreateGamePayload {
  sport_id: SportId;
  venue_id: number;
  date_time: string;
  duration: number;
  players_needed: number;
  level: SkillLevel;
  description?: string;
}

export interface GameResult {
  game_id: number;
  result: string;
  stats: string;
  mvp: string;
  your_rating: number;
}

// ── Venues ───────────────────────────────────────────
export type VenueType = 'stadium' | 'gym' | 'pool' | 'court' | 'field';

export interface Venue {
  id: number;
  name: string;
  type: VenueType;
  sport_id: SportId;
  address: string;
  city: string;
  lat: number;
  lng: number;
  rating: number;
  reviews_count: number;
  price_per_hour: number;
  images: string[];
  owner_id: number;
  description: string;
  amenities: string[];
  working_hours: WorkingHours;
}

export interface WorkingHours {
  open: string;
  close: string;
  days: number[];
}

export interface TimeSlot {
  id: number;
  venue_id: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  price: number;
}

// ── Bookings ─────────────────────────────────────────
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
  id: number;
  venue: Pick<Venue, 'id' | 'name' | 'address' | 'images'>;
  user: Pick<User, 'id' | 'name' | 'phone' | 'avatar'>;
  slot: TimeSlot;
  status: BookingStatus;
  total_price: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
}

export interface CreateBookingPayload {
  venue_id: number;
  slot_id: number;
  payment_method_id: string;
}

// ── Chats ────────────────────────────────────────────
export type ChatType = 'game' | 'direct' | 'venue';

export interface ChatRoom {
  id: number;
  type: ChatType;
  title: string;
  avatar: string | null;
  last_message: ChatMessage | null;
  unread_count: number;
  participants: Pick<User, 'id' | 'name' | 'avatar'>[];
}

export interface ChatMessage {
  id: number;
  room_id: number;
  sender: Pick<User, 'id' | 'name' | 'avatar'>;
  text: string;
  created_at: string;
  is_me: boolean;
}

// ── Payments ─────────────────────────────────────────
export interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'elcart' | 'mbank' | 'odengi';
  last4: string;
  label: string;
  is_default: boolean;
}

// ── Owner CRM ────────────────────────────────────────
export type DashboardPeriod = 'today' | 'week' | 'month';

export interface DashboardStats {
  revenue: number;
  revenue_change: number;
  bookings: number;
  bookings_change: number;
  occupancy: number;
  occupancy_change: number;
  active_venues: number;
}

export interface RevenueChartItem {
  label: string;
  value: number;
}

// ── API ──────────────────────────────────────────────
export interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── WebSocket ────────────────────────────────────────
export interface WSMessage {
  type: 'chat.message' | 'chat.typing' | 'notification.new' | 'booking.update';
  payload: unknown;
}

export interface WSChatMessage {
  id: number;
  room_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string | null;
  text: string;
  created_at: string;
}
