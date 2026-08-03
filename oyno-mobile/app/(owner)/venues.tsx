import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, Platform, Modal, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Star, Edit, CalendarDays, X, Camera } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { venuesApi } from '@/services/api';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { SportId, TimeSlot, Venue, VenueType } from '@/types';

const VENUE_TYPES: { id: VenueType; name: string; emoji: string }[] = [
  { id: 'field', name: 'Поле', emoji: '🟩' },
  { id: 'gym', name: 'Зал', emoji: '🏋️' },
  { id: 'court', name: 'Корт', emoji: '🎾' },
  { id: 'pool', name: 'Бассейн', emoji: '🏊' },
  { id: 'stadium', name: 'Стадион', emoji: '🏟️' },
];

const VENUE_SPORTS: { id: Exclude<SportId, 'all'>; name: string; emoji: string }[] = [
  { id: 'football', name: 'Футбол', emoji: '⚽' },
  { id: 'basketball', name: 'Баскет', emoji: '🏀' },
  { id: 'volleyball', name: 'Волей', emoji: '🏐' },
  { id: 'tennis', name: 'Теннис', emoji: '🎾' },
  { id: 'swimming', name: 'Плавание', emoji: '🏊' },
  { id: 'other', name: 'Другое', emoji: '⚡' },
];

export default function OwnerVenuesScreen() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [scheduleVenue, setScheduleVenue] = useState<Venue | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['my-venues'],
    queryFn: () => venuesApi.myVenues(),
  });
  const venues: Venue[] = data?.data ?? [];

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
          renderItem={({ item }) => (
            <VenueCard
              venue={item}
              onEdit={() => setEditingVenue(item)}
              onSchedule={() => setScheduleVenue(item)}
            />
          )}
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
      {editingVenue && (
        <EditVenueModal
          key={editingVenue.id}
          venue={editingVenue}
          onClose={() => setEditingVenue(null)}
        />
      )}
      {scheduleVenue && (
        <ScheduleModal
          key={scheduleVenue.id}
          venue={scheduleVenue}
          onClose={() => setScheduleVenue(null)}
        />
      )}
    </SafeAreaView>
  );
}

