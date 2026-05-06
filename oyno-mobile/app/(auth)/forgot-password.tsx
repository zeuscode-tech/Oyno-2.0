import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { authApi } from '@/services/api';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';

const PHONE_PREFIX = '+996';

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState(PHONE_PREFIX);

  const handlePhoneChange = (val: string) => {
    if (!val.startsWith(PHONE_PREFIX)) {
      const digits = val.replace(/\D/g, '').slice(0, 9);
      setPhone(PHONE_PREFIX + digits);
      return;
    }
    const after = val.slice(PHONE_PREFIX.length).replace(/\D/g, '').slice(0, 9);
    setPhone(PHONE_PREFIX + after);
  };

  const { mutate: send, isPending } = useMutation({
    mutationFn: () => authApi.forgotPassword(phone),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Код отправлен!', text2: `SMS на ${phone}` });
      router.push({ pathname: '/(auth)/reset-password', params: { phone } });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.phone?.[0]
        ?? e?.response?.data?.detail
        ?? 'Номер не найден';
      Toast.show({ type: 'error', text1: msg });
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.logoBlock}>
          <Text style={styles.logo}>OYNO</Text>
          <Text style={styles.logoSub}>ВОССТАНОВЛЕНИЕ ПАРОЛЯ</Text>
        </View>

        <Text style={styles.desc}>
          Введи номер телефона, привязанный к аккаунту.{'\n'}
          Мы отправим код для сброса пароля.
        </Text>

        <Text style={styles.label}>ТЕЛЕФОН</Text>
        <TextInput
          style={styles.input}
          placeholder="+996 700 000 000"
          placeholderTextColor={COLORS.gray[600]}
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          autoComplete="tel"
          autoFocus
        />

        <TouchableOpacity
          style={[styles.btnAccent, (isPending || phone.length < PHONE_PREFIX.length + 9) && styles.btnDisabled]}
          onPress={() => phone.length >= PHONE_PREFIX.length + 9 && send()}
          disabled={isPending || phone.length < PHONE_PREFIX.length + 9}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.btnAccentText}>ОТПРАВИТЬ КОД</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Назад к входу</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1, padding: SPACING.lg, justifyContent: 'center' },
  logoBlock: { alignItems: 'center', marginBottom: SPACING.xl },
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
  desc: {
    fontFamily: FONTS.boldItalic,
    fontSize: 13,
    color: COLORS.gray[400],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
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
    marginBottom: SPACING.lg,
  },
  btnAccent: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.accent,
  },
  btnDisabled: { opacity: 0.4 },
  btnAccentText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 14,
    color: '#000',
    letterSpacing: 2,
  },
  backBtn: { paddingVertical: 14, alignItems: 'center' },
  backText: {
    fontFamily: FONTS.boldItalic,
    fontSize: 12,
    color: COLORS.accent,
    letterSpacing: 1,
  },
});
