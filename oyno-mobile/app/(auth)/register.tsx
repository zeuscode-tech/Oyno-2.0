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
import { RegisterPayload } from '@/types';

function normalizePhone(input: string): string {
  return input.replace(/\s+/g, '').trim();
}

function extractRegisterError(e: any): string {
  const isTimeout = e?.code === 'ECONNABORTED';
  if (isTimeout) return 'Сервер долго отвечает. Попробуй еще раз.';

  if (!e?.response) {
    return 'Нет соединения с сервером. Проверь интернет и URL API.';
  }

  const data = e?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;

  const directKeys = ['detail', 'phone', 'password', 'name', 'non_field_errors'];
  for (const key of directKeys) {
    const value = data?.[key];
    if (Array.isArray(value) && value.length > 0) return String(value[0]);
    if (typeof value === 'string' && value.trim()) return value;
  }

  if (data && typeof data === 'object') {
    for (const value of Object.values(data)) {
      if (Array.isArray(value) && value.length > 0) return String(value[0]);
      if (typeof value === 'string' && value.trim()) return value;
    }
  }

  return 'Ошибка регистрации';
}

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { setUser, setTokens } = useAuthStore();

  const { mutate: register, isPending } = useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: async ({ data }) => {
      setUser(data.user);
      await setTokens(data.tokens);
      router.replace('/(player)');
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: extractRegisterError(e) });
    },
  });

  const onRegisterPress = () => {
    const preparedName = name.trim();
    const preparedPhone = normalizePhone(phone);
    const preparedPassword = password.trim();

    if (!preparedName || !preparedPhone || !preparedPassword) {
      Toast.show({ type: 'error', text1: 'Заполни все поля.' });
      return;
    }

    if (preparedPassword.length < 8) {
      Toast.show({ type: 'error', text1: 'Пароль должен быть минимум 8 символов.' });
      return;
    }

    register({
      name: preparedName,
      phone: preparedPhone,
      password: preparedPassword,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBlock}>
          <Text style={styles.logo}>OYNO</Text>
          <Text style={styles.logoSub}>РЕГИСТРАЦИЯ</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>ИМЯ ИГРОКА</Text>
          <TextInput
            style={styles.input}
            placeholder="Исхак"
            placeholderTextColor={COLORS.gray[600]}
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />

          <Text style={[styles.label, { marginTop: SPACING.md }]}>ТЕЛЕФОН</Text>
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
            placeholder="Минимум 8 символов"
            placeholderTextColor={COLORS.gray[600]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btnAccent, isPending && styles.btnDisabled]}
            onPress={onRegisterPress}
            disabled={isPending}
            activeOpacity={0.85}
          >
            <Text style={styles.btnAccentText}>
              {isPending ? 'РЕГИСТРИРУЕМ...' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnBack}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.btnBackText}>
              Уже есть аккаунт? <Text style={{ color: COLORS.accent }}>ВОЙТИ</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flexGrow: 1, padding: SPACING.lg, justifyContent: 'center' },
  logoBlock: { alignItems: 'center', marginBottom: SPACING.xxl },
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
  form: { gap: 4 },
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
  btnDisabled: { opacity: 0.6 },
  btnAccentText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 14,
    color: '#000',
    letterSpacing: 2,
  },
  btnBack: {
    borderRadius: RADIUS.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  btnBackText: {
    fontFamily: FONTS.boldItalic,
    fontSize: 12,
    color: COLORS.gray[500],
    letterSpacing: 1,
  },
});
