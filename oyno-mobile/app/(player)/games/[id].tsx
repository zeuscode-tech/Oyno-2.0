import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Clock, Calendar, Users, ShieldCheck, MessageCircle, Navigation } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { gamesApi } from '@/services/api';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['game', id],
    queryFn: () => gamesApi.detail(Number(id)),
  });

  const { mutate: join, isPending: joining } = useMutation({
    mutationFn: () => gamesApi.join(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game', id] });
      qc.invalidateQueries({ queryKey: ['games-all'] });
      Toast.show({ type: 'success', text1: 'Ты в игре!' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Не удалось записаться' }),
  });

  const game = data?.data;

  const openInMaps = () => {
    if (!game?.venue) return;
    const lat = parseFloat(String(game.venue.lat));
    const lng = parseFloat(String(game.venue.lng));
    if (isNaN(lat) || isNaN(lng)) return;
    const url2gis = `dgis://2gis.ru/geo/${lng},${lat}`;
    const urlWeb = `https://2gis.ru/geo/${lng},${lat}`;
    Linking.canOpenURL(url2gis).then((supported) => {
      Linking.openURL(supported ? url2gis : urlWeb);
    });
  };

  if (isLoading || !game) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  const date = new Date(game.date_time);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroEmoji}>
            <Text style={styles.sportEmoji}>⚽</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Title + Status */}
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.sportName}>{game.title}</Text>
              <View style={styles.statusRow}>
                <ShieldCheck size={16} color={COLORS.accent} />
                <Text style={styles.statusText}>Матч в силе</Text>
              </View>
            </View>
            <View style={styles.playersBadge}>
              <Text style={styles.playersNum}>{game.players_joined}/{game.players_total}</Text>
            </View>
          </View>

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Calendar size={20} color={COLORS.accent} />
              <Text style={styles.infoLabel}>ДАТА</Text>
              <Text style={styles.infoValue}>
                {date.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Clock size={20} color={COLORS.accent} />
              <Text style={styles.infoLabel}>ВРЕМЯ</Text>
              <Text style={styles.infoValue}>
                {date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {/* Venue */}
          <View style={styles.venueCard}>
            <View style={styles.venueCardHeader}>
              <MapPin size={16} color={COLORS.accent} />
              <Text style={styles.venueCardTitle}>ЛОКАЦИЯ</Text>
            </View>
            <Text style={styles.venueName}>{game.venue?.name}</Text>
            <TouchableOpacity style={styles.addressRow} onPress={openInMaps} activeOpacity={0.7}>
              <Navigation size={12} color={COLORS.accent} />
              <Text style={styles.venueAddress}>{game.venue?.address}</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={[styles.venueCard, { marginBottom: 140 }]}>
            <View style={styles.venueCardHeader}>
              <Users size={16} color={COLORS.accent} />
              <Text style={styles.venueCardTitle}>ОПИСАНИЕ</Text>
            </View>
            <Text style={styles.description}>{game.description}</Text>
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        {game.is_joined ? (
          game.chat_room_id && (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => router.push(`/(player)/chats/${game.chat_room_id}`)}
              activeOpacity={0.85}
            >
              <MessageCircle size={20} color="#000" />
              <Text style={styles.btnPrimaryText}>ВОРВАТЬСЯ В ЧАТ</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity
            style={[styles.btnPrimary, styles.btnWhite, joining && { opacity: 0.6 }]}
            onPress={() => join()}
            disabled={joining}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnPrimaryText, { color: '#000' }]}>
              {joining ? 'ЗАПИСЫВАЕМ...' : 'ЗАПИСАТЬСЯ НА ИГРУ'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loadingRoot: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: FONTS.boldItalic, color: COLORS.gray[500], fontSize: 12, textTransform: 'uppercase' },

  hero: {
    height: 280,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'relative',
  },
  heroEmoji: { justifyContent: 'center', alignItems: 'center' },
  sportEmoji: { fontSize: 120 },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 16,
    left: 16,
    width: 48,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  body: { padding: SPACING.lg },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  sportName: { fontFamily: FONTS.blackItalic, fontSize: 36, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -1.5, lineHeight: 36 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  statusText: { fontFamily: FONTS.blackItalic, fontSize: 11, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: 2 },
  playersBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...SHADOW.accent,
  },
  playersNum: { fontFamily: FONTS.blackItalic, fontSize: 18, color: '#000' },

  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: SPACING.md },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
    ...SHADOW.card,
  },
  infoLabel: { fontFamily: FONTS.boldItalic, fontSize: 9, color: COLORS.gray[500], textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { fontFamily: FONTS.blackItalic, fontSize: 18, color: COLORS.white },

  venueCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  venueCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  venueCardTitle: { fontFamily: FONTS.blackItalic, fontSize: 10, color: COLORS.white, textTransform: 'uppercase', letterSpacing: 2 },
  venueName: { fontFamily: FONTS.boldItalic, fontSize: 14, color: COLORS.white },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  venueAddress: { fontFamily: FONTS.boldItalic, fontSize: 11, color: COLORS.accent, textDecorationLine: 'underline', flex: 1 },
  description: { fontFamily: FONTS.boldItalic, fontSize: 13, color: COLORS.gray[400], lineHeight: 20 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.lg,
    backgroundColor: 'transparent',
  },
  btnPrimary: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...SHADOW.accent,
  },
  btnWhite: { backgroundColor: COLORS.white },
  btnPrimaryText: { fontFamily: FONTS.blackItalic, fontSize: 14, color: '#000', letterSpacing: 2, textTransform: 'uppercase' },
});
