// ============================================
// Cals2Gains - Protein Dashboard
// ============================================
// Protein-first tracking view with progress ring,
// remaining targets, streak, quick foods, and timeline

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '../store/themeStore';
import { usePremiumGate } from '../hooks/usePremiumGate';
import { useUserStore } from '../store/userStore';
import { useMealStore } from '../store/mealStore';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const RING_SIZE = 200;
const RING_WIDTH = 14;

interface ProteinFood {
  id: string;
  name: string;
  protein: number;
  serving: string;
  icon: string;
}

const QUICK_PROTEIN_FOODS: ProteinFood[] = [
  { id: '1', name: 'proteinDashboard.chickenBreast', protein: 31, serving: '100g', icon: 'restaurant-outline' },
  { id: '2', name: 'proteinDashboard.eggs', protein: 12, serving: '2 uds', icon: 'ellipse-outline' },
  { id: '3', name: 'proteinDashboard.wheyProtein', protein: 25, serving: '30g', icon: 'flask-outline' },
  { id: '4', name: 'proteinDashboard.greekYogurt', protein: 10, serving: '100g', icon: 'cafe-outline' },
  { id: '5', name: 'proteinDashboard.cannedTuna', protein: 26, serving: '100g', icon: 'fish-outline' },
  { id: '6', name: 'proteinDashboard.cottageCheese', protein: 14, serving: '100g', icon: 'nutrition-outline' },
];

