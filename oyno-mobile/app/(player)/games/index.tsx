import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Platform, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, MapPin, MessageCircle,
  Trophy, Star, Zap, ChevronRight, ArrowLeft,
} from 'lucide-react-native';
import { gamesApi } from '@/services/api';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { Game } from '@/types';
import { t } from '@/constants/i18n';
import { SPORT_LABELS, SPORT_OPTIONS } from '@/constants/sports';

type Tab = 'all' | 'upcoming' | 'history';

export default function GamesScreen() {
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('Все');

  const { data: allData, isLoading } = useQuery({
    queryKey: ['games-all'],
    queryFn: () => gamesApi.list(),
  });

  const { data: myData } = useQuery({
    queryKey: ['games-my'],
    queryFn: () => gamesApi.myGames(),
  });

  const allGames = allData?.data?.results ?? [];
  const myGames = myData?.data?.results ?? [];

  const filtered = useMemo(() => {
    const now = new Date();

    const base = tab === 'history'
      ? myGames.filter((g) => g.status === 'completed' || new Date(g.date_time) < now)
      : tab === 'upcoming'
      ? myGames.filter((g) => g.is_joined && g.status !== 'completed' && new Date(g.date_time) >= now)
      : allGames.filter((g) => new Date(g.date_time) >= now && g.status !== 'completed' && g.status !== 'cancelled');

    return base
      .filter((g) => {
        const matchSearch =
          g.title.toLowerCase().includes(search.toLowerCase()) ||
          g.venue?.name.toLowerCase().includes(search.toLowerCase());
        const matchSport = sportFilter === 'Все' || (
          g.sport_id !== 'all' && SPORT_LABELS[g.sport_id] === sportFilter
        );
        return matchSearch && matchSport;
      })
      .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
  }, [tab, search, sportFilter, allGames, myGames]);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('games.title')}</Text>

        <View style={styles.searchRow}>
          <Search size={16} color={COLORS.gray[500]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск площадки или спорта..."
            placeholderTextColor={COLORS.gray[600]}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          <View style={styles.filterIcon}>
            <Filter size={14} color={COLORS.gray[500]} />
          </View>
          {SPORT_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.filterBtn, sportFilter === s.label && styles.filterBtnActive]}
              onPress={() => setSportFilter(s.label)}
            >
              <Text style={[styles.filterBtnText, sportFilter === s.label && styles.filterBtnTextActive]}>
                {s.emoji} {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['all', 'upcoming', 'history'] as Tab[]).map((id) => {
            const labels = { all: 'Все игры', upcoming: 'Предстоящие', history: 'История' };
            return (
              <TouchableOpacity
                key={id}
                style={styles.tabItem}
                onPress={() => setTab(id)}
              >
                <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>
                  {labels[id]}
                </Text>
                {tab === id && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) =>
          tab === 'history'
            ? <HistoryCard game={item} />
            : <GameCard game={item} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === 'upcoming' ? 'У тебя нет предстоящих игр' : t('games.notFound')}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

function GameCard({ game }: { game: Game }) {
  const qc = useQueryClient();
  const { mutate: join, isPending } = useMutation({
    mutationFn: () => gamesApi.join(game.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['games-all'] });
      qc.invalidateQueries({ queryKey: ['games-my'] });
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={[
          styles.statusBadge,
          game.is_joined ? styles.statusJoined : styles.statusWaiting,
        ]}>
          <Text style={[styles.statusText, game.is_joined && { color: '#000' }]}>
            {game.is_joined ? t('games.inGame').toUpperCase() : game.status === 'confirmed' ? 'ПОДТВЕРЖДЕН' : 'ОЖИДАНИЕ'}
          </Text>
        </View>
        <Text style={styles.cardMeta}>
          {new Date(game.date_time).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
          {' • '}
          {new Date(game.date_time).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <Text style={styles.cardTitle} numberOfLines={1}>{game.venue?.name}</Text>
      <View style={styles.cardAddressRow}>
        <MapPin size={12} color={COLORS.accent} />
        <Text style={styles.cardAddress} numberOfLines={1}>
          {game.venue?.address} • {game.players_joined}/{game.players_total} чел
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.btnDetail}
          onPress={() => router.push(`/(player)/games/${game.id}`)}
        >
          <Text style={styles.btnDetailText}>Подробнее</Text>
        </TouchableOpacity>
        {game.is_joined && game.chat_room_id && (
          <TouchableOpacity
            style={styles.btnChat}
            onPress={() => router.push(`/(player)/chats/${game.chat_room_id}`)}
          >
            <MessageCircle size={20} color="#000" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function HistoryCard({ game }: { game: Game }) {
  return (
    <TouchableOpacity
      style={styles.historyCard}
      onPress={() => router.push(`/(player)/games/${game.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.historyIcon}>
        <Text style={styles.historyEmoji}>⚽</Text>
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyTitle}>{game.title}</Text>
        <Text style={styles.historyResult}>{game.status === 'completed' ? 'Завершен' : ''}</Text>
      </View>
      <ChevronRight size={16} color={COLORS.gray[600]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgDeep },
  header: {
    backgroundColor: COLORS.bgDeep,
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.sm,
    paddingBottom: 4,
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
  searchRow: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    color: COLORS.white,
    fontFamily: FONTS.boldItalic,
    fontSize: 12,
  },
  filtersContent: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
    paddingBottom: SPACING.sm,
  },
  filterIcon: {
    width: 40,
    height: 36,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    ...SHADOW.accent,
  },
  filterBtnText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 10,
    color: COLORS.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterBtnTextActive: { color: '#000' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: SPACING.sm,
    gap: SPACING.lg,
  },
  tabItem: { paddingBottom: 12, position: 'relative' },
  tabText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 11,
    color: COLORS.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  tabTextActive: { color: COLORS.white },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.accent,
  },
  list: { padding: SPACING.lg, gap: 12, paddingBottom: 100 },
  empty: {
    fontFamily: FONTS.boldItalic,
    fontSize: 11,
    color: COLORS.gray[600],
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingVertical: 40,
  },

  // Game Card
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.white,
  },
  statusJoined: { backgroundColor: COLORS.accent },
  statusWaiting: { backgroundColor: COLORS.white },
  statusText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 8,
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardMeta: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  cardTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 18,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  cardAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.md,
  },
  cardAddress: {
    fontFamily: FONTS.boldItalic,
    fontSize: 10,
    color: COLORS.gray[500],
    flex: 1,
    textTransform: 'uppercase',
  },
  cardActions: { flexDirection: 'row', gap: 10 },
  btnDetail: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnDetailText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 10,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  btnChat: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.accent,
  },

  // History Card
  historyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  historyIcon: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyEmoji: { fontSize: 24 },
  historyInfo: { flex: 1 },
  historyTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 14,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  historyResult: {
    fontFamily: FONTS.boldItalic,
    fontSize: 10,
    color: COLORS.accent,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
