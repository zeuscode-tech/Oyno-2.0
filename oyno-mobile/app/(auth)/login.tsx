import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { t } from '@/constants/i18n';
import { LoginPayload } from '@/types';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { setUser, setTokens } = useAuthStore();

  const { mutate: login, isPending } = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: async ({ data }) => {
      setUser(data.user);
      await setTokens(data.tokens);
      router.replace(
        data.user.role === 'venue_owner' ? '/(owner)' : '/(player)'
      );
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Неверный телефон или пароль' });
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoBlock}>
          <Text style={styles.logo}>OYNO</Text>
          <Text style={styles.logoSub}>СПОРТИВНОЕ СООБЩЕСТВО</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>ТЕЛЕФОН</Text>
          <TextInput
            style={styles.input}
            placeholder="+996 700 000 000"
            placeholderTextColor={COLORS.gray[600]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />

          <Text style={[styles.label, { marginTop: SPACING.md }]}>ПАРОЛЬ</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.gray[600]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btnAccent, isPending && styles.btnDisabled]}
            onPress={() => login({ phone, password })}
            disabled={isPending}
            activeOpacity={0.85}
          >
            <Text style={styles.btnAccentText}>
              {isPending ? 'ВХОДИМ...' : t('auth.login').toUpperCase()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnOutlineText}>
              {t('auth.noAccount')} <Text style={{ color: COLORS.accent }}>СОЗДАТЬ</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  inner: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logo: {
    fontFamily: FONTS.blackItalic,
    fontSize: 72,
    color: COLORS.accent,
    lineHeight: 72,
    letterSpacing: -4,
  },
  logoSub: {
    fontFamily: FONTS.blackItalic,
    fontSize: 10,
    color: COLORS.gray[500],
    letterSpacing: 4,
    marginTop: 4,
  },
  form: {
    gap: 4,
  },
  label: {
    fontFamily: FONTS.blackItalic,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 3,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 18,
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 14,
    marginBottom: 4,
  },
  btnAccent: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: SPACING.lg,
    ...SHADOW.accent,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnAccentText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 14,
    color: '#000',
    letterSpacing: 2,
  },
  btnOutline: {
    borderRadius: RADIUS.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  btnOutlineText: {
    fontFamily: FONTS.boldItalic,
    fontSize: 12,
    color: COLORS.gray[500],
    letterSpacing: 1,
  },
});
