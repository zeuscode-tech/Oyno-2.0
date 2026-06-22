import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Building2, LogIn, LogOut, Phone, UserRound, X } from 'lucide-react-native';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, logout, setActiveRole, updateUser } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone] = useState(user?.phone ?? '');

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => authApi.updateProfile({ name: name.trim() }),
    onSuccess: ({ data }) => {
      updateUser(data);
      setEditOpen(false);
      Toast.show({ type: 'success', text1: 'Профиль обновлён' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Не удалось сохранить профиль' }),
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/(player)');
  };

  const switchToOwner = () => {
    if (user?.role === 'venue_owner') {
      setActiveRole('venue_owner');
      router.replace('/(owner)');
      return;
    }
    Toast.show({
      type: 'info',
      text1: 'Режим владельца',
      text2: 'Для подключения площадки напишите оператору OYNO.',
    });
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.guestBox}>
          <Text style={styles.title}>Профиль</Text>
          <Text style={styles.guestText}>
            Смотреть площадки можно без регистрации. Войдите, если хотите сохранить имя и телефон для заявок.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(auth)/login')}>
            <LogIn size={18} color="#000" />
            <Text style={styles.primaryText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Профиль</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase() || 'O'}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <View style={styles.infoRow}>
            <Phone size={15} color={COLORS.accent} />
            <Text style={styles.phone}>{user.phone}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.menuItem} onPress={() => setEditOpen(true)}>
          <UserRound size={22} color={COLORS.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Изменить имя</Text>
            <Text style={styles.menuSub}>Минимальный профиль для заявок</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={switchToOwner}>
          <Building2 size={22} color={COLORS.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Я владелец площадки</Text>
            <Text style={styles.menuSub}>Приём заявок и управление площадками</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={COLORS.error} />
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={editOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Имя</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setEditOpen(false)}>
              <X size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.label}>Как вас записать в заявке</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Имя"
              placeholderTextColor={COLORS.gray[600]}
            />
            <Text style={styles.staticPhone}>{phone}</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, (isPending || name.trim().length < 2) && { opacity: 0.5 }]}
              onPress={() => name.trim().length >= 2 && save()}
              disabled={isPending || name.trim().length < 2}
            >
              {isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryText}>Сохранить</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: 110 },
  title: { fontFamily: FONTS.blackItalic, fontSize: 34, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -1, marginBottom: SPACING.lg },
  guestBox: { flex: 1, justifyContent: 'center', padding: SPACING.lg },
  guestText: { fontFamily: FONTS.bold, fontSize: 14, lineHeight: 21, color: COLORS.gray[400], marginBottom: SPACING.xl },
  card: { alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.xl, marginBottom: SPACING.lg, ...SHADOW.card },
  avatar: { width: 92, height: 92, borderRadius: 28, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  avatarText: { fontFamily: FONTS.blackItalic, fontSize: 42, color: '#000' },
  name: { fontFamily: FONTS.blackItalic, fontSize: 28, color: COLORS.white, textTransform: 'uppercase' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  phone: { fontFamily: FONTS.bold, color: COLORS.gray[400], fontSize: 14 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.sm },
  menuTitle: { fontFamily: FONTS.blackItalic, fontSize: 14, color: COLORS.white, textTransform: 'uppercase' },
  menuSub: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: SPACING.lg, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(239,83,80,0.35)', paddingVertical: 16 },
  logoutText: { fontFamily: FONTS.blackItalic, fontSize: 12, color: COLORS.error, textTransform: 'uppercase', letterSpacing: 2 },
  primaryBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.xl, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, ...SHADOW.accent },
  primaryText: { fontFamily: FONTS.blackItalic, fontSize: 13, color: '#000', textTransform: 'uppercase', letterSpacing: 1.5 },
  modalRoot: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === 'ios' ? 20 : SPACING.lg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg },
  modalTitle: { fontFamily: FONTS.blackItalic, fontSize: 28, color: COLORS.white, textTransform: 'uppercase' },
  closeBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: SPACING.lg },
  label: { fontFamily: FONTS.blackItalic, fontSize: 10, color: COLORS.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 14, color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16, marginBottom: SPACING.md },
  staticPhone: { fontFamily: FONTS.bold, color: COLORS.gray[500], fontSize: 13, marginBottom: SPACING.xl },
});
