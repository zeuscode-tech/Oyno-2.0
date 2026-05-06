import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { authApi } from '@/services/api';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const codeRef = useRef<TextInput>(null);

  const digits = code.padEnd(6, ' ').split('');

  const { mutate: reset, isPending } = useMutation({
    mutationFn: () => authApi.resetPassword(phone ?? '', code, newPassword),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Пароль изменён!', text2: 'Войди с новым паролем' });
      router.replace('/(auth)/login');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.detail ?? 'Неверный или истёкший код';
      Toast.show({ type: 'error', text1: msg });
      setCode('');
    },
  });

  const { mutate: resend, isPending: resending } = useMutation({
    mutationFn: () => authApi.forgotPassword(phone ?? ''),
    onSuccess: () => Toast.show({ type: 'success', text1: 'Код отправлен повторно' }),
  });

  const canSubmit = code.length === 6 && newPassword.length >= 8 && newPassword === confirmPassword;

  const onSubmit = () => {
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Пароли не совпадают' });
      return;
    }
    reset();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBlock}>
          <Text style={styles.logo}>OYNO</Text>
          <Text style={styles.logoSub}>НОВЫЙ ПАРОЛЬ</Text>
        </View>

        <Text style={styles.desc}>
          Введи код из SMS на{'\n'}
          <Text style={{ color: COLORS.accent }}>{phone}</Text>
        </Text>

        {/* OTP boxes */}
        <TouchableOpacity
          style={styles.boxesRow}
          onPress={() => codeRef.current?.focus()}
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
        <TextInput
          ref={codeRef}
          style={styles.hiddenInput}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />

        {/* New password */}
        <Text style={styles.label}>НОВЫЙ ПАРОЛЬ</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, { paddingRight: 56, marginBottom: 0 }]}
            placeholder="Минимум 8 символов"
            placeholderTextColor={COLORS.gray[600]}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNew}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew((v) => !v)} activeOpacity={0.7}>
            {showNew ? <EyeOff size={20} color={COLORS.gray[500]} /> : <Eye size={20} color={COLORS.gray[500]} />}
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>ПОВТОРИ ПАРОЛЬ</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.input,
              { paddingRight: 56, marginBottom: 0 },
              confirmPassword.length > 0 && newPassword !== confirmPassword && styles.inputError,
            ]}
            placeholder="Повтори пароль"
            placeholderTextColor={COLORS.gray[600]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm((v) => !v)} activeOpacity={0.7}>
            {showConfirm ? <EyeOff size={20} color={COLORS.gray[500]} /> : <Eye size={20} color={COLORS.gray[500]} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.btnAccent, (!canSubmit || isPending) && styles.btnDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit || isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.btnAccentText}>СМЕНИТЬ ПАРОЛЬ</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={() => resend()}
          disabled={resending}
        >
          <Text style={styles.resendText}>
            {resending ? 'Отправляем...' : 'Отправить код повторно'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flexGrow: 1, padding: SPACING.lg, justifyContent: 'center' },
  logoBlock: { alignItems: 'center', marginBottom: SPACING.lg },
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
    marginBottom: SPACING.lg,
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
  boxText: { fontFamily: FONTS.blackItalic, fontSize: 24, color: COLORS.white },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  label: {
    fontFamily: FONTS.blackItalic,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 3,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
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
    marginBottom: SPACING.md,
  },
  inputError: { borderColor: COLORS.error },
  btnAccent: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: SPACING.sm,
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
  resendBtn: { paddingVertical: 12, alignItems: 'center' },
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
