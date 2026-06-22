import { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search } from 'lucide-react-native';
import { venuesApi } from '@/services/api';
import { useUIStore } from '@/stores/uiStore';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { SportId, Venue } from '@/types';

const SPORTS: { id: SportId; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'football', label: 'Футбол' },
  { id: 'basketball', label: 'Баскетбол' },
  { id: 'volleyball', label: 'Волейбол' },
  { id: 'tennis', label: 'Теннис' },
];

const SPORT_LABELS: Record<string, string> = {
  football: 'Футбол',
  basketball: 'Баскетбол',
  volleyball: 'Волейбол',
  tennis: 'Теннис',
};

export default function HomeScreen() {
  const { selectedSport, setSelectedSport } = useUIStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['venues', selectedSport],
    queryFn: () =>
      venuesApi.list({
        sport_id: selectedSport === 'all' ? undefined : selectedSport,
      }),
  });

  const venues = data?.data?.results ?? [];
  const subtitle = useMemo(() => {
    if (selectedSport === 'all') return 'Площадки для футбола, баскетбола, волейбола и тенниса';
    return `Площадки для спорта: ${SPORT_LABELS[selectedSport] ?? 'спорт'}`;
  }, [selectedSport]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>OYNO</Text>
            <Text style={styles.kicker}>Бишкек</Text>
          </View>
          <View style={styles.searchBadge}>
            <Search size={18} color="#000" />
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Найди спортплощадку и оставь заявку за 30 секунд</Text>
          <Text style={styles.heroText}>{subtitle}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {SPORTS.map((sport) => {
            const active = selectedSport === sport.id;
            return (
              <TouchableOpacity
                key={sport.id}
                style={[styles.filter, active && styles.filterActive]}
                onPress={() => setSelectedSport(sport.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {sport.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Площадки</Text>
          <Text style={styles.sectionCount}>{venues.length}</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={COLORS.accent} size="large" style={styles.loader} />
        ) : isError ? (
          <Text style={styles.emptyText}>Не удалось загрузить площадки</Text>
        ) : venues.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Пока нет площадок по фильтру</Text>
            <Text style={styles.emptyText}>
              Оставь заявку на любой площадке или выбери другой вид спорта.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(player)/venues/${venue.id}`)}
      activeOpacity={0.88}
    >
      {venue.images?.[0] ? (
        <Image source={{ uri: venue.images[0] }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImage, styles.cardPlaceholder]}>
          <Text style={styles.cardPlaceholderText}>OYNO</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardSport}>{SPORT_LABELS[venue.sport_id] ?? 'Спорт'}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{venue.name}</Text>
        <View style={styles.cardMeta}>
          <MapPin size={13} color={COLORS.accent} />
          <Text style={styles.cardAddress} numberOfLines={1}>{venue.address}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.price}>{venue.price_per_hour} сом/час</Text>
          <Text style={styles.cta}>Заявка</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 100 },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.sm,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontFamily: FONTS.blackItalic,
    fontSize: 42,
    color: COLORS.accent,
    letterSpacing: -2,
  },
  kicker: {
    fontFamily: FONTS.blackItalic,
    fontSize: 11,
    color: COLORS.gray[500],
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  searchBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 28,
    lineHeight: 32,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  heroText: {
    marginTop: SPACING.sm,
    fontFamily: FONTS.bold,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.gray[400],
  },
  filters: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
    paddingBottom: SPACING.lg,
  },
  filter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    ...SHADOW.accent,
  },
  filterText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 11,
    color: COLORS.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterTextActive: { color: '#000' },
  sectionHeader: {
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 24,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontFamily: FONTS.blackItalic,
    fontSize: 13,
    color: '#000',
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  loader: { marginTop: 60 },
  list: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  cardImage: { width: '100%', height: 170 },
  cardPlaceholder: {
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPlaceholderText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 28,
    color: COLORS.accent,
  },
  cardBody: { padding: SPACING.md },
  cardSport: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  cardTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 20,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  cardMeta: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardAddress: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.gray[500],
  },
  cardFooter: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontFamily: FONTS.blackItalic,
    fontSize: 14,
    color: COLORS.accent,
  },
  cta: {
    fontFamily: FONTS.blackItalic,
    fontSize: 11,
    color: '#000',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  emptyBox: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 16,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.gray[500],
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
});
