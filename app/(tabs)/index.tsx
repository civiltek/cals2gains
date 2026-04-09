// ============================================
// Cals2Gains - Home / Dashboard Screen
// ============================================

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import Colors from '../../constants/colors';
import MacroRing from '../../components/ui/MacroRing';
import MacroBar from '../../components/ui/MacroBar';
import MealCard from '../../components/ui/MealCard';
import { useUserStore } from '../../store/userStore';
import { useMealStore } from '../../store/mealStore';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { user, isSubscriptionActive, isOnTrial, trialDaysRemaining } = useUserStore();
  const {
    todayMeals,
    todayNutrition,
    isLoading,
    loadTodayMeals,
    removeMeal,
  } = useMealStore();

  const locale = i18n.language === 'es' ? es : enUS;
  const today = format(new Date(), 'EEEE, d MMMM', { locale });

  useEffect(() => {
    if (user) {
      loadTodayMeals(user.uid);
    }
  }, [user?.uid]);

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

  const goals = user?.goals || { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 30 };

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {t('home.greeting')}, {user?.displayName?.split(' ')[0] || '👋'}
            </Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/paywall')}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Trial banner */}
        {isOnTrial() && trialDaysRemaining() <= 3 && (
          <TouchableOpacity
            style={styles.trialBanner}
            onPress={() => router.push('/paywall')}
          >
            <Ionicons name="time-outline" size={16} color={Colors.warning} />
            <Text style={styles.trialBannerText}>
              {t('home.trialBanner', { days: trialDaysRemaining() })}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.warning} />
          </TouchableOpacity>
        )}

        {/* Subscription expired banner */}
        {!isSubscriptionActive() && (
          <TouchableOpacity
            style={styles.subscriptionBanner}
            onPress={() => router.push('/paywall')}
          >
            <Ionicons name="lock-closed" size={16} color={Colors.white} />
            <Text style={styles.subscriptionBannerText}>{t('home.subscribeToContinue')}</Text>
          </TouchableOpacity>
        )}

        {/* Calorie ring + macros summary */}
        <View style={styles.calorieSection}>
          <MacroRing
            calories={todayNutrition.calories}
            calorieGoal={goals.calories}
            protein={todayNutrition.protein}
            carbs={todayNutrition.carbs}
            fat={todayNutrition.fat}
            size={170}
          />

          <View style={styles.calorieSummary}>
            <CalorieStat
              label={t('home.caloriesConsumed')}
              value={Math.round(todayNutrition.calories)}
              unit="kcal"
              color={Colors.accent}
            />
            <View style={styles.calorieDivider} />
            <CalorieStat
              label={t('home.caloriesGoal')}
              value={goals.calories}
              unit="kcal"
              color={Colors.textSecondary}
            />
            <View style={styles.calorieDivider} />
            <CalorieStat
              label={t('home.caloriesRemaining')}
              value={Math.max(0, goals.calories - Math.round(todayNutrition.calories))}
              unit="kcal"
              color={Colors.primary}
            />
          </View>
        </View>

        {/* Macro bars */}
        <View style={styles.macrosSection}>
          <Text style={styles.sectionTitle}>{t('home.macros')}</Text>
          <MacroBar
            label={t('home.protein')}
            current={todayNutrition.protein}
            goal={goals.protein}
            unit="g"
            color={Colors.protein}
            compact
          />
          <MacroBar
            label={t('home.carbs')}
            current={todayNutrition.carbs}
            goal={goals.carbs}
            unit="g"
            color={Colors.carbs}
            compact
          />
          <MacroBar
            label={t('home.fat')}
            current={todayNutrition.fat}
            goal={goals.fat}
            unit="g"
            color={Colors.fat}
            compact
          />
          <MacroBar
            label={t('home.fiber')}
            current={todayNutrition.fiber || 0}
            goal={goals.fiber}
            unit="g"
            color={Colors.fiber}
            compact
          />
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
                      {Math.round(meals.reduce((s, m) => s + m.nutrition.calories, 0))} kcal
                    </Text>
                  </View>
                  {meals.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onDelete={handleDeleteMeal}
                      compact
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

const CalorieStat: React.FC<{
  label: string;
  value: number;
  unit: string;
  color: string;
}> = ({ label, value, unit, color }) => (
  <View style={styles.calorieStat}>
    <Text style={[styles.calorieStatValue, { color }]}>{value}</Text>
    <Text style={styles.calorieStatUnit}>{unit}</Text>
    <Text style={styles.calorieStatLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  date: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: Colors.warning + '15',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  trialBannerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.warning,
    fontWeight: '500',
  },
  subscriptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  subscriptionBannerText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
  calorieSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calorieSummary: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 16,
  },
  calorieStat: {
    alignItems: 'center',
  },
  calorieStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  calorieStatUnit: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  calorieStatLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  calorieDivider: {
    width: 1,
    backgroundColor: Colors.border,
    height: 40,
    alignSelf: 'center',
  },
  macrosSection: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
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
    color: Colors.textSecondary,
  },
  mealGroupCalories: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  emptyButton: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
