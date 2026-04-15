import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  StyleSheet, Image, Modal, TextInput, ActivityIndicator,
  SafeAreaView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Bell, Plus, X, LayoutGrid, Globe, Activity, Layers, Circle } from 'lucide-react-native';
import { gamesApi, venuesApi } from '@/services/api';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { Game, Venue, SportId, SkillLevel } from '@/types';
import { t } from '@/constants/i18n';

const SPORT_CATEGORIES: { id: SportId; name: string; Icon: any }[] = [
  { id: 'all', name: 'Все', Icon: LayoutGrid },
  { id: 'football', name: 'Футбол', Icon: Globe },
  { id: 'basketball', name: 'Баскет', Icon: Activity },
  { id: 'volleyball', name: 'Волей', Icon: Layers },
  { id: 'tennis', name: 'Теннис', Icon: Circle },
];

export default function HomeScreen() {
  const { selectedSport, setSelectedSport, isCreateGameOpen, setCreateGameOpen, notificationsCount } = useUIStore();
  const user = useAuthStore((s) => s.user);

  const { data: gamesData, isLoading: gamesLoading } = useQuery({
    queryKey: ['games', selectedSport],
    queryFn: () => gamesApi.list({ sport_id: selectedSport === 'all' ? undefined : selectedSport }),
  });

  const { data: venuesData, isLoading: venuesLoading } = useQuery({
    queryKey: ['venues', selectedSport],
    queryFn: () => venuesApi.list({ sport_id: selectedSport === 'all' ? undefined : selectedSport }),
  });

  const games = gamesData?.data?.results ?? [];
  const venues = venuesData?.data?.results ?? [];
  const isLoading = gamesLoading || venuesLoading;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>OYNO</Text>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8}>
            <Bell size={20} color={COLORS.gray[400]} />
            {notificationsCount > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {/* Create Game Button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setCreateGameOpen(true)}
          activeOpacity={0.85}
        >
          <View style={styles.createIconWrapper}>
            <Plus size={24} color="#000" strokeWidth={3} />
          </View>
          <Text style={styles.createBtnText}>{t('home.createGame').toUpperCase()}</Text>
        </TouchableOpacity>

        {/* Sport Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {SPORT_CATEGORIES.map((sport) => {
            const active = selectedSport === sport.id;
            return (
              <TouchableOpacity
                key={sport.id}
                style={styles.categoryItem}
                onPress={() => setSelectedSport(sport.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryIcon, active && styles.categoryIconActive]}>
                  <sport.Icon size={28} color={active ? '#000' : '#fff'} strokeWidth={1.5} />
                </View>
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                  {sport.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Hot Matches */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('home.hotMatches').toUpperCase().replace(' ', '\n').split('\n').map((word, i) =>
                  i === 0
                    ? <Text key={i} style={{ color: COLORS.white }}>{word} </Text>
                    : <Text key={i} style={{ color: COLORS.accent }}>{word}</Text>
                )}
              </Text>
              {games.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
              {games.length === 0 && (
                <Text style={styles.emptyText}>Нет игр по фильтру</Text>
              )}
            </View>

            {/* Venues */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Text style={{ color: COLORS.white }}>Спортивные </Text>
                <Text style={{ color: COLORS.accent }}>Базы</Text>
              </Text>
              <View style={styles.venuesGrid}>
                {venues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </View>
              {venues.length === 0 && (
                <Text style={styles.emptyText}>Нет площадок по фильтру</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Create Game Modal */}
      <CreateGameModal visible={isCreateGameOpen} onClose={() => setCreateGameOpen(false)} />
    </SafeAreaView>
  );
}

// ── Game Card ─────────────────────────────────────────
function GameCard({ game }: { game: Game }) {
  const sportCategory = SPORT_CATEGORIES.find((s) => s.id === game.sport_id);
  return (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => router.push(`/(player)/games/${game.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.gameCardIcon}>
        {sportCategory && <sportCategory.Icon size={28} color={COLORS.accent} strokeWidth={1.5} />}
      </View>
      <View style={styles.gameCardInfo}>
        <Text style={styles.gameCardTitle} numberOfLines={1}>
          {game.title}
        </Text>
        <Text style={styles.gameCardVenue} numberOfLines={1}>
          {game.venue?.name}
        </Text>
      </View>
      <View style={styles.gameCardBadge}>
        <Text style={styles.gameCardBadgeLabel}>НУЖНО</Text>
        <Text style={styles.gameCardBadgeNum}>{game.players_needed - game.players_joined}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Venue Card ────────────────────────────────────────
function VenueCard({ venue }: { venue: Venue }) {
  return (
    <TouchableOpacity
      style={styles.venueCard}
      onPress={() => router.push(`/(player)/venues/${venue.id}`)}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: venue.images?.[0] ?? 'https://via.placeholder.com/300' }}
        style={styles.venueCardImage}
        resizeMode="cover"
      />
      <View style={styles.venueCardBody}>
        <Text style={styles.venueCardName} numberOfLines={1}>{venue.name}</Text>
        <Text style={styles.venueCardRating}>★ {venue.rating}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Create Game Modal ─────────────────────────────────
const GAME_SPORTS: { id: SportId; name: string }[] = [
  { id: 'football', name: 'Футбол' },
  { id: 'basketball', name: 'Баскет' },
  { id: 'volleyball', name: 'Волей' },
  { id: 'tennis', name: 'Теннис' },
];

const SKILL_LEVELS: { id: SkillLevel; name: string }[] = [
  { id: 'ANY', name: 'Любой' },
  { id: 'BEGINNER', name: 'Новичок' },
  { id: 'INTERMEDIATE', name: 'Средний' },
  { id: 'ADVANCED', name: 'Про' },
];

function CreateGameModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [sportId, setSportId] = useState<SportId>('football');
  const [venueId, setVenueId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('18:00');
  const [playersNeeded, setPlayersNeeded] = useState(10);
  const [level, setLevel] = useState<SkillLevel>('ANY');
  const [description, setDescription] = useState('');

  const { data: venuesData } = useQuery({
    queryKey: ['venues-all'],
    queryFn: () => venuesApi.list(),
    enabled: visible,
  });
  const venues = venuesData?.data?.results ?? [];

  const dates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { iso: d.toISOString().split('T')[0], d };
  });

  const { mutate: create, isPending } = useMutation({
    mutationFn: () =>
      gamesApi.create({
        sport_id: sportId,
        venue_id: venueId!,
        date_time: `${selectedDate}T${time}:00`,
        duration: 90,
        players_needed: playersNeeded,
        level,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['games'] });
      Toast.show({ type: 'success', text1: 'Игра создана!', text2: 'Ищем игроков...' });
      setVenueId(null);
      setDescription('');
      setPlayersNeeded(10);
      onClose();
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Ошибка создания игры' });
    },
  });

  const canSubmit = venueId !== null && time.length >= 4;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            Новая <Text style={{ color: COLORS.accent }}>Игра</Text>
          </Text>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Sport */}
          <Text style={styles.fieldLabel}>ВИД СПОРТА</Text>
          <View style={styles.pillRow}>
            {GAME_SPORTS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.pill, sportId === s.id && styles.pillActive]}
                onPress={() => setSportId(s.id)}
              >
                <Text style={[styles.pillText, sportId === s.id && styles.pillTextActive]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date */}
          <Text style={styles.fieldLabel}>ДАТА</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: SPACING.md }}
          >
            <View style={styles.datesRow}>
              {dates.map(({ iso, d }) => {
                const isSelected = iso === selectedDate;
                return (
                  <TouchableOpacity
                    key={iso}
                    style={[styles.dateBtn, isSelected && styles.dateBtnActive]}
                    onPress={() => setSelectedDate(iso)}
                  >
                    <Text style={[styles.dateBtnDay, isSelected && { color: '#000' }]}>
                      {d.toLocaleDateString('ru', { weekday: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={[styles.dateBtnNum, isSelected && { color: '#000' }]}>
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Time */}
          <Text style={styles.fieldLabel}>ВРЕМЯ (ЧЧ:ММ)</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="18:00"
            placeholderTextColor={COLORS.gray[600]}
            value={time}
            onChangeText={setTime}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          {/* Venue */}
          <Text style={styles.fieldLabel}>ПЛОЩАДКА</Text>
          {venues.length === 0 ? (
            <Text style={styles.fieldHint}>Загрузка площадок...</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: SPACING.md }}
            >
              <View style={styles.venuePickerRow}>
                {venues.slice(0, 12).map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.venuePill, venueId === v.id && styles.venuePillActive]}
                    onPress={() => setVenueId(v.id)}
                  >
                    <Text
                      style={[styles.venuePillText, venueId === v.id && { color: '#000' }]}
                      numberOfLines={1}
                    >
                      {v.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Players needed */}
          <Text style={styles.fieldLabel}>НУЖНО ИГРОКОВ</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setPlayersNeeded(Math.max(2, playersNeeded - 1))}
            >
              <Text style={styles.stepperBtnText}>–</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{playersNeeded}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setPlayersNeeded(Math.min(30, playersNeeded + 1))}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Level */}
          <Text style={styles.fieldLabel}>УРОВЕНЬ ИГРЫ</Text>
          <View style={styles.pillRow}>
            {SKILL_LEVELS.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[styles.pill, level === l.id && styles.pillActive]}
                onPress={() => setLevel(l.id)}
              >
                <Text style={[styles.pillText, level === l.id && styles.pillTextActive]}>
                  {l.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={styles.fieldLabel}>ОПИСАНИЕ (НЕОБЯЗАТЕЛЬНО)</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldTextarea]}
            placeholder="Расскажи о своей игре..."
            placeholderTextColor={COLORS.gray[600]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </ScrollView>

        <TouchableOpacity
          style={[styles.modalBtn, (!canSubmit || isPending) && styles.modalBtnDisabled]}
          onPress={() => canSubmit && create()}
          disabled={!canSubmit || isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.modalBtnText}>СОЗДАТЬ ИГРУ</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.md,
    paddingBottom: SPACING.lg,
  },
  logo: {
    fontFamily: FONTS.blackItalic,
    fontSize: 40,
    color: COLORS.accent,
    letterSpacing: -2,
    lineHeight: 44,
  },
  bellBtn: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },

  // Create Button
  createBtn: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: 'rgba(198,255,0,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(198,255,0,0.3)',
    borderStyle: 'dashed',
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    gap: 12,
  },
  createIconWrapper: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    padding: 12,
  },
  createBtnText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 11,
    color: COLORS.accent,
    letterSpacing: 2,
  },

  // Categories
  categoriesScroll: { marginBottom: SPACING.lg },
  categoriesContent: { paddingHorizontal: SPACING.lg, gap: 16 },
  categoryItem: { alignItems: 'center', gap: 8 },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: COLORS.bgCard,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    ...SHADOW.accent,
  },
  categoryLabel: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoryLabelActive: { color: COLORS.white },

  // Section
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 24,
    letterSpacing: -1,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
    lineHeight: 28,
  },
  emptyText: {
    fontFamily: FONTS.boldItalic,
    fontSize: 11,
    color: COLORS.gray[600],
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },

  // Game Card
  gameCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  gameCardIcon: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gameCardInfo: { flex: 1 },
  gameCardTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 13,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  gameCardVenue: {
    fontFamily: FONTS.boldItalic,
    fontSize: 10,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    marginTop: 4,
  },
  gameCardBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    ...SHADOW.accent,
  },
  gameCardBadgeLabel: {
    fontFamily: FONTS.blackItalic,
    fontSize: 7,
    color: 'rgba(0,0,0,0.6)',
    textTransform: 'uppercase',
  },
  gameCardBadgeNum: {
    fontFamily: FONTS.blackItalic,
    fontSize: 20,
    color: '#000',
    lineHeight: 22,
  },

  // Venue Grid
  venuesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  venueCard: {
    width: '47.5%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  venueCardImage: { width: '100%', height: 120 },
  venueCardBody: { padding: SPACING.md },
  venueCardName: {
    fontFamily: FONTS.blackItalic,
    fontSize: 12,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  venueCardRating: {
    fontFamily: FONTS.boldItalic,
    fontSize: 10,
    color: COLORS.accent,
    marginTop: 4,
  },

  // Modal
  modalRoot: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 32 : SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : SPACING.lg,
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 28,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  modalClose: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { paddingBottom: SPACING.lg, gap: 4 },
  fieldLabel: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.accent,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: SPACING.md,
    marginBottom: 8,
  },
  fieldHint: {
    fontFamily: FONTS.boldItalic,
    fontSize: 11,
    color: COLORS.gray[600],
    marginBottom: SPACING.md,
  },
  fieldInput: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 14,
    marginBottom: 4,
  },
  fieldTextarea: {
    height: 80,
    paddingTop: 14,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    ...SHADOW.accent,
  },
  pillText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 11,
    color: COLORS.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pillTextActive: { color: '#000' },
  datesRow: { flexDirection: 'row', gap: 10 },
  dateBtn: {
    width: 56,
    paddingVertical: 12,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 4,
  },
  dateBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    ...SHADOW.accent,
  },
  dateBtnDay: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
  },
  dateBtnNum: {
    fontFamily: FONTS.blackItalic,
    fontSize: 18,
    color: COLORS.white,
  },
  venuePickerRow: { flexDirection: 'row', gap: 8 },
  venuePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 160,
  },
  venuePillActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    ...SHADOW.accent,
  },
  venuePillText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 11,
    color: COLORS.gray[400],
    textTransform: 'uppercase',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: 4,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 24,
    color: COLORS.white,
    lineHeight: 28,
  },
  stepperValue: {
    fontFamily: FONTS.blackItalic,
    fontSize: 36,
    color: COLORS.accent,
    letterSpacing: -1,
    minWidth: 48,
    textAlign: 'center',
  },
  modalBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: 22,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOW.accent,
  },
  modalBtnDisabled: { opacity: 0.4 },
  modalBtnText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 14,
    color: '#000',
    letterSpacing: 2,
  },
});
