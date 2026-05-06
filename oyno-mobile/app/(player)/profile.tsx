import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, Platform, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle as SvgCircle, G as SvgG } from 'react-native-svg';
import {
  Edit, CreditCard, Building2, Settings, LogOut,
  MapPin, Zap, Trophy, Star, Target, Check, X, Camera, Plus,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { authApi, paymentsApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { t } from '@/constants/i18n';
import { PaymentMethod } from '@/types';

export default function ProfileScreen() {
  const { user, logout, setActiveRole, updateUser } = useAuthStore();
  const [showEdit, setShowEdit] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editUsername, setEditUsername] = useState(user?.username ?? '');
  const [editCity, setEditCity] = useState(user?.city ?? '');
  const [editBio, setEditBio] = useState(user?.bio ?? '');
  const [editSkillLevel, setEditSkillLevel] = useState(user?.skill_level ?? 'beginner');
  const [editMainSport, setEditMainSport] = useState(user?.main_sport ?? '');
  const qc = useQueryClient();

  const { data: paymentData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentsApi.methods(),
  });
  const rawMethods = paymentData?.data as any;
  const methods: PaymentMethod[] = Array.isArray(rawMethods)
    ? rawMethods
    : rawMethods?.results ?? [];
  const defaultMethod = methods.find((m) => m.is_default);

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: () => authApi.updateProfile({
      name: editName,
      username: editUsername.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '') || undefined,
      city: editCity,
      bio: editBio,
      skill_level: editSkillLevel,
      main_sport: editMainSport || undefined,
    } as any),
    onSuccess: ({ data }) => {
      updateUser(data);
      setShowEdit(false);
      Toast.show({ type: 'success', text1: 'Профиль обновлён' });
    },
  });

  const { mutate: uploadAvatar, isPending: uploadingAvatar } = useMutation({
    mutationFn: (uri: string) => authApi.uploadAvatar(uri),
    onSuccess: ({ data }) => {
      updateUser(data);
      Toast.show({ type: 'success', text1: 'Фото обновлено' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Не удалось загрузить фото' }),
  });

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Нет доступа к фото' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleOwnerMode = async () => {
    try {
      // Берём актуальные данные с сервера
      const { data: freshUser } = await authApi.getMe();
      updateUser(freshUser);
      if (freshUser.role === 'venue_owner') {
        setActiveRole('venue_owner');
        router.replace('/(owner)');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Нет прав владельца',
          text2: 'Зарегистрируйся заново с ролью "Владелец поля"',
        });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Не удалось проверить права' });
    }
  };

  const stats = [
    { label: t('profile.matches'), value: String(user?.matches_played ?? 0), pct: Math.min((user?.matches_played ?? 0) / 50 * 100, 100), Icon: Trophy },
    { label: t('profile.rating'), value: String(user?.rating ?? '–'), pct: ((user?.rating ?? 0) / 5) * 100, Icon: Star },
    { label: t('profile.reliability'), value: `${user?.reliability ?? 0}%`, pct: user?.reliability ?? 0, Icon: Target },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Avatar + Info */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={pickAvatar} activeOpacity={0.85}>
            {uploadingAvatar ? (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <ActivityIndicator color={COLORS.accent} />
              </View>
            ) : user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarCameraBtn}>
              <Camera size={14} color="#000" />
            </View>
            <View style={styles.avatarBadge}>
              <Zap size={16} color="#000" fill="#000" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.name}</Text>
          {user?.username ? (
            <Text style={styles.usernameText}>@{user.username}</Text>
          ) : null}
          {user?.main_sport ? (
            <View style={styles.mainSportRow}>
              <Text style={styles.mainSportEmoji}>
                {{'football':'⚽','basketball':'🏀','volleyball':'🏐','tennis':'🎾','other':'⚡'}[user.main_sport] ?? '⚡'}
              </Text>
              <Text style={styles.mainSportText}>
                {{'football':'Футбол','basketball':'Баскетбол','volleyball':'Волейбол','tennis':'Теннис','other':'Другое'}[user.main_sport] ?? ''}
              </Text>
            </View>
          ) : null}
          <View style={styles.locationRow}>
            <MapPin size={14} color={COLORS.accent} />
            <Text style={styles.locationText}>{user?.city}</Text>
          </View>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>
              {{'beginner':'Новичок','intermediate':'Любитель','advanced':'Продвинутый','pro':'Профессионал'}[user?.skill_level ?? 'beginner'] ?? t('profile.advanced')}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          {stats.map((s, i) => {
            const r = 36;
            const circ = 2 * Math.PI * r;
            const offset = circ - (s.pct / 100) * circ;
            return (
              <View key={s.label} style={styles.statItem}>
                <View style={styles.statRing}>
                  <Svg width={76} height={76}>
                    <SvgG rotation="-90" origin="38, 38">
                      <SvgCircle cx={38} cy={38} r={r} stroke={COLORS.border} strokeWidth={8} fill="transparent" />
                      <SvgCircle
                        cx={38} cy={38} r={r}
                        stroke={COLORS.accent}
                        strokeWidth={8}
                        fill="transparent"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                      />
                    </SvgG>
                  </Svg>
                  <Text style={styles.statValue}>{s.value}</Text>
                </View>
                <View style={styles.statLabelRow}>
                  <s.Icon size={10} color={COLORS.accent} />
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {[
            { id: 'edit', label: t('profile.edit'), sub: 'Данные аккаунта', Icon: Edit, onPress: () => setShowEdit(true) },
            { id: 'payment', label: defaultMethod ? `${defaultMethod.label}` : 'Добавить карту', sub: t('profile.payment'), Icon: CreditCard, onPress: () => setShowPayment(true) },
            { id: 'venues', label: t('profile.venues'), sub: 'История брони', Icon: Building2, onPress: () => router.push('/(player)/booking') },
            { id: 'settings', label: t('profile.settings'), sub: 'Приложение', Icon: Settings, onPress: () => setShowSettings(true) },
            { id: 'owner', label: t('profile.ownerMode'), sub: 'Переключиться', Icon: Settings, onPress: handleOwnerMode },
          ].map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.85}>
              <View style={styles.menuIcon}>
                <item.Icon size={22} color={COLORS.accent} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={18} color={COLORS.error} />
          <Text style={styles.logoutText}>{t('profile.logout').toUpperCase()}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalBackBtn} onPress={() => setShowEdit(false)}>
              <X size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>ПРОФИЛЬ</Text>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={() => saveProfile()}>
              <Check size={20} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.inputLabel}>ИМЯ ИГРОКА</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor={COLORS.gray[600]}
            />
            <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>USERNAME (как в телеграме)</Text>
            <View style={styles.usernameInputWrapper}>
              <Text style={styles.usernameAt}>@</Text>
              <TextInput
                style={[styles.modalInput, styles.usernameInput]}
                value={editUsername}
                onChangeText={(v) => setEditUsername(v.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                placeholder="oyno_player"
                placeholderTextColor={COLORS.gray[600]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Text style={styles.usernameHint}>Только буквы, цифры, . и _   •   другие смогут найти тебя по нему</Text>
            <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>ГОРОД</Text>
            <TextInput
              style={styles.modalInput}
              value={editCity}
              onChangeText={setEditCity}
              placeholderTextColor={COLORS.gray[600]}
            />
            <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>О СЕБЕ</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top', paddingTop: 14 }]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Расскажи о себе..."
              placeholderTextColor={COLORS.gray[600]}
              multiline
            />
            <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>УРОВЕНЬ ИГРЫ</Text>
            <View style={styles.editPillRow}>
              {([
                { id: 'beginner', label: 'Новичок' },
                { id: 'intermediate', label: 'Любитель' },
                { id: 'advanced', label: 'Продвинутый' },
                { id: 'pro', label: 'Про' },
              ] as const).map((lvl) => (
                <TouchableOpacity
                  key={lvl.id}
                  style={[styles.editPill, editSkillLevel === lvl.id && styles.editPillActive]}
                  onPress={() => setEditSkillLevel(lvl.id)}
                >
                  <Text style={[styles.editPillText, editSkillLevel === lvl.id && styles.editPillTextActive]}>
                    {lvl.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>ОСНОВНОЙ СПОРТ</Text>
            <View style={styles.editPillRow}>
              {([
                { id: 'football', label: '⚽ Футбол' },
                { id: 'basketball', label: '🏀 Баскет' },
                { id: 'volleyball', label: '🏐 Волей' },
                { id: 'tennis', label: '🎾 Теннис' },
                { id: 'other', label: '⚡ Другое' },
              ] as const).map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.editPill, editMainSport === s.id && styles.editPillActive]}
                  onPress={() => setEditMainSport(s.id)}
                >
                  <Text style={[styles.editPillText, editMainSport === s.id && styles.editPillTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalSaveBtnFull, savingProfile && { opacity: 0.6 }]}
              onPress={() => saveProfile()}
              disabled={savingProfile}
            >
              <Text style={styles.modalSaveBtnText}>{savingProfile ? 'СОХРАНЯЕМ...' : 'СОХРАНИТЬ'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalRoot, { paddingTop: SPACING.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg, gap: SPACING.md }}>
            <TouchableOpacity style={styles.modalBackBtn} onPress={() => setShowSettings(false)}>
              <X size={20} color={COLORS.accent} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { flex: 1 }]}>НАСТРОЙКИ</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: 12 }}>
            {[
              { label: 'Уведомления об играх', sub: 'Новые игры рядом' },
              { label: 'Уведомления о чатах', sub: 'Новые сообщения' },
              { label: 'Уведомления о бронях', sub: 'Статус бронирования' },
            ].map((item) => (
              <View key={item.label} style={[styles.menuItem, { marginHorizontal: 0 }]}>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <View style={{ width: 44, height: 26, backgroundColor: COLORS.accent, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 3, alignItems: 'flex-end' }}>
                  <View style={{ width: 20, height: 20, backgroundColor: '#000', borderRadius: 10 }} />
                </View>
              </View>
            ))}
            <View style={{ marginTop: SPACING.lg, padding: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ fontFamily: FONTS.blackItalic, fontSize: 10, color: COLORS.accent, letterSpacing: 2, marginBottom: 4 }}>ВЕРСИЯ ПРИЛОЖЕНИЯ</Text>
              <Text style={{ fontFamily: FONTS.boldItalic, fontSize: 12, color: COLORS.gray[500] }}>OYNO v2.0.0</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPayment} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalRoot, { paddingTop: SPACING.md }]}>
          <TouchableOpacity style={styles.modalBackBtn} onPress={() => setShowPayment(false)}>
            <X size={20} color={COLORS.accent} />
            <Text style={styles.modalBackText}>Назад</Text>
          </TouchableOpacity>

          <Text style={[styles.modalTitle, { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg }]}>
            ОПЛАТА
          </Text>

          <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: 12 }}>
            {methods.map((method) => (
              <PaymentMethodItem key={method.id} method={method} />
            ))}
            {methods.length === 0 && (
              <Text style={styles.emptyText}>Нет сохранённых карт</Text>
            )}
            <AddCardForm onSuccess={() => {}} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Add Card Form ────────────────────────────────────
