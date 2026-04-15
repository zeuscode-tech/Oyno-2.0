import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart2, Building2, CalendarDays, User } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/theme';

function TabIcon({ icon: Icon, label, focused }: { icon: any; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Icon size={24} color={focused ? COLORS.accent : COLORS.gray[600]} strokeWidth={focused ? 3 : 2} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function OwnerLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={BarChart2} label="Дашборд" focused={focused} /> }}
      />
      <Tabs.Screen
        name="venues"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={Building2} label="Площадки" focused={focused} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={CalendarDays} label="Брони" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={User} label="Профиль" focused={focused} /> }}
      />
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
  tabLabel: { fontFamily: FONTS.blackItalic, fontSize: 8, color: COLORS.gray[600], letterSpacing: 1, textTransform: 'uppercase' },
  tabLabelActive: { color: COLORS.accent },
});
