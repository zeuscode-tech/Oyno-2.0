import type { ComponentType } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Home, User } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/theme';

function TabIcon({
  icon: Icon,
  label,
  focused,
}: {
  icon: ComponentType<any>;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabItem}>
      <Icon size={24} color={focused ? COLORS.accent : COLORS.gray[600]} strokeWidth={focused ? 3 : 2} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function PlayerLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={Home} label="Площадки" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={User} label="Профиль" focused={focused} /> }}
      />
      <Tabs.Screen name="booking" options={{ href: null }} />
      <Tabs.Screen name="venues/[id]" options={{ href: null }} />
      <Tabs.Screen name="games/index" options={{ href: null }} />
      <Tabs.Screen name="games/[id]" options={{ href: null }} />
      <Tabs.Screen name="chats/index" options={{ href: null }} />
      <Tabs.Screen name="chats/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(18,18,18,0.95)',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabItem: { alignItems: 'center', gap: 4 },
  tabLabel: {
    fontFamily: FONTS.blackItalic,
    fontSize: 8,
    color: COLORS.gray[600],
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tabLabelActive: { color: COLORS.accent },
});
