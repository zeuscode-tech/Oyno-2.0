import { create } from '@/lib/zustand';
import { SportId } from '@/types';

interface UIState {
  selectedSport: SportId;
  isCreateGameOpen: boolean;
  isPaymentSheetOpen: boolean;
  notificationsCount: number;

  // Actions
  setSelectedSport: (sport: SportId) => void;
  setCreateGameOpen: (val: boolean) => void;
  setPaymentSheetOpen: (val: boolean) => void;
  incrementNotifications: () => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedSport: 'all',
  isCreateGameOpen: false,
  isPaymentSheetOpen: false,
  notificationsCount: 0,

  setSelectedSport: (sport) => set({ selectedSport: sport }),
  setCreateGameOpen: (val) => set({ isCreateGameOpen: val }),
  setPaymentSheetOpen: (val) => set({ isPaymentSheetOpen: val }),
  incrementNotifications: () =>
    set((s) => ({ notificationsCount: s.notificationsCount + 1 })),
  clearNotifications: () => set({ notificationsCount: 0 }),
}));
