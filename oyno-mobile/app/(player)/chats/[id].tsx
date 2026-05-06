import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Image,
  StyleSheet, Platform, KeyboardAvoidingView, SafeAreaView,
  ActivityIndicator, Pressable, Modal
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Send, Camera, Mic, Image as ImageIcon, Video, Square, Edit3, Play, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { chatsApi } from '@/services/api';
import { oynoSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, FONTS, SPACING, SHADOW } from '@/constants/theme';
import { ChatMessage, ChatRoom, WSChatMessage } from '@/types';

let Audio: any = null;
try { Audio = require('expo-av').Audio; } catch { }

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const roomId = Number(id);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const listRef = useRef<FlatList>(null);
  const recordingRef = useRef<any>(null);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: roomsData } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => chatsApi.rooms(),
  });

  const { data: messagesData } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: () => chatsApi.messages(roomId),
    enabled: !!roomId,
  });

  const roomsRaw = roomsData?.data as any;
  const roomsList: ChatRoom[] = Array.isArray(roomsRaw) ? roomsRaw : (roomsRaw?.results ?? []);
  const room = roomsList.find((r) => r.id === roomId);
  const isOrganizer = room?.organizer_id === user?.id;

  const serverMessages = messagesData?.data?.results ?? [];
  const allMessages = [
    ...serverMessages,
    ...localMessages.filter((lm) => !serverMessages.find((sm) => sm.id === lm.id)),
  ];

  useEffect(() => {
    oynoSocket.joinRoom(roomId);
    const unsubMessage = oynoSocket.onMessage(roomId, (wsMsg: WSChatMessage) => {
      if (wsMsg.sender_id === user?.id) return;
      const newMsg: ChatMessage = {
        id: wsMsg.id,
        room_id: wsMsg.room_id,
        sender: { id: wsMsg.sender_id, name: wsMsg.sender_name, avatar: wsMsg.sender_avatar },
        text: wsMsg.text,
        media_url: wsMsg.media_url ?? null,
        media_type: wsMsg.media_type ?? 'text',
        created_at: wsMsg.created_at,
        is_me: false,
      };
      setLocalMessages((prev) => [...prev, newMsg]);
    });
    return () => { unsubMessage(); oynoSocket.leaveRoom(roomId); };
  }, [roomId]);

  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [allMessages.length]);

  // ── Send text ────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    const optimistic: ChatMessage = {
      id: Date.now(),
      room_id: roomId,
      sender: { id: user!.id, name: user!.name, avatar: user!.avatar },
      text: text.trim(),
      media_url: null,
      media_type: 'text',
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
    typingTimer.current = setTimeout(() => oynoSocket.sendTyping(roomId, false), 1500);
  }, [roomId]);

  // ── Upload media ─────────────────────────────────────
  const uploadAndSend = async (uri: string, mediaType: 'image' | 'video' | 'audio') => {
    setUploading(true);
    try {
      const { data: msg } = await chatsApi.uploadMedia(roomId, uri, mediaType);
      const optimistic: ChatMessage = {
        ...msg,
        is_me: true,
        media_url: msg.media_url ?? uri,
        media_type: mediaType,
      };
      setLocalMessages((prev) => [...prev, optimistic]);
    } catch {
      Toast.show({ type: 'error', text1: 'Не удалось отправить файл' });
    } finally {
      setUploading(false);
    }
  };

  // ── Pick from gallery ────────────────────────────────
  const handlePickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Toast.show({ type: 'error', text1: 'Нет доступа к галерее' }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video' || asset.uri.match(/\.(mp4|mov|avi)$/i);
      await uploadAndSend(asset.uri, isVideo ? 'video' : 'image');
    }
  };

  // ── Camera ───────────────────────────────────────────
  const handleCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Toast.show({ type: 'error', text1: 'Нет доступа к камере' }); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      await uploadAndSend(asset.uri, isVideo ? 'video' : 'image');
    }
  };

  // ── Voice recording ───────────────────────────────────
  const handleMicPress = async () => {
    if (!Audio) {
      Toast.show({ type: 'info', text1: 'Установи expo-av', text2: 'npx expo install expo-av' });
      return;
    }
    if (isRecording) return;
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Toast.show({ type: 'error', text1: 'Нет доступа к микрофону' }); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingSecs(0);
      recordingTimer.current = setInterval(() => setRecordingSecs((s) => s + 1), 1000);
    } catch {
      Toast.show({ type: 'error', text1: 'Ошибка записи' });
    }
  };

  const handleMicRelease = async () => {
    if (!isRecording || !recordingRef.current) return;
    clearInterval(recordingTimer.current!);
    setIsRecording(false);
    setRecordingSecs(0);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (uri) await uploadAndSend(uri, 'audio');
    } catch {
      Toast.show({ type: 'error', text1: 'Ошибка сохранения записи' });
    }
  };

  // ── Change chat avatar ────────────────────────────────
  const handleChangeAvatar = async () => {
    if (!isOrganizer) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Toast.show({ type: 'error', text1: 'Нет доступа к фото' }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        await chatsApi.updateAvatar(roomId, result.assets[0].uri);
        qc.invalidateQueries({ queryKey: ['chat-rooms'] });
        Toast.show({ type: 'success', text1: 'Аватар обновлён' });
      } catch {
        Toast.show({ type: 'error', text1: 'Ошибка обновления аватара' });
      }
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>

          <Pressable style={styles.roomInfo} onPress={handleChangeAvatar}>
            <View style={styles.roomAvatarWrapper}>
              {room?.avatar_url ? (
                <Image source={{ uri: room.avatar_url }} style={styles.roomAvatarImg} />
              ) : (
                <View style={styles.roomAvatar}>
                  <Text style={styles.roomAvatarEmoji}>⚽</Text>
                </View>
              )}
              {isOrganizer && (
                <View style={styles.avatarEditBadge}>
                  <Edit3 size={9} color="#000" />
                </View>
              )}
            </View>
            <View>
              <Text style={styles.roomTitle} numberOfLines={1}>{room?.title ?? 'Чат'}</Text>
              <Text style={styles.participantsText}>
                {room?.participants?.length ?? 0} участников
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={allMessages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <MessageBubble message={item} onImagePress={setFullScreenImage} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Recording indicator */}
        {isRecording && (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              Запись {String(Math.floor(recordingSecs / 60)).padStart(2, '0')}:{String(recordingSecs % 60).padStart(2, '0')}
            </Text>
            <Text style={styles.recordingHint}>Отпусти чтобы отправить</Text>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.inputIcon} onPress={handleCamera}>
            <Camera size={22} color={COLORS.gray[500]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.inputIcon} onPress={handlePickMedia}>
            <ImageIcon size={22} color={COLORS.gray[500]} />
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

          {uploading ? (
            <View style={styles.inputIcon}>
              <ActivityIndicator size="small" color={COLORS.accent} />
            </View>
          ) : text.trim() ? (
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Send size={18} color="#000" fill="#000" />
            </TouchableOpacity>
          ) : (
            <Pressable
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPressIn={handleMicPress}
              onPressOut={handleMicRelease}
            >
              {isRecording
                ? <Square size={16} color="#000" fill="#000" />
                : <Mic size={20} color={isRecording ? '#000' : COLORS.gray[500]} />
              }
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Full screen image modal */}
      <Modal
        visible={!!fullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={styles.fullScreenModal}>
          <TouchableOpacity
            style={styles.fullScreenCloseBtn}
            onPress={() => setFullScreenImage(null)}
          >
            <X size={28} color="#FFF" />
          </TouchableOpacity>
          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Audio bubble ──────────────────────────────────────
function AudioBubble({ mediaUrl, isMe }: { mediaUrl: string; isMe: boolean }) {
  const [sound, setSound] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Генерация псевдослучайных высот для волны на основе URL
  const generateWaveform = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const wave = [];
    for (let i = 0; i < 35; i++) wave.push(Math.abs(Math.sin(hash + i * 1.5)) * 14 + 4);
    return wave;
  };
  const [waveform] = useState(() => generateWaveform(mediaUrl));

  const togglePlay = async () => {
    if (!Audio) {
      Toast.show({ type: 'error', text1: 'Аудио не поддерживается' });
      return;
    }
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          if (progress >= 1) await sound.setPositionAsync(0);
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
      });

      const { BASE_URL } = require('@/services/api');
      const absoluteUrl = mediaUrl.startsWith('http')
        ? mediaUrl
        : `${BASE_URL.replace('/api/v1', '')}${mediaUrl}`;

      const FileSystem = require('expo-file-system/legacy');
      const filename = absoluteUrl.split('/').pop() || 'audio.m4a';
      const localUri = `${FileSystem.cacheDirectory}${filename}`;

      let uriToPlay = absoluteUrl;
      try {
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        if (!fileInfo.exists) {
          const downloadRes = await FileSystem.downloadAsync(absoluteUrl, localUri);
          uriToPlay = downloadRes.uri;
        } else {
          uriToPlay = localUri;
        }
      } catch (err) {
        console.log('Failed to download audio, falling back to remote URL', err);
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: uriToPlay },
        { shouldPlay: true, progressUpdateIntervalMillis: 50 }
      );
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded) {
          if (status.durationMillis) setProgress(status.positionMillis / status.durationMillis);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setProgress(1); // дошли до конца
          }
        }
      });
    } catch (e: any) {
      console.log('Error playing audio:', e);
      Toast.show({ type: 'error', text1: 'Ошибка воспроизведения', text2: e?.message || String(e) });
    }
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  return (
    <TouchableOpacity style={styles.mediaAudio} onPress={togglePlay} activeOpacity={0.8}>
      {isPlaying ? (
        <Square size={16} color={isMe ? '#000' : COLORS.accent} fill={isMe ? '#000' : COLORS.accent} />
      ) : (
        <Play size={18} color={isMe ? '#000' : COLORS.accent} fill={isMe ? '#000' : COLORS.accent} />
      )}
      <View style={styles.audioWave}>
        {waveform.map((h, i) => {
          const isActive = (i / waveform.length) <= progress;
          return (
            <View
              key={i}
              style={[
                styles.audioBar,
                {
                  height: h,
                  backgroundColor: isActive
                    ? (isMe ? '#000' : COLORS.accent)
                    : (isMe ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)')
                }
              ]}
            />
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

// ── Message bubble ────────────────────────────────────
function MessageBubble({ message, onImagePress }: { message: ChatMessage; onImagePress: (url: string) => void }) {
  const isMe = message.is_me;

  const renderContent = () => {
    if (message.media_type === 'image' && message.media_url) {
      return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(message.media_url!)}>
          <Image
            source={{ uri: message.media_url }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    }
    if (message.media_type === 'video' && message.media_url) {
      return (
        <View style={styles.mediaVideoThumb}>
          <Video size={32} color={COLORS.accent} />
          <Text style={styles.mediaVideoText}>Видео</Text>
        </View>
      );
    }
    if (message.media_type === 'audio' && message.media_url) {
      return <AudioBubble mediaUrl={message.media_url} isMe={isMe} />;
    }
    if (message.text) {
      return (
        <Text style={[styles.bubbleText, isMe && { color: '#000' }]}>
          {message.text}
        </Text>
      );
    }
    return null;
  };

  return (
    <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
      <View style={[
        styles.bubble,
        isMe ? styles.bubbleMe : styles.bubbleThem,
        (message.media_type === 'image' || message.media_type === 'video') && styles.bubbleMedia,
      ]}>
        {!isMe && (
          <Text style={styles.bubbleSender}>{message.sender.name}</Text>
        )}
        {renderContent()}
        <Text style={[styles.bubbleTime, isMe && { color: 'rgba(0,0,0,0.4)' }]}>
          {new Date(message.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
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
    width: 40, height: 40,
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  roomAvatarWrapper: { position: 'relative' },
  roomAvatar: {
    width: 48, height: 48,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomAvatarImg: {
    width: 48, height: 48,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  roomAvatarEmoji: { fontSize: 22 },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2, right: -2,
    width: 18, height: 18,
    backgroundColor: COLORS.accent,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.bgCard,
  },
  roomTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 14,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  participantsText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },

  // Messages
  messagesList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: 12,
    paddingBottom: 20,
  },
  bubbleWrapper: { alignItems: 'flex-start' },
  bubbleWrapperMe: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleMe: { backgroundColor: COLORS.accent, borderTopRightRadius: 4 },
  bubbleThem: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopLeftRadius: 4,
  },
  bubbleMedia: { padding: 4, overflow: 'hidden' },
  bubbleSender: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
    paddingHorizontal: 8,
    paddingTop: 6,
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
    paddingHorizontal: 4,
    paddingBottom: 4,
  },

  // Media
  mediaImage: { width: 220, height: 180, borderRadius: 16 },
  mediaVideoThumb: {
    width: 220, height: 140,
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  mediaVideoText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 11,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  mediaAudio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 160,
  },
  audioWave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 20 },
  audioBar: { width: 3, backgroundColor: COLORS.accent, borderRadius: 2 },

  // Input
  inputBar: {
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? 24 : SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputIcon: {
    width: 38, height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: COLORS.white,
    fontFamily: FONTS.boldItalic,
    fontSize: 13,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38, height: 38,
    backgroundColor: COLORS.accent,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.accent,
  },
  micBtn: {
    width: 38, height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 13,
  },
  micBtnActive: {
    backgroundColor: COLORS.accent,
    ...SHADOW.accent,
  },

  // Recording
  recordingBar: {
    backgroundColor: 'rgba(239,83,80,0.12)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(239,83,80,0.3)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  recordingDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#ef5350',
  },
  recordingText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 12,
    color: '#ef5350',
    letterSpacing: 2,
  },
  recordingHint: {
    fontFamily: FONTS.boldItalic,
    fontSize: 10,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    marginLeft: 'auto',
  },

  // Full Screen Image
  fullScreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
});
