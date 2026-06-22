import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AuthTokens, User, Game, Venue, Booking, ChatRoom, ChatMessage,
  DashboardStats, TimeSlot, CreateGamePayload, CreateBookingPayload,
  PaginatedResponse, LoginPayload, RegisterPayload, PaymentMethod, SportId,
  BookingRequest, CreateBookingRequestPayload, BookingRequestStatus } from '@/types';
import { API_BASE_URL } from '@/services/network';
import { appStorage } from '@/services/storage';

// ── Config ─────────────────────────────────────────
export const BASE_URL = API_BASE_URL;
const TOKEN_KEY = 'oyno_tokens';

// ── Axios instance ──────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT + fix FormData headers ─────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const raw = await appStorage.getItem(TOKEN_KEY);
  if (raw) {
    const tokens: AuthTokens = JSON.parse(raw);
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  // For FormData let the runtime set Content-Type with boundary automatically
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
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
        const raw = await appStorage.getItem(TOKEN_KEY);
        if (!raw) throw new Error('No tokens');
        const tokens: AuthTokens = JSON.parse(raw);
        const { data } = await axios.post<AuthTokens>(
          `${BASE_URL}/auth/token/refresh/`,
          { refresh: tokens.refresh }
        );
        await appStorage.setItem(TOKEN_KEY, JSON.stringify(data));
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        await appStorage.deleteItem(TOKEN_KEY);
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

  uploadAvatar: (uri: string) => {
    const form = new FormData();
    const filename = uri.split('/').pop() ?? 'avatar.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    form.append('avatar', { uri, name: filename, type: mime } as any);
    return api.patch<User>('/auth/me/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  logout: () =>
    api.post('/auth/logout/'),

  forgotPassword: (phone: string) =>
    api.post<{ detail: string }>('/auth/password/reset/', { phone }),

  resetPassword: (phone: string, code: string, new_password: string) =>
    api.post<{ detail: string }>('/auth/password/reset/confirm/', { phone, code, new_password }),
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

  createVenue: (data: {
    name: string; type: string; sport_id: string;
    address: string; city: string; price_per_hour: number;
    description?: string;
  }) => api.post<Venue>('/venues/', data),

  update: (id: number, data: Partial<Venue>) =>
    api.patch<Venue>(`/venues/${id}/`, data),

  reviews: (id: number) =>
    api.get<{ id: number; rating: number; text: string; author_name: string; created_at: string }[]>(`/venues/${id}/reviews/`),

  addReview: (id: number, data: { rating: number; text?: string }) =>
    api.post<{ id: number; rating: number; text: string; author_name: string; created_at: string }>(`/venues/${id}/reviews/`, data),
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

export const bookingRequestsApi = {
  create: (payload: CreateBookingRequestPayload) =>
    api.post<BookingRequest>('/bookings/requests/', payload),

  mine: () =>
    api.get<BookingRequest[]>('/bookings/requests/'),

  ownerList: (params?: { status?: BookingRequestStatus }) =>
    api.get<BookingRequest[]>('/bookings/requests/owner/', { params }),

  updateOwnerStatus: (id: number, status: BookingRequestStatus) =>
    api.patch<Pick<BookingRequest, 'status'>>(`/bookings/requests/owner/${id}/`, { status }),
};

// ── Users (search) ──────────────────────────────────
export const usersApi = {
  searchByUsername: (username: string) =>
    api.get<User[]>('/auth/users/search/', { params: { username } }),
};

// ── Chats ───────────────────────────────────────────
export const chatsApi = {
  rooms: () =>
    api.get<ChatRoom[]>('/chats/rooms/'),

  messages: (roomId: number, params?: { page?: number }) =>
    api.get<PaginatedResponse<ChatMessage>>(`/chats/rooms/${roomId}/messages/`, { params }),

  uploadMedia: (roomId: number, uri: string, mediaType: 'image' | 'video' | 'audio') => {
    const form = new FormData();
    const filename = uri.split('/').pop() ?? `media.${mediaType === 'audio' ? 'm4a' : 'jpg'}`;
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      mp4: 'video/mp4', mov: 'video/quicktime',
      m4a: 'audio/m4a', aac: 'audio/aac', wav: 'audio/wav',
    };
    form.append('file', { uri, name: filename, type: mimeMap[ext] ?? 'application/octet-stream' } as any);
    form.append('media_type', mediaType);
    return api.post<ChatMessage>(`/chats/rooms/${roomId}/upload/`, form);
  },

  createDirect: (userId: number) =>
    api.post<ChatRoom>('/chats/rooms/direct/', { user_id: userId }),

  updateAvatar: (roomId: number, uri: string) => {
    const form = new FormData();
    const filename = uri.split('/').pop() ?? 'avatar.jpg';
    form.append('avatar', { uri, name: filename, type: 'image/jpeg' } as any);
    return api.patch<ChatRoom>(`/chats/rooms/${roomId}/avatar/`, form);
  },
};

// ── Payments ────────────────────────────────────────
export const paymentsApi = {
  methods: () =>
    api.get<PaymentMethod[]>('/payments/methods/'),

  addCard: (payload: { type: string; last4: string; label: string }) =>
    api.post<PaymentMethod>('/payments/methods/', payload),

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
