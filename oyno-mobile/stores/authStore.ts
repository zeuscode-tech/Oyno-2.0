import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User, AuthTokens, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeRole: UserRole;

  // Actions
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  setActiveRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const TOKEN_KEY = 'oyno_tokens';
const USER_KEY = 'oyno_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isLoading: true,
  isAuthenticated: false,
  activeRole: 'player',

  setUser: (user) => {
    set({ user, isAuthenticated: true });
    // Fire-and-forget: persist user so it survives app restart
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)).catch(() => {});
  },

  setTokens: async (tokens) => {
    set({ tokens });
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
  },

  setActiveRole: (role) => set({ activeRole: role }),

  updateUser: (data) => {
    const current = get().user;
    if (current) {
      const updated = { ...current, ...data };
      set({ user: updated });
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated)).catch(() => {});
    }
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]).catch(() => {});
    set({ user: null, tokens: null, isAuthenticated: false, activeRole: 'player' });
  },

  loadFromStorage: async () => {
    try {
      const [rawTokens, rawUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      if (rawTokens && rawUser) {
        const tokens: AuthTokens = JSON.parse(rawTokens);
        const user: User = JSON.parse(rawUser);
        set({
          tokens,
          user,
          isAuthenticated: true,
          // Restore role from user's actual role
          activeRole: user.role === 'venue_owner' ? 'venue_owner' : 'player',
        });
      }
    } catch {
      // Corrupted data — clear it
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    } finally {
      set({ isLoading: false });
    }
  },
}));
