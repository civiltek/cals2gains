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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMealPlanStore } from '../store/mealPlanStore';
import { PlannedMeal, MealType } from '../types';
import { COLORS } from '../theme';

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MEAL_TYPES_ES: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
};

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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [addMealModal, setAddMealModal] = useState<AddMealModalState>({
    visible: false,
  });
  const [longPressedMeal, setLongPressedMeal] = useState<{
    meal: PlannedMeal;
    visible: boolean;
  }>({ meal: null, visible: false });

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
    router.push('/(tabs)/recipes');
  };

  const handleAddMealFromTemplate = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddMealModal({ visible: false });
    // Navigate to meal templates
    router.push('/(tabs)/templates');
  };

  const handleSearchFood = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddMealModal({ visible: false });
    // Navigate to food search
    router.push('/(tabs)/search');
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

  const handleGenerateGroceryList = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await generateGroceryList('user-placeholder');
    router.push('/(tabs)/grocery-list');
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Plan Semanal</Text>
        <View style={styles.weekNav}>
          <TouchableOpacity
            onPress={handlePreviousWeek}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.violet} />
          </TouchableOpacity>
          <Text style={styles.weekLabel}>
            {weekDays[0].toLocaleDateString('es-ES', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            -{' '}
            {weekDays[6].toLocaleDateString('es-ES', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <TouchableOpacity
            onPress={handleNextWeek}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-forward" size={24} color={COLORS.violet} />
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
            ]}
            onPress={() => handleSelectDay(date)}
          >
            <Text style={styles.dayButtonText}>{DAYS_ES[index]}</Text>
            <Text
              style={[
                styles.dayDate,
                isSelected(date) && styles.dayDateActive,
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
          <View key={slot.mealType} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealTypeLabel}>
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
                      <Text style={styles.mealMacros}>
                        {Math.round(slot.meal.nutrition.calories)} cal •{' '}
                        {Math.round(slot.meal.nutrition.protein)}g P •{' '}
                        {Math.round(slot.meal.nutrition.carbs)}g C •{' '}
                        {Math.round(slot.meal.nutrition.fat)}g F
                      </Text>
                    )}
                  </View>

                  <View style={styles.mealActions}>
                    <TouchableOpacity
                      onPress={() => handleRemoveMeal(slot.meal.id)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={COLORS.coral}
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
                <Ionicons name="add-circle-outline" size={28} color={COLORS.violet} />
                <Text style={styles.emptySlotText}>Agregar comida</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Daily Nutrition Summary */}
      <View style={styles.nutritionSummary}>
        <View style={styles.nutritionRow}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Cal</Text>
            <Text style={styles.nutritionValue}>
              {Math.round(dayNutrition.calories)}
            </Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Proteína</Text>
            <Text style={styles.nutritionValue}>
              {Math.round(dayNutrition.protein)}g
            </Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Carbos</Text>
            <Text style={styles.nutritionValue}>
              {Math.round(dayNutrition.carbs)}g
            </Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Grasas</Text>
            <Text style={styles.nutritionValue}>
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
        <Ionicons name="list" size={20} color={COLORS.bone} />
        <Text style={styles.groceryButtonText}>Generar Lista de Compras</Text>
      </TouchableOpacity>

      {/* Add Meal Modal */}
      <Modal
        visible={addMealModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddMealModal({ visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar Comida</Text>
              <TouchableOpacity
                onPress={() => setAddMealModal({ visible: false })}
              >
                <Ionicons name="close" size={24} color={COLORS.bone} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleAddMealFromRecipe}
            >
              <Ionicons name="book" size={24} color={COLORS.violet} />
              <Text style={styles.modalOptionText}>Desde Recetas</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleAddMealFromTemplate}
            >
              <Ionicons name="layers" size={24} color={COLORS.violet} />
              <Text style={styles.modalOptionText}>Desde Plantillas</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleSearchFood}
            >
              <Ionicons name="search" size={24} color={COLORS.violet} />
              <Text style={styles.modalOptionText}>Buscar Alimento</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
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
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{longPressedMeal.meal.name}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setLongPressedMeal({ ...longPressedMeal, visible: false })
                  }
                >
                  <Ionicons name="close" size={24} color={COLORS.bone} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  // Move to another day
                  setLongPressedMeal({ ...longPressedMeal, visible: false });
                  router.push('/(tabs)/meal-plan');
                }}
              >
                <Ionicons name="copy" size={24} color={COLORS.violet} />
                <Text style={styles.modalOptionText}>Copiar a otro día</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  handleRemoveMeal(longPressedMeal.meal.id);
                  setLongPressedMeal({ ...longPressedMeal, visible: false });
                }}
              >
                <Ionicons name="trash" size={24} color={COLORS.coral} />
                <Text style={[styles.modalOptionText, { color: COLORS.coral }]}>
                  Eliminar
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
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.bone,
    marginBottom: 12,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekLabel: {
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayButtonActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  dayButtonText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayDate: {
    color: COLORS.bone,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayDateActive: {
    color: COLORS.background,
  },
  mealsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mealCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.cardHover,
  },
  mealTypeLabel: {
    color: COLORS.violet,
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
    color: COLORS.bone,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealNameStrikethrough: {
    textDecorationLine: 'line-through',
  },
  mealMacros: {
    color: COLORS.textSecondary,
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
    color: COLORS.violet,
    fontSize: 14,
    fontWeight: '600',
  },
  nutritionSummary: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  nutritionValue: {
    color: COLORS.violet,
    fontSize: 16,
    fontWeight: 'bold',
  },
  nutritionDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  groceryButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.violet,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  groceryButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
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
    color: COLORS.bone,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: COLORS.cardHover,
    borderRadius: 12,
    gap: 12,
  },
  modalOptionText: {
    flex: 1,
    color: COLORS.bone,
    fontSize: 14,
    fontWeight: '600',
  },
});