function VenueCard({
  venue,
  onEdit,
  onSchedule,
}: {
  venue: Venue;
  onEdit: () => void;
  onSchedule: () => void;
}) {
  const qc = useQueryClient();
  const { mutate: requestVerification, isPending: isRequestingVerification } = useMutation({
    mutationFn: () => venuesApi.requestVerification(venue.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-venues'] });
      Toast.show({ type: 'success', text1: 'Заявка отправлена на проверку' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Не удалось отправить заявку' }),
  });
  const hasImage = venue.images?.length > 0;
  const isVerified = venue.verification_status === 'verified';
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
        <Text style={[styles.verificationStatus, isVerified ? styles.statusVerified : styles.statusPending]}>
          {isVerified ? 'Площадка подтверждена' : 'Ожидает проверки'}
        </Text>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.btnEdit}
            onPress={onEdit}
          >
            <Edit size={14} color={COLORS.accent} />
            <Text style={styles.btnEditText}>Редактировать</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnStats}
            onPress={onSchedule}
          >
            <CalendarDays size={14} color="#000" />
            <Text style={styles.btnStatsText}>Расписание</Text>
          </TouchableOpacity>
        </View>
        {!isVerified && (
          <TouchableOpacity
            style={[styles.verifyBtn, isRequestingVerification && styles.btnDisabled]}
            onPress={() => requestVerification()}
            disabled={isRequestingVerification}
          >
            <Text style={styles.verifyBtnText}>Отправить на проверку</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function EditVenueModal({ venue, onClose }: { venue: Venue; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(venue.name);
  const [type, setType] = useState<VenueType>(venue.type);
  const [sportIds, setSportIds] = useState<Exclude<SportId, 'all'>[]>(() => {
    const values = (venue.sport_ids?.filter((id): id is Exclude<SportId, 'all'> => id !== 'all') ?? []);
    return values.length ? values : [venue.sport_id === 'all' ? 'football' : venue.sport_id];
  });
  const [address, setAddress] = useState(venue.address);
  const [phone, setPhone] = useState(venue.phones?.[0] ?? '');
  const [city, setCity] = useState(venue.city);
  const [price, setPrice] = useState(String(venue.price_per_hour || ''));
  const [link2gis, setLink2gis] = useState(venue.link_2gis ?? '');
  const [description, setDescription] = useState(venue.description ?? '');

  const { mutate: update, isPending } = useMutation({
    mutationFn: () => venuesApi.update(venue.id, {
      name: name.trim(),
      type,
      sport_id: sportIds[0],
      sport_ids: sportIds,
      address: address.trim(),
      city: city.trim(),
      price_per_hour: Number(price) || 0,
      link_2gis: link2gis.trim(),
      description: description.trim(),
      phone: phone.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-venues'] });
      Toast.show({ type: 'success', text1: 'Площадка обновлена' });
      onClose();
    },
    onError: () => Toast.show({ type: 'error', text1: 'Не удалось сохранить изменения' }),
  });

  const toggleSport = (id: Exclude<SportId, 'all'>) => {
    if (sportIds.includes(id)) {
      if (sportIds.length > 1) setSportIds((current) => current.filter((sport) => sport !== id));
      return;
    }
    setSportIds((current) => [...current, id]);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Редактировать <Text style={{ color: COLORS.accent }}>площадку</Text></Text>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}><X size={24} color="#fff" /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>ТИП ПЛОЩАДКИ</Text>
            <View style={styles.pillRow}>
              {VENUE_TYPES.map((item) => (
                <TouchableOpacity key={item.id} style={[styles.pill, type === item.id && styles.pillActive]} onPress={() => setType(item.id)}>
                  <Text style={[styles.pillText, type === item.id && styles.pillTextActive]}>{item.emoji} {item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>ВИДЫ СПОРТА</Text>
            <View style={styles.pillRow}>
              {VENUE_SPORTS.map((item) => {
                const active = sportIds.includes(item.id);
                return (
                  <TouchableOpacity key={item.id} style={[styles.pill, active && styles.pillActive]} onPress={() => toggleSport(item.id)}>
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{item.emoji} {item.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>НАЗВАНИЕ</Text>
            <TextInput style={styles.fieldInput} value={name} onChangeText={setName} placeholder="Название площадки" placeholderTextColor={COLORS.gray[600]} />
            <Text style={styles.fieldLabel}>АДРЕС</Text>
            <TextInput style={styles.fieldInput} value={address} onChangeText={setAddress} placeholder="Адрес" placeholderTextColor={COLORS.gray[600]} />
            <Text style={styles.fieldLabel}>ТЕЛЕФОН</Text>
            <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} placeholder="+996 700 000 000" placeholderTextColor={COLORS.gray[600]} keyboardType="phone-pad" />
            <Text style={styles.fieldLabel}>ГОРОД</Text>
            <TextInput style={styles.fieldInput} value={city} onChangeText={setCity} placeholder="Бишкек" placeholderTextColor={COLORS.gray[600]} />
            <Text style={styles.fieldLabel}>ЦЕНА ЗА ЧАС</Text>
            <TextInput style={styles.fieldInput} value={price} onChangeText={(value) => setPrice(value.replace(/\D/g, ''))} placeholder="1500" placeholderTextColor={COLORS.gray[600]} keyboardType="number-pad" />
            <Text style={styles.fieldLabel}>ССЫЛКА 2GIS</Text>
            <TextInput style={styles.fieldInput} value={link2gis} onChangeText={setLink2gis} placeholder="https://2gis.kg/..." placeholderTextColor={COLORS.gray[600]} autoCapitalize="none" keyboardType="url" />
            <Text style={styles.fieldLabel}>ОПИСАНИЕ</Text>
            <TextInput style={[styles.fieldInput, styles.fieldTextarea]} value={description} onChangeText={setDescription} placeholder="Описание площадки" placeholderTextColor={COLORS.gray[600]} multiline textAlignVertical="top" />
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalBtn, (!name.trim() || !address.trim() || !sportIds.length || isPending) && styles.modalBtnDisabled]} onPress={() => update()} disabled={!name.trim() || !address.trim() || !sportIds.length || isPending}>
              {isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.modalBtnText}>СОХРАНИТЬ</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ScheduleModal({ venue, onClose }: { venue: Venue; onClose: () => void }) {
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [price, setPrice] = useState(String(venue.price_per_hour || ''));
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['owner-slots', venue.id, date],
    queryFn: () => venuesApi.slots(venue.id, date),
  });
  const slots: TimeSlot[] = data?.data ?? [];
  const { mutate: addSlot, isPending } = useMutation({
    mutationFn: () => venuesApi.addSlot(venue.id, { date, start_time: startTime, end_time: endTime, price: Number(price) || 0 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-slots', venue.id, date] });
      Toast.show({ type: 'success', text1: 'Слот добавлен' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Не удалось добавить слот' }),
  });
  const dates = Array.from({ length: 7 }, (_, index) => {
    const current = new Date();
    current.setDate(current.getDate() + index);
    return formatDateInput(current);
  });

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Расписание <Text style={{ color: COLORS.accent }}>{venue.name}</Text></Text>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}><X size={24} color="#fff" /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
              {dates.map((item) => {
                const active = item === date;
                return <TouchableOpacity key={item} style={[styles.dateChip, active && styles.pillActive]} onPress={() => setDate(item)}><Text style={[styles.dateChipText, active && styles.pillTextActive]}>{formatDateLabel(item)}</Text></TouchableOpacity>;
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>СЛОТЫ НА {formatDateLabel(date).toUpperCase()}</Text>
            {isLoading ? <ActivityIndicator color={COLORS.accent} /> : slots.length ? slots.map((slot) => (
              <View key={slot.id} style={styles.slotCard}>
                <Text style={styles.slotTime}>{slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}</Text>
                <Text style={styles.slotPrice}>{slot.price} сом</Text>
              </View>
            )) : <Text style={styles.emptySlots}>На эту дату слотов пока нет</Text>}

            <Text style={styles.fieldLabel}>ДОБАВИТЬ СЛОТ</Text>
            <View style={styles.timeRow}>
              <TextInput style={[styles.fieldInput, styles.timeInput]} value={startTime} onChangeText={setStartTime} placeholder="10:00" placeholderTextColor={COLORS.gray[600]} />
              <Text style={styles.timeSeparator}>—</Text>
              <TextInput style={[styles.fieldInput, styles.timeInput]} value={endTime} onChangeText={setEndTime} placeholder="11:00" placeholderTextColor={COLORS.gray[600]} />
            </View>
            <TextInput style={styles.fieldInput} value={price} onChangeText={(value) => setPrice(value.replace(/\D/g, ''))} placeholder="Цена, сом" placeholderTextColor={COLORS.gray[600]} keyboardType="number-pad" />
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalBtn, isPending && styles.modalBtnDisabled]} onPress={() => addSlot()} disabled={isPending}>
              {isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.modalBtnText}>ДОБАВИТЬ СЛОТ</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function AddVenueModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('field');
  const [sportIds, setSportIds] = useState<Exclude<SportId, 'all'>[]>(['football']);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
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
      form.append('sport_id', sportIds[0]);
      sportIds.forEach((id) => form.append('sport_ids', id));
      form.append('address', address.trim());
      if (phone.trim()) form.append('phone', phone.trim());
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
      setName(''); setAddress(''); setPhone(''); setPrice(''); setDescription(''); setLink2gis('');
      setType('field'); setSportIds(['football']); setCity('Бишкек'); setPhotos([]);
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
                  style={[styles.pill, sportIds.includes(s.id) && styles.pillActive]}
                  onPress={() => {
                    if (sportIds.includes(s.id)) {
                      if (sportIds.length > 1) setSportIds((current) => current.filter((id) => id !== s.id));
                    } else {
                      setSportIds((current) => [...current, s.id]);
                    }
                  }}
                >
                  <Text style={[styles.pillText, sportIds.includes(s.id) && styles.pillTextActive]}>
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

            {/* Phone */}
            <Text style={styles.fieldLabel}>ТЕЛЕФОН ДЛЯ БРОНИРОВАНИЯ</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="+996 700 000 000"
              placeholderTextColor={COLORS.gray[600]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
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
  verificationStatus: { fontFamily: FONTS.bold, fontSize: 10, marginBottom: SPACING.md },
  statusVerified: { color: COLORS.accent },
  statusPending: { color: '#F7B955' },
  cardActions: { flexDirection: 'row', gap: 10 },
  btnEdit: {
    flex: 1, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 6, paddingVertical: 10,
    backgroundColor: COLORS.bg, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnDisabled: { opacity: 0.55 },
  verifyBtn: {
    marginTop: SPACING.sm,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(198,255,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(198,255,0,0.35)',
    alignItems: 'center',
  },
  verifyBtnText: { fontFamily: FONTS.blackItalic, fontSize: 10, color: COLORS.accent, textTransform: 'uppercase' },
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
  modalRoot: { flex: 1, backgroundColor: COLORS.bg },
  modalSafeArea: { flex: 1 },
  modalScroll: { flex: 1 },
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
  dateRow: { gap: 8, paddingBottom: SPACING.md },
  dateChip: {
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  dateChipText: { fontFamily: FONTS.blackItalic, fontSize: 11, color: COLORS.gray[400], textTransform: 'uppercase' },
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    marginBottom: 8,
  },
  slotTime: { fontFamily: FONTS.blackItalic, fontSize: 16, color: COLORS.white },
  slotPrice: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.accent },
  emptySlots: { fontFamily: FONTS.boldItalic, fontSize: 12, color: COLORS.gray[500], paddingVertical: 14 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { flex: 1, textAlign: 'center' },
  timeSeparator: { fontFamily: FONTS.blackItalic, color: COLORS.gray[400], fontSize: 18 },
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
