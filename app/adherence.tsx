import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { Meal, Nutrition, UserGoals } from '../types';
import { getRecentMeals } from '../services/firebase';
import { format, subDays, startOfDay, differenceInCalendarDays } from 'date-fns';

const { width } = Dimensions.get('window');

const MIN_DAYS_FOR_ANALYSIS = 3;

type Period = 'semana' | 'mes' | '3-meses';
type DayStatus = 'good' | 'ok' | 'missed';

interface AdherenceMetrics {
  overallScore: number;
  calorieScore: number;
  proteinScore: number;
  consistencyScore: number;
  currentStreak: number;
  longestStreak: number;
  dailyStatus: { label: string; status: DayStatus }[];
  monthlyDays: { day: number; status: DayStatus }[];
  trend: number[];
  tips: string[];
  daysLogged: number;
  totalDays: number;
}

// ── Helpers ──────────────────────────────────────────────

function sumDayNutrition(meals: Meal[]): Nutrition {
  return meals.reduce(
    (total, m) => ({
      calories: total.calories + (m.nutrition?.calories || 0),
      protein: total.protein + (m.nutrition?.protein || 0),
      carbs: total.carbs + (m.nutrition?.carbs || 0),
      fat: total.fat + (m.nutrition?.fat || 0),
      fiber: total.fiber + (m.nutrition?.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

function getDayStatus(dayNutrition: Nutrition, goals: UserGoals): DayStatus {
  const calRatio = goals.calories > 0 ? dayNutrition.calories / goals.calories : 0;
  const protRatio = goals.protein > 0 ? dayNutrition.protein / goals.protein : 0;
  // "good" = within ±15% for both cals and protein
  const calOk = calRatio >= 0.85 && calRatio <= 1.15;
  const protOk = protRatio >= 0.85;
  if (calOk && protOk) return 'good';
  if (calOk || protOk) return 'ok';
  return 'missed';
}

function adherencePercent(actual: number, goal: number): number {
  if (goal <= 0) return 0;
  const deviation = Math.abs(1 - actual / goal);
  return Math.min(100, Math.max(0, Math.round((1 - deviation) * 100)));
}

function periodToDays(period: Period): number {
  if (period === 'semana') return 7;
  if (period === 'mes') return 30;
  return 90;
}

function generateTips(
  calorieScore: number,
  proteinScore: number,
  consistencyScore: number,
  daysLogged: number,
  totalDays: number,
  t: any,
): string[] {
  const tips: string[] = [];
  if (proteinScore >= 80)
    tips.push(t('adherence.tipProteinExcellent'));
  else if (proteinScore < 60)
    tips.push(t('adherence.tipAddProtein'));
  if (consistencyScore < 70)
    tips.push(t('adherence.tipLogDaily'));
  if (calorieScore >= 80)
    tips.push(t('adherence.tipGoodCalories'));
  else if (calorieScore < 60)
    tips.push(t('adherence.tipReviewPortions'));
  if (daysLogged >= totalDays * 0.8)
    tips.push(t('adherence.tipGreatConsistency'));
  return tips;
}

// ── Component ────────────────────────────────────────────

export default function AdherenceScreen() {
  const C = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const [period, setPeriod] = useState<Period>('semana');
  const [metrics, setMetrics] = useState<AdherenceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [insufficientData, setInsufficientData] = useState(false);

  const periods: { id: Period; label: string }[] = [
    { id: 'semana', label: t('adherence.week') },
    { id: 'mes', label: t('adherence.month') },
    { id: '3-meses', label: t('adherence.threeMonths') },
  ];

  useEffect(() => {
    if (user?.uid) {
      calculateAdherence();
    } else {
      setLoading(false);
      setInsufficientData(true);
    }
  }, [period, user?.uid]);

  const calculateAdherence = async () => {
    try {
      setLoading(true);
      setInsufficientData(false);

      const userId = user!.uid;
      const goals = user!.goals;
      const totalDays = periodToDays(period);

      // Fetch meals for the selected period
      const meals = await getRecentMeals(userId, totalDays);

      // Group meals by day
      const byDay = new Map<string, Meal[]>();
      for (const meal of meals) {
        const key = format(meal.timestamp, 'yyyy-MM-dd');
        const existing = byDay.get(key) || [];
        existing.push(meal);
        byDay.set(key, existing);
      }

      const daysLogged = byDay.size;

      if (daysLogged < MIN_DAYS_FOR_ANALYSIS) {
        setInsufficientData(true);
        setLoading(false);
        return;
      }

      // Compute per-day adherence
      const dailyAdherences: { date: string; calAdh: number; protAdh: number; status: DayStatus }[] = [];
      byDay.forEach((dayMeals, dateKey) => {
        const nutrition = sumDayNutrition(dayMeals);
        dailyAdherences.push({
          date: dateKey,
          calAdh: adherencePercent(nutrition.calories, goals.calories),
          protAdh: adherencePercent(nutrition.protein, goals.protein),
          status: getDayStatus(nutrition, goals),
        });
      });

      // Scores = average adherence across logged days
      const calorieScore = Math.round(
        dailyAdherences.reduce((s, d) => s + d.calAdh, 0) / dailyAdherences.length
      );
      const proteinScore = Math.round(
        dailyAdherences.reduce((s, d) => s + d.protAdh, 0) / dailyAdherences.length
      );
      const consistencyScore = Math.round((daysLogged / totalDays) * 100);
      const overallScore = Math.round((calorieScore + proteinScore + consistencyScore) / 3);

      // Streaks: consecutive days (from today going back) with at least 1 logged meal
      const today = startOfDay(new Date());
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      // Build a set of logged date keys
      const loggedDates = new Set(byDay.keys());

      for (let i = 0; i < totalDays; i++) {
        const d = subDays(today, i);
        const key = format(d, 'yyyy-MM-dd');
        if (loggedDates.has(key)) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
          if (i === currentStreak) currentStreak++; // only counts if unbroken from today
        } else {
          tempStreak = 0;
        }
      }

      // Weekly heatmap (last 7 days)
      const dayLabels = [
        t('mealPlan.dayMon'),
        t('mealPlan.dayTue'),
        t('mealPlan.dayWed'),
        t('mealPlan.dayThu'),
        t('mealPlan.dayFri'),
        t('mealPlan.daySat'),
        t('mealPlan.daySun'),
      ];
      const dailyStatus: { label: string; status: DayStatus }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        const key = format(d, 'yyyy-MM-dd');
        const dayMeals = byDay.get(key);
        let status: DayStatus = 'missed';
        if (dayMeals && dayMeals.length > 0) {
          status = getDayStatus(sumDayNutrition(dayMeals), goals);
        }
        // Day of week: 0=Sunday in JS, shift to Mon-first
        const jsDay = d.getDay(); // 0=Sun
        const label = dayLabels[(jsDay + 6) % 7]; // Mon=0
        dailyStatus.push({ label, status });
      }

      // Monthly days (for calendar view)
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const monthlyDays: { day: number; status: DayStatus }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(now.getFullYear(), now.getMonth(), d);
        if (date > now) {
          // Future days
          monthlyDays.push({ day: d, status: 'missed' });
          continue;
        }
        const key = format(date, 'yyyy-MM-dd');
        const dayMeals = byDay.get(key);
        if (dayMeals && dayMeals.length > 0) {
          monthlyDays.push({ day: d, status: getDayStatus(sumDayNutrition(dayMeals), goals) });
        } else {
          monthlyDays.push({ day: d, status: 'missed' });
        }
      }

      // Simple trend: split the period into 7 equal segments, compute score per segment
      const sortedDates = [...dailyAdherences].sort((a, b) => a.date.localeCompare(b.date));
      const segmentSize = Math.max(1, Math.ceil(sortedDates.length / 7));
      const trend: number[] = [];
      for (let i = 0; i < sortedDates.length; i += segmentSize) {
        const segment = sortedDates.slice(i, i + segmentSize);
        const avgAdh = Math.round(
          segment.reduce((s, d) => s + (d.calAdh + d.protAdh) / 2, 0) / segment.length
        );
        trend.push(avgAdh);
      }

      const tips = generateTips(calorieScore, proteinScore, consistencyScore, daysLogged, totalDays, t);

      setMetrics({
        overallScore,
        calorieScore,
        proteinScore,
        consistencyScore,
        currentStreak,
        longestStreak,
        dailyStatus,
        monthlyDays,
        trend,
        tips,
        daysLogged,
        totalDays,
      });
    } catch (error) {
      console.error('Error calculating adherence:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 75) return C.success;
    if (score >= 50) return C.warning;
    return C.error;
  };

  const getDayStatusColor = (status: DayStatus): string => {
    switch (status) {
      case 'good':
        return C.success;
      case 'ok':
        return C.warning;
      case 'missed':
        return C.border;
      default:
        return C.border;
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>{t('adherence.loading')}</Text>
      </View>
    );
  }

  // ── Insufficient data state ──
  if (insufficientData || !metrics) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="bar-chart-outline" size={64} color={C.textSecondary} />
        <Text style={styles.emptyTitle}>{t('adherence.insufficientData')}</Text>
        <Text style={styles.emptySubtitle}>
          {t('adherence.insufficientDataMsg', { days: MIN_DAYS_FOR_ANALYSIS })}
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/(tabs)')}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>{t('adherence.logMeal')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('adherence.title')}</Text>
        <Text style={styles.subtitle}>
          {t('adherence.subtitle')}
        </Text>
      </View>

      {/* Overall Score Ring */}
      <View style={styles.scoreSection}>
        <View
          style={[
            styles.scoreRing,
            { borderColor: getScoreColor(metrics.overallScore) },
          ]}
        >
          <Text
            style={[
              styles.scoreValue,
              { color: getScoreColor(metrics.overallScore) },
            ]}
          >
            {metrics.overallScore}
          </Text>
          <Text style={styles.scoreLabel}>{t('adherence.score')}</Text>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.periodButton,
              period === p.id && styles.periodButtonActive,
            ]}
            onPress={() => setPeriod(p.id)}
          >
            <Text
              style={[
                styles.periodText,
                period === p.id && styles.periodTextActive,
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Score Breakdown */}
      <View style={styles.breakdownSection}>
        <Text style={styles.sectionTitle}>{t('adherence.scoreBreakdown')}</Text>

        <ScoreBreakdownCard
          icon="flame"
          label={t('adherence.calories')}
          score={metrics.calorieScore}
          description={t('adherence.caloriesDesc')}
          color={getScoreColor(metrics.calorieScore)}
        />

        <ScoreBreakdownCard
          icon="barbell"
          label={t('adherence.protein')}
          score={metrics.proteinScore}
          description={t('adherence.proteinDesc')}
          color={getScoreColor(metrics.proteinScore)}
        />

        <ScoreBreakdownCard
          icon="checkmark-circle"
          label={t('adherence.logging')}
          score={metrics.consistencyScore}
          description={t('adherence.loggingDesc', { logged: metrics.daysLogged, total: metrics.totalDays })}
          color={getScoreColor(metrics.consistencyScore)}
        />
      </View>

      {/* Daily Heatmap */}
      {period === 'semana' && (
        <View style={styles.heatmapSection}>
          <Text style={styles.sectionTitle}>{t('adherence.last7Days')}</Text>
          <View style={styles.heatmapWeek}>
            {metrics.dailyStatus.map((dayInfo, index) => (
              <View key={index} style={styles.heatmapDayContainer}>
                <View
                  style={[
                    styles.heatmapDay,
                    { backgroundColor: getDayStatusColor(dayInfo.status) },
                  ]}
                />
                <Text style={styles.heatmapDayLabel}>{dayInfo.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.success }]} />
              <Text style={styles.legendText}>{t('adherence.met')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.warning }]} />
              <Text style={styles.legendText}>{t('adherence.partial')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.border }]} />
              <Text style={styles.legendText}>{t('adherence.noLog')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Monthly Calendar */}
      {period === 'mes' && (
        <View style={styles.heatmapSection}>
          <Text style={styles.sectionTitle}>{t('adherence.monthlyCalendar')}</Text>
          <View style={styles.monthlyCalendar}>
            {Array.from({ length: Math.ceil(metrics.monthlyDays.length / 7) }).map((_, weekIndex) => (
              <View key={weekIndex} style={styles.calendarWeek}>
                {metrics.monthlyDays
                  .slice(weekIndex * 7, (weekIndex + 1) * 7)
                  .map((dayData) => (
                    <View
                      key={dayData.day}
                      style={styles.calendarDayContainer}
                    >
                      <View
                        style={[
                          styles.calendarDay,
                          { backgroundColor: getDayStatusColor(dayData.status) },
                        ]}
                      />
                      <Text style={styles.calendarDayNumber}>{dayData.day}</Text>
                    </View>
                  ))}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Streak Info */}
      <View style={styles.streakSection}>
        <Text style={styles.sectionTitle}>{t('adherence.streak')}</Text>
        <View style={styles.streakContainer}>
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakLabel}>{t('adherence.currentStreak')}</Text>
            <Text style={styles.streakNumber}>{metrics.currentStreak}</Text>
            <Text style={styles.streakUnit}>{t('common.days')}</Text>
          </View>
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>⭐</Text>
            <Text style={styles.streakLabel}>{t('adherence.bestStreak')}</Text>
            <Text style={styles.streakNumber}>{metrics.longestStreak}</Text>
            <Text style={styles.streakUnit}>{t('common.days')}</Text>
          </View>
        </View>
      </View>

      {/* Trend Chart */}
      {metrics.trend.length >= 2 && (
        <View style={styles.trendSection}>
          <Text style={styles.sectionTitle}>{t('adherence.consistencyTrend')}</Text>
          <View style={styles.trendChart}>
            <TrendChart data={metrics.trend} color={C.primary} />
          </View>
        </View>
      )}

      {/* Tips Section */}
      {metrics.tips.length > 0 && (
        <View style={styles.tipsSection}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={24} color={C.warning} />
            <Text style={styles.sectionTitle}>{t('adherence.tips')}</Text>
          </View>
          {metrics.tips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer Spacing */}
      <View style={styles.footerSpacing} />
    </ScrollView>
  );
}

// ── Sub-components ───────────────────────────────────────

interface ScoreBreakdownCardProps {
  icon: string;
  label: string;
  score: number;
  description: string;
  color: string;
}

function ScoreBreakdownCard({
  icon,
  label,
  score,
  description,
  color,
}: ScoreBreakdownCardProps) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <View style={s.breakdownCard}>
      <View style={s.breakdownLeft}>
        <View style={[s.breakdownIcon, { backgroundColor: color }]}>
          <Ionicons name={icon as any} size={20} color={C.background} />
        </View>
        <View style={s.breakdownText}>
          <Text style={s.breakdownLabel}>{label}</Text>
          <Text style={s.breakdownDescription}>{description}</Text>
        </View>
      </View>
      <View style={[s.breakdownScore, { borderColor: color }]}>
        <Text style={[s.breakdownScoreValue, { color }]}>{score}%</Text>
      </View>
    </View>
  );
}

interface TrendChartProps {
  data: number[];
  color: string;
}

function TrendChart({ data, color }: TrendChartProps) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const chartWidth = width - 32;
  const chartHeight = 120;
  const maxScore = Math.max(...data, 100);
  const points = data.map((value, index) => {
    const x = data.length > 1 ? (index / (data.length - 1)) * chartWidth : chartWidth / 2;
    const y = chartHeight - (value / maxScore) * chartHeight;
    return { x, y, value };
  });

  return (
    <View style={s.chartContainer}>
      <View style={s.chartAxis}>
        <Text style={s.axisLabel}>100</Text>
      </View>
      <View style={s.chartAxis}>
        <Text style={s.axisLabel}>50</Text>
      </View>
      <View style={s.chartAxis}>
        <Text style={s.axisLabel}>0</Text>
      </View>
      <View style={s.chartContent}>
        {points.map((point, index) => (
          <View
            key={index}
            style={[
              s.chartPoint,
              { left: point.x, top: point.y, backgroundColor: color },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: C.textSecondary,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: C.text,
      marginTop: 16,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      color: C.textSecondary,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 24,
      gap: 8,
    },
    emptyButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: C.text,
    },
    subtitle: {
      fontSize: 14,
      color: C.textSecondary,
      marginTop: 4,
      lineHeight: 20,
    },
    scoreSection: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    scoreRing: {
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scoreValue: {
      fontSize: 52,
      fontWeight: '800',
    },
    scoreLabel: {
      fontSize: 14,
      color: C.textSecondary,
      marginTop: 4,
    },
    periodSelector: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 24,
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 4,
      gap: 4,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    periodButtonActive: {
      backgroundColor: C.primary,
    },
    periodText: {
      fontSize: 13,
      fontWeight: '600',
      color: C.textSecondary,
      textAlign: 'center',
    },
    periodTextActive: {
      color: C.background,
    },
    breakdownSection: {
      marginHorizontal: 16,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: C.text,
      marginBottom: 12,
    },
    breakdownCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      justifyContent: 'space-between',
    },
    breakdownLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    breakdownIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    breakdownText: {
      flex: 1,
    },
    breakdownLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: C.text,
    },
    breakdownDescription: {
      fontSize: 11,
      color: C.textSecondary,
      marginTop: 2,
    },
    breakdownScore: {
      width: 50,
      height: 50,
      borderRadius: 12,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    breakdownScoreValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    heatmapSection: {
      marginHorizontal: 16,
      marginBottom: 24,
    },
    heatmapWeek: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    heatmapDayContainer: {
      alignItems: 'center',
      flex: 1,
    },
    heatmapDay: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 8,
      marginBottom: 8,
    },
    heatmapDayLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: C.textSecondary,
    },
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginTop: 12,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 11,
      color: C.textSecondary,
    },
    monthlyCalendar: {
      gap: 8,
    },
    calendarWeek: {
      flexDirection: 'row',
      gap: 4,
      justifyContent: 'space-between',
    },
    calendarDayContainer: {
      flex: 1,
      alignItems: 'center',
    },
    calendarDay: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 6,
      marginBottom: 4,
    },
    calendarDayNumber: {
      fontSize: 9,
      fontWeight: '500',
      color: C.textSecondary,
    },
    streakSection: {
      marginHorizontal: 16,
      marginBottom: 24,
    },
    streakContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    streakCard: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    streakEmoji: {
      fontSize: 32,
      marginBottom: 8,
    },
    streakLabel: {
      fontSize: 12,
      color: C.textSecondary,
      marginBottom: 4,
    },
    streakNumber: {
      fontSize: 28,
      fontWeight: '700',
      color: C.primary,
    },
    streakUnit: {
      fontSize: 12,
      color: C.textSecondary,
      marginTop: 4,
    },
    trendSection: {
      marginHorizontal: 16,
      marginBottom: 24,
    },
    trendChart: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 12,
      height: 150,
    },
    chartContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    chartAxis: {
      width: 30,
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    axisLabel: {
      fontSize: 10,
      color: C.textSecondary,
    },
    chartContent: {
      flex: 1,
      position: 'relative',
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      marginLeft: 8,
    },
    chartPoint: {
      width: 8,
      height: 8,
      borderRadius: 4,
      position: 'absolute',
      marginLeft: -4,
      marginTop: -4,
    },
    tipsSection: {
      marginHorizontal: 16,
      marginBottom: 24,
    },
    tipsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      gap: 10,
    },
    tipDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: C.warning,
      marginTop: 8,
    },
    tipText: {
      fontSize: 14,
      fontWeight: '500',
      color: C.text,
      flex: 1,
    },
    errorText: {
      fontSize: 16,
      color: C.error,
      textAlign: 'center',
    },
    footerSpacing: {
      height: 40,
    },
  });
}
