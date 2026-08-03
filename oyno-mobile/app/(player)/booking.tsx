import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import { venuesApi, bookingsApi } from '@/services/api';
import { trackEvent } from '@/services/analytics';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { TimeSlot } from '@/types';

export default function BookingScreen() {
  const { venue_id, slot_id } = useLocalSearchParams<{ venue_id: string; slot_id: string }>();
  const { data: venueRes, isLoading: venueLoading } = useQuery({
    queryKey: ['venue', venue_id],
    queryFn: () => venuesApi.detail(Number(venue_id)),
    enabled: !!venue_id,
  });

  const { data: slotsRes, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots-booking', venue_id],
    queryFn: () =>
      venuesApi.slots(Number(venue_id), new Date().toISOString().split('T')[0]),
    enabled: !!venue_id,
  });

  const venue = venueRes?.data;
  const slots = slotsRes?.data ?? [];
  const slot: TimeSlot | undefined = slots.find((candidate) => String(candidate.id) === String(slot_id));
  const isLoading = venueLoading || slotsLoading;

  const { mutate: book, isPending } = useMutation({
    mutationFn: () =>
      bookingsApi.create({
        venue_id: Number(venue_id),
        slot_id: Number(slot_id),
      }),
    onSuccess: () => {
      trackEvent('booking_created', { venue_id: Number(venue_id), slot_id: Number(slot_id) });
      Toast.show({
        type: 'success',
        text1: 'Бронирование создано!',
        text2: 'Ожидайте подтверждения от владельца',
      });
      router.replace('/(player)');
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Ошибка бронирования', text2: 'Попробуйте ещё раз' });
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>БРОНИРОВАНИЕ</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Venue */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>ПЛОЩАДКА</Text>
          <Text style={styles.infoValue}>{venue?.name ?? '—'}</Text>
          <Text style={styles.infoSub}>{venue?.address}</Text>
        </View>

        {/* Slot */}
        {slot ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>ВРЕМЯ</Text>
            <Text style={styles.infoValue}>
              {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
            </Text>
            <Text style={styles.infoSub}>Стоимость: {slot.price} сом</Text>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>СЛОТ</Text>
            <Text style={styles.infoSub}>Слот #{slot_id}</Text>
          </View>
        )}

        <View style={styles.requestCard}>
          <CheckCircle size={24} color={COLORS.accent} />
          <View style={styles.requestInfo}>
            <Text style={styles.requestTitle}>Оплата после подтверждения</Text>
            <Text style={styles.requestText}>
              Сначала владелец подтвердит заявку. Способ оплаты согласуем в чате.
            </Text>
          </View>
        </View>

        {/* Total */}
        {slot && (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>ИТОГО</Text>
            <Text style={styles.totalPrice}>{slot.price} сом</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.bookBtn,
            (!slot || isPending) && styles.bookBtnDisabled,
          ]}
          onPress={() => book()}
          disabled={!slot || isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.bookBtnText}>ПОДТВЕРДИТЬ БРОНЬ</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loadingRoot: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.sm,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontFamily: FONTS.blackItalic,
    fontSize: 20,
    color: COLORS.white,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },

  content: { padding: SPACING.lg, gap: 12, paddingBottom: 120 },

  infoCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  infoLabel: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.accent,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  infoValue: {
    fontFamily: FONTS.blackItalic,
    fontSize: 20,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  infoSub: {
    fontFamily: FONTS.boldItalic,
    fontSize: 11,
    color: COLORS.gray[500],
    marginTop: 4,
  },

  requestCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  requestInfo: { flex: 1 },
  requestTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 14,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  requestText: {
    fontFamily: FONTS.boldItalic,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.gray[500],
    marginTop: 4,
  },

  emptyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 14,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
  },
  emptySub: {
    fontFamily: FONTS.boldItalic,
    fontSize: 11,
    color: COLORS.gray[600],
  },

  methodCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  methodCardActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    ...SHADOW.accent,
  },
  methodInfo: { flex: 1 },
  methodLabel: {
    fontFamily: FONTS.blackItalic,
    fontSize: 14,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  methodLast4: {
    fontFamily: FONTS.boldItalic,
    fontSize: 11,
    color: COLORS.gray[500],
    marginTop: 2,
  },

  totalCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontFamily: FONTS.blackItalic,
    fontSize: 12,
    color: COLORS.gray[400],
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  totalPrice: {
    fontFamily: FONTS.blackItalic,
    fontSize: 28,
    color: COLORS.accent,
    letterSpacing: -1,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.lg,
  },
  bookBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: 22,
    alignItems: 'center',
    ...SHADOW.accent,
  },
  bookBtnDisabled: { opacity: 0.4 },
  bookBtnText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 14,
    color: '#000',
    letterSpacing: 2,
  },
});
