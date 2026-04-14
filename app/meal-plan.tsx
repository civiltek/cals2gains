import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  PanResponder,
  GestureResponderEvent,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMealPlanStore } from '../store/mealPlanStore';
import { useMealStore } from '../store/mealStore';
import { useUserStore } from '../store/userStore';
import { PlannedMeal, MealType } from '../types';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useColors } from '../store/themeStore';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface MealSlot {
  mealType: MealType;
  meal?: PlannedMeal;
}

interface AddMealModalState {
  visible: boolean;
  selectedMealType?: MealType;
  selectedDate?: Date;
}

export default function MealPlanScreen() {
  const C = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const MEAL_TYPES_ES: Record<string, string> = {
    breakfast: t('home.breakfast'),
    lunch: t('home.lunch'),
    dinner: t('home.dinner'),
    snack: t('home.snack'),
  };
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [addMealModal, setAddMealModal] = useState<AddMealModalState>({
    visible: false,
  });
  const [longPressedMeal, setLongPressedMeal] = useState<{
    meal: PlannedMeal;
    visible: boolean;
  }>({ meal: null, visible: false });

  const { addMeal } = useMealStore();
  const { user } = useUserStore();

  const {
    currentPlan,
    loadPlan,
    addPlannedMeal,
    removePlannedMeal,
    toggleMealCompleted,
    generateGroceryList,
    getDayMeals,
    getDayNutrition,
  } = useMealPlanStore();

  useEffect(() => {
    const weekStart = getWeekStart(new Date());
    loadPlan('user-placeholder', weekStart);
  }, [loadPlan]);

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getWeekDays = (): Date[] => {
    const start = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      return date;
    });
  };

  const weekDays = getWeekDays();
  const dayMeals = getDayMeals(selectedDate);
  const dayNutrition = getDayNutrition(selectedDate);
  const DAYS = [t('mealPlan.dayMon'), t('mealPlan.dayTue'), t('mealPlan.dayWed'), t('mealPlan.dayThu'), t('mealPlan.dayFri'), t('mealPlan.daySat'), t('mealPlan.daySun')];

  const handlePreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handleSelectDay = (date: Date) => {
    Haptics.selectionAsync();
    setSelectedDate(date);
  };

  const handleOpenAddMeal = (mealType: MealType) => {
    Haptics.selectionAsync();
    setAddMealModal({
      visible: true,
      selectedMealType: mealType,
      selectedDate,
    });
  };

  const handleAddMealFromRecipe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddMealModal({ visible: false });
    // Navigate to recipe selection
    router.push('/recipes');
  };

  const handleAddMealFromTemplate = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddMealModal({ visible: false });
    // Navigate to quick-add (no templates screen exists)
    router.push('/quick-add');
  };

  const handleSearchFood = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddMealModal({ visible: false });
    // Navigate to food search
    router.push('/food-search');
  };

  const handleRemoveMeal = (mealId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    removePlannedMeal(mealId);
  };

  const handleToggleMealCompleted = (mealId: string) => {
    Haptics.selectionAsync();
    toggleMealCompleted(mealId);
  };

  const handleLongPressMeal = (meal: PlannedMeal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLongPressedMeal({ meal, visible: true });
  };

  const handleLogMeal = async (meal: PlannedMeal) => {
    const mealName = (meal as any).name || meal.customName || t('mealPlan.plannedMeal');
    try {
      const nutrition = meal.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      await addMeal({
        userId: user?.uid || '',
        timestamp: new Date(),
        photoUri: '',
        dishName: mealName,
        dishNameEs: mealName,
        dishNameEn: mealName,
        ingredients: (meal as any).ingredients || [],
        portionDescription: `${meal.servings || 1} ${t('mealPlan.portion')}`,
        estimatedWeight: 0,
        nutrition: {
          calories: Math.round(nutrition.calories || 0),
          protein: Math.round(nutrition.protein || 0),
          carbs: Math.round(nutrition.carbs || 0),
          fat: Math.round(nutrition.fat || 0),
          fiber: Math.round(nutrition.fiber || 0),
        },
        mealType: meal.mealType,
        aiConfidence: 1,
      });

      // Mark as completed in the plan
      if (!meal.completed) {
        toggleMealCompleted(meal.id);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('mealPlan.registered'), t('mealPlan.addedToHistory', { mealName }));
    } catch (error: any) {
      console.error('Failed to log planned meal:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('mealPlan.logError'), error?.message || t('mealPlan.saveError'));
    }
  };

  const handleGenerateGroceryList = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await generateGroceryList('user-placeholder');
    router.push('/grocery-list');
  };

  const mealSlots: MealSlot[] = MEAL_ORDER.map((mealType) => ({
    mealType,
    meal: dayMeals.find((m) => m.mealType === mealType),
  }));

  const isSelected = (date: Date): boolean => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.bone }]}>{t('mealPlan.weeklyPlan')}</Text>
        <View style={styles.weekNav}>
          <TouchableOpacity
            onPress={handlePreviousWeek}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color={C.violet} />
          </TouchableOpacity>
          <Text style={[styles.weekLabel, { color: C.textSecondary }]}>
            {weekDays[0].toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            -{' '}
            {weekDays[6].toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <TouchableOpacity
            onPress={handleNextWeek}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-forward" size={24} color={C.violet} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Day Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daySelector}
      >
        {weekDays.map((date, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayButton,
              isSelected(date) && styles.dayButtonActive,
              { backgroundColor: isSelected(date) ? C.violet : C.card, borderColor: isSelected(date) ? C.violet : C.border },
            ]}
            onPress={() => handleSelectDay(date)}
          >
            <Text style={[styles.dayButtonText, { color: C.textSecondary }]}>{DAYS[index]}</Text>
            <Text
              style={[
                styles.dayDate,
                isSelected(date) && styles.dayDateActive,
                { color: isSelected(date) ? C.background : C.bone },
              ]}
            >
              {date.getDate()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Meals for Selected Day */}
      <ScrollView
        style={styles.mealsContainer}
        showsVerticalScrollIndicator={false}
      >
        {mealSlots.map((slot) => (
          <View key={slot.mealType} style={[styles.mealCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.mealHeader, { backgroundColor: C.cardHover }]}>
              <Text style={[styles.mealTypeLabel, { color: C.violet }]}>
                {MEAL_TYPES_ES[slot.mealType]}
              </Text>
            </View>

            {slot.meal ? (
              <Pressable
                onLongPress={() => handleLongPressMeal(slot.meal)}
                onPress={() => handleToggleMealCompleted(slot.meal.id)}
              >
                <View
                  style={[
                    styles.mealContent,
                    slot.meal.completed && styles.mealCompleted,
                  ]}
                >
                  <View style={styles.mealInfo}>
                    <Text
                      style={[
                        styles.mealName,
                        slot.meal.completed && styles.mealNameStrikethrough,
                      ]}
                    >
                      {slot.meal.name}
                    </Text>
                    {slot.meal.nutrition && (
                      <Text style={[styles.mealMacros, { color: C.textSecondary }]}>
                        {Math.round(slot.meal.nutrition?.calories ?? 0)} cal •{' '}
                        {Math.round(slot.meal.nutrition?.protein ?? 0)}g P •{' '}
                        {Math.round(slot.meal.nutrition?.carbs ?? 0)}g C •{' '}
                        {Math.round(slot.meal.nutrition?.fat ?? 0)}g F
                      </Text>
                    )}
                  </View>

                  <View style={styles.mealActions}>
                    {!slot.meal.completed && (
                      <TouchableOpacity
                        onPress={() => handleLogMeal(slot.meal)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={{ marginRight: 8 }}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={C.success || '#4CAF50'}
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleRemoveMeal(slot.meal.id)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={C.coral}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </Pressable>
            ) : (
              <TouchableOpacity
                style={styles.emptySlot}
                onPress={() => handleOpenAddMeal(slot.mealType)}
              >
                <Ionicons name="add-circle-outline" size={28} color={C.violet} />
                <Text style={[styles.emptySlotText, { color: C.violet }]}>{t('mealPlan.addFood')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Daily Nutrition Summary */}
      <View style={[styles.nutritionSummary, { backgroundColor: C.card, borderTopColor: C.border }]}>
        <View style={styles.nutritionRow}>
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionLabel, { color: C.textSecondary }]}>Cal</Text>
            <Text style={[styles.nutritionValue, { color: C.violet }]}>
              {Math.round(dayNutrition.calories)}
            </Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionLabel, { color: C.textSecondary }]}>{t('nutrition.protein')}</Text>
            <Text style={[styles.nutritionValue, { color: C.violet }]}>
              {Math.round(dayNutrition.protein)}g
            </Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionLabel, { color: C.textSecondary }]}>{t('quickAdd.carbs')}</Text>
            <Text style={[styles.nutritionValue, { color: C.violet }]}>
              {Math.round(dayNutrition.carbs)}g
            </Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionLabel, { color: C.textSecondary }]}>{t('nutrition.fat')}</Text>
            <Text style={[styles.nutritionValue, { color: C.violet }]}>
              {Math.round(dayNutrition.fat)}g
            </Text>
          </View>
        </View>
      </View>

      {/* Generate Grocery List Button */}
      <TouchableOpacity
        style={styles.groceryButton}
        onPress={handleGenerateGroceryList}
      >
        <Ionicons name="list" size={20} color={C.bone} />
        <Text style={[styles.groceryButtonText, { color: C.background }]}>{t('mealPlan.generateGroceryList')}</Text>
      </TouchableOpacity>

      {/* Add Meal Modal */}
      <Modal
        visible={addMealModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddMealModal({ visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.bone }]}>{t('mealPlan.addMealTitle')}</Text>
              <TouchableOpacity
                onPress={() => setAddMealModal({ visible: false })}
              >
                <Ionicons name="close" size={24} color={C.bone} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleAddMealFromRecipe}
            >
              <Ionicons name="book" size={24} color={C.violet} />
              <Text style={[styles.modalOptionText, { color: C.bone }]}>{t('mealPlan.fromRecipes')}</Text>
              <Ionicons name="chevron-forward" size={20} color={C.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleAddMealFromTemplate}
            >
              <Ionicons name="layers" size={24} color={C.violet} />
              <Text style={[styles.modalOptionText, { color: C.bone }]}>{t('mealPlan.fromTemplates')}</Text>
              <Ionicons name="chevron-forward" size={20} color={C.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleSearchFood}
            >
              <Ionicons name="search" size={24} color={C.violet} />
              <Text style={[styles.modalOptionText, { color: C.bone }]}>{t('mealPlan.searchFood')}</Text>
              <Ionicons name="chevron-forward" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Long Press Menu Modal */}
      {longPressedMeal.meal && (
        <Modal
          visible={longPressedMeal.visible}
          transparent
          animationType="fade"
          onRequestClose={() =>
            setLongPressedMeal({ ...longPressedMeal, visible: false })
          }
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: C.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: C.bone }]}>{longPressedMeal.meal.name}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setLongPressedMeal({ ...longPressedMeal, visible: false })
                  }
                >
                  <Ionicons name="close" size={24} color={C.bone} />
                </TouchableOpacity>
              </View>

              {!longPressedMeal.meal.completed && (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setLongPressedMeal({ ...longPressedMeal, visible: false });
                    handleLogMeal(longPressedMeal.meal);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={24} color={C.success || '#4CAF50'} />
                  <Text style={[styles.modalOptionText, { color: C.bone }]}>{t('mealPlan.logMeal')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  // Move to another day
                  setLongPressedMeal({ ...longPressedMeal, visible: false });
                  router.push('/meal-plan');
                }}
              >
                <Ionicons name="copy" size={24} color={C.violet} />
                <Text style={[styles.modalOptionText, { color: C.bone }]}>{t('mealPlan.copyToAnotherDay')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  handleRemoveMeal(longPressedMeal.meal.id);
                  setLongPressedMeal({ ...longPressedMeal, visible: false });
                }}
              >
                <Ionicons name="trash" size={24} color={C.coral} />
                <Text style={[styles.modalOptionText, { color: C.coral }]}>
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  daySelector: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },
  dayButton: {
    width: 56,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayButtonActive: {
    borderWidth: 1,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayDateActive: {
    fontWeight: 'bold',
  },
  mealsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mealCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  mealHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mealTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  mealCompleted: {
    opacity: 0.6,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealNameStrikethrough: {
    textDecorationLine: 'line-through',
  },
  mealMacros: {
    fontSize: 12,
  },
  mealActions: {
    marginLeft: 12,
  },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptySlotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nutritionSummary: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  nutritionDivider: {
    width: 1,
    height: 24,
  },
  groceryButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  groceryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    gap: 12,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});