export default function ProteinDashboard() {
  const isPremium = usePremiumGate();
  if (!isPremium) return null;

  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const macroStyles = useMemo(() => createMacroStyles(C), [C]);
  const { t, i18n } = useTranslation();
  const { user } = useUserStore();
  const { todayMeals, todayNutrition, addMeal, recentMeals, loadRecentMeals } = useMealStore();

  const proteinGoal = user?.goals?.protein || 150;

  // Load recent meals for streak calculation
  useEffect(() => {
    if (user?.uid) loadRecentMeals(user.uid);
  }, [user?.uid]);

  // Calculate from real meal data
  const proteinConsumed = useMemo(
    () => Math.round(todayNutrition?.protein || 0),
    [todayNutrition]
  );
  const proteinRemaining = Math.max(0, proteinGoal - proteinConsumed);
  const percentage = Math.min(proteinConsumed / proteinGoal, 1);

  // Count meals remaining (assume 4 meals/day max)
  const mealsEaten = todayMeals.length;
  const mealsRemaining = Math.max(1, 4 - mealsEaten);
  const nextMealTarget = proteinRemaining > 0 ? Math.ceil(proteinRemaining / mealsRemaining) : 0;

  // Streak — count consecutive days meeting protein goal from all available meals
  const streakDays = useMemo(() => {
    if (!proteinGoal) return 0;
    const allMeals = [...todayMeals, ...recentMeals];
    const seen = new Set<string>();
    const uniqueMeals = allMeals.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    // Aggregate protein by calendar day
    const dayProtein = new Map<string, number>();
    for (const m of uniqueMeals) {
      try {
        const day = format(new Date(m.timestamp), 'yyyy-MM-dd');
        dayProtein.set(day, (dayProtein.get(day) || 0) + (m.nutrition?.protein || 0));
      } catch {
        // skip meals with invalid timestamps
      }
    }
    // Count consecutive days from today backwards
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = format(d, 'yyyy-MM-dd');
      const protein = dayProtein.get(key) || 0;
      if (protein >= proteinGoal) {
        streak++;
      } else if (i === 0) {
        // Today not yet complete — skip and keep checking yesterday
        continue;
      } else {
        break;
      }
    }
    return streak;
  }, [todayMeals, recentMeals, proteinGoal]);

  const handleQuickLog = async (food: ProteinFood) => {
    if (!user?.uid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await addMeal({
        userId: user.uid,
        timestamp: new Date(),
        photoUri: '',
        dishName: food.name,
        dishNameEs: food.name,
        dishNameEn: food.name,
        ingredients: [],
        portionDescription: food.serving,
        estimatedWeight: parseInt(food.serving) || 100,
        nutrition: {
          calories: Math.round(food.protein * 5), // rough estimate
          protein: food.protein,
          carbs: 0,
          fat: Math.round(food.protein * 0.3),
          fiber: 0,
        },
        mealType: 'snack',
        aiConfidence: 0.9,
      });
      Alert.alert(t('common.logged'), `${t(food.name)} (+${food.protein}g ${t('nutrition.protein')})`);
    } catch {
      Alert.alert(t('errors.error'), t('proteinDashboard.logError'));
    }
  };

  // ── Ring SVG ──
  const radius = RING_SIZE / 2 - RING_WIDTH;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);

  // Ring color based on progress
  const ringColor = percentage >= 1
    ? C.success
    : percentage >= 0.7
      ? C.primary
      : percentage >= 0.4
        ? C.protein
        : C.accent;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Protein Ring ── */}
      <View style={styles.ringContainer}>
        <View style={styles.ringWrapper}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Background track */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={radius}
              stroke={C.surfaceLight || C.border}
              strokeWidth={RING_WIDTH}
              fill="none"
            />
            {/* Progress arc */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={radius}
              stroke={ringColor}
              strokeWidth={RING_WIDTH}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation={-90}
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          {/* Center text — positioned absolutely inside the ring */}
          <View style={styles.ringCenterText}>
            <Text style={[styles.ringNumber, { color: ringColor }]}>{proteinConsumed}</Text>
            <Text style={styles.ringUnit}>{t('common.of')} {proteinGoal}g</Text>
          </View>
        </View>
        <Text style={styles.ringCaption}>
          {percentage >= 1 ? t('proteinDashboard.goalMet') : `${Math.round(percentage * 100)}% ${t('proteinDashboard.ofGoal')}`}
        </Text>
      </View>

      {/* ── Remaining Card ── */}
      {proteinRemaining > 0 && (
        <View style={styles.remainingCard}>
          <View style={styles.remainingHeader}>
            <View style={styles.remainingIconCircle}>
              <Ionicons name="flame" size={20} color={C.accent} />
            </View>
            <View style={styles.remainingHeaderText}>
              <Text style={styles.remainingTitle}>{t('proteinDashboard.remaining')}</Text>
              <Text style={styles.remainingValue}>{proteinRemaining}g</Text>
            </View>
          </View>

          <View style={styles.remainingDivider} />

          <View style={styles.remainingMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={C.textSecondary} />
              <Text style={styles.metaText}>{mealsRemaining} {t('proteinDashboard.mealsRemaining')}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="trending-up-outline" size={16} color={C.primary} />
              <Text style={[styles.metaText, { color: C.primary }]}>
                ~{nextMealTarget}g {t('proteinDashboard.perMeal')}
              </Text>
            </View>
          </View>

          <View style={styles.suggestionsBox}>
            <Text style={styles.suggestionsLabel}>{t('proteinDashboard.quickIdeas')}</Text>
            <Text style={styles.suggestionItem}>
              {t('proteinDashboard.suggestions')}
            </Text>
          </View>
        </View>
      )}

      {/* ── Streak Badge ── */}
      {streakDays > 0 && (
        <View style={styles.streakCard}>
          <Ionicons name="flame" size={22} color={C.accent} />
          <Text style={styles.streakText}>
            <Text style={styles.streakNumber}>{streakDays} {t('common.days')}</Text> {t('proteinDashboard.meetingGoal')}
          </Text>
        </View>
      )}

      {/* ── Other Macros ── */}
      <View style={styles.macrosCard}>
        <Text style={styles.sectionTitle}>{t('proteinDashboard.otherMacros')}</Text>
        <MacroRow
          label={t('nutrition.carbs')}
          value={Math.round(todayNutrition?.carbs || 0)}
          goal={user?.goals?.carbs || 250}
          color={C.carbs}
        />
        <MacroRow
          label={t('nutrition.fat')}
          value={Math.round(todayNutrition?.fat || 0)}
          goal={user?.goals?.fat || 65}
          color={C.fat}
        />
        <MacroRow
          label={t('nutrition.fiber')}
          value={Math.round(todayNutrition?.fiber || 0)}
          goal={user?.goals?.fiber || 30}
          color={C.fiber}
        />
      </View>

      {/* ── Quick Protein Foods ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('proteinDashboard.quickProteins')}</Text>
        <View style={styles.foodGrid}>
          {QUICK_PROTEIN_FOODS.map((food) => (
            <TouchableOpacity
              key={food.id}
              style={styles.foodCard}
              onPress={() => handleQuickLog(food)}
              activeOpacity={0.7}
            >
              <Ionicons name={food.icon as any} size={24} color={C.primary} />
              <Text style={styles.foodName} numberOfLines={1}>{t(food.name)}</Text>
              <Text style={styles.foodProtein}>+{food.protein}g</Text>
              <Text style={styles.foodServing}>{food.serving}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Today's Timeline ── */}
      {todayMeals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('proteinDashboard.todayLog')}</Text>
          <View style={styles.timeline}>
            {todayMeals.map((meal, i) => {
              const time = meal.timestamp instanceof Date
                ? meal.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                : '';
              const mealProtein = Math.round(meal.nutrition?.protein || 0);
              const dishName = i18n.language === 'es'
                ? (meal.dishNameEs || meal.dishName)
                : (meal.dishNameEn || meal.dishName);

              return (
                <View key={meal.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: C.primary }]} />
                    {i < todayMeals.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTime}>{time}</Text>
                    <Text style={styles.timelineName} numberOfLines={1}>{dishName}</Text>
                    <View style={styles.timelineProteinBadge}>
                      <Text style={styles.timelineProteinText}>{mealProtein}g prot</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── Sub-component: Macro progress bar ──
const MacroRow: React.FC<{
  label: string;
  value: number;
  goal: number;
  color: string;
}> = ({ label, value, goal, color }) => {
  const C = useColors();
  const macroStyles = useMemo(() => createMacroStyles(C), [C]);
  const pct = Math.min((value / goal) * 100, 100);
  return (
    <View style={macroStyles.row}>
      <View style={macroStyles.labelRow}>
        <Text style={macroStyles.label}>{label}</Text>
        <Text style={macroStyles.values}>{value}g / {goal}g</Text>
      </View>
      <View style={macroStyles.barBg}>
        <View style={[macroStyles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

function createMacroStyles(C: any) {
  return StyleSheet.create({
    row: { gap: 6, marginTop: 14 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
    label: { fontSize: 13, fontWeight: '600', color: C.text },
    values: { fontSize: 13, color: C.textSecondary },
    barBg: { height: 6, borderRadius: 3, backgroundColor: C.surfaceLight || C.border, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3 },
  });
}

// ── Main styles ──
function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },

    // Ring
    ringContainer: {
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 24,
    },
    ringWrapper: {
      width: RING_SIZE,
      height: RING_SIZE,
      justifyContent: 'center',
      alignItems: 'center',
    },
    ringCenterText: {
      position: 'absolute',
      alignItems: 'center',
    },
    ringNumber: {
      fontSize: 44,
      fontWeight: '800',
      lineHeight: 48,
    },
    ringUnit: {
      fontSize: 14,
      color: C.textSecondary,
      marginTop: 2,
    },
    ringCaption: {
      fontSize: 13,
      color: C.textSecondary,
      marginTop: 8,
    },

    // Remaining card
    remainingCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: C.border,
    },
    remainingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    remainingIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.accent + '18',
      justifyContent: 'center',
      alignItems: 'center',
    },
    remainingHeaderText: {
      flex: 1,
    },
    remainingTitle: {
      fontSize: 13,
      color: C.textSecondary,
    },
    remainingValue: {
      fontSize: 28,
      fontWeight: '800',
      color: C.text,
      lineHeight: 32,
    },
    remainingDivider: {
      height: 1,
      backgroundColor: C.border,
      marginVertical: 14,
    },
    remainingMeta: {
      flexDirection: 'row',
      gap: 20,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 13,
      color: C.textSecondary,
    },
    suggestionsBox: {
      marginTop: 14,
      backgroundColor: C.background,
      borderRadius: 10,
      padding: 12,
    },
    suggestionsLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: C.textSecondary,
      marginBottom: 4,
    },
    suggestionItem: {
      fontSize: 12,
      color: C.textMuted,
      lineHeight: 18,
    },

    // Streak
    streakCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.accent + '12',
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      gap: 10,
      borderWidth: 1,
      borderColor: C.accent + '25',
    },
    streakText: {
      fontSize: 14,
      color: C.textSecondary,
    },
    streakNumber: {
      fontWeight: '700',
      color: C.accent,
    },

    // Macros card
    macrosCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: C.border,
    },

    // Sections
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: C.text,
      marginBottom: 12,
    },

    // Food grid
    foodGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    foodCard: {
      width: (width - 52) / 3,
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      gap: 4,
    },
    foodName: {
      fontSize: 11,
      fontWeight: '600',
      color: C.text,
      textAlign: 'center',
      marginTop: 4,
    },
    foodProtein: {
      fontSize: 15,
      fontWeight: '800',
      color: C.protein,
    },
    foodServing: {
      fontSize: 10,
      color: C.textMuted,
    },

    // Timeline
    timeline: {
      gap: 0,
    },
    timelineItem: {
      flexDirection: 'row',
      gap: 14,
      minHeight: 60,
    },
    timelineLeft: {
      alignItems: 'center',
      width: 20,
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 4,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: C.border,
      marginTop: 4,
    },
    timelineContent: {
      flex: 1,
      paddingBottom: 16,
    },
    timelineTime: {
      fontSize: 11,
      fontWeight: '600',
      color: C.textMuted,
    },
    timelineName: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
      marginTop: 2,
    },
    timelineProteinBadge: {
      alignSelf: 'flex-start',
      backgroundColor: C.protein + '20',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 4,
    },
    timelineProteinText: {
      fontSize: 12,
      fontWeight: '700',
      color: C.protein,
    },
  });
}
