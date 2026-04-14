// ============================================
// Cals2Gains - History Screen
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  format,
  subDays,
  isSameDay,
  isYesterday,
  isToday,
} from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useColors, useThemeStore } from '../../store/themeStore';
import MealCard from '../../components/ui/MealCard';
import { useUserStore } from '../../store/userStore';
import { useMealStore } from '../../store/mealStore';
import { Meal } from '../../types';

// Brand logo assets
const LOGO_MARK = require('../../brand-assets/C2G-Mark-512.png');

export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const C = useColors();
  const isDark = useThemeStore(s => s.isDark);
  const { user } = useUserStore();
  const nutritionMode = useUserStore((s) => s.user?.nutritionMode || 'simple');
  const { recentMeals, loadRecentMeals, removeMeal } = useMealStore();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const locale = i18n.language === 'es' ? es : enUS;

  useEffect(() => {
    if (user) loadRecentMeals(user.uid);
  }, [user?.uid]);

  // Group meals by date
  const groupedMeals = recentMeals.reduce((groups, meal) => {
    const dateKey = format(meal.timestamp, 'yyyy-MM-dd');
    return {
      ...groups,
      [dateKey]: [...(groups[dateKey] || []), meal],
    };
  }, {} as Record<string, Meal[]>);

  // Get last 7 days for date picker
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i));

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return t('history.today');
    if (isYesterday(date)) return t('history.yesterday');
    return format(date, 'EEE d', { locale });
  };

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedMeals = groupedMeals[selectedDateKey] || [];
  const totalCalories = selectedMeals.reduce((s, m) => s + (m.nutrition?.calories ?? m.calories ?? 0), 0);

  const handleEditMeal = (meal: any) => {
    router.push({
      pathname: '/edit-meal',
      params: { mealJson: JSON.stringify(meal) },
    });
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await removeMeal(mealId);
    } catch {
      Alert.alert(t('errors.generic'));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <View style={styles.brandRow}>
          <Image source={LOGO_MARK} style={styles.brandLogo} resizeMode="contain" />
          <View style={styles.brandWordmark}>
            <Text style={[styles.brandName, { color: C.text }]}>
              <Text style={{ color: C.violet }}>Cals</Text>
              <Text style={{ color: C.coral, fontSize: 15, fontFamily: 'Outfit-Bold' }}>2</Text>
              <Text style={{ color: C.violet }}>Gains</Text>
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/paywall')}>
          <Ionicons name="notifications-outline" size={22} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: C.text }]}>{t('history.title')}</Text>
      </View>

      {/* Date picker */}
      <View style={styles.datePicker}>
        {last7Days.reverse().map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const isSelected = isSameDay(date, selectedDate);
          const hasMeals = (groupedMeals[dateKey] || []).length > 0;

          return (
            <TouchableOpacity
              key={dateKey}
              style={[
                styles.dateButton,
                {
                  backgroundColor: isSelected ? C.primary : C.surface,
                  borderColor: isSelected ? C.primary : C.border,
                },
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[styles.dateDayLabel, { color: isSelected ? C.white : C.textMuted }]}>
                {format(date, 'EEE', { locale }).substring(0, 3)}
              </Text>
              <Text style={[styles.dateDayNumber, { color: isSelected ? C.white : C.text }]}>
                {format(date, 'd')}
              </Text>
              {hasMeals && (
                <View style={[styles.hasMealsDot, { backgroundColor: isSelected ? C.white : C.accent }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected day summary */}
      <View style={[styles.daySummary, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View>
          <Text style={[styles.daySummaryDate, { color: C.text }]}>
            {formatDateLabel(selectedDate)} · {format(selectedDate, 'MMMM d', { locale })}
          </Text>
          <Text style={[styles.daySummaryMeals, { color: C.textSecondary }]}>
            {selectedMeals.length} {selectedMeals.length === 1 ? t('history.meal') : t('history.meals')}
          </Text>
        </View>
        <View style={styles.daySummaryCalories}>
          <Text style={[styles.daySummaryCaloriesValue, { color: C.primary }]}>
            {Math.round(totalCalories)}
          </Text>
          <Text style={[styles.daySummaryCaloriesUnit, { color: C.textSecondary }]}>kcal</Text>
        </View>
      </View>

      {/* Meals list */}
      <FlatList
        data={selectedMeals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>{t('history.noMeals')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MealCard
            meal={item}
            onDelete={handleDeleteMeal}
            onEdit={handleEditMeal}
            nutritionMode={nutritionMode}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.text + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  datePicker: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  dateButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  dateDayLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  dateDayNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  hasMealsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  daySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  daySummaryDate: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  daySummaryMeals: {
    fontSize: 13,
    marginTop: 2,
  },
  daySummaryCalories: {
    alignItems: 'flex-end',
  },
  daySummaryCaloriesValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  daySummaryCaloriesUnit: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 16,
  },
});
