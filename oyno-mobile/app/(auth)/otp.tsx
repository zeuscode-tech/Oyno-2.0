import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { user, updateUser } = useAuthStore();
  const [code, setCode] = useState('');
  const inputRef = useRef<TextInput>(null);

  const { mutate: verify, isPending } = useMutation({
    mutationFn: () => authApi.verifyOtp(phone ?? '', code),
    onSuccess: ({ data }) => {
      if (data.verified) {
        updateUser({ phone_verified: true });
        router.replace(user?.role === 'venue_owner' ? '/(owner)' : '/(player)');
      } else {
        Toast.show({ type: 'error', text1: 'Неверный код подтверждения' });
        setCode('');
      }
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Неверный код', text2: 'Попробуйте ещё раз' });
      setCode('');
    },
  });

  const { mutate: resend, isPending: resending } = useMutation({
    mutationFn: () => authApi.sendOtp(phone ?? ''),
    onSuccess: () => Toast.show({ type: 'success', text1: 'Код отправлен повторно' }),
    onError: () => Toast.show({ type: 'error', text1: 'Ошибка отправки кода' }),
  });

  // Render code as 6 individual digit boxes
  const digits = code.padEnd(6, ' ').split('');

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoBlock}>
          <Text style={styles.logo}>OYNO</Text>
          <Text style={styles.logoSub}>ПОДТВЕРЖДЕНИЕ</Text>
        </View>

        <Text style={styles.desc}>
          Введи код из SMS, отправленного на{'\n'}
          <Text style={{ color: COLORS.accent }}>{phone}</Text>
        </Text>

        {/* OTP digit boxes — tap to focus hidden input */}
        <TouchableOpacity
          style={styles.boxesRow}
          onPress={() => inputRef.current?.focus()}
          activeOpacity={1}
        >
          {digits.map((d, i) => (
            <View
              key={i}
              style={[
                styles.box,
                i < code.length && styles.boxFilled,
                i === code.length && styles.boxActive,
              ]}
            >
              <Text style={styles.boxText}>{d.trim()}</Text>
            </View>
          ))}
        </TouchableOpacity>

        {/* Hidden text input captures keyboard */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={code}
          onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />

        {/* Confirm button */}
        <TouchableOpacity
          style={[
            styles.btnAccent,
            (isPending || code.length < 6) && styles.btnDisabled,
          ]}
          onPress={() => verify()}
          disabled={isPending || code.length < 6}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.btnAccentText}>ПОДТВЕРДИТЬ</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity
          style={styles.resendBtn}
          onPress={() => resend()}
          disabled={resending}
          activeOpacity={0.85}
        >
          <Text style={styles.resendText}>
            {resending ? 'Отправляем...' : 'Отправить код повторно'}
          </Text>
        </TouchableOpacity>

        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Назад</Text>
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
    fontSize: 14,
    color: COLORS.gray[400],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },

  boxesRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  box: {
    width: 48,
    height: 60,
    backgroundColor: COLORS.bgCard,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxFilled: { borderColor: COLORS.gray[400] },
  boxActive: { borderColor: COLORS.accent },
  boxText: {
    fontFamily: FONTS.blackItalic,
    fontSize: 24,
    color: COLORS.white,
  },

  // Zero-size hidden input
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
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

  resendBtn: { paddingVertical: 16, alignItems: 'center' },
  resendText: {
    fontFamily: FONTS.boldItalic,
    fontSize: 12,
    color: COLORS.gray[500],
    letterSpacing: 1,
  },

  backBtn: { paddingVertical: 12, alignItems: 'center' },
  backText: {
    fontFamily: FONTS.boldItalic,
    fontSize: 12,
    color: COLORS.accent,
    letterSpacing: 1,
  },
});
