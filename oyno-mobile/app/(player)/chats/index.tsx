import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Zap } from 'lucide-react-native';
import { chatsApi } from '@/services/api';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { ChatRoom } from '@/types';
import { t } from '@/constants/i18n';

export default function ChatsListScreen() {
  const { data } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => chatsApi.rooms(),
    refetchInterval: 10_000, // fallback polling — основной канал через WS
  });

  const rooms = data?.data ?? [];

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('chats.title')}</Text>
          <Zap size={32} color={COLORS.accent} fill={COLORS.accent} />
        </View>
        <View style={styles.searchRow}>
          <Search size={20} color={COLORS.gray[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('chats.search').toUpperCase()}
            placeholderTextColor={COLORS.gray[600]}
          />
        </View>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <ChatRoomCard room={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Нет активных чатов</Text>
        }
      />
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
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>
            {room.avatar ? '' : avatarEmoji}
          </Text>
        </View>
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
});
