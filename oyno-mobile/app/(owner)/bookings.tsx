import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock, MapPin } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { bookingsApi } from '@/services/api';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { Booking, BookingStatus } from '@/types';
import { t } from '@/constants/i18n';

const STATUS_TABS: { id: BookingStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'pending', label: 'Ожидает' },
  { id: 'confirmed', label: 'Подтверждено' },
  { id: 'completed', label: 'Завершено' },
];

export default function OwnerBookingsScreen() {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['owner-bookings', statusFilter],
    queryFn: () =>
      bookingsApi.ownerBookings(statusFilter !== 'all' ? { status: statusFilter } : undefined),
    refetchInterval: 30_000,
  });

  const bookings = data?.data ?? [];

  const { mutate: confirm } = useMutation({
    mutationFn: (id: number) => bookingsApi.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-bookings'] });
      Toast.show({ type: 'success', text1: 'Бронь подтверждена' });
    },
  });

  const { mutate: cancel } = useMutation({
    mutationFn: (id: number) => bookingsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-bookings'] });
      Toast.show({ type: 'error', text1: 'Бронь отменена' });
    },
  });

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>БРОНИ</Text>

        <FlatList
          horizontal
          data={STATUS_TABS}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, statusFilter === item.id && styles.tabActive]}
              onPress={() => setStatusFilter(item.id)}
            >
              <Text style={[styles.tabText, statusFilter === item.id && { color: '#000' }]}>
                {item.label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onConfirm={() => confirm(item.id)}
            onCancel={() => cancel(item.id)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Нет броней</Text>
        }
      />
    </SafeAreaView>
  );
}

function BookingCard({
  booking,
  onConfirm,
  onCancel,
}: {
  booking: Booking;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const STATUS_COLORS: Record<BookingStatus, string> = {
    pending: COLORS.warning,
    confirmed: COLORS.accent,
    cancelled: COLORS.error,
    completed: COLORS.gray[500],
  };
  const STATUS_LABELS: Record<BookingStatus, string> = {
    pending: 'Ожидает',
    confirmed: 'Подтверждено',
    cancelled: 'Отменено',
    completed: 'Завершено',
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardVenue}>{booking.venue.name}</Text>
          <View style={styles.cardAddressRow}>
            <MapPin size={11} color={COLORS.accent} />
            <Text style={styles.cardAddress} numberOfLines={1}>{booking.venue.address}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[booking.status] + '22', borderColor: STATUS_COLORS[booking.status] }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[booking.status] }]}>
            {STATUS_LABELS[booking.status].toUpperCase()}
          </Text>
        </View>
      </View>

      {/* User + Time */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>ИГРОК</Text>
          <Text style={styles.infoValue}>{booking.user.name}</Text>
          <Text style={styles.infoSub}>{booking.user.phone}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>ВРЕМЯ</Text>
          <Text style={styles.infoValue}>
            {booking.slot.start_time.slice(0, 5)}–{booking.slot.end_time.slice(0, 5)}
          </Text>
          <Text style={styles.infoSub}>
            {new Date(booking.slot.start_time).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>СУММА</Text>
          <Text style={[styles.infoValue, { color: COLORS.accent }]}>{booking.total_price} с</Text>
          <Text style={styles.infoSub}>{booking.payment_status === 'paid' ? 'Оплачено' : 'Не оплачено'}</Text>
        </View>
      </View>

      {/* Actions */}
      {booking.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
            <X size={16} color={COLORS.error} />
            <Text style={styles.btnCancelText}>Отменить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnConfirm} onPress={onConfirm}>
            <Check size={16} color="#000" />
            <Text style={styles.btnConfirmText}>Подтвердить</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.blackItalic,
    fontSize: 36,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -2,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  tabs: { paddingHorizontal: SPACING.lg, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tabText: { fontFamily: FONTS.blackItalic, fontSize: 10, color: COLORS.gray[400], textTransform: 'uppercase', letterSpacing: 1 },

  list: { padding: SPACING.lg, gap: 12, paddingBottom: 100 },
  empty: { fontFamily: FONTS.boldItalic, fontSize: 11, color: COLORS.gray[600], textTransform: 'uppercase', textAlign: 'center', paddingVertical: 40 },

  // Card
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardVenue: { fontFamily: FONTS.blackItalic, fontSize: 16, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -0.5 },
  cardAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardAddress: { fontFamily: FONTS.boldItalic, fontSize: 10, color: COLORS.gray[500], flex: 1 },
  statusBadge: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: FONTS.blackItalic, fontSize: 9, letterSpacing: 1 },

  infoRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoItem: { flex: 1, alignItems: 'center' },
  infoDivider: { width: 1, backgroundColor: COLORS.border },
  infoLabel: { fontFamily: FONTS.blackItalic, fontSize: 8, color: COLORS.gray[600], textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  infoValue: { fontFamily: FONTS.blackItalic, fontSize: 14, color: COLORS.white },
  infoSub: { fontFamily: FONTS.boldItalic, fontSize: 9, color: COLORS.gray[500], marginTop: 2 },

  actions: { flexDirection: 'row', gap: 10 },
  btnCancel: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: 'rgba(239,83,80,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.3)',
  },
  btnCancelText: { fontFamily: FONTS.blackItalic, fontSize: 11, color: COLORS.error, textTransform: 'uppercase' },
  btnConfirm: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    ...SHADOW.accent,
  },
  btnConfirmText: { fontFamily: FONTS.blackItalic, fontSize: 11, color: '#000', textTransform: 'uppercase' },
});
