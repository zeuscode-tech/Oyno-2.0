import { create } from '@/lib/zustand';
import { User, AuthTokens, UserRole } from '@/types';
import { appStorage } from '@/services/storage';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeRole: UserRole;

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
    appStorage.setItem(USER_KEY, JSON.stringify(user)).catch(() => { });
  },

  setTokens: async (tokens) => {
    set({ tokens });
    await appStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },

  setActiveRole: (role) => set({ activeRole: role }),

  updateUser: (data) => {
    const current = get().user;
    if (current) {
      const updated = { ...current, ...data };
      set({ user: updated });
      appStorage.setItem(USER_KEY, JSON.stringify(updated)).catch(() => { });
    }
  },



  logout: async () => {
    await Promise.all([
      appStorage.deleteItem(TOKEN_KEY),
      appStorage.deleteItem(USER_KEY),
    ]).catch(() => { });
    set({ user: null, tokens: null, isAuthenticated: false, activeRole: 'player' });
  },

  loadFromStorage: async () => {
    try {
      const [rawTokens, rawUser] = await Promise.all([
        appStorage.getItem(TOKEN_KEY),
        appStorage.getItem(USER_KEY),
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
      appStorage.deleteItem(TOKEN_KEY).catch(() => { });
      appStorage.deleteItem(USER_KEY).catch(() => { });
    } finally {
      set({ isLoading: false });
    }
  },
}));
