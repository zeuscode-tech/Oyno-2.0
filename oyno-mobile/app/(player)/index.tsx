import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  StyleSheet, Image, Modal, TextInput, ActivityIndicator,
  SafeAreaView, Platform, Animated, PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Bell, Plus, X } from 'lucide-react-native';
import { gamesApi, venuesApi } from '@/services/api';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { Game, Venue, SportId, SkillLevel } from '@/types';
import { t } from '@/constants/i18n';

const SPORT_CATEGORIES: { id: SportId; name: string; emoji: string }[] = [
  { id: 'all', name: 'Все', emoji: '⚡' },
  { id: 'football', name: 'Футбол', emoji: '⚽' },
  { id: 'basketball', name: 'Баскет', emoji: '🏀' },
  { id: 'volleyball', name: 'Волей', emoji: '🏐' },
  { id: 'tennis', name: 'Теннис', emoji: '🎾' },
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

  const allGames = gamesData?.data?.results ?? [];
  const venues = venuesData?.data?.results ?? [];
  const isLoading = gamesLoading || venuesLoading;

  const hotGames = useMemo(() => {
    const now = new Date();
    return allGames
      .filter((g) => new Date(g.date_time) >= now)
      .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
      .slice(0, 3);
  }, [allGames]);

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
                  <Text style={styles.categoryEmoji}>{sport.emoji}</Text>
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
              {hotGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
              {hotGames.length === 0 && (
                <Text style={styles.emptyText}>Нет предстоящих игр</Text>
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
        <Text style={styles.gameCardEmoji}>{sportCategory?.emoji ?? '🎮'}</Text>
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
      {venue.images?.[0] ? (
        <Image
          source={{ uri: venue.images[0] }}
          style={styles.venueCardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.venueCardImage, styles.venueCardImagePlaceholder]}>
          <Text style={styles.venueCardEmoji}>🏟️</Text>
        </View>
      )}
      <View style={styles.venueCardBody}>
        <Text style={styles.venueCardName} numberOfLines={1}>{venue.name}</Text>
        <Text style={styles.venueCardRating}>★ {venue.rating}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Create Game Modal ─────────────────────────────────
const GAME_SPORTS: { id: SportId; name: string; emoji: string }[] = [
  { id: 'football', name: 'Футбол', emoji: '⚽' },
  { id: 'basketball', name: 'Баскет', emoji: '🏀' },
  { id: 'volleyball', name: 'Волей', emoji: '🏐' },
  { id: 'tennis', name: 'Теннис', emoji: '🎾' },
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
  const [duration, setDuration] = useState(1.5);
  const [playersNeeded, setPlayersNeeded] = useState(10);
  const [level, setLevel] = useState<SkillLevel>('ANY');
  const [description, setDescription] = useState('');

  const { data: venuesData, isLoading: venuesLoading } = useQuery({
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
        duration,
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
    onError: (e: any) => {
      const msg = e?.response?.data
        ? JSON.stringify(e.response.data)
        : 'Ошибка создания игры';
      Toast.show({ type: 'error', text1: 'Ошибка', text2: msg.slice(0, 80) });
    },
  });

  const canSubmit = venueId !== null;

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
                  {s.emoji} {s.name}
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
          <Text style={styles.fieldLabel}>ВРЕМЯ НАЧАЛА</Text>
          <TimeWheelPicker value={time} onChange={setTime} />

          {/* Duration */}
          <Text style={styles.fieldLabel}>ДЛИТЕЛЬНОСТЬ</Text>
          <View style={styles.pillRow}>
            {([1, 1.5, 2, 2.5, 3] as const).map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.pill, duration === d && styles.pillActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.pillText, duration === d && styles.pillTextActive]}>
                  {d === 1 ? '1 ч' : d === 1.5 ? '1:30' : d === 2 ? '2 ч' : d === 2.5 ? '2:30' : '3 ч'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Venue */}
          <Text style={styles.fieldLabel}>ПЛОЩАДКА</Text>
          {venuesLoading ? (
            <ActivityIndicator color={COLORS.accent} style={{ marginBottom: SPACING.md }} />
          ) : venues.length === 0 ? (
            <Text style={[styles.fieldHint, { color: COLORS.error }]}>
              Нет доступных площадок. Сначала добавьте площадки через режим владельца.
            </Text>
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

// ── Wheel Picker (PanResponder — no nested scroll issues) ─────────────────
const ITEM_H = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINS = ['00', '15', '30', '45'];

function WheelColumn({
  items, value, onChange, label,
}: {
  items: string[]; value: string; onChange: (v: string) => void; label: string;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const startIdx = Math.max(0, items.indexOf(value));
  const animY = useRef(new Animated.Value(-startIdx * ITEM_H)).current;
  const baseY = useRef(-startIdx * ITEM_H);

  // Sync when value changes from outside (e.g. hours column updates minutes column)
  useEffect(() => {
    const i = Math.max(0, items.indexOf(value));
    const target = -i * ITEM_H;
    if (Math.abs(baseY.current - target) > 1) {
      baseY.current = target;
      Animated.spring(animY, {
        toValue: target,
        useNativeDriver: true,
        damping: 20,
        stiffness: 300,
      }).start();
    }
  }, [value]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
    onPanResponderGrant: () => {
      // Freeze at current animated position so drag starts from there
      animY.stopAnimation((v) => {
        baseY.current = v;
        animY.setValue(v);
      });
    },
    onPanResponderMove: (_, gs) => {
      const next = baseY.current + gs.dy;
      const min = -(items.length - 1) * ITEM_H;
      animY.setValue(Math.max(min, Math.min(0, next)));
    },
    onPanResponderRelease: (_, gs) => {
      const rawY = baseY.current + gs.dy;
      // vy < 0 means upward (higher hours) → project in same direction: rawY + vy*k
      const projected = rawY + gs.vy * 120;
      const snapIdx = Math.max(0, Math.min(
        Math.round(-projected / ITEM_H),
        items.length - 1
      ));
      const snapY = -snapIdx * ITEM_H;
      baseY.current = snapY;
      onChangeRef.current(items[snapIdx]);
      Animated.spring(animY, {
        toValue: snapY,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    },
  }), [items]);

  return (
    <View style={wStyles.col}>
      <Text style={wStyles.colLabel}>{label}</Text>
      <View style={wStyles.colInner}>
        <View style={wStyles.highlight} pointerEvents="none" />
        <Animated.View
          {...pan.panHandlers}
          style={{ paddingVertical: ITEM_H, transform: [{ translateY: animY }] }}
        >
          {items.map((item) => (
            <View key={item} style={wStyles.item}>
              <Text style={[wStyles.itemText, item === value && wStyles.itemTextActive]}>
                {item}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

function TimeWheelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(':');
  const normM = MINS.includes(m) ? m : '00';
  return (
    <View style={wStyles.picker}>
      <WheelColumn
        items={HOURS}
        value={h}
        label="ЧЧ"
        onChange={(hh) => onChange(`${hh}:${normM}`)}
      />
      <Text style={wStyles.colon}>:</Text>
      <WheelColumn
        items={MINS}
        value={normM}
        label="ММ"
        onChange={(mm) => onChange(`${h}:${mm}`)}
      />
    </View>
  );
}

const wStyles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    marginBottom: 4,
    height: ITEM_H * 3 + SPACING.sm * 2 + 24, // 3 visible rows + label space
    gap: 8,
  },
  col: { flex: 1, alignItems: 'center' },
  colLabel: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.accent,
    letterSpacing: 3,
    marginBottom: 4,
  },
  colInner: {
    height: ITEM_H * 3,
    overflow: 'hidden',
    width: '100%',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_H,
    left: 0,
    right: 0,
    height: ITEM_H,
    backgroundColor: 'rgba(198,255,0,0.08)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(198,255,0,0.25)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center', width: '100%' },
  itemText: { fontFamily: FONTS.blackItalic, fontSize: 20, color: COLORS.gray[600] },
  itemTextActive: { color: COLORS.white, fontSize: 28 },
  colon: {
    fontFamily: FONTS.blackItalic,
    fontSize: 32,
    color: COLORS.gray[600],
    paddingTop: 20,
  },
});

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
  categoryEmoji: { fontSize: 28 },

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
  gameCardEmoji: { fontSize: 28 },
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
  venueCardImagePlaceholder: {
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  venueCardEmoji: { fontSize: 40 },
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
