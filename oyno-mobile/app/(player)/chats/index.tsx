import { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  TextInput, StyleSheet, SafeAreaView, Platform, Modal, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Zap, UserPlus, X, AtSign } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { chatsApi, usersApi } from '@/services/api';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { ChatRoom, User } from '@/types';
import { t } from '@/constants/i18n';

export default function ChatsListScreen() {
  const [search, setSearch] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [usernameQuery, setUsernameQuery] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState<number | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const searchUsers = useCallback((query: string) => {
    setUsernameQuery(query);
    clearTimeout(searchTimer.current);
    if (!query.trim()) { setUserResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data: res } = await usersApi.searchByUsername(query.trim());
        // Бэкенд может вернуть [] или {results: [...]}
        const list: User[] = Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.results)
            ? (res as any).results
            : [];
        setUserResults(list);
      } catch (e: any) {
        setUserResults([]);
        const status = e?.response?.status;
        if (status === 404) {
          Toast.show({ type: 'error', text1: 'Поиск недоступен', text2: 'Бэкенд не поддерживает /auth/users/search/' });
        } else if (!status) {
          Toast.show({ type: 'error', text1: 'Нет соединения с сервером' });
        }
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  const startDirectChat = useCallback(async (userId: number) => {
    setIsStartingChat(userId);
    try {
      const { data: room } = await chatsApi.createDirect(userId);
      setShowUserSearch(false);
      setUsernameQuery('');
      setUserResults([]);
      router.push(`/(player)/chats/${room.id}`);
    } catch {
      Toast.show({ type: 'error', text1: 'Не удалось открыть чат' });
    } finally {
      setIsStartingChat(null);
    }
  }, []);

  const { data } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => chatsApi.rooms(),
    refetchInterval: 10_000, // fallback polling — основной канал через WS
  });

  const rawData = data?.data as any;
  const rooms: ChatRoom[] = Array.isArray(rawData) ? rawData : (rawData?.results ?? []);

  // Фильтруем истекшие игровые чаты (date_time + duration < сейчас)
  const now = Date.now();
  const activeRooms = rooms.filter((r) => {
    if (r.type === 'game' && r.game_date_time && r.game_duration != null) {
      const gameEnd = new Date(r.game_date_time).getTime() + r.game_duration * 3600000;
      if (gameEnd < now) return false;
    }
    // Также скрываем завершённые/отменённые игры
    if (r.type === 'game' && r.game_status && !['waiting', 'confirmed'].includes(r.game_status)) {
      return false;
    }
    return true;
  });

  const filtered = search.trim()
    ? activeRooms.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()))
    : activeRooms;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('chats.title')}</Text>
          <Zap size={32} color={COLORS.accent} fill={COLORS.accent} />
          <TouchableOpacity
            style={styles.findUserBtn}
            onPress={() => setShowUserSearch(true)}
            activeOpacity={0.8}
          >
            <UserPlus size={20} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <Search size={20} color={COLORS.gray[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('chats.search').toUpperCase()}
            placeholderTextColor={COLORS.gray[600]}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <ChatRoomCard room={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Нет активных чатов</Text>
        }
      />

      {/* User search modal */}
      <Modal
        visible={showUserSearch}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUserSearch(false)}
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <AtSign size={20} color={COLORS.accent} />
              <Text style={styles.modalTitle}>НАЙТИ ИГРОКА</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => { setShowUserSearch(false); setUsernameQuery(''); setUserResults([]); }}
            >
              <X size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchRow}>
            <Text style={styles.modalAt}>@</Text>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="username"
              placeholderTextColor={COLORS.gray[600]}
              value={usernameQuery}
              onChangeText={searchUsers}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {isSearching && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginRight: 12 }} />}
          </View>

          <FlatList
            data={userResults}
            keyExtractor={(u) => String(u.id)}
            contentContainerStyle={styles.userList}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              usernameQuery.trim() && !isSearching ? (
                <Text style={styles.userEmpty}>Никого не найдено</Text>
              ) : null
            }
            renderItem={({ item: u }) => (
              <View style={styles.userCard}>
                <View style={styles.userAvatar}>
                  {u.avatar
                    ? <Image source={{ uri: u.avatar }} style={styles.userAvatarImg} />
                    : <Text style={styles.userAvatarInitial}>{u.name.charAt(0).toUpperCase()}</Text>
                  }
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.name}</Text>
                  {u.username ? (
                    <Text style={styles.userUsername}>@{u.username}</Text>
                  ) : null}
                  {u.city ? <Text style={styles.userCity}>{u.city}</Text> : null}
                </View>
                <TouchableOpacity
                  style={[styles.chatBtn, isStartingChat === u.id && { opacity: 0.6 }]}
                  onPress={() => startDirectChat(u.id)}
                  disabled={isStartingChat === u.id}
                  activeOpacity={0.8}
                >
                  {isStartingChat === u.id
                    ? <ActivityIndicator size="small" color="#000" />
                    : <Text style={styles.chatBtnText}>НАПИСАТЬ</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ChatRoomCard({ room }: { room: ChatRoom }) {
  const avatarEmoji = room.type === 'game' ? '⚽' : room.type === 'venue' ? '🏟' : '💬';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(player)/chats/${room.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.avatarWrapper}>
        {room.avatar_url ? (
          <Image source={{ uri: room.avatar_url }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
          </View>
        )}
        <View style={styles.onlineDot} />
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
          <Text style={styles.timestamp}>
            {room.last_message
              ? new Date(room.last_message.created_at).toLocaleTimeString('ru', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {room.last_message?.text ?? 'Нет сообщений'}
        </Text>
      </View>

      {room.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{room.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.sm,
    paddingBottom: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.blackItalic,
    fontSize: 44,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -3,
  },
  searchRow: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 18,
    color: COLORS.white,
    fontFamily: FONTS.blackItalic,
    fontSize: 11,
    letterSpacing: 2,
  },
  list: { paddingHorizontal: SPACING.sm, gap: 8, paddingBottom: 100 },
  empty: {
    fontFamily: FONTS.boldItalic,
    fontSize: 11,
    color: COLORS.gray[600],
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingVertical: 40,
  },

  // Card
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOW.card,
  },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  avatarEmoji: { fontSize: 28 },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.bgCard,
  },
  info: { flex: 1, minWidth: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  roomTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 15,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    flex: 1,
  },
  timestamp: { fontFamily: FONTS.blackItalic, fontSize: 9, color: COLORS.gray[600], textTransform: 'uppercase' },
  lastMessage: { fontFamily: FONTS.boldItalic, fontSize: 12, color: COLORS.gray[500] },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    backgroundColor: COLORS.accent,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { fontFamily: FONTS.blackItalic, fontSize: 10, color: '#000' },

  // Find user button
  findUserBtn: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
    ...SHADOW.accent,
  },

  // User search modal
  modalRoot: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { fontFamily: FONTS.blackItalic, fontSize: 20, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -1 },
  modalCloseBtn: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    margin: SPACING.lg,
    paddingLeft: SPACING.md,
  },
  modalAt: {
    fontFamily: FONTS.blackItalic,
    fontSize: 22,
    color: COLORS.accent,
    marginRight: 4,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: 16,
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  userList: { paddingHorizontal: SPACING.lg, gap: 10 },
  userEmpty: {
    fontFamily: FONTS.boldItalic,
    fontSize: 11,
    color: COLORS.gray[600],
    textAlign: 'center',
    paddingVertical: 30,
    textTransform: 'uppercase',
  },
  userCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOW.card,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarImg: { width: 52, height: 52, borderRadius: 18 },
  userAvatarInitial: { fontFamily: FONTS.blackItalic, fontSize: 22, color: COLORS.accent },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontFamily: FONTS.blackItalic, fontSize: 14, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -0.5 },
  userUsername: { fontFamily: FONTS.boldItalic, fontSize: 12, color: COLORS.accent, marginTop: 1 },
  userCity: { fontFamily: FONTS.boldItalic, fontSize: 10, color: COLORS.gray[500], textTransform: 'uppercase', marginTop: 2 },
  chatBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...SHADOW.accent,
  },
  chatBtnText: { fontFamily: FONTS.blackItalic, fontSize: 10, color: '#000', letterSpacing: 1 },
});
