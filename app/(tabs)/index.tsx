// ============================================
// Cals2Gains - Home / Dashboard Screen
// ============================================

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useColors, useThemeStore } from '../../store/themeStore';
import MacroRing from '../../components/ui/MacroRing';
import MealCard from '../../components/ui/MealCard';
import { useUserStore } from '../../store/userStore';
import { useMealStore } from '../../store/mealStore';
import { useWeeklyStore } from '../../store/weeklyStore';
import { useAdaptiveStore } from '../../store/adaptiveStore';
import { useAdaptiveEngines } from '../../hooks/useAdaptiveEngines';
import { useStreakStore } from '../../store/streakStore';
import StreakBadge from '../../components/ui/StreakBadge';
import * as Haptics from 'expo-haptics';
import { useTrainingPlanStore } from '../../store/trainingPlanStore';

// ============================================
// MACRO BAR COLORS
// ============================================
const MACRO_COLORS = {
  calories: '#FF6A4D',  // Signal Coral
  protein: '#9C8CFF',   // Soft Violet
  carbs: '#FF9800',     // Orange
  fat: '#FFD700',       // Golden yellow
  fiber: '#4ADE80',     // Green
};

// Brand logo assets
const LOGO_MARK = require('../../brand-assets/C2G-Mark-512.png');
const LOGO_DARK = require('../../brand-assets/C2G-Logo-Dark.png');
const LOGO_LIGHT = require('../../brand-assets/C2G-Logo-Light.png');

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const C = useColors();
  const isDark = useThemeStore(s => s.isDark);
  const styles = getStyles(C);
  const { user, getActiveGoals, isSubscriptionActive, isOnTrial, trialDaysRemaining } = useUserStore();
  const nutritionMode = useUserStore((s) => s.user?.nutritionMode || 'simple');
  const {
    todayMeals,
    todayNutrition,
    isLoading,
    loadTodayMeals,
    loadMealsForDate,
    removeMeal,
  } = useMealStore();

  // View date — defaults to today; user can step back/forward with arrows.
  // We load meals for this date whenever it changes (including on mount).
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const isToday = useMemo(() => {
    const now = new Date();
    return viewDate.toDateString() === now.toDateString();
  }, [viewDate]);

  const goPrevDay = useCallback(() => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - 1);
    setViewDate(d);
  }, [viewDate]);

  const goNextDay = useCallback(() => {
    if (isToday) return;
    const d = new Date(viewDate);
    d.setDate(d.getDate() + 1);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    if (d > now) return;
    setViewDate(d);
  }, [viewDate, isToday]);

  // Adaptive engines — runs weekly check + memory analysis on mount
  const { isAnalyzing } = useAdaptiveEngines();

  // Streak & achievements
  const loadGameProgress = useStreakStore((s) => s.loadGameProgress);
  const refreshStreak = useStreakStore((s) => s.refreshStreak);
  const newlyUnlocked = useStreakStore((s) => s.newlyUnlocked);
  const clearNewlyUnlocked = useStreakStore((s) => s.clearNewlyUnlocked);
  const isStreakLoaded = useStreakStore((s) => s.isLoaded);
  const currentRecommendation = useAdaptiveStore((s) => s.currentRecommendation);
  const lastAdherenceScore = useAdaptiveStore((s) => s.lastAdherenceScore);
  const acceptRecommendation = useAdaptiveStore((s) => s.acceptRecommendation);
  const dismissRecommendation = useAdaptiveStore((s) => s.dismissRecommendation);
  const updateUserGoals = useUserStore((s) => s.updateUserGoals);
  const getTodayTrainingInfo = useTrainingPlanStore((s) => s.getTodayInfo);
  const todayTraining = isToday ? getTodayTrainingInfo() : null;

  const locale = i18n.language === 'es' ? es : enUS;
  const today = useMemo(
    () => format(viewDate, 'EEEE, d MMMM', { locale }),
    [viewDate, locale]
  );

  useEffect(() => {
    if (!user) return;
    if (isToday) {
      loadTodayMeals(user.uid);
    } else {
      loadMealsForDate(user.uid, viewDate);
    }
    if (!isStreakLoaded) {
      loadGameProgress(user.uid);
    }
  }, [user?.uid, viewDate.toDateString()]);

  // Load the rolling 7-day window when dynamic TDEE + rebalance is enabled.
  // Refreshes itself every 6h internally — see weeklyStore.loadWeek.
  const loadWeek = useWeeklyStore((s) => s.loadWeek);
  const getTodayTarget = useWeeklyStore((s) => s.getTodayTarget);
  useEffect(() => {
    if (!user?.uid || !user?.profile || !user.dynamicTDEEEnabled) return;
    loadWeek(user.uid, user.profile);
  }, [user?.uid, user?.dynamicTDEEEnabled, todayNutrition.calories]);

  // Refresh streak whenever meals are loaded for the day
  useEffect(() => {
    if (user && todayMeals.length >= 2) {
      refreshStreak(user.uid);
    }
  }, [todayMeals.length >= 2, user?.uid]);

  const onRefresh = useCallback(() => {
    if (user) loadTodayMeals(user.uid);
  }, [user?.uid]);

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await removeMeal(mealId);
    } catch {
      Alert.alert(t('errors.generic'));
    }
  };

  const handleAcceptRecommendation = async () => {
    const newGoals = acceptRecommendation();
    if (newGoals && user) {
      try {
        await updateUserGoals({
          goalMode: user.goalMode || 'maintain',
          targetCalories: newGoals.calories,
          targetProtein: newGoals.protein,
          targetCarbs: newGoals.carbs,
          targetFat: newGoals.fat,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Failed to apply recommendation:', error);
      }
    }
  };

  const handleEditMeal = (meal: any) => {
    router.push({
      pathname: '/edit-meal',
      params: { mealJson: JSON.stringify(meal) },
    });
  };

  // Use getActiveGoals() for reactivity — it respects goalMode, dayType, etc.
  const activeGoals = getActiveGoals();
  const baseGoals = activeGoals.calories > 0
    ? activeGoals
    : { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 30 };

  // Weekly rebalance: if dynamicTDEEEnabled is on AND we have the profile,
  // compute today's target from the 7-day rolling budget instead of the
  // flat daily goal. Falls back to baseGoals on kill switch / no data.
  const rebalancedTarget = useMemo(() => {
    if (!user?.dynamicTDEEEnabled || !user?.profile) return null;
    if (!isToday) return null; // only adjust today's view
    // If an active training plan marks today as refeed or competition, skip
    // rebalance so the plan's macros take precedence (nutrition agent R9).
    const trainingInfo = getTodayTrainingInfo();
    const trainingDay =
      trainingInfo?.dayType === 'refeed' || trainingInfo?.dayType === 'competicion'
        ? trainingInfo.dayType
        : null;
    return getTodayTarget(user, baseGoals, trainingDay);
  }, [user, isToday, baseGoals.calories, getTodayTarget, getTodayTrainingInfo]);

  const goals = rebalancedTarget
    ? {
        calories: rebalancedTarget.calories,
        protein: rebalancedTarget.protein,
        carbs: rebalancedTarget.carbs,
        fat: rebalancedTarget.fat,
        fiber: rebalancedTarget.fiber,
      }
    : baseGoals;

  // Consumed macros
  const consumed = {
    calories: Math.round(todayNutrition.calories),
    protein: Math.round(todayNutrition.protein),
    carbs: Math.round(todayNutrition.carbs),
    fat: Math.round(todayNutrition.fat),
    fiber: Math.round(todayNutrition.fiber || 0),
  };

  const mealsByType = {
    breakfast: todayMeals.filter((m) => m.mealType === 'breakfast'),
    lunch: todayMeals.filter((m) => m.mealType === 'lunch'),
    dinner: todayMeals.filter((m) => m.mealType === 'dinner'),
    snack: todayMeals.filter((m) => m.mealType === 'snack'),
  };

  const mealTypeLabels = {
    breakfast: t('home.breakfast'),
    lunch: t('home.lunch'),
    dinner: t('home.dinner'),
    snack: t('home.snack'),
  };

  const mealTypeIcons = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
      >
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.brandRow}>
            <Image
              source={LOGO_MARK}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <View style={styles.brandWordmark}>
              <Text style={[styles.brandName, { color: C.text }]}>
                <Text style={{ color: C.violet }}>Cals</Text>
                <Text style={{ color: C.coral, fontSize: 15, fontFamily: 'Outfit-Bold' }}>2</Text>
                <Text style={{ color: C.violet }}>Gains</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/paywall')}
          >
            <Ionicons name="notifications-outline" size={22} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Greeting + Date (with day nav) + Streak badge */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {t('home.greeting')}, {user?.displayName?.split(' ')[0] || '👋'}
            </Text>
            <View style={styles.dateNavRow}>
              <TouchableOpacity
                onPress={goPrevDay}
                style={styles.dateNavBtn}
                accessibilityRole="button"
                accessibilityLabel={t('home.previousDay')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              >
                <Ionicons name="chevron-back" size={18} color={C.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.date}>{today}</Text>
              <TouchableOpacity
                onPress={goNextDay}
                disabled={isToday}
                style={styles.dateNavBtn}
                accessibilityRole="button"
                accessibilityLabel={t('home.nextDay')}
                accessibilityState={{ disabled: isToday }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isToday ? C.textMuted : C.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
          <StreakBadge compact />
        </View>

        {/* Achievement celebration overlay */}
        {newlyUnlocked.length > 0 && (() => {
          const { ACHIEVEMENT_DEFS } = require('../../store/streakStore');
          const latest = newlyUnlocked[newlyUnlocked.length - 1];
          const def = ACHIEVEMENT_DEFS.find((d: any) => d.id === latest.id);
          if (!def) return null;
          return (
            <TouchableOpacity
              style={styles.celebrationOverlay}
              activeOpacity={1}
              onPress={clearNewlyUnlocked}
            >
              <View style={[styles.celebrationCard, { backgroundColor: C.card, borderColor: C.primary }]}>
                <Text style={styles.celebrationEmoji}>{def.icon}</Text>
                <Text style={[styles.celebrationTitle, { color: C.primary }]}>
                  {t('achievements.milestoneReached')}
                </Text>
                <Text style={[styles.celebrationName, { color: C.text }]}>
                  {i18n.language === 'es' ? def.nameEs : def.nameEn}
                </Text>
                <Text style={[styles.celebrationDesc, { color: C.textSecondary }]}>
                  {i18n.language === 'es' ? def.descriptionEs : def.descriptionEn}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })()}

        {/* Trial banner */}
        {isOnTrial() && trialDaysRemaining() <= 3 && (
          <TouchableOpacity
            style={styles.trialBanner}
            onPress={() => router.push('/paywall')}
          >
            <Ionicons name="time-outline" size={16} color={C.warning} />
            <Text style={styles.trialBannerText}>
              {t('home.trialBanner', { days: trialDaysRemaining() })}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={C.warning} />
          </TouchableOpacity>
        )}

        {/* Subscription expired banner */}
        {!isSubscriptionActive() && (
          <TouchableOpacity
            style={styles.subscriptionBanner}
            onPress={() => router.push('/paywall')}
          >
            <Ionicons name="lock-closed" size={16} color={C.white} />
            <Text style={styles.subscriptionBannerText}>{t('home.subscribeToContinue')}</Text>
          </TouchableOpacity>
        )}

        {/* Training Plan Banner */}
        {todayTraining && (
          <TouchableOpacity
            style={styles.trainingBanner}
            onPress={() => router.push('/training-day')}
            activeOpacity={0.85}
          >
            <View style={styles.trainingBannerLeft}>
              <Text style={{ fontSize: 22 }}>
                {todayTraining.dayType === 'entreno' ? '🏋️'
                  : todayTraining.dayType === 'refeed' ? '🔄'
                  : todayTraining.dayType === 'competicion' ? '🏁'
                  : '🛋️'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.trainingBannerTitle}>
                  {todayTraining.dayType === 'entreno' ? 'Día de entreno'
                    : todayTraining.dayType === 'refeed' ? 'Día de refeed'
                    : todayTraining.dayType === 'competicion' ? '¡Día de competición!'
                    : 'Día de descanso'}
                </Text>
                <Text style={styles.trainingBannerSub}>
                  {todayTraining.plan.name} · Día {todayTraining.dayNumber}/{todayTraining.totalDays}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#FF6A4D" />
          </TouchableOpacity>
        )}

        {/* Adaptive Engine Recommendation Banner */}
        {currentRecommendation && currentRecommendation.status === 'pending' && (
          <View style={styles.adaptiveBanner}>
            <View style={styles.adaptiveBannerHeader}>
              <View style={styles.adaptiveBannerIcon}>
                <Ionicons name="analytics" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.adaptiveBannerTitle}>
                {t('home.adaptiveRecommendation')}
              </Text>
            </View>
            <Text style={styles.adaptiveBannerText}>
              {i18n.language === 'es'
                ? currentRecommendation.descriptionEs
                : currentRecommendation.description}
            </Text>
            {lastAdherenceScore && (
              <View style={styles.adherenceRow}>
                <Text style={styles.adherenceLabel}>{t('home.adherenceScore')}</Text>
                <Text style={[styles.adherenceValue, {
                  color: lastAdherenceScore.overall >= 0.75 ? C.success
                    : lastAdherenceScore.overall >= 0.5 ? C.warning : C.error,
                }]}>
                  {Math.round(lastAdherenceScore.overall * 100)}%
                </Text>
                <Text style={styles.adherenceTrend}>
                  {lastAdherenceScore.trend === 'improving' ? '📈'
                    : lastAdherenceScore.trend === 'declining' ? '📉' : '➡️'}
                </Text>
              </View>
            )}
            {currentRecommendation.autoAdjustment && (
              <View style={styles.adaptiveActions}>
                <TouchableOpacity
                  style={styles.adaptiveAcceptBtn}
                  onPress={handleAcceptRecommendation}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.adaptiveAcceptText}>{t('home.acceptAdjustment')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adaptiveDismissBtn}
                  onPress={dismissRecommendation}
                >
                  <Text style={styles.adaptiveDismissText}>{t('home.dismiss')}</Text>
                </TouchableOpacity>
              </View>
            )}
            {!currentRecommendation.autoAdjustment && (
              <TouchableOpacity
                style={styles.adaptiveDismissBtn}
                onPress={dismissRecommendation}
              >
                <Text style={styles.adaptiveDismissText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ===== CALORIE RING + MACRO BARS DASHBOARD ===== */}
        <View style={styles.dashboardCard}>
          {/* Rebalance banner: only shown when today's target differs from base.
              Includes the nutrition-agent-mandated medical disclaimer (R2). */}
          {rebalancedTarget && rebalancedTarget.calories !== rebalancedTarget.baseTarget && (
            <View style={[styles.rebalanceBanner, { backgroundColor: C.violet + '22', borderColor: C.violet }]}>
              <View style={styles.rebalanceHeader}>
                <Ionicons name="sync" size={14} color={C.violet} />
                <Text style={[styles.rebalanceText, { color: C.text }]}>
                  {t('home.rebalance.adjusted', {
                    today: rebalancedTarget.calories,
                    base: rebalancedTarget.baseTarget,
                    defaultValue: 'Hoy {{today}} kcal · base {{base}}',
                  })}
                </Text>
              </View>
              <Text style={[styles.rebalanceDisclaimer, { color: C.text + 'aa' }]}>
                {t('home.rebalance.disclaimer', {
                  defaultValue: 'Información general basada en tu actividad reciente. No sustituye el consejo de un profesional de la salud.',
                })}
              </Text>
            </View>
          )}

          {/* Calorie ring centered */}
          <View style={styles.ringRow}>
            <MacroRing
              calories={consumed.calories}
              calorieGoal={goals.calories}
              protein={consumed.protein}
              carbs={consumed.carbs}
              fat={consumed.fat}
              size={150}
            />
            <View style={styles.calorieStats}>
              <View style={styles.calorieStat}>
                <Text style={[styles.calorieValue, { color: MACRO_COLORS.calories }]}>
                  {consumed.calories}
                </Text>
                <Text style={styles.calorieLabel}>{t('home.macros.consumed')}</Text>
              </View>
              <View style={[styles.calorieDivider, { backgroundColor: C.border }]} />
              <View style={styles.calorieStat}>
                <Text style={[styles.calorieValue, { color: C.textSecondary }]}>
                  {goals.calories}
                </Text>
                <Text style={styles.calorieLabel}>{t('home.macros.goal')}</Text>
              </View>
              <View style={[styles.calorieDivider, { backgroundColor: C.border }]} />
              <View style={styles.calorieStat}>
                <Text style={[styles.calorieValue, { color: C.primary }]}>
                  {Math.max(0, goals.calories - consumed.calories)}
                </Text>
                <Text style={styles.calorieLabel}>{t('home.macros.remaining')}</Text>
              </View>
            </View>
          </View>

          {/* Macro progress bars */}
          <View style={styles.macroBarsContainer}>
            <MacroProgressBar
              label={t('home.macros.protein')}
              consumed={consumed.protein}
              goal={goals.protein}
              unit="g"
              color={MACRO_COLORS.protein}
              C={C}
              styles={styles}
            />
            <MacroProgressBar
              label={t('home.macros.carbs')}
              consumed={consumed.carbs}
              goal={goals.carbs}
              unit="g"
              color={MACRO_COLORS.carbs}
              C={C}
              styles={styles}
            />
            <MacroProgressBar
              label={t('home.macros.fat')}
              consumed={consumed.fat}
              goal={goals.fat}
              unit="g"
              color={MACRO_COLORS.fat}
              C={C}
              styles={styles}
            />
            {nutritionMode === 'advanced' && goals.fiber > 0 && (
              <MacroProgressBar
                label={t('home.macros.fiber')}
                consumed={consumed.fiber}
                goal={goals.fiber}
                unit="g"
                color={MACRO_COLORS.fiber}
                C={C}
                styles={styles}
              />
            )}
          </View>

          {/* Advanced: Macro Distribution */}
          {nutritionMode === 'advanced' && consumed.calories > 0 && (() => {
            const protCal = consumed.protein * 4;
            const carbCal = consumed.carbs * 4;
            const fatCal = consumed.fat * 9;
            const total = protCal + carbCal + fatCal || 1;
            const protPct = Math.round((protCal / total) * 100);
            const carbPct = Math.round((carbCal / total) * 100);
            const fatPct = 100 - protPct - carbPct;
            return (
              <View style={{
                marginTop: 16,
                padding: 16,
                backgroundColor: C.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 }}>
                  {t('home.macroDistribution')}
                </Text>
                {/* Stacked bar */}
                <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
                  <View style={{ flex: protPct, backgroundColor: MACRO_COLORS.protein }} />
                  <View style={{ flex: carbPct, backgroundColor: MACRO_COLORS.carbs }} />
                  <View style={{ flex: fatPct, backgroundColor: MACRO_COLORS.fat }} />
                </View>
                {/* Labels */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: MACRO_COLORS.protein, marginBottom: 4 }} />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: MACRO_COLORS.protein }}>{protPct}%</Text>
                    <Text style={{ fontSize: 11, color: C.textSecondary }}>{t('home.macros.protein')}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: MACRO_COLORS.carbs, marginBottom: 4 }} />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: MACRO_COLORS.carbs }}>{carbPct}%</Text>
                    <Text style={{ fontSize: 11, color: C.textSecondary }}>{t('home.macros.carbs')}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: MACRO_COLORS.fat, marginBottom: 4 }} />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: MACRO_COLORS.fat }}>{fatPct}%</Text>
                    <Text style={{ fontSize: 11, color: C.textSecondary }}>{t('home.macros.fat')}</Text>
                  </View>
                </View>
                {/* Calorie breakdown */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
                  <Text style={{ fontSize: 11, color: C.textSecondary }}>{t('home.macros.protein')}: {protCal} kcal</Text>
                  <Text style={{ fontSize: 11, color: C.textSecondary }}>{t('home.macros.carbs')}: {carbCal} kcal</Text>
                  <Text style={{ fontSize: 11, color: C.textSecondary }}>{t('home.macros.fat')}: {fatCal} kcal</Text>
                </View>
              </View>
            );
          })()}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>{t('home.quickActions.title')}</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction icon="camera-outline" label={t('home.quickActions.camera')} color="#FF6A4D" onPress={() => router.push('/(tabs)/camera')} styles={styles} />
            <QuickAction icon="sparkles-outline" label={t('home.quickActions.aiAnalysis')} color="#9C8CFF" onPress={() => router.push('/ai-review')} styles={styles} />
            <QuickAction icon="search-outline" label={t('home.quickActions.searchFood')} color="#4FC3F7" onPress={() => router.push('/food-search')} styles={styles} />
            <QuickAction icon="restaurant-outline" label={t('home.quickActions.whatToEat')} color="#4ADE80" onPress={() => router.push('/what-to-eat')} styles={styles} />
          </View>
        </View>

        {/* Meals by type */}
        <View style={styles.mealsSection}>
          <Text style={styles.sectionTitle}>{t('home.meals')}</Text>

          {todayMeals.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyState}
              onPress={() => router.push('/(tabs)/camera')}
            >
              <Text style={styles.emptyEmoji}>📸</Text>
              <Text style={styles.emptyTitle}>{t('home.noMealsYet')}</Text>
              <Text style={styles.emptyButton}>{t('home.addFirstMeal')}</Text>
            </TouchableOpacity>
          ) : (
            Object.entries(mealsByType).map(([type, meals]) => {
              if (meals.length === 0) return null;
              const mealType = type as keyof typeof mealsByType;
              return (
                <View key={type} style={styles.mealGroup}>
                  <View style={styles.mealGroupHeader}>
                    <Text style={styles.mealGroupEmoji}>{mealTypeIcons[mealType]}</Text>
                    <Text style={styles.mealGroupLabel}>{mealTypeLabels[mealType]}</Text>
                    <Text style={styles.mealGroupCalories}>
                      {Math.round(meals.reduce((s, m) => s + (m.nutrition?.calories ?? 0), 0))} kcal
                    </Text>
                  </View>
                  {meals.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onDelete={handleDeleteMeal}
                      onEdit={handleEditMeal}
                      compact
                      nutritionMode={nutritionMode}
                    />
                  ))}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

const MacroProgressBar: React.FC<{
  label: string;
  consumed: number;
  goal: number;
  unit: string;
  color: string;
  C: any;
  styles: any;
}> = ({ label, consumed, goal, unit, color, C, styles }) => {
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const percentage = Math.round(progress * 100);
  const isOver = consumed > goal;

  return (
    <View style={styles.macroBarRow}>
      <View style={styles.macroBarHeader}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={styles.macroBarValues}>
          <Text style={[styles.macroBarCurrent, { color: isOver ? C.error : color }]}>
            {consumed}
          </Text>
          <Text style={styles.macroBarSeparator}> / {goal} {unit}</Text>
        </Text>
      </View>
      <View style={styles.macroBarTrack}>
        <View
          style={[
            styles.macroBarFill,
            {
              width: `${percentage}%`,
              backgroundColor: isOver ? C.error : color,
            },
          ]}
        />
      </View>
      <Text style={[styles.macroBarPercent, { color: isOver ? C.error : C.textMuted }]}>
        {percentage}%
      </Text>
    </View>
  );
};

const QuickAction: React.FC<{
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  styles: any;
}> = ({ icon, label, color, onPress, styles }) => (
  <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={22} color={color} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

// ============================================
// STYLES
// ============================================

const getStyles = (C: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    brandHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 4,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    brandLogo: {
      width: 32,
      height: 32,
    },
    brandWordmark: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    brandName: {
      fontSize: 20,
      fontWeight: '800',
      fontFamily: 'Outfit-Bold',
      letterSpacing: -0.3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 8,
    },
    greeting: {
      fontSize: 22,
      fontWeight: '700',
      color: C.text,
    },
    date: {
      fontSize: 13,
      color: C.textSecondary,
      textTransform: 'capitalize',
    },
    dateNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
      gap: 6,
    },
    dateNavBtn: {
      paddingVertical: 2,
      paddingHorizontal: 2,
    },
    notificationBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    trialBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginVertical: 8,
      backgroundColor: C.warning + '15',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      gap: 8,
      borderWidth: 1,
      borderColor: C.warning + '30',
    },
    trialBannerText: {
      flex: 1,
      fontSize: 13,
      color: C.warning,
      fontWeight: '500',
    },
    trainingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginVertical: 6,
      backgroundColor: '#FF6A4D15',
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: '#FF6A4D40',
      gap: 10,
    },
    trainingBannerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    trainingBannerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FF6A4D',
    },
    trainingBannerSub: {
      fontSize: 12,
      color: C.textSecondary,
      marginTop: 1,
    },
    subscriptionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 20,
      marginVertical: 8,
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 8,
    },
    subscriptionBannerText: {
      fontSize: 14,
      color: C.white,
      fontWeight: '600',
    },

    // ===== ADAPTIVE BANNER =====
    adaptiveBanner: {
      marginHorizontal: 16,
      marginVertical: 8,
      backgroundColor: C.primary + '12',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.primary + '30',
    },
    adaptiveBannerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    adaptiveBannerIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: C.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    adaptiveBannerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: C.primary,
      flex: 1,
    },
    adaptiveBannerText: {
      fontSize: 13,
      color: C.text,
      lineHeight: 19,
      marginBottom: 10,
      includeFontPadding: false,
    },
    adherenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: C.primary + '20',
    },
    adherenceLabel: {
      fontSize: 12,
      color: C.textSecondary,
      flex: 1,
    },
    adherenceValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    adherenceTrend: {
      fontSize: 14,
    },
    adaptiveActions: {
      flexDirection: 'row',
      gap: 10,
    },
    adaptiveAcceptBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingVertical: 10,
      gap: 6,
    },
    adaptiveAcceptText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    adaptiveDismissBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    adaptiveDismissText: {
      fontSize: 13,
      fontWeight: '600',
      color: C.textSecondary,
    },

    // ===== DASHBOARD CARD =====
    dashboardCard: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: C.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: C.border,
    },
    ringRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    rebalanceBanner: {
      flexDirection: 'column',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 12,
    },
    rebalanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rebalanceDisclaimer: {
      fontSize: 10,
      fontFamily: 'InstrumentSans',
      fontStyle: 'italic',
      lineHeight: 14,
      marginTop: 2,
    },
    rebalanceText: {
      fontSize: 12,
      fontFamily: 'InstrumentSans-Medium',
      flex: 1,
    },
    calorieStats: {
      flex: 1,
      flexDirection: 'column',
      marginLeft: 16,
      gap: 6,
    },
    calorieStat: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    calorieValue: {
      fontSize: 20,
      fontWeight: '700',
    },
    calorieLabel: {
      fontSize: 11,
      color: C.textMuted,
    },
    calorieDivider: {
      height: 1,
      marginVertical: 2,
    },

    // ===== MACRO PROGRESS BARS =====
    macroBarsContainer: {
      gap: 14,
    },
    macroBarRow: {
      gap: 4,
    },
    macroBarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    macroBarLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: C.text,
    },
    macroBarValues: {
      fontSize: 13,
    },
    macroBarCurrent: {
      fontWeight: '700',
      fontSize: 14,
    },
    macroBarSeparator: {
      color: C.textMuted,
      fontWeight: '400',
    },
    macroBarTrack: {
      height: 10,
      borderRadius: 5,
      backgroundColor: C.surfaceLight || C.border,
      overflow: 'hidden',
    },
    macroBarFill: {
      height: '100%',
      borderRadius: 5,
    },
    macroBarPercent: {
      fontSize: 11,
      fontWeight: '500',
      textAlign: 'right',
    },

    // ===== QUICK ACTIONS =====
    quickActionsSection: {
      marginHorizontal: 16,
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: C.text,
      marginBottom: 12,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    quickActionCard: {
      width: '48%' as any,
      flexGrow: 1,
      flexBasis: '46%',
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    quickActionIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickActionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: C.text,
      textAlign: 'center',
    },

    // ===== MEALS =====
    mealsSection: {
      marginHorizontal: 16,
      marginTop: 16,
    },
    mealGroup: {
      marginBottom: 16,
    },
    mealGroupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    mealGroupEmoji: {
      fontSize: 16,
    },
    mealGroupLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: C.textSecondary,
    },
    mealGroupCalories: {
      fontSize: 13,
      color: C.textMuted,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
      backgroundColor: C.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      borderStyle: 'dashed',
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 15,
      color: C.textSecondary,
      marginBottom: 12,
    },
    emptyButton: {
      fontSize: 14,
      color: C.primary,
      fontWeight: '600',
    },
    // Achievement celebration overlay
    celebrationOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
    },
    celebrationCard: {
      width: 300,
      borderRadius: 24,
      borderWidth: 2,
      padding: 28,
      alignItems: 'center',
      gap: 8,
      elevation: 12,
    },
    celebrationEmoji: {
      fontSize: 64,
      marginBottom: 8,
    },
    celebrationTitle: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    celebrationName: {
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
    },
    celebrationDesc: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
