import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Platform, KeyboardAvoidingView, SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Phone, Camera, Mic } from 'lucide-react-native';
import { chatsApi } from '@/services/api';
import { oynoSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';
import { ChatMessage, WSChatMessage } from '@/types';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const roomId = Number(id);
  const [text, setText] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<FlatList>(null);
  const user = useAuthStore((s) => s.user);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  const { data: roomsData } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => chatsApi.rooms(),
  });

  const { data: messagesData } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: () => chatsApi.messages(roomId),
    enabled: !!roomId,
  });

  const room = roomsData?.data?.find((r) => r.id === roomId);
  const serverMessages = messagesData?.data?.results ?? [];

  // Merge server messages with local optimistic messages
  const allMessages = [...serverMessages, ...localMessages.filter(
    (lm) => !serverMessages.find((sm) => sm.id === lm.id)
  )];

  // Connect WebSocket on mount
  useEffect(() => {
    oynoSocket.joinRoom(roomId);

    const unsubMessage = oynoSocket.onMessage(roomId, (wsMsg: WSChatMessage) => {
      if (wsMsg.sender_id === user?.id) return; // already added optimistically
      const newMsg: ChatMessage = {
        id: wsMsg.id,
        room_id: wsMsg.room_id,
        sender: { id: wsMsg.sender_id, name: wsMsg.sender_name, avatar: wsMsg.sender_avatar },
        text: wsMsg.text,
        created_at: wsMsg.created_at,
        is_me: false,
      };
      setLocalMessages((prev) => [...prev, newMsg]);
    });

    return () => {
      unsubMessage();
      oynoSocket.leaveRoom(roomId);
    };
  }, [roomId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [allMessages.length]);

  const handleSend = useCallback(() => {
    if (!text.trim()) return;

    // Optimistic update
    const optimistic: ChatMessage = {
      id: Date.now(),
      room_id: roomId,
      sender: { id: user!.id, name: user!.name, avatar: user!.avatar },
      text: text.trim(),
      created_at: new Date().toISOString(),
      is_me: true,
    };
    setLocalMessages((prev) => [...prev, optimistic]);
    oynoSocket.sendMessage(roomId, text.trim());
    setText('');
  }, [text, roomId, user]);

  const handleTyping = useCallback((val: string) => {
    setText(val);
    oynoSocket.sendTyping(roomId, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      oynoSocket.sendTyping(roomId, false);
    }, 1500);
  }, [roomId]);

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.roomInfo}>
            <View style={styles.roomAvatar}>
              <Text style={styles.roomAvatarEmoji}>⚽</Text>
            </View>
            <View>
              <Text style={styles.roomTitle} numberOfLines={1}>{room?.title ?? 'Чат'}</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>в сети</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.callBtn}>
            <Phone size={22} color={COLORS.gray[500]} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={allMessages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <MessageBubble message={item} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.inputIcon}>
            <Camera size={22} color={COLORS.gray[500]} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="НАПИШИ ЧТО-НИБУДЬ..."
            placeholderTextColor={COLORS.gray[700]}
            value={text}
            onChangeText={handleTyping}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
          />
          {text.trim() ? (
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Send size={18} color="#000" fill="#000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.inputIcon}>
              <Mic size={22} color={COLORS.gray[500]} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isMe = message.is_me;
  return (
    <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        {!isMe && (
          <Text style={styles.bubbleSender}>{message.sender.name}</Text>
        )}
        <Text style={[styles.bubbleText, isMe && { color: '#000' }]}>
          {message.text}
        </Text>
        <Text style={[styles.bubbleTime, isMe && { color: 'rgba(0,0,0,0.4)' }]}>
          {new Date(message.created_at).toLocaleTimeString('ru', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  roomAvatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomAvatarEmoji: { fontSize: 22 },
  roomTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 14,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  onlineText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  callBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Messages
  messagesList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: 16,
    paddingBottom: 20,
  },
  bubbleWrapper: { alignItems: 'flex-start' },
  bubbleWrapperMe: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '85%',
    borderRadius: 24,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    gap: 4,
  },
  bubbleMe: {
    backgroundColor: COLORS.accent,
    borderTopRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopLeftRadius: 4,
  },
  bubbleSender: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  bubbleText: {
    fontFamily: FONTS.boldItalic,
    fontSize: 13,
    color: COLORS.white,
    lineHeight: 20,
  },
  bubbleTime: {
    fontFamily: FONTS.blackItalic,
    fontSize: 8,
    color: COLORS.gray[600],
    alignSelf: 'flex-end',
    textTransform: 'uppercase',
  },

  // Input
  inputBar: {
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? 24 : SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.white,
    fontFamily: FONTS.boldItalic,
    fontSize: 13,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
