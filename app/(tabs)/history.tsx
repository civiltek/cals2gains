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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import Colors from '../../constants/colors';
import MealCard from '../../components/ui/MealCard';
import { useUserStore } from '../../store/userStore';
import { useMealStore } from '../../store/mealStore';
import { Meal } from '../../types';

export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useUserStore();
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
  const totalCalories = selectedMeals.reduce((s, m) => s + m.nutrition.calories, 0);

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await removeMeal(mealId);
    } catch {
      Alert.alert(t('errors.generic'));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('history.title')}</Text>
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
              style={[styles.dateButton, isSelected && styles.dateButtonSelected]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[styles.dateDayLabel, isSelected && styles.dateLabelSelected]}>
                {format(date, 'EEE', { locale }).substring(0, 3)}
              </Text>
              <Text style={[styles.dateDayNumber, isSelected && styles.dateLabelSelected]}>
                {format(date, 'd')}
              </Text>
              {hasMeals && (
                <View style={[styles.hasMealsDot, isSelected && styles.hasMealsDotSelected]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected day summary */}
      <View style={styles.daySummary}>
        <View>
          <Text style={styles.daySummaryDate}>
            {formatDateLabel(selectedDate)} · {format(selectedDate, 'MMMM d', { locale })}
          </Text>
          <Text style={styles.daySummaryMeals}>
            {selectedMeals.length} {selectedMeals.length === 1 ? t('history.meal') : t('history.meals')}
          </Text>
        </View>
        <View style={styles.daySummaryCalories}>
          <Text style={styles.daySummaryCaloriesValue}>
            {Math.round(totalCalories)}
          </Text>
          <Text style={styles.daySummaryCaloriesUnit}>kcal</Text>
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
            <Text style={styles.emptyText}>{t('history.noMeals')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MealCard
            meal={item}
            onDelete={handleDeleteMeal}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
  dateButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateDayLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  dateDayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  dateLabelSelected: {
    color: Colors.white,
  },
  hasMealsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    marginTop: 2,
  },
  hasMealsDotSelected: {
    backgroundColor: Colors.white,
  },
  daySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  daySummaryDate: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  daySummaryMeals: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  daySummaryCalories: {
    alignItems: 'flex-end',
  },
  daySummaryCaloriesValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
  },
  daySummaryCaloriesUnit: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
  },
});
