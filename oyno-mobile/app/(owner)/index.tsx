import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, DollarSign, CalendarDays,
  BarChart2, Users, ArrowRight, Zap,
} from 'lucide-react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { ownerApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '@/constants/theme';
import { DashboardPeriod } from '@/types';
import { t } from '@/constants/i18n';

const { width } = Dimensions.get('window');
const CHART_W = width - SPACING.lg * 2 - 32;
const CHART_H = 120;

export default function OwnerDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('week');
  const { user, setActiveRole } = useAuthStore();

  const { data: statsRes, isLoading } = useQuery({
    queryKey: ['owner-stats', period],
    queryFn: () => ownerApi.dashboardStats(period),
  });

  const { data: chartRes } = useQuery({
    queryKey: ['owner-chart', period === 'today' ? 'week' : period],
    queryFn: () => ownerApi.revenueChart(period === 'today' ? 'week' : period),
  });

  const stats = statsRes?.data;
  const chart = chartRes?.data;

  const switchToPlayer = () => {
    setActiveRole('player');
    router.replace('/(player)');
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Привет, {user?.name?.split(' ')[0]}</Text>
            <Text style={styles.title}>{t('owner.dashboard')}</Text>
          </View>
          <TouchableOpacity style={styles.switchBtn} onPress={switchToPlayer}>
            <Zap size={16} color="#000" />
            <Text style={styles.switchBtnText}>ИГРОК</Text>
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(['today', 'week', 'month'] as DashboardPeriod[]).map((p) => {
            const labels = { today: t('owner.today'), week: t('owner.week'), month: t('owner.month') };
            return (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodBtnText, period === p && { color: '#000' }]}>
                  {labels[p].toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon={DollarSign}
            label={t('owner.revenue')}
            value={stats ? `${stats.revenue.toLocaleString('ru')} сом` : '–'}
            change={stats?.revenue_change ?? 0}
          />
          <StatCard
            icon={CalendarDays}
            label={t('owner.bookings')}
            value={String(stats?.bookings ?? '–')}
            change={stats?.bookings_change ?? 0}
          />
          <StatCard
            icon={BarChart2}
            label={t('owner.occupancy')}
            value={stats ? `${stats.occupancy}%` : '–'}
            change={stats?.occupancy_change ?? 0}
          />
          <StatCard
            icon={Users}
            label="Площадки"
            value={String(stats?.active_venues ?? '–')}
            change={0}
            noChange
          />
        </View>

        {/* Revenue Chart */}
        {chart && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              Выручка / <Text style={{ color: COLORS.accent }}>{period === 'week' ? 'Неделя' : 'Месяц'}</Text>
            </Text>
            <RevenueBarChart labels={chart.labels} values={chart.values} />
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>БЫСТРЫЕ ДЕЙСТВИЯ</Text>
        <View style={styles.actionsRow}>
          {[
            { label: 'Добавить площадку', icon: '🏟', route: '/(owner)/venues' as const },
            { label: 'Просмотр броней', icon: '📅', route: '/(owner)/bookings' as const },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionCard}
              onPress={() => router.push(a.route)}
              activeOpacity={0.85}
            >
              <Text style={styles.actionEmoji}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <ArrowRight size={16} color={COLORS.accent} />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon: Icon, label, value, change, noChange }: {
  icon: any; label: string; value: string; change: number; noChange?: boolean;
}) {
  const isPositive = change >= 0;
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <View style={styles.statIconWrapper}>
          <Icon size={18} color={COLORS.accent} />
        </View>
        {!noChange && (
          <View style={[styles.changeBadge, isPositive ? styles.changePos : styles.changeNeg]}>
            {isPositive
              ? <TrendingUp size={10} color="#000" />
              : <TrendingDown size={10} color="#fff" />}
            <Text style={[styles.changeText, !isPositive && { color: '#fff' }]}>
              {Math.abs(change)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.statCardValue}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

function RevenueBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values, 1);
  const barW = (CHART_W - (labels.length - 1) * 8) / labels.length;

  return (
    <Svg width={CHART_W} height={CHART_H + 24} style={{ marginTop: 12 }}>
      {values.map((v, i) => {
        const barH = (v / max) * CHART_H;
        const x = i * (barW + 8);
        const y = CHART_H - barH;
        return (
          <React.Fragment key={i}>
            <Rect
              x={x} y={y}
              width={barW} height={barH}
              rx={6}
              fill={i === values.length - 1 ? COLORS.accent : COLORS.border}
            />
            <SvgText
              x={x + barW / 2} y={CHART_H + 18}
              textAnchor="middle"
              fontSize={9}
              fill={COLORS.gray[600]}
              fontFamily={FONTS.blackItalic}
            >
              {labels[i]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// Need React import for Fragment in SVG
import React from 'react';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  greeting: { fontFamily: FONTS.boldItalic, fontSize: 12, color: COLORS.gray[500], textTransform: 'uppercase', letterSpacing: 2 },
  title: { fontFamily: FONTS.blackItalic, fontSize: 28, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -1 },
  switchBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...SHADOW.accent,
  },
  switchBtnText: { fontFamily: FONTS.blackItalic, fontSize: 11, color: '#000', letterSpacing: 1 },

  // Period
  periodRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md },
  periodBtnActive: { backgroundColor: COLORS.accent, ...SHADOW.accent },
  periodBtnText: { fontFamily: FONTS.blackItalic, fontSize: 10, color: COLORS.gray[400], letterSpacing: 1 },

  // Stats Grid
  statsGrid: {
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statIconWrapper: { width: 36, height: 36, backgroundColor: COLORS.bg, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  changeBadge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 3 },
  changePos: { backgroundColor: COLORS.accent },
  changeNeg: { backgroundColor: COLORS.error },
  changeText: { fontFamily: FONTS.blackItalic, fontSize: 9, color: '#000' },
  statCardValue: { fontFamily: FONTS.blackItalic, fontSize: 22, color: COLORS.white, letterSpacing: -1 },
  statCardLabel: { fontFamily: FONTS.boldItalic, fontSize: 10, color: COLORS.gray[500], textTransform: 'uppercase', marginTop: 2 },

  // Chart
  chartCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    ...SHADOW.card,
  },
  chartTitle: { fontFamily: FONTS.blackItalic, fontSize: 16, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -0.5 },

  // Quick Actions
  sectionTitle: {
    fontFamily: FONTS.blackItalic,
    fontSize: 11,
    color: COLORS.accent,
    letterSpacing: 3,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  actionsRow: { paddingHorizontal: SPACING.lg, gap: 10 },
  actionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  actionEmoji: { fontSize: 24 },
  actionLabel: { flex: 1, fontFamily: FONTS.blackItalic, fontSize: 14, color: COLORS.white, textTransform: 'uppercase', letterSpacing: -0.5 },
});
