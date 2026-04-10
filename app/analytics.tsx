import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { mealStore } from '@/stores/mealStore';
import { weightStore } from '@/stores/weightStore';
import { waterStore } from '@/stores/waterStore';
import { COLORS } from '../theme';

const { width } = Dimensions.get('window');
const CARD_PADDING = 16;
const CHART_HEIGHT = 240;

type PeriodType = 'week' | 'month' | 'quarter';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDaysLogged: number;
}

interface MacroAverage {
  protein: number;
  carbs: number;
  fat: number;
}

interface TrendPoint {
  date: string;
  calories: number;
}

interface WeightTrend {
  change: number;
  percent: number;
  startWeight: number;
  endWeight: number;
}

interface BestWorstDays {
  best: { date: string; calories: number };
  worst: { date: string; calories: number };
}

interface WaterStats {
  average: number;
  goal: number;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.bone,
    marginBottom: 24,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  periodTabTextActive: {
    color: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: CARD_PADDING,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakItem: {
    alignItems: 'center',
    flex: 1,
  },
  streakValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.violet,
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  adherenceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  circularProgress: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.cardHover,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.violet,
    position: 'relative',
    marginBottom: 16,
  },
  adherenceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.violet,
  },
  adherencePercent: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  adherenceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  macroLabel: {
    width: 70,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.bone,
  },
  macroBar: {
    flex: 1,
    height: 24,
    backgroundColor: COLORS.cardHover,
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.background,
  },
  chartContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  chartGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chartGridLine: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  trendLineContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CHART_HEIGHT,
  },
  weightChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weightChange: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.violet,
  },
  weightChangePercent: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  weightRange: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 8,
  },
  macroBreakdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    marginTop: 12,
    gap: 12,
  },
  macroBar3D: {
    flex: 1,
    backgroundColor: COLORS.violet,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  macroBar3DProtein: {
    backgroundColor: COLORS.violet,
  },
  macroBar3DCarbs: {
    backgroundColor: COLORS.coral,
  },
  macroBar3DFat: {
    backgroundColor: '#FFB84D',
  },
  macroBar3DLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.background,
    marginBottom: 4,
  },
  dayCard: {
    backgroundColor: COLORS.cardHover,
    borderRadius: 8,
    padding: 12,
    flex: 1,
    alignItems: 'center',
  },
  dayCardDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dayCardCalories: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.bone,
  },
  waterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.violet,
  },
  waterGoal: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  waterIcon: {
    fontSize: 40,
    color: COLORS.coral,
  },
});

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<PeriodType>('week');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh data when screen is focused
      setLoading(false);
    }, [])
  );

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    switch (period) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(end.getMonth() - 3);
        break;
    }
    return { start, end };
  }, [period]);

  const streakData = useMemo((): StreakData => {
    const meals = mealStore.getMeals();
    const targetCalories = 2000; // Configurable target

    const sortedMeals = [...meals].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const uniqueDates = new Set<string>();

    for (const meal of sortedMeals) {
      const dateKey = new Date(meal.date).toISOString().split('T')[0];
      uniqueDates.add(dateKey);
    }

    let prevDate: Date | null = null;
    const sortedDates = Array.from(uniqueDates)
      .sort()
      .map((d) => new Date(d));

    for (const date of sortedDates) {
      const mealsOnDate = sortedMeals.filter(
        (m) => new Date(m.date).toISOString().split('T')[0] === date.toISOString().split('T')[0]
      );
      const totalCalories = mealsOnDate.reduce((sum, m) => sum + (m.calories || 0), 0);

      const meetsGoal =
        totalCalories >= targetCalories * 0.9 && totalCalories <= targetCalories * 1.1;

      if (meetsGoal) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        if (prevDate) {
          const daysDiff =
            (date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff === 1) {
            tempStreak = 0;
          }
        }
        tempStreak = 0;
      }

      prevDate = date;
    }

    currentStreak = tempStreak;

    return {
      currentStreak,
      longestStreak,
      totalDaysLogged: uniqueDates.size,
    };
  }, []);

  const adherenceScore = useMemo((): number => {
    const meals = mealStore.getMeals();
    const targetCalories = 2000;

    const mealsInPeriod = meals.filter((m) => {
      const mealDate = new Date(m.date);
      return mealDate >= dateRange.start && mealDate <= dateRange.end;
    });

    if (mealsInPeriod.length === 0) return 0;

    const mealsPerDay: { [key: string]: number } = {};
    mealsInPeriod.forEach((meal) => {
      const dateKey = new Date(meal.date).toISOString().split('T')[0];
      mealsPerDay[dateKey] = (mealsPerDay[dateKey] || 0) + (meal.calories || 0);
    });

    const meetsGoal = Object.values(mealsPerDay).filter(
      (cals) => cals >= targetCalories * 0.9 && cals <= targetCalories * 1.1
    ).length;

    return Math.round((meetsGoal / Object.keys(mealsPerDay).length) * 100);
  }, [dateRange]);

  const macroAverages = useMemo((): MacroAverage => {
    const meals = mealStore.getMeals();

    const mealsInPeriod = meals.filter((m) => {
      const mealDate = new Date(m.date);
      return mealDate >= dateRange.start && mealDate <= dateRange.end;
    });

    if (mealsInPeriod.length === 0)
      return { protein: 0, carbs: 0, fat: 0 };

    const totals = mealsInPeriod.reduce(
      (acc, meal) => ({
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fat: acc.fat + (meal.fat || 0),
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );

    return {
      protein: Math.round(totals.protein / mealsInPeriod.length),
      carbs: Math.round(totals.carbs / mealsInPeriod.length),
      fat: Math.round(totals.fat / mealsInPeriod.length),
    };
  }, [dateRange]);

  const caloriesTrend = useMemo((): TrendPoint[] => {
    const meals = mealStore.getMeals();

    const mealsInPeriod = meals.filter((m) => {
      const mealDate = new Date(m.date);
      return mealDate >= dateRange.start && mealDate <= dateRange.end;
    });

    const mealsPerDay: { [key: string]: number } = {};
    mealsInPeriod.forEach((meal) => {
      const dateKey = new Date(meal.date).toISOString().split('T')[0];
      mealsPerDay[dateKey] = (mealsPerDay[dateKey] || 0) + (meal.calories || 0);
    });

    return Object.entries(mealsPerDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, calories]) => ({ date, calories }));
  }, [dateRange]);

  const weightProgress = useMemo((): WeightTrend => {
    const weights = weightStore.getWeights();

    const weightsInPeriod = weights.filter((w) => {
      const wDate = new Date(w.date);
      return wDate >= dateRange.start && wDate <= dateRange.end;
    });

    if (weightsInPeriod.length === 0)
      return { change: 0, percent: 0, startWeight: 0, endWeight: 0 };

    const sortedWeights = weightsInPeriod.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const startWeight = sortedWeights[0].weight;
    const endWeight = sortedWeights[sortedWeights.length - 1].weight;
    const change = endWeight - startWeight;
    const percent = (change / startWeight) * 100;

    return {
      change: Math.round(change * 10) / 10,
      percent: Math.round(percent * 10) / 10,
      startWeight,
      endWeight,
    };
  }, [dateRange]);

  const macroBreakdown = useMemo(() => {
    const total = macroAverages.protein + macroAverages.carbs + macroAverages.fat;
    if (total === 0) return { protein: 0, carbs: 0, fat: 0 };

    return {
      protein: (macroAverages.protein / total) * 100,
      carbs: (macroAverages.carbs / total) * 100,
      fat: (macroAverages.fat / total) * 100,
    };
  }, [macroAverages]);

  const bestWorstDays = useMemo((): BestWorstDays | null => {
    if (caloriesTrend.length === 0) return null;

    const best = caloriesTrend.reduce((prev, current) =>
      prev.calories > current.calories ? prev : current
    );
    const worst = caloriesTrend.reduce((prev, current) =>
      prev.calories < current.calories ? prev : current
    );

    return { best, worst };
  }, [caloriesTrend]);

  const waterStats = useMemo((): WaterStats => {
    const water = waterStore.getWater();

    const waterInPeriod = water.filter((w) => {
      const wDate = new Date(w.date);
      return wDate >= dateRange.start && wDate <= dateRange.end;
    });

    if (waterInPeriod.length === 0) return { average: 0, goal: 2000 };

    const total = waterInPeriod.reduce((sum, w) => sum + (w.amount || 0), 0);
    return {
      average: Math.round(total / waterInPeriod.length),
      goal: 2000,
    };
  }, [dateRange]);

  const renderTrendLine = () => {
    if (caloriesTrend.length < 2) return null;

    const minCalories = Math.min(...caloriesTrend.map((p) => p.calories));
    const maxCalories = Math.max(...caloriesTrend.map((p) => p.calories));
    const range = maxCalories - minCalories || 1;

    const points = caloriesTrend.map((point, index) => {
      const x = (index / (caloriesTrend.length - 1)) * (width - 80);
      const y =
        CHART_HEIGHT - ((point.calories - minCalories) / range) * (CHART_HEIGHT - 40);
      return { x, y };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <svg
        width={width - 80}
        height={CHART_HEIGHT}
        viewBox={`0 0 ${width - 80} ${CHART_HEIGHT}`}
        style={{ position: 'absolute' }}
      >
        <path d={pathD} stroke={COLORS.violet} strokeWidth={2} fill="none" />
      </svg>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Estadísticas</Text>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodTab, period === 'week' && styles.periodTabActive]}
            onPress={() => setPeriod('week')}
          >
            <Text
              style={[
                styles.periodTabText,
                period === 'week' && styles.periodTabTextActive,
              ]}
            >
              Semana
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodTab, period === 'month' && styles.periodTabActive]}
            onPress={() => setPeriod('month')}
          >
            <Text
              style={[
                styles.periodTabText,
                period === 'month' && styles.periodTabTextActive,
              ]}
            >
              Mes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodTab, period === 'quarter' && styles.periodTabActive]}
            onPress={() => setPeriod('quarter')}
          >
            <Text
              style={[
                styles.periodTabText,
                period === 'quarter' && styles.periodTabTextActive,
              ]}
            >
              3 Meses
            </Text>
          </TouchableOpacity>
        </View>

        {/* Streak Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Racha Actual</Text>
          <View style={styles.streakContainer}>
            <View style={styles.streakItem}>
              <Text style={styles.streakValue}>🔥 {streakData.currentStreak}</Text>
              <Text style={styles.streakLabel}>días actuales</Text>
            </View>
            <View style={styles.streakItem}>
              <Text style={styles.streakValue}>{streakData.longestStreak}</Text>
              <Text style={styles.streakLabel}>racha más larga</Text>
            </View>
            <View style={styles.streakItem}>
              <Text style={styles.streakValue}>{streakData.totalDaysLogged}</Text>
              <Text style={styles.streakLabel}>días registrados</Text>
            </View>
          </View>
        </View>

        {/* Adherence Score */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cumplimiento de Metas</Text>
          <View style={styles.adherenceContainer}>
            <View style={styles.circularProgress}>
              <View>
                <Text style={styles.adherenceValue}>{adherenceScore}</Text>
                <Text style={styles.adherencePercent}>%</Text>
              </View>
            </View>
            <Text style={styles.adherenceLabel}>
              Frecuencia de cumplimiento de objetivos calóricos (±10%)
            </Text>
          </View>
        </View>

        {/* Calorie Trend */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tendencia Calórica</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartGrid}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.chartGridLine} />
              ))}
            </View>
            <View style={styles.trendLineContainer}>
              {renderTrendLine()}
            </View>
          </View>
          {caloriesTrend.length > 0 && (
            <Text style={styles.cardTitle}>
              Promedio: {Math.round(caloriesTrend.reduce((sum, p) => sum + p.calories, 0) / caloriesTrend.length)} cal
            </Text>
          )}
        </View>

        {/* Weekly Macro Averages */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Promedios Macro</Text>
          <View>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Proteína</Text>
              <View style={styles.macroBar}>
                <View
                  style={[
                    styles.macroFill,
                    { width: `${Math.min((macroAverages.protein / 150) * 100, 100)}%`, backgroundColor: COLORS.violet },
                  ]}
                >
                  <Text style={styles.macroText}>{macroAverages.protein}g</Text>
                </View>
              </View>
            </View>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Carbos</Text>
              <View style={styles.macroBar}>
                <View
                  style={[
                    styles.macroFill,
                    { width: `${Math.min((macroAverages.carbs / 300) * 100, 100)}%`, backgroundColor: COLORS.coral },
                  ]}
                >
                  <Text style={styles.macroText}>{macroAverages.carbs}g</Text>
                </View>
              </View>
            </View>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Grasas</Text>
              <View style={styles.macroBar}>
                <View
                  style={[
                    styles.macroFill,
                    { width: `${Math.min((macroAverages.fat / 80) * 100, 100)}%`, backgroundColor: '#FFB84D' },
                  ]}
                >
                  <Text style={styles.macroText}>{macroAverages.fat}g</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Weight Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progreso de Peso</Text>
          <View style={styles.weightChangeContainer}>
            <View>
              <Text style={styles.weightChange}>
                {weightProgress.change > 0 ? '+' : ''}{weightProgress.change} kg
              </Text>
              <Text style={styles.weightChangePercent}>
                {weightProgress.percent > 0 ? '+' : ''}{weightProgress.percent}%
              </Text>
              <Text style={styles.weightRange}>
                {weightProgress.startWeight} → {weightProgress.endWeight} kg
              </Text>
            </View>
            <Ionicons
              name={weightProgress.change <= 0 ? 'trending-down' : 'trending-up'}
              size={40}
              color={weightProgress.change <= 0 ? COLORS.coral : '#FF9999'}
            />
          </View>
        </View>

        {/* Macro Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Distribución Macro</Text>
          <View style={styles.macroBreakdownContainer}>
            <View style={[styles.macroBar3D, styles.macroBar3DProtein, { height: `${macroBreakdown.protein}%` }]}>
              <Text style={styles.macroBar3DLabel}>{Math.round(macroBreakdown.protein)}%</Text>
              <Text style={styles.macroBar3DLabel}>Proteína</Text>
            </View>
            <View style={[styles.macroBar3D, styles.macroBar3DCarbs, { height: `${macroBreakdown.carbs}%` }]}>
              <Text style={styles.macroBar3DLabel}>{Math.round(macroBreakdown.carbs)}%</Text>
              <Text style={styles.macroBar3DLabel}>Carbos</Text>
            </View>
            <View style={[styles.macroBar3D, styles.macroBar3DFat, { height: `${macroBreakdown.fat}%` }]}>
              <Text style={styles.macroBar3DLabel}>{Math.round(macroBreakdown.fat)}%</Text>
              <Text style={styles.macroBar3DLabel}>Grasas</Text>
            </View>
          </View>
        </View>

        {/* Best/Worst Days */}
        {bestWorstDays && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mejor y Peor Día</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={styles.dayCard}>
                <Text style={styles.dayCardDate}>{bestWorstDays.best.date}</Text>
                <Text style={styles.dayCardCalories}>{bestWorstDays.best.calories}</Text>
                <Text style={styles.dayCardDate}>calorías (Mejor)</Text>
              </View>
              <View style={styles.dayCard}>
                <Text style={styles.dayCardDate}>{bestWorstDays.worst.date}</Text>
                <Text style={styles.dayCardCalories}>{bestWorstDays.worst.calories}</Text>
                <Text style={styles.dayCardDate}>calorías (Peor)</Text>
              </View>
            </View>
          </View>
        )}

        {/* Water Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Agua Diaria</Text>
          <View style={styles.waterContainer}>
            <View>
              <Text style={styles.waterValue}>{waterStats.average} ml</Text>
              <Text style={styles.waterGoal}>promedio diario</Text>
              <Text style={styles.waterGoal}>meta: {waterStats.goal} ml</Text>
            </View>
            <Ionicons name="water" style={styles.waterIcon} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
