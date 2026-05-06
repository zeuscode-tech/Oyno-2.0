import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, Platform, Modal, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Star, Edit, BarChart2, X, Camera } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { venuesApi } from '@/services/api';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { Venue } from '@/types';

const VENUE_TYPES: { id: string; name: string; emoji: string }[] = [
  { id: 'field', name: 'Поле', emoji: '🟩' },
  { id: 'gym', name: 'Зал', emoji: '🏋️' },
  { id: 'court', name: 'Корт', emoji: '🎾' },
  { id: 'pool', name: 'Бассейн', emoji: '🏊' },
  { id: 'stadium', name: 'Стадион', emoji: '🏟️' },
];

const VENUE_SPORTS: { id: string; name: string; emoji: string }[] = [
  { id: 'football', name: 'Футбол', emoji: '⚽' },
  { id: 'basketball', name: 'Баскет', emoji: '🏀' },
  { id: 'volleyball', name: 'Волей', emoji: '🏐' },
  { id: 'tennis', name: 'Теннис', emoji: '🎾' },
  { id: 'other', name: 'Другое', emoji: '⚡' },
];

export default function OwnerVenuesScreen() {
  const [showAdd, setShowAdd] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['my-venues'],
    queryFn: () => venuesApi.myVenues(),
  });
  const venues = (data?.data as any) ?? [];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>МОИ ПЛОЩАДКИ</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
          <Plus size={20} color="#000" strokeWidth={3} />
          <Text style={styles.addBtnText}>ДОБАВИТЬ</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={venues}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <VenueCard venue={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏟️</Text>
              <Text style={styles.emptyTitle}>НЕТ ПЛОЩАДОК</Text>
              <Text style={styles.emptySubtitle}>Нажми «Добавить» чтобы создать первую</Text>
            </View>
          }
        />
      )}

      <AddVenueModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </SafeAreaView>
  );
}

