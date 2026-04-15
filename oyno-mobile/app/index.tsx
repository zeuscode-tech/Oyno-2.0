import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { COLORS } from '@/constants/theme';

export default function Index() {
  const { isAuthenticated, isLoading, activeRole } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (activeRole === 'venue_owner') return <Redirect href="/(owner)" />;
  return <Redirect href="/(player)" />;
}
