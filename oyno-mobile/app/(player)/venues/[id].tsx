import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ArrowLeft, CalendarDays, Check, MapPin, Navigation, Phone, Users } from 'lucide-react-native';
import { bookingRequestsApi, venuesApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { CreateBookingRequestPayload } from '@/types';

const SPORT_LABELS: Record<string, string> = {
  football: 'Футбол',
  basketball: 'Баскетбол',
  volleyball: 'Волейбол',
  tennis: 'Теннис',
  swimming: 'Плавание',
};

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [requestOpen, setRequestOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['venue', id],
    queryFn: () => venuesApi.detail(Number(id)),
    enabled: !!id,
  });

  const venue = data?.data;
  const amenities = venue?.amenities ?? [];

  const mapUrl = useMemo(() => {
    if (!venue) return '';
    if (venue.link_2gis) return venue.link_2gis;
    return `https://2gis.kg/bishkek/search/${encodeURIComponent(venue.address || venue.name)}`;
  }, [venue]);

  const openMap = () => {
    if (mapUrl) Linking.openURL(mapUrl).catch(() => {});
  };

  if (isLoading || !venue) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {venue.images?.[0] ? (
            <Image source={{ uri: venue.images[0] }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.placeholder]}>
              <Text style={styles.placeholderText}>OYNO</Text>
            </View>
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={styles.sport}>{SPORT_LABELS[venue.sport_id] ?? 'Спорт'}</Text>
          <Text style={styles.title}>{venue.name}</Text>
          <View style={styles.addressRow}>
            <MapPin size={15} color={COLORS.accent} />
            <Text style={styles.address}>{venue.address}</Text>
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{venue.price_per_hour}</Text>
              <Text style={styles.statLabel}>сом/час</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{venue.working_hours?.open ?? '08:00'}</Text>
              <Text style={styles.statLabel}>открытие</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{venue.working_hours?.close ?? '22:00'}</Text>
              <Text style={styles.statLabel}>закрытие</Text>
            </View>
          </View>

          {venue.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Описание</Text>
              <Text style={styles.description}>{venue.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Удобства</Text>
            {amenities.length > 0 ? (
              <View style={styles.amenities}>
                {amenities.map((item) => (
                  <View key={item} style={styles.chip}>
                    <Text style={styles.chipText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>Удобства уточняются у площадки.</Text>
            )}
          </View>

          <TouchableOpacity style={styles.mapButton} onPress={openMap} activeOpacity={0.85}>
            <View style={styles.mapIcon}>
              <Navigation size={22} color="#000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapTitle}>Открыть в 2ГИС</Text>
              <Text style={styles.mapSub} numberOfLines={1}>{venue.address}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>Свободное время уточняется</Text>
            <Text style={styles.noteText}>
              Оставь заявку: мы или владелец площадки свяжемся с тобой и подтвердим время.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.requestButton} onPress={() => setRequestOpen(true)} activeOpacity={0.9}>
          <Text style={styles.requestButtonText}>Оставить заявку</Text>
        </TouchableOpacity>
      </View>

      <BookingRequestModal
        visible={requestOpen}
        venueId={venue.id}
        sportId={venue.sport_id}
        venueName={venue.name}
        onClose={() => setRequestOpen(false)}
      />
    </View>
  );
}

function BookingRequestModal({
  visible,
  venueId,
  sportId,
  venueName,
  onClose,
}: {
  visible: boolean;
  venueId: number;
  sportId: string;
  venueName: string;
  onClose: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:00');
  const [players, setPlayers] = useState('10');
  const [comment, setComment] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const payload: CreateBookingRequestPayload = {
        venue_id: venueId,
        customer_name: name.trim(),
        phone: phone.trim(),
        sport_id: sportId as any,
        preferred_date: date,
        preferred_time: time.trim(),
        players_count: Number(players) || undefined,
        comment: comment.trim(),
      };
      return bookingRequestsApi.create(payload);
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Заявка отправлена',
        text2: 'Скоро свяжемся и подтвердим время.',
      });
      setComment('');
      onClose();
    },
    onError: (e: any) => {
      const data = e?.response?.data;
      const msg = typeof data === 'string' ? data : JSON.stringify(data ?? {});
      Toast.show({ type: 'error', text1: 'Не удалось отправить заявку', text2: msg.slice(0, 80) });
    },
  });

  const canSubmit = name.trim().length >= 2 && phone.trim().length >= 6;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Заявка</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalVenue}>{venueName}</Text>

          <Field icon={<Users size={16} color={COLORS.accent} />} label="Имя">
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Как к вам обращаться" placeholderTextColor={COLORS.gray[600]} />
          </Field>

          <Field icon={<Phone size={16} color={COLORS.accent} />} label="Телефон / WhatsApp">
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+996..." placeholderTextColor={COLORS.gray[600]} keyboardType="phone-pad" />
          </Field>

          <Field icon={<CalendarDays size={16} color={COLORS.accent} />} label="Дата">
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2026-06-22" placeholderTextColor={COLORS.gray[600]} />
          </Field>

          <Field icon={<Check size={16} color={COLORS.accent} />} label="Желаемое время">
            <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="19:00 или вечер" placeholderTextColor={COLORS.gray[600]} />
          </Field>

          <Field icon={<Users size={16} color={COLORS.accent} />} label="Сколько игроков">
            <TextInput style={styles.input} value={players} onChangeText={(v) => setPlayers(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="10" placeholderTextColor={COLORS.gray[600]} />
          </Field>

          <Text style={styles.label}>Комментарий</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={comment}
            onChangeText={setComment}
            placeholder="Например: нужен зал после 20:00, есть парковка?"
            placeholderTextColor={COLORS.gray[600]}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || isPending) && { opacity: 0.5 }]}
            onPress={() => canSubmit && mutate()}
            disabled={!canSubmit || isPending}
            activeOpacity={0.9}
          >
            {isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>Отправить заявку</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <View style={styles.fieldLabelRow}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 110 },
  loadingRoot: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  hero: { position: 'relative' },
  heroImage: { width: '100%', height: 280 },
  placeholder: { backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontFamily: FONTS.blackItalic, fontSize: 34, color: COLORS.accent },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 18,
    left: 16,
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: SPACING.lg },
  sport: { fontFamily: FONTS.blackItalic, fontSize: 10, color: COLORS.accent, letterSpacing: 3, textTransform: 'uppercase' },
  title: { fontFamily: FONTS.blackItalic, fontSize: 32, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -1, marginTop: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  address: { flex: 1, fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gray[400] },
  stats: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    padding: SPACING.md,
    ...SHADOW.card,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: FONTS.blackItalic, fontSize: 16, color: COLORS.white },
  statLabel: { fontFamily: FONTS.blackItalic, fontSize: 9, color: COLORS.gray[500], textTransform: 'uppercase', marginTop: 3 },
  divider: { width: 1, backgroundColor: COLORS.border },
  section: { marginTop: SPACING.xl },
  sectionTitle: { fontFamily: FONTS.blackItalic, fontSize: 13, color: COLORS.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: SPACING.sm },
  description: { fontFamily: FONTS.bold, fontSize: 14, lineHeight: 21, color: COLORS.gray[400] },
  muted: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gray[500] },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gray[400] },
  mapButton: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  mapIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  mapTitle: { fontFamily: FONTS.blackItalic, fontSize: 14, color: COLORS.white, textTransform: 'uppercase' },
  mapSub: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gray[500], marginTop: 3 },
  noteBox: { marginTop: SPACING.lg, borderRadius: RADIUS.xl, padding: SPACING.md, backgroundColor: 'rgba(198,255,0,0.08)', borderWidth: 1, borderColor: 'rgba(198,255,0,0.22)' },
  noteTitle: { fontFamily: FONTS.blackItalic, fontSize: 14, color: COLORS.accent, textTransform: 'uppercase' },
  noteText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gray[400], lineHeight: 19, marginTop: 6 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: SPACING.lg, paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  requestButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center', ...SHADOW.accent },
  requestButtonText: { fontFamily: FONTS.blackItalic, fontSize: 14, color: '#000', textTransform: 'uppercase', letterSpacing: 1.5 },
  modalRoot: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === 'ios' ? 20 : SPACING.lg },
  modalHeader: { paddingHorizontal: SPACING.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontFamily: FONTS.blackItalic, fontSize: 28, color: COLORS.white, textTransform: 'uppercase' },
  closeBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 28, color: COLORS.white, lineHeight: 30 },
  modalContent: { padding: SPACING.lg, paddingBottom: 40 },
  modalVenue: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gray[400], marginBottom: SPACING.lg },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label: { fontFamily: FONTS.blackItalic, fontSize: 10, color: COLORS.accent, letterSpacing: 2, textTransform: 'uppercase' },
  input: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 13, color: COLORS.white, fontFamily: FONTS.bold, fontSize: 15 },
  textarea: { height: 90, marginTop: 8, paddingTop: 13 },
  submitBtn: { marginTop: SPACING.xl, backgroundColor: COLORS.accent, borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center', ...SHADOW.accent },
  submitText: { fontFamily: FONTS.blackItalic, fontSize: 14, color: '#000', textTransform: 'uppercase', letterSpacing: 1.5 },
});