const CARD_TYPES: { id: PaymentMethod['type']; label: string }[] = [
  { id: 'visa', label: 'Visa' },
  { id: 'mastercard', label: 'MasterCard' },
  { id: 'elcart', label: 'Элкарт' },
  { id: 'mbank', label: 'Mbank' },
  { id: 'odengi', label: "O!Деньги" },
];

function AddCardForm({ onSuccess }: { onSuccess: () => void }) {
  const qc = useQueryClient();
  const [cardType, setCardType] = useState<PaymentMethod['type']>('visa');
  const [last4, setLast4] = useState('');

  const { mutate: addCard, isPending } = useMutation({
    mutationFn: () => paymentsApi.addCard({
      type: cardType,
      last4: last4.trim(),
      label: `${CARD_TYPES.find(c => c.id === cardType)?.label} •••• ${last4.trim()}`,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-methods'] });
      Toast.show({ type: 'success', text1: 'Карта добавлена' });
      setLast4('');
      onSuccess();
    },
    onError: () => Toast.show({ type: 'error', text1: 'Не удалось добавить карту' }),
  });

  return (
    <View style={styles.addCardForm}>
      <Text style={styles.addCardTitle}>ДОБАВИТЬ КАРТУ</Text>

      <Text style={styles.addCardLabel}>ТИП</Text>
      <View style={styles.cardTypeRow}>
        {CARD_TYPES.map((ct) => (
          <TouchableOpacity
            key={ct.id}
            style={[styles.cardTypePill, cardType === ct.id && styles.cardTypePillActive]}
            onPress={() => setCardType(ct.id)}
          >
            <Text style={[styles.cardTypePillText, cardType === ct.id && { color: '#000' }]}>
              {ct.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.addCardLabel}>ПОСЛЕДНИЕ 4 ЦИФРЫ</Text>
      <TextInput
        style={styles.addCardInput}
        placeholder="4242"
        placeholderTextColor={COLORS.gray[600]}
        value={last4}
        onChangeText={(v) => setLast4(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
      />

      <TouchableOpacity
        style={[styles.addCardBtn, (isPending || last4.length !== 4) && { opacity: 0.5 }]}
        onPress={() => last4.length === 4 && addCard()}
        disabled={isPending || last4.length !== 4}
      >
        {isPending
          ? <ActivityIndicator color="#000" />
          : <Text style={styles.addCardBtnText}>ДОБАВИТЬ</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

function PaymentMethodItem({ method }: { method: PaymentMethod }) {
  const icons: Record<string, string> = {
    visa: '💳',
    mastercard: '💳',
    elcart: '🏦',
    mbank: '📱',
    odengi: '📱',
  };
  return (
    <TouchableOpacity style={[styles.paymentCard, method.is_default && styles.paymentCardActive]} activeOpacity={0.85}>
      <View style={[styles.paymentIconWrapper, method.is_default && styles.paymentIconActive]}>
        <CreditCard size={24} color={method.is_default ? '#000' : COLORS.accent} />
      </View>
      <Text style={styles.paymentLabel}>{method.label}</Text>
      {method.is_default && (
        <View style={styles.checkBadge}>
          <Check size={14} color="#000" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 100 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  avatarWrapper: { position: 'relative', marginBottom: SPACING.md },
  avatar: { width: 120, height: 120, borderRadius: 40, borderWidth: 3, borderColor: COLORS.accent },
  avatarFallback: { backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontFamily: FONTS.blackItalic, fontSize: 48, color: COLORS.accent },
  avatarBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: { fontFamily: FONTS.blackItalic, fontSize: 32, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -1 },
  usernameText: {
    fontFamily: FONTS.boldItalic,
    fontSize: 13,
    color: COLORS.accent,
    letterSpacing: 0.5,
    marginTop: 2,
    marginBottom: 2,
  },
  usernameInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingLeft: SPACING.lg,
  },
  usernameAt: {
    fontFamily: FONTS.blackItalic,
    fontSize: 20,
    color: COLORS.accent,
    marginRight: 2,
  },
  usernameInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  usernameHint: {
    fontFamily: FONTS.boldItalic,
    fontSize: 10,
    color: COLORS.gray[600],
    marginTop: 6,
    marginLeft: 4,
    marginBottom: 4,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: SPACING.sm },
  locationText: { fontFamily: FONTS.boldItalic, fontSize: 11, color: COLORS.gray[500], textTransform: 'uppercase', letterSpacing: 2 },
  mainSportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 2,
  },
  mainSportEmoji: { fontSize: 18 },
  mainSportText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 12,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rankBadge: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  rankText: { fontFamily: FONTS.blackItalic, fontSize: 11, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: 1 },
  editPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  editPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editPillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  editPillText: { fontFamily: FONTS.blackItalic, fontSize: 11, color: COLORS.gray[400], letterSpacing: 0.5 },
  editPillTextActive: { color: '#000' },

  // Stats
  statsCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: 40,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    ...SHADOW.card,
  },
  statItem: { alignItems: 'center', width: '32%' },
  statRing: { position: 'relative', width: 76, height: 76, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: {
    position: 'absolute',
    fontFamily: FONTS.blackItalic,
    fontSize: 16,
    color: COLORS.white,
  },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  statLabel: { fontFamily: FONTS.blackItalic, fontSize: 7, color: COLORS.gray[400], textTransform: 'uppercase', letterSpacing: 1 },

  // Menu
  menu: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.lg },
  menuItem: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  menuIcon: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuInfo: { flex: 1 },
  menuLabel: { fontFamily: FONTS.blackItalic, fontSize: 13, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -0.5 },
  menuSub: { fontFamily: FONTS.boldItalic, fontSize: 10, color: COLORS.gray[500], textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  menuArrow: { fontFamily: FONTS.blackItalic, fontSize: 24, color: COLORS.gray[600] },

  // Logout
  logoutBtn: {
    marginHorizontal: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: 'rgba(239,83,80,0.2)',
  },
  logoutText: { fontFamily: FONTS.blackItalic, fontSize: 11, color: COLORS.error, letterSpacing: 3 },

  // Modal
  modalRoot: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.md,
    marginBottom: SPACING.xl,
  },
  modalTitle: { fontFamily: FONTS.blackItalic, fontSize: 24, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -1 },
  modalBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.bgCard, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  modalBackText: { fontFamily: FONTS.blackItalic, fontSize: 12, color: COLORS.white, textTransform: 'uppercase' },
  modalSaveBtn: { width: 44, height: 44, backgroundColor: COLORS.accent, borderRadius: 14, justifyContent: 'center', alignItems: 'center', ...SHADOW.accent },
  modalBody: { paddingHorizontal: SPACING.lg },
  inputLabel: { fontFamily: FONTS.blackItalic, fontSize: 10, color: COLORS.accent, letterSpacing: 3, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
  modalInput: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 18,
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  modalSaveBtnFull: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: SPACING.xl,
    ...SHADOW.accent,
  },
  modalSaveBtnText: { fontFamily: FONTS.blackItalic, fontSize: 14, color: '#000', letterSpacing: 2 },
  emptyText: { fontFamily: FONTS.boldItalic, fontSize: 11, color: COLORS.gray[600], textTransform: 'uppercase', textAlign: 'center', paddingVertical: 20 },

  // Avatar camera button
  avatarCameraBtn: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 28,
    height: 28,
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Add Card Form
  addCardForm: {
    marginTop: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    gap: 4,
  },
  addCardTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 12,
    color: COLORS.accent,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  addCardLabel: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.gray[500],
    letterSpacing: 2,
    marginTop: SPACING.sm,
    marginBottom: 6,
  },
  cardTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  cardTypePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTypePillActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  cardTypePillText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 10,
    color: COLORS.gray[400],
    letterSpacing: 1,
  },
  addCardInput: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: 4,
  },
  addCardBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.sm,
    ...SHADOW.accent,
  },
  addCardBtnText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 12,
    color: '#000',
    letterSpacing: 2,
  },

  // Payment
  paymentCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  paymentCardActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(198,255,0,0.08)' },
  paymentIconWrapper: { width: 48, height: 48, backgroundColor: COLORS.bg, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  paymentIconActive: { backgroundColor: COLORS.accent },
  paymentLabel: { flex: 1, fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  checkBadge: { width: 24, height: 24, backgroundColor: COLORS.accent, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