function VenueCard({ venue }: { venue: Venue }) {
  const hasImage = venue.images?.length > 0;
  return (
    <View style={styles.card}>
      {hasImage ? (
        <Image
          source={{ uri: venue.images[0] }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Text style={styles.cardImageEmoji}>🏟️</Text>
        </View>
      )}
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

function AddVenueModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('field');
  const [sportId, setSportId] = useState('football');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Бишкек');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [link2gis, setLink2gis] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Нет доступа к фото' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 10));
    }
  };

  const { mutate: create, isPending } = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('type', type);
      form.append('sport_id', sportId);
      form.append('address', address.trim());
      form.append('city', city.trim() || 'Бишкек');
      form.append('price_per_hour', String(parseFloat(price) || 0));
      if (description.trim()) form.append('description', description.trim());
      let finalLink = link2gis.trim();
      if (finalLink && !finalLink.startsWith('http')) {
        finalLink = 'https://' + finalLink;
      }
      if (finalLink) form.append('link_2gis', finalLink);
      photos.forEach((uri, i) => {
        const filename = uri.split('/').pop() ?? `photo_${i}.jpg`;
        const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
        form.append('images', { uri, name: filename, type: `image/${ext}` } as any);
      });
      return venuesApi.create(form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-venues'] });
      Toast.show({ type: 'success', text1: 'Площадка добавлена!' });
      setName(''); setAddress(''); setPrice(''); setDescription(''); setLink2gis('');
      setType('field'); setSportId('football'); setCity('Бишкек'); setPhotos([]);
      onClose();
    },
    onError: (e: any) => {
      const data = e?.response?.data;
      let msg = 'Ошибка создания';
      if (typeof data === 'object' && data !== null) {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          msg = `${firstKey}: ${data[firstKey][0]}`;
        } else if (data.detail) {
          msg = data.detail;
        }
      }
      Toast.show({ type: 'error', text1: msg });
    },
  });

  const canSubmit = name.trim().length > 0 && address.trim().length > 0 && parseFloat(price) > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Новая <Text style={{ color: COLORS.accent }}>Площадка</Text>
            </Text>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Venue type */}
            <Text style={styles.fieldLabel}>ТИП ПЛОЩАДКИ</Text>
            <View style={styles.pillRow}>
              {VENUE_TYPES.map((vt) => (
                <TouchableOpacity
                  key={vt.id}
                  style={[styles.pill, type === vt.id && styles.pillActive]}
                  onPress={() => setType(vt.id)}
                >
                  <Text style={[styles.pillText, type === vt.id && styles.pillTextActive]}>
                    {vt.emoji} {vt.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sport */}
            <Text style={styles.fieldLabel}>ВИД СПОРТА</Text>
            <View style={styles.pillRow}>
              {VENUE_SPORTS.map((s) => (
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

            {/* Name */}
            <Text style={styles.fieldLabel}>НАЗВАНИЕ ПЛОЩАДКИ</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Например: SportZone Football"
              placeholderTextColor={COLORS.gray[600]}
              value={name}
              onChangeText={setName}
            />

            {/* Address */}
            <Text style={styles.fieldLabel}>АДРЕС</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="ул. Токтогула 215"
              placeholderTextColor={COLORS.gray[600]}
              value={address}
              onChangeText={setAddress}
            />

            {/* City */}
            <Text style={styles.fieldLabel}>ГОРОД</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Бишкек"
              placeholderTextColor={COLORS.gray[600]}
              value={city}
              onChangeText={setCity}
            />

            {/* 2GIS Link */}
            <Text style={styles.fieldLabel}>ССЫЛКА НА 2GIS (НЕОБЯЗАТЕЛЬНО)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="https://2gis.kg/bishkek/geo/..."
              placeholderTextColor={COLORS.gray[600]}
              value={link2gis}
              onChangeText={setLink2gis}
              autoCapitalize="none"
              keyboardType="url"
            />

            {/* Price */}
            <Text style={styles.fieldLabel}>ЦЕНА ЗА ЧАС (СОМ)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="1500"
              placeholderTextColor={COLORS.gray[600]}
              value={price}
              onChangeText={(v) => setPrice(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
            />

            {/* Photos */}
            <Text style={styles.fieldLabel}>ФОТОГРАФИИ (до 10)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {photos.map((uri, i) => (
                  <View key={i} style={styles.photoThumb}>
                    <Image source={{ uri }} style={styles.photoThumbImg} />
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    >
                      <X size={12} color="#000" />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 10 && (
                  <TouchableOpacity style={styles.photoAddBtn} onPress={pickPhoto} activeOpacity={0.8}>
                    <Camera size={24} color={COLORS.accent} />
                    <Text style={styles.photoAddText}>Добавить</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            {/* Description */}
            <Text style={styles.fieldLabel}>ОПИСАНИЕ (НЕОБЯЗАТЕЛЬНО)</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextarea]}
              placeholder="Расскажи о площадке..."
              placeholderTextColor={COLORS.gray[600]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Submit */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalBtn, (!canSubmit || isPending) && styles.modalBtnDisabled]}
              onPress={() => canSubmit && create()}
              disabled={!canSubmit || isPending}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.modalBtnText}>ДОБАВИТЬ ПЛОЩАДКУ</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
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

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  cardImage: { width: '100%', height: 160 },
  cardImagePlaceholder: {
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardImageEmoji: { fontSize: 56 },
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
    flex: 1, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 6, paddingVertical: 10,
    backgroundColor: COLORS.bg, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnEditText: { fontFamily: FONTS.blackItalic, fontSize: 10, color: COLORS.accent, textTransform: 'uppercase' },
  btnStats: {
    flex: 1, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 6, paddingVertical: 10,
    backgroundColor: COLORS.accent, borderRadius: 12, ...SHADOW.accent,
  },
  btnStatsText: { fontFamily: FONTS.blackItalic, fontSize: 10, color: '#000', textTransform: 'uppercase' },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 60, marginBottom: SPACING.md },
  emptyTitle: { fontFamily: FONTS.blackItalic, fontSize: 18, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -0.5 },
  emptySubtitle: { fontFamily: FONTS.boldItalic, fontSize: 12, color: COLORS.gray[500], marginTop: 8, textAlign: 'center' },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.sm,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 28,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  modalClose: {
    width: 48, height: 48,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, gap: 4 },
  modalFooter: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 32 : SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: 22,
    alignItems: 'center',
    ...SHADOW.accent,
  },
  modalBtnDisabled: { opacity: 0.4 },
  modalBtnText: { fontFamily: FONTS.blackItalic, fontSize: 14, color: '#000', letterSpacing: 2 },

  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbImg: { width: 80, height: 80 },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddBtn: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'rgba(198,255,0,0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  photoAddText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 8,
    color: COLORS.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.accent,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: SPACING.md,
    marginBottom: 8,
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
  fieldTextarea: { height: 80, paddingTop: 14 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent, ...SHADOW.accent },
  pillText: { fontFamily: FONTS.blackItalic, fontSize: 11, color: COLORS.gray[400], letterSpacing: 0.5 },
  pillTextActive: { color: '#000' },
});
