import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { AuthTokens, User, Game, Venue, Booking, ChatRoom, ChatMessage,
  DashboardStats, TimeSlot, CreateGamePayload, CreateBookingPayload,
  PaginatedResponse, LoginPayload, RegisterPayload, PaymentMethod, SportId } from '@/types';

// ── Config ─────────────────────────────────────────
const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const BASE_URL = (rawBaseUrl && rawBaseUrl.length > 0
  ? rawBaseUrl
  : 'http://localhost:8000/api/v1').replace(/\/+$/, '');
const TOKEN_KEY = 'oyno_tokens';

// ── Axios instance ──────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT ────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  if (raw) {
    const tokens: AuthTokens = JSON.parse(raw);
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

// ── Response interceptor: refresh token ────────────
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const raw = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!raw) throw new Error('No tokens');
        const tokens: AuthTokens = JSON.parse(raw);
        const { data } = await axios.post<AuthTokens>(
          `${BASE_URL}/auth/token/refresh/`,
          { refresh: tokens.refresh }
        );
        await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(data));
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        // Redirect to login handled by router
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ────────────────────────────────────────────
export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<{ user: User; tokens: AuthTokens }>('/auth/login/', payload),

  register: (payload: RegisterPayload) =>
    api.post<{ user: User; tokens: AuthTokens }>('/auth/register/', payload),

  sendOtp: (phone: string) =>
    api.post<{ detail: string }>('/auth/otp/send/', { phone }),

  verifyOtp: (phone: string, code: string) =>
    api.post<{ verified: boolean }>('/auth/otp/verify/', { phone, code }),

  getMe: () =>
    api.get<User>('/auth/me/'),

  updateProfile: (data: Partial<User>) =>
    api.patch<User>('/auth/me/', data),

  logout: () =>
    api.post('/auth/logout/'),
};

// ── Games ───────────────────────────────────────────
export const gamesApi = {
  list: (params?: { sport_id?: SportId; city?: string; page?: number }) =>
    api.get<PaginatedResponse<Game>>('/games/', { params }),

  detail: (id: number) =>
    api.get<Game>(`/games/${id}/`),

  create: (payload: CreateGamePayload) =>
    api.post<Game>('/games/', payload),

  join: (id: number) =>
    api.post<Game>(`/games/${id}/join/`),

  leave: (id: number) =>
    api.post<Game>(`/games/${id}/leave/`),

  myGames: (params?: { status?: string }) =>
    api.get<PaginatedResponse<Game>>('/games/my/', { params }),
};

// ── Venues ──────────────────────────────────────────
export const venuesApi = {
  list: (params?: { sport_id?: SportId; city?: string; page?: number }) =>
    api.get<PaginatedResponse<Venue>>('/venues/', { params }),

  detail: (id: number) =>
    api.get<Venue>(`/venues/${id}/`),

  slots: (id: number, date: string) =>
    api.get<TimeSlot[]>(`/venues/${id}/slots/`, { params: { date } }),

  myVenues: () =>
    api.get<Venue[]>('/venues/my/'),

  create: (data: FormData) =>
    api.post<Venue>('/venues/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: number, data: Partial<Venue>) =>
    api.patch<Venue>(`/venues/${id}/`, data),
};

// ── Bookings ────────────────────────────────────────
export const bookingsApi = {
  create: (payload: CreateBookingPayload) =>
    api.post<Booking>('/bookings/', payload),

  myBookings: () =>
    api.get<Booking[]>('/bookings/my/'),

  ownerBookings: (params?: { status?: string; venue_id?: number }) =>
    api.get<Booking[]>('/bookings/owner/', { params }),

  confirm: (id: number) =>
    api.post<Booking>(`/bookings/${id}/confirm/`),

  cancel: (id: number) =>
    api.post<Booking>(`/bookings/${id}/cancel/`),
};

// ── Chats ───────────────────────────────────────────
export const chatsApi = {
  rooms: () =>
    api.get<ChatRoom[]>('/chats/rooms/'),

  messages: (roomId: number, params?: { page?: number }) =>
    api.get<PaginatedResponse<ChatMessage>>(`/chats/rooms/${roomId}/messages/`, { params }),
};

// ── Payments ────────────────────────────────────────
export const paymentsApi = {
  methods: () =>
    api.get<PaymentMethod[]>('/payments/methods/'),

  addCard: (token: string) =>
    api.post<PaymentMethod>('/payments/methods/', { token }),

  initiate: (bookingId: number, methodId: string) =>
    api.post<{ payment_id: string; redirect_url?: string }>(
      '/payments/initiate/',
      { booking_id: bookingId, method_id: methodId }
    ),

  confirm: (paymentId: string, otp?: string) =>
    api.post<{ status: string }>('/payments/confirm/', { payment_id: paymentId, otp }),
};

// ── Owner CRM ────────────────────────────────────────
export const ownerApi = {
  dashboardStats: (period: 'today' | 'week' | 'month') =>
    api.get<DashboardStats>('/owner/stats/', { params: { period } }),

  revenueChart: (period: 'week' | 'month') =>
    api.get<{ labels: string[]; values: number[] }>('/owner/revenue-chart/', { params: { period } }),
};

export default api;
