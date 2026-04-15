import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, Platform, Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Plus, Star, Edit, BarChart2 } from 'lucide-react-native';
import { venuesApi } from '@/services/api';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { Venue } from '@/types';

export default function OwnerVenuesScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-venues'],
    queryFn: () => venuesApi.myVenues(),
  });
  const venues = data?.data ?? [];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>МОИ ПЛОЩАДКИ</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85}>
          <Plus size={20} color="#000" strokeWidth={3} />
          <Text style={styles.addBtnText}>ДОБАВИТЬ</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={venues}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <VenueCard venue={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏟</Text>
            <Text style={styles.emptyTitle}>НЕТ ПЛОЩАДОК</Text>
            <Text style={styles.emptySubtitle}>Добавьте свою первую площадку</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: venue.images?.[0] ?? 'https://via.placeholder.com/400x200' }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={1}>{venue.name}</Text>
          <View style={styles.ratingBadge}>
            <Star size={10} color={COLORS.accent} fill={COLORS.accent} />
            <Text style={styles.ratingText}>{venue.rating}</Text>
          </View>
        </View>
        <Text style={styles.cardAddress} numberOfLines={1}>{venue.address}</Text>
        <Text style={styles.cardPrice}>{venue.price_per_hour} сом / час</Text>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.btnEdit}>
            <Edit size={14} color={COLORS.accent} />
            <Text style={styles.btnEditText}>Редактировать</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnStats}
            onPress={() => router.push({ pathname: '/(owner)', params: { venue_id: venue.id } })}
          >
            <BarChart2 size={14} color="#000" />
            <Text style={styles.btnStatsText}>Статистика</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  title: { fontFamily: FONTS.blackItalic, fontSize: 28, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -1 },
  addBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...SHADOW.accent,
  },
  addBtnText: { fontFamily: FONTS.blackItalic, fontSize: 11, color: '#000', letterSpacing: 1 },

  list: { paddingHorizontal: SPACING.lg, gap: 16, paddingBottom: 100 },

  // Card
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  cardImage: { width: '100%', height: 160 },
  cardBody: { padding: SPACING.md },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontFamily: FONTS.blackItalic, fontSize: 18, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -0.5, flex: 1 },
  ratingBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    ...SHADOW.accent,
  },
  ratingText: { fontFamily: FONTS.blackItalic, fontSize: 11, color: '#000' },
  cardAddress: { fontFamily: FONTS.boldItalic, fontSize: 11, color: COLORS.gray[500], marginBottom: 4 },
  cardPrice: { fontFamily: FONTS.blackItalic, fontSize: 13, color: COLORS.accent, marginBottom: SPACING.md },
  cardActions: { flexDirection: 'row', gap: 10 },
  btnEdit: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnEditText: { fontFamily: FONTS.blackItalic, fontSize: 10, color: COLORS.accent, textTransform: 'uppercase' },
  btnStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    ...SHADOW.accent,
  },
  btnStatsText: { fontFamily: FONTS.blackItalic, fontSize: 10, color: '#000', textTransform: 'uppercase' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 60, marginBottom: SPACING.md },
  emptyTitle: { fontFamily: FONTS.blackItalic, fontSize: 18, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -0.5 },
  emptySubtitle: { fontFamily: FONTS.boldItalic, fontSize: 12, color: COLORS.gray[500], marginTop: 8 },
});
