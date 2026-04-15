import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { router } from 'expo-router';
import { User, LogOut, ChevronRight, Gamepad2 } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';

export default function OwnerProfileScreen() {
  const { user, logout, setActiveRole } = useAuthStore();

  const handleSwitchToPlayer = () => {
    setActiveRole('player');
    router.replace('/(player)');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>ПРОФИЛЬ</Text>

      {/* User info card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <User size={32} color={COLORS.accent} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name ?? '—'}</Text>
          <Text style={styles.userRole}>ВЛАДЕЛЕЦ ПЛОЩАДКИ</Text>
          <Text style={styles.userPhone}>{user?.phone}</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleSwitchToPlayer}
          activeOpacity={0.85}
        >
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(198,255,0,0.08)' }]}>
            <Gamepad2 size={20} color={COLORS.accent} />
          </View>
          <Text style={styles.menuLabel}>Режим игрока</Text>
          <ChevronRight size={16} color={COLORS.gray[600]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.menuItemDanger]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(239,83,80,0.08)' }]}>
            <LogOut size={20} color={COLORS.error} />
          </View>
          <Text style={[styles.menuLabel, { color: COLORS.error }]}>Выйти из профиля</Text>
          <ChevronRight size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.blackItalic,
    fontSize: 36,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -2,
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.sm,
    marginBottom: SPACING.lg,
  },

  userCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOW.card,
  },
  avatar: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  userInfo: { flex: 1 },
  userName: {
    fontFamily: FONTS.blackItalic,
    fontSize: 20,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  userRole: {
    fontFamily: FONTS.blackItalic,
    fontSize: 9,
    color: COLORS.accent,
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  userPhone: {
    fontFamily: FONTS.boldItalic,
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 4,
  },

  menu: { gap: 12 },
  menuItem: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOW.card,
  },
  menuItemDanger: { borderColor: 'rgba(239,83,80,0.15)' },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontFamily: FONTS.blackItalic,
    fontSize: 13,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -0.3,
  },
});
