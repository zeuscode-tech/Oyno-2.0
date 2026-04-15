import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Platform, Dimensions, SafeAreaView, FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  ArrowLeft, MapPin, Star, Clock, ChevronRight,
  Users, Shield, Zap,
} from 'lucide-react-native';
import { venuesApi, bookingsApi } from '@/services/api';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { TimeSlot } from '@/types';

const { width } = Dimensions.get('window');

// NOTE: 2GIS tiles можно подключить через кастомный MapView с urlTemplate:
// https://tile2.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const { data: venueRes, isLoading } = useQuery({
    queryKey: ['venue', id],
    queryFn: () => venuesApi.detail(Number(id)),
  });

  const { data: slotsRes } = useQuery({
    queryKey: ['slots', id, selectedDate],
    queryFn: () => venuesApi.slots(Number(id), selectedDate),
    enabled: !!id,
  });

  const venue = venueRes?.data;
  const slots = slotsRes?.data ?? [];

  // 5 ближайших дней
  const dates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { iso: d.toISOString().split('T')[0], d };
  });

  if (isLoading || !venue) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.hero}>
          <Image
            source={{ uri: venue.images?.[0] ?? 'https://via.placeholder.com/400x250' }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>

          {/* Rating badge */}
          <View style={styles.ratingBadge}>
            <Star size={12} fill={COLORS.accent} color={COLORS.accent} />
            <Text style={styles.ratingText}>{venue.rating}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Title */}
          <Text style={styles.name}>{venue.name}</Text>
          <View style={styles.addressRow}>
            <MapPin size={14} color={COLORS.accent} />
            <Text style={styles.address}>{venue.address}</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Star size={16} color={COLORS.accent} fill={COLORS.accent} />
              <Text style={styles.statValue}>{venue.rating}</Text>
              <Text style={styles.statLabel}>{venue.reviews_count} отзывов</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Clock size={16} color={COLORS.accent} />
              <Text style={styles.statValue}>{venue.working_hours?.open}–{venue.working_hours?.close}</Text>
              <Text style={styles.statLabel}>Режим работы</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Zap size={16} color={COLORS.accent} />
              <Text style={styles.statValue}>{venue.price_per_hour} сом</Text>
              <Text style={styles.statLabel}>За час</Text>
            </View>
          </View>

          {/* Description */}
          {venue.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ОПИСАНИЕ</Text>
              <Text style={styles.description}>{venue.description}</Text>
            </View>
          ) : null}

          {/* Amenities */}
          {venue.amenities?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>УДОБСТВА</Text>
              <View style={styles.amenitiesRow}>
                {venue.amenities.map((a) => (
                  <View key={a} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 2GIS Map */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>НА КАРТЕ</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                // Для 2GIS: заменить на кастомный TileOverlay с тайлами 2GIS
                initialRegion={{
                  latitude: venue.lat,
                  longitude: venue.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{ latitude: venue.lat, longitude: venue.lng }}
                  title={venue.name}
                  description={venue.address}
                >
                  <View style={styles.markerPin}>
                    <MapPin size={20} color="#000" />
                  </View>
                </Marker>
              </MapView>
            </View>
          </View>

          {/* Date Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ВЫБЕРИ ДАТУ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
          </View>

          {/* Time Slots */}
          <View style={[styles.section, { marginBottom: 120 }]}>
            <Text style={styles.sectionTitle}>СВОБОДНОЕ ВРЕМЯ</Text>
            <View style={styles.slotsGrid}>
              {slots.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id;
                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.slotBtn,
                      !slot.is_available && styles.slotBtnDisabled,
                      isSelected && styles.slotBtnActive,
                    ]}
                    onPress={() => slot.is_available && setSelectedSlot(slot)}
                    disabled={!slot.is_available}
                  >
                    <Text style={[
                      styles.slotTime,
                      !slot.is_available && { color: COLORS.gray[600] },
                      isSelected && { color: '#000' },
                    ]}>
                      {slot.start_time.slice(0, 5)}
                    </Text>
                    <Text style={[
                      styles.slotPrice,
                      !slot.is_available && { color: COLORS.gray[600] },
                      isSelected && { color: 'rgba(0,0,0,0.7)' },
                    ]}>
                      {slot.is_available ? `${slot.price} с` : 'занят'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {slots.length === 0 && (
                <Text style={styles.emptySlots}>Нет доступных слотов</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      {selectedSlot && (
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerSlotTime}>
              {selectedSlot.start_time.slice(0, 5)} – {selectedSlot.end_time.slice(0, 5)}
            </Text>
            <Text style={styles.footerPrice}>{selectedSlot.price} сом</Text>
          </View>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => router.push({
              pathname: '/(player)/booking',
              params: { venue_id: id, slot_id: String(selectedSlot.id) },
            })}
            activeOpacity={0.85}
          >
            <Text style={styles.bookBtnText}>ЗАБРОНИРОВАТЬ</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loadingRoot: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: FONTS.boldItalic, color: COLORS.gray[500], fontSize: 12, textTransform: 'uppercase' },

  // Hero
  hero: { position: 'relative' },
  heroImage: { width: '100%', height: 260 },
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
  ratingBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...SHADOW.accent,
  },
  ratingText: { fontFamily: FONTS.blackItalic, fontSize: 13, color: '#000' },

  // Body
  body: { padding: SPACING.lg },
  name: {
    fontFamily: FONTS.blackItalic,
    fontSize: 32,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -1,
    marginBottom: 8,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.lg },
  address: { fontFamily: FONTS.boldItalic, fontSize: 12, color: COLORS.gray[500], flex: 1 },

  // Stats
  statsRow: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOW.card,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  statValue: { fontFamily: FONTS.blackItalic, fontSize: 14, color: COLORS.white },
  statLabel: { fontFamily: FONTS.boldItalic, fontSize: 9, color: COLORS.gray[500], textTransform: 'uppercase' },

  // Section
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 11,
    color: COLORS.accent,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  description: {
    fontFamily: FONTS.boldItalic,
    fontSize: 13,
    color: COLORS.gray[400],
    lineHeight: 20,
  },

  // Amenities
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  amenityText: { fontFamily: FONTS.boldItalic, fontSize: 11, color: COLORS.gray[400] },

  // Map
  mapContainer: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  map: { width: '100%', height: 200 },
  markerPin: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    padding: 6,
    ...SHADOW.accent,
  },

  // Dates
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
  dateBtnDay: { fontFamily: FONTS.blackItalic, fontSize: 9, color: COLORS.gray[500], textTransform: 'uppercase' },
  dateBtnNum: { fontFamily: FONTS.blackItalic, fontSize: 18, color: COLORS.white },

  // Slots
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotBtn: {
    width: '30%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  slotBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    ...SHADOW.accent,
  },
  slotBtnDisabled: { opacity: 0.4 },
  slotTime: { fontFamily: FONTS.blackItalic, fontSize: 14, color: COLORS.white },
  slotPrice: { fontFamily: FONTS.boldItalic, fontSize: 10, color: COLORS.gray[500] },
  emptySlots: {
    fontFamily: FONTS.boldItalic,
    fontSize: 11,
    color: COLORS.gray[600],
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingVertical: 20,
    width: '100%',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  footerInfo: { flex: 1 },
  footerSlotTime: { fontFamily: FONTS.blackItalic, fontSize: 16, color: COLORS.white },
  footerPrice: { fontFamily: FONTS.boldItalic, fontSize: 12, color: COLORS.accent, marginTop: 2 },
  bookBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 18,
    ...SHADOW.accent,
  },
  bookBtnText: { fontFamily: FONTS.blackItalic, fontSize: 13, color: '#000', letterSpacing: 1 },
});
