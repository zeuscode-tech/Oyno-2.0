import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, Platform, Modal, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import {
  Edit, CreditCard, Building2, Settings, LogOut,
  MapPin, Zap, Trophy, Star, Target, Check, X,
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
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editCity, setEditCity] = useState(user?.city ?? '');
  const qc = useQueryClient();

  const { data: paymentData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentsApi.methods(),
  });
  const methods = paymentData?.data ?? [];
  const defaultMethod = methods.find((m) => m.is_default);

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: () => authApi.updateProfile({ name: editName, city: editCity }),
    onSuccess: ({ data }) => {
      updateUser(data);
      setShowEdit(false);
      Toast.show({ type: 'success', text1: 'Профиль обновлён' });
    },
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleOwnerMode = () => {
    if (user?.role === 'venue_owner') {
      setActiveRole('venue_owner');
      router.replace('/(owner)');
    } else {
      Toast.show({ type: 'error', text1: 'Нет прав владельца площадки' });
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
          <View style={styles.avatarWrapper}>
            {user?.avatar
              ? <Image source={{ uri: user.avatar }} style={styles.avatar} />
              : <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitials}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
            }
            <View style={styles.avatarBadge}>
              <Zap size={16} color="#000" fill="#000" />
            </View>
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={COLORS.accent} />
            <Text style={styles.locationText}>{user?.city}</Text>
          </View>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>{user?.rank ?? t('profile.advanced')}</Text>
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
                  <Svg width={76} height={76} style={{ transform: [{ rotate: '-90deg' }] }}>
                    <SvgCircle cx={38} cy={38} r={r} stroke={COLORS.border} strokeWidth={8} fill="transparent" />
                    <SvgCircle
                      cx={38} cy={38} r={r}
                      stroke={COLORS.accent}
                      strokeWidth={8}
                      fill="transparent"
                      strokeDasharray={`${circ}`}
                      strokeDashoffset={`${offset}`}
                      strokeLinecap="round"
                    />
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
            { id: 'venues', label: t('profile.venues'), sub: 'История брони', Icon: Building2, onPress: () => {} },
            { id: 'settings', label: t('profile.settings'), sub: 'Приложение', Icon: Settings, onPress: () => {} },
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

          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>ИМЯ ИГРОКА</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor={COLORS.gray[600]}
            />
            <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>ГОРОД</Text>
            <TextInput
              style={styles.modalInput}
              value={editCity}
              onChangeText={setEditCity}
              placeholderTextColor={COLORS.gray[600]}
            />
            <TouchableOpacity
              style={[styles.modalSaveBtnFull, savingProfile && { opacity: 0.6 }]}
              onPress={() => saveProfile()}
              disabled={savingProfile}
            >
              <Text style={styles.modalSaveBtnText}>{savingProfile ? 'СОХРАНЯЕМ...' : 'СОХРАНИТЬ'}</Text>
            </TouchableOpacity>
          </View>
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
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: SPACING.sm },
  locationText: { fontFamily: FONTS.boldItalic, fontSize: 11, color: COLORS.gray[500], textTransform: 'uppercase', letterSpacing: 2 },
  rankBadge: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  rankText: { fontFamily: FONTS.blackItalic, fontSize: 11, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: 1 },

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
