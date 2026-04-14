import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import { useMealStore } from '../store/mealStore';
import { useUserStore } from '../store/userStore';
import { useWeightStore } from '../store/weightStore';
import { Meal, Nutrition, UserGoals } from '../types';
import { getRecentMeals } from '../services/firebase';
import { startOfDay, subDays, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

const { width } = Dimensions.get('window');

const MIN_DAYS_FOR_ANALYSIS = 3;

interface WeeklyMetrics {
  avgCalories: number;
  avgProtein: number;
  daysLogged: number;
  weightChange: number | null;
  calorieAdherence: number;
  proteinAdherence: number;
  consistency: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  wins: string[];
  improvements: string[];
  dailyCalories: { day: string; calories: number }[];
}

// ── Helpers ──────────────────────────────────────────────

function groupMealsByDay(meals: Meal[]): Map<string, Meal[]> {
  const groups = new Map<string, Meal[]>();
  for (const meal of meals) {
    const key = format(meal.timestamp, 'yyyy-MM-dd');
    const existing = groups.get(key) || [];
    existing.push(meal);
    groups.set(key, existing);
  }
  return groups;
}

function sumNutrition(meals: Meal[]): Nutrition {
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

function calculateAdherencePercent(actual: number, goal: number): number {
  if (goal <= 0) return 0;
  // How close to goal: 100% if exact, decreases as you go over or under
  const ratio = actual / goal;
  // Within ±15% of goal = good adherence range
  const deviation = Math.abs(1 - ratio);
  const adherence = Math.max(0, Math.round((1 - deviation) * 100));
  return Math.min(100, adherence);
}

function computeGrade(calorieAdh: number, proteinAdh: number, consistency: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  const avg = (calorieAdh + proteinAdh + consistency) / 3;
  if (avg >= 85) return 'A';
  if (avg >= 70) return 'B';
  if (avg >= 55) return 'C';
  if (avg >= 40) return 'D';
  return 'F';
}

function generateWins(
  daysLogged: number,
  calorieAdh: number,
  proteinAdh: number,
  avgProtein: number,
  goals: UserGoals,
  t: any,
): string[] {
  const wins: string[] = [];
  if (daysLogged >= 5)
    wins.push(t('weeklyCoach.wins'));
  else if (daysLogged >= 3)
    wins.push(t('weeklyCoach.wins'));
  if (calorieAdh >= 85)
    wins.push(t('weeklyCoach.wins'));
  if (proteinAdh >= 85)
    wins.push(t('weeklyCoach.wins'));
  if (wins.length === 0)
    wins.push(t('weeklyCoach.wins'));
  return wins;
}

function generateImprovements(
  daysLogged: number,
  calorieAdh: number,
  proteinAdh: number,
  avgProtein: number,
  goals: UserGoals,
  dailyCalories: { day: string; calories: number }[],
  t: any,
): string[] {
  const improvements: string[] = [];
  if (daysLogged < 5)
    improvements.push(t('weeklyCoach.improvements'));
  if (calorieAdh < 70)
    improvements.push(t('weeklyCoach.improvements'));
  if (proteinAdh < 70 && goals.protein > 0)
    improvements.push(t('weeklyCoach.improvements'));

  // Find the day with highest calories
  if (dailyCalories.length >= 2) {
    const sorted = [...dailyCalories].sort((a, b) => b.calories - a.calories);
    if (sorted[0].calories > sorted[sorted.length - 1].calories * 1.3) {
      improvements.push(t('weeklyCoach.improvements'));
    }
  }
  return improvements;
}

// ── Component ────────────────────────────────────────────

export default function WeeklyCoachScreen() {
  const C = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const nutritionMode = useUserStore((s) => s.user?.nutritionMode || 'simple');
  const weightChange = useWeightStore((s) => s.getWeightChange(7));
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [insufficientData, setInsufficientData] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      calculateWeeklyMetrics();
    } else {
      setLoading(false);
      setInsufficientData(true);
    }
  }, [user?.uid]);

  const calculateWeeklyMetrics = async () => {
    try {
      const userId = user!.uid;
      const goals = user!.goals;

      // Fetch last 7 days of meals
      const meals = await getRecentMeals(userId, 7);

      // Group meals by day
      const byDay = groupMealsByDay(meals);
      const daysLogged = byDay.size;

      if (daysLogged < MIN_DAYS_FOR_ANALYSIS) {
        setInsufficientData(true);
        setLoading(false);
        return;
      }

      // Per-day totals
      const dailyTotals: { day: string; nutrition: Nutrition }[] = [];
      byDay.forEach((dayMeals, dateKey) => {
        dailyTotals.push({ day: dateKey, nutrition: sumNutrition(dayMeals) });
      });

      // Averages across logged days
      const totalCals = dailyTotals.reduce((s, d) => s + d.nutrition.calories, 0);
      const totalProt = dailyTotals.reduce((s, d) => s + d.nutrition.protein, 0);
      const avgCalories = Math.round(totalCals / daysLogged);
      const avgProtein = Math.round((totalProt / daysLogged) * 10) / 10;

      // Adherence: average of per-day adherence
      const calAdherences = dailyTotals.map((d) =>
        calculateAdherencePercent(d.nutrition.calories, goals.calories)
      );
      const protAdherences = dailyTotals.map((d) =>
        calculateAdherencePercent(d.nutrition.protein, goals.protein)
      );
      const calorieAdherence = Math.round(
        calAdherences.reduce((s, v) => s + v, 0) / calAdherences.length
      );
      const proteinAdherence = Math.round(
        protAdherences.reduce((s, v) => s + v, 0) / protAdherences.length
      );

      // Consistency = % of 7 days that were logged
      const consistency = Math.round((daysLogged / 7) * 100);

      const grade = computeGrade(calorieAdherence, proteinAdherence, consistency);

      // Daily calories for chart & insights
      const dayNames = [
        t('trainingDay.sun').slice(0, 3).toLowerCase(),
        t('trainingDay.mon').slice(0, 3).toLowerCase(),
        t('trainingDay.tue').slice(0, 3).toLowerCase(),
        t('trainingDay.wed').slice(0, 3).toLowerCase(),
        t('trainingDay.thu').slice(0, 3).toLowerCase(),
        t('trainingDay.fri').slice(0, 3).toLowerCase(),
        t('trainingDay.sat').slice(0, 3).toLowerCase(),
      ];
      const dailyCalories = dailyTotals.map((d) => {
        const date = new Date(d.day + 'T12:00:00');
        return {
          day: dayNames[date.getDay()],
          calories: Math.round(d.nutrition.calories),
        };
      });

      const wins = generateWins(daysLogged, calorieAdherence, proteinAdherence, avgProtein, goals, t);
      const improvements = generateImprovements(
        daysLogged, calorieAdherence, proteinAdherence, avgProtein, goals, dailyCalories, t
      );

      setMetrics({
        avgCalories,
        avgProtein,
        daysLogged,
        weightChange,
        calorieAdherence,
        proteinAdherence,
        consistency,
        grade,
        wins,
        improvements,
        dailyCalories,
      });
    } catch (error) {
      console.error('Error calculating weekly metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string): string => {
    const gradeColors: { [key: string]: string } = {
      A: C.success,
      B: C.info,
      C: C.warning,
      D: '#FF9500',
      F: C.error,
    };
    return gradeColors[grade] || C.primary;
  };

  const getAdherenceColor = (value: number): string => {
    if (value >= 85) return C.success;
    if (value >= 70) return C.warning;
    return C.error;
  };

  const handleShare = async () => {
    if (!metrics) return;
    try {
      await Haptics.selectionAsync();
      await Share.share({
        message: `${t('weeklyCoach.title')} Cals2Gains:\n${t('weeklyCoach.title')}: ${metrics.grade}\n${t('weeklyCoach.calories')}: ${metrics.calorieAdherence}%\n${t('weeklyCoach.protein')}: ${metrics.proteinAdherence}%\n${t('weeklyCoach.daysLogged')}: ${metrics.daysLogged}/7`,
        title: `${t('weeklyCoach.title')} - Cals2Gains`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[styles.loadingText, { color: C.textSecondary }]}>{t('weeklyCoach.loading')}</Text>
      </View>
    );
  }

  // ── Insufficient data state ──
  if (insufficientData || !metrics) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="analytics-outline" size={64} color={C.textSecondary} />
        <Text style={[styles.emptyTitle, { color: C.text }]}>{t('weeklyCoach.insufficientData')}</Text>
        <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
          {t('weeklyCoach.insufficientDataMsg')}
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/(tabs)')}
        >
          <Ionicons name="add-circle" size={20} color="#FFF" />
          <Text style={styles.emptyButtonText}>{t('weeklyCoach.logMeal')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Date range display ──
  const now = new Date();
  const weekStart = subDays(now, 6);
  const formatDate = (date: Date) =>
    date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: C.text }]}>{t('weeklyCoach.title')}</Text>
          <Text style={[styles.dateRange, { color: C.textSecondary }]}>
            {formatDate(weekStart)} - {formatDate(now)}
          </Text>
        </View>
        <TouchableOpacity onPress={handleShare} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="share-social" size={24} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Grade Circle */}
      <View style={styles.gradeSection}>
        <View style={[styles.gradeCircle, { borderColor: getGradeColor(metrics.grade) }]}>
          <Text style={[styles.gradeText, { color: getGradeColor(metrics.grade) }]}>
            {metrics.grade}
          </Text>
        </View>
        <Text style={[styles.gradeLabel, { color: C.textSecondary }]}>{t('weeklyCoach.title')}</Text>
      </View>

      {/* Key Metrics Row */}
      <View style={styles.metricsGrid}>
        <MetricCard
          label={t('weeklyCoach.avgCalories')}
          value={metrics.avgCalories.toFixed(0)}
          unit="kcal"
          icon="flame"
        />
        <MetricCard
          label={t('weeklyCoach.avgProtein')}
          value={metrics.avgProtein.toFixed(0)}
          unit="g"
          icon="barbell"
        />
        <MetricCard
          label={t('weeklyCoach.daysLogged')}
          value={metrics.daysLogged}
          unit="/7"
          icon="calendar"
        />
        <MetricCard
          label={t('weeklyCoach.weightChange')}
          value={metrics.weightChange != null ? Math.abs(metrics.weightChange).toFixed(1) : '--'}
          unit={metrics.weightChange != null ? 'kg' : ''}
          icon="scale"
          isNegative={metrics.weightChange != null && metrics.weightChange < 0}
        />
      </View>

      {/* Adherence Breakdown */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('weeklyCoach.adherence')}</Text>

        <AdherenceRing
          label={t('weeklyCoach.calories')}
          value={metrics.calorieAdherence}
          color={getAdherenceColor(metrics.calorieAdherence)}
        />
        <AdherenceRing
          label={t('weeklyCoach.protein')}
          value={metrics.proteinAdherence}
          color={getAdherenceColor(metrics.proteinAdherence)}
        />
        {nutritionMode === 'advanced' && (
          <AdherenceRing
            label={t('weeklyCoach.consistency')}
            value={metrics.consistency}
            color={getAdherenceColor(metrics.consistency)}
          />
        )}
      </View>

      {/* Wins Section */}
      {metrics.wins.length > 0 && (
        <View style={[styles.section, styles.winsSection]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={24} color={C.success} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('weeklyCoach.wins')}</Text>
          </View>
          {metrics.wins.map((win, index) => (
            <View key={index} style={styles.winCard}>
              <Ionicons name="checkmark" size={20} color={C.success} />
              <Text style={[styles.winText, { color: C.text }]}>{win}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Areas to Improve */}
      {metrics.improvements.length > 0 && (
        <View style={[styles.section, styles.improvementSection]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={24} color={C.warning} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('weeklyCoach.improvements')}</Text>
          </View>
          {metrics.improvements.map((improvement, index) => (
            <View key={index} style={styles.improvementCard}>
              <Ionicons name="arrow-up" size={20} color={C.warning} />
              <Text style={[styles.improvementText, { color: C.text }]}>{improvement}</Text>
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

interface MetricCardProps {
  label: string;
  value: string | number;
  unit: string;
  icon: string;
  isNegative?: boolean;
}

function MetricCard({ label, value, unit, icon, isNegative }: MetricCardProps) {
  const C = useColors();
  return (
    <View style={[styles.metricCard, { backgroundColor: C.card }]}>
      <Ionicons name={icon as any} size={20} color={C.primary} />
      <Text style={[styles.metricValue, { color: C.text }]}>{value}</Text>
      <Text style={[styles.metricUnit, { color: C.textSecondary }]}>{unit}</Text>
      <Text style={[styles.metricLabel, { color: C.textSecondary }]}>{label}</Text>
      {isNegative && (
        <View style={[styles.negativeBadge, { backgroundColor: C.success }]}>
          <Ionicons name="arrow-down" size={12} color="#FFF" />
        </View>
      )}
    </View>
  );
}

interface AdherenceRingProps {
  label: string;
  value: number;
  color: string;
}

function AdherenceRing({ label, value, color }: AdherenceRingProps) {
  const C = useColors();
  return (
    <View style={styles.adherenceRow}>
      <View style={[styles.adherenceCircle, { borderColor: color }]}>
        <Text style={[styles.adherenceValue, { color }]}>{value}%</Text>
      </View>
      <Text style={[styles.adherenceLabel, { color: C.text }]}>{label}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 14,
  },
  gradeSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  gradeCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradeText: {
    fontSize: 56,
    fontWeight: '800',
  },
  gradeLabel: {
    fontSize: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    gap: 8,
  },
  metricCard: {
    width: (width - 32) / 2 - 4,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  metricUnit: {
    fontSize: 12,
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  negativeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  adherenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  adherenceCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adherenceValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  adherenceLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  winsSection: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  winCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  winText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  improvementSection: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  improvementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  improvementText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorIcon: {
    width: 20,
    height: 20,
  },
});

