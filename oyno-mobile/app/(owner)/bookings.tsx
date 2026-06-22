import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Linking,
  RefreshControl,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, MapPin, Phone, UserRound, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { bookingRequestsApi } from '@/services/api';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { BookingRequest, BookingRequestStatus } from '@/types';

const STATUS_TABS: { id: BookingRequestStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'new', label: 'Новые' },
  { id: 'contacted', label: 'Связались' },
  { id: 'confirmed', label: 'Подтверждено' },
  { id: 'cancelled', label: 'Отменено' },
];

const STATUS_LABELS: Record<BookingRequestStatus, string> = {
  new: 'Новая',
  contacted: 'Связались',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
};

const STATUS_COLORS: Record<BookingRequestStatus, string> = {
  new: COLORS.warning,
  contacted: COLORS.accent,
  confirmed: COLORS.success,
  cancelled: COLORS.error,
};

const SPORT_LABELS: Record<string, string> = {
  football: 'Футбол',
  basketball: 'Баскетбол',
  volleyball: 'Волейбол',
  tennis: 'Теннис',
};

export default function OwnerBookingsScreen() {
  const [statusFilter, setStatusFilter] = useState<BookingRequestStatus | 'all'>('all');
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['owner-booking-requests', statusFilter],
    queryFn: () =>
      bookingRequestsApi.ownerList(statusFilter !== 'all' ? { status: statusFilter } : undefined),
    refetchInterval: 30_000,
  });

  const requests = query.data?.data ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: BookingRequestStatus }) =>
      bookingRequestsApi.updateOwnerStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-booking-requests'] });
      Toast.show({ type: 'success', text1: 'Статус заявки обновлён' });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Не удалось обновить заявку' });
    },
  });

  const updateStatus = (id: number, status: BookingRequestStatus) => {
    statusMutation.mutate({ id, status });
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>OWNER</Text>
        <Text style={styles.title}>Заявки</Text>
        <Text style={styles.subtitle}>Новые запросы от игроков. Позвоните и отметьте результат.</Text>

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
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, statusFilter === item.id && styles.tabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            isUpdating={statusMutation.isPending}
            onContacted={() => updateStatus(item.id, 'contacted')}
            onConfirmed={() => updateStatus(item.id, 'confirmed')}
            onCancelled={() => updateStatus(item.id, 'cancelled')}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{query.isLoading ? 'Загружаем...' : 'Заявок пока нет'}</Text>
            <Text style={styles.emptyText}>Когда игрок оставит заявку на вашу площадку, она появится здесь.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function RequestCard({
  request,
  isUpdating,
  onContacted,
  onConfirmed,
  onCancelled,
}: {
  request: BookingRequest;
  isUpdating: boolean;
  onContacted: () => void;
  onConfirmed: () => void;
  onCancelled: () => void;
}) {
  const callCustomer = () => {
    Linking.openURL(`tel:${request.phone}`);
  };

  const dateText = request.preferred_date
    ? new Date(`${request.preferred_date}T00:00:00`).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      })
    : 'Дата не выбрана';

  const sportText = request.sport_id ? SPORT_LABELS[request.sport_id] ?? request.sport_id : 'Спорт не выбран';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.venueName}>{request.venue.name}</Text>
          <View style={styles.metaRow}>
            <MapPin size={13} color={COLORS.gray[500]} />
            <Text style={styles.address} numberOfLines={1}>{request.venue.address}</Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              borderColor: STATUS_COLORS[request.status],
              backgroundColor: `${STATUS_COLORS[request.status]}22`,
            },
          ]}
        >
          <Text style={[styles.statusText, { color: STATUS_COLORS[request.status] }]}>
            {STATUS_LABELS[request.status]}
          </Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoItem}>
          <UserRound size={15} color={COLORS.accent} />
          <View style={styles.infoTextBlock}>
            <Text style={styles.infoLabel}>Клиент</Text>
            <Text style={styles.infoValue}>{request.customer_name}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.infoItem} onPress={callCustomer} activeOpacity={0.85}>
          <Phone size={15} color={COLORS.accent} />
          <View style={styles.infoTextBlock}>
            <Text style={styles.infoLabel}>Телефон</Text>
            <Text style={[styles.infoValue, styles.phoneText]}>{request.phone}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.infoItem}>
          <Clock size={15} color={COLORS.accent} />
          <View style={styles.infoTextBlock}>
            <Text style={styles.infoLabel}>Когда</Text>
            <Text style={styles.infoValue}>
              {dateText}{request.preferred_time ? `, ${request.preferred_time}` : ''}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.detailPill}>{sportText}</Text>
        {request.players_count ? <Text style={styles.detailPill}>{request.players_count} игроков</Text> : null}
        <Text style={styles.detailPill}>{request.venue.price_per_hour} сом/час</Text>
      </View>

      {request.comment ? <Text style={styles.comment}>{request.comment}</Text> : null}

      {request.status !== 'cancelled' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={onContacted}
            disabled={isUpdating}
          >
            <Phone size={15} color={COLORS.accent} />
            <Text style={styles.secondaryButtonText}>Связались</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={onConfirmed}
            disabled={isUpdating}
          >
            <Check size={15} color="#000" />
            <Text style={styles.confirmButtonText}>Подтвердить</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, styles.cancelButton]}
            onPress={onCancelled}
            disabled={isUpdating}
          >
            <X size={16} color={COLORS.error} />
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
  eyebrow: {
    fontFamily: FONTS.blackItalic,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 3,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.blackItalic,
    fontSize: 34,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -1,
    paddingHorizontal: SPACING.lg,
  },
  subtitle: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.gray[400],
    lineHeight: 19,
    paddingHorizontal: SPACING.lg,
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  tabs: { paddingHorizontal: SPACING.lg, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tabText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 11,
    color: COLORS.gray[400],
    textTransform: 'uppercase',
  },
  tabTextActive: { color: '#000' },
  list: { padding: SPACING.lg, gap: 12, paddingBottom: 110 },
  emptyState: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 16,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.gray[500],
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  cardTitleBlock: { flex: 1 },
  venueName: {
    fontFamily: FONTS.blackItalic,
    fontSize: 17,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  address: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.gray[500],
  },
  statusBadge: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  infoBox: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 12,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoTextBlock: { flex: 1 },
  infoLabel: {
    fontFamily: FONTS.blackItalic,
    fontSize: 8,
    color: COLORS.gray[600],
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
    marginTop: 2,
  },
  phoneText: { color: COLORS.accent },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailPill: {
    fontFamily: FONTS.blackItalic,
    fontSize: 10,
    color: COLORS.gray[100],
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  comment: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.gray[400],
    lineHeight: 18,
  },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButton: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmButton: { backgroundColor: COLORS.accent, ...SHADOW.accent },
  iconButton: {
    width: 44,
    minHeight: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: 'rgba(239,83,80,0.08)',
    borderColor: 'rgba(239,83,80,0.3)',
  },
  secondaryButtonText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 10,
    color: COLORS.accent,
    textTransform: 'uppercase',
  },
  confirmButtonText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 10,
    color: '#000',
    textTransform: 'uppercase',
  },
});
