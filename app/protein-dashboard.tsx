import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme';
import { useNavigation } from 'expo-router';

// Mock store imports
import { mealStore } from '../stores/mealStore';
import { userStore } from '../stores/userStore';
import { templateStore } from '../stores/templateStore';

const { width } = Dimensions.get('window');
const RING_SIZE = 240;
const RING_WIDTH = 12;

interface ProteinFood {
  id: string;
  name: string;
  protein: number;
  serving: string;
  icon: string;
}

const QUICK_PROTEIN_FOODS: ProteinFood[] = [
  { id: '1', name: 'Pechuga de Pollo', protein: 31, serving: '100g', icon: 'drumstick' },
  { id: '2', name: 'Huevos', protein: 6, serving: '1 unidad', icon: 'egg' },
  { id: '3', name: 'Whey Protein', protein: 25, serving: '30g', icon: 'flask' },
  { id: '4', name: 'Yogur Griego', protein: 10, serving: '100g', icon: 'cup' },
  { id: '5', name: 'Atún', protein: 26, serving: '100g', icon: 'fish' },
  { id: '6', name: 'Queso Cottage', protein: 14, serving: '100g', icon: 'cheese' },
];

interface MealLog {
  id: string;
  name: string;
  protein: number;
  time: string;
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
}

interface ProteinStreak {
  count: number;
  lastDate: string;
}

export default function ProteinDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [isProteinPrimero, setIsProteinPrimero] = useState(true);
  const [todaysMeals, setTodaysMeals] = useState<MealLog[]>([]);
  const [proteinGoal, setProteinGoal] = useState(160);
  const [proteinConsumed, setProteinConsumed] = useState(87);
  const [proteinRemaining, setProteinRemaining] = useState(proteinGoal - proteinConsumed);
  const [mealsRemaining, setMealsRemaining] = useState(2);
  const [proteinStreak, setProteinStreak] = useState<ProteinStreak>({ count: 12, lastDate: '2026-04-10' });

  useEffect(() => {
    // Simulate loading data from stores
    const loadData = () => {
      setProteinConsumed(87);
      setProteinGoal(160);
      setProteinRemaining(73);
      setMealsRemaining(2);
      setTodaysMeals([
        { id: '1', name: 'Desayuno - Huevos y Tostadas', protein: 18, time: '07:30', mealType: 'breakfast' },
        { id: '2', name: 'Almuerzo - Pechuga de Pollo', protein: 52, time: '12:45', mealType: 'lunch' },
        { id: '3', name: 'Snack - Whey Protein', protein: 25, time: '15:30', mealType: 'snack' },
      ]);
    };
    loadData();
  }, []);

  const handleToggleProteinPrimero = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsProteinPrimero(!isProteinPrimero);
  };

  const handleQuickLog = (food: ProteinFood) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newProteinConsumed = proteinConsumed + food.protein;
    setProteinConsumed(newProteinConsumed);
    setProteinRemaining(Math.max(0, proteinGoal - newProteinConsumed));

    const newMeal: MealLog = {
      id: Math.random().toString(),
      name: food.name,
      protein: food.protein,
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      mealType: 'snack',
    };
    setTodaysMeals([...todaysMeals, newMeal]);

    Alert.alert(
      'Registrado',
      `${food.name} (+${food.protein}g proteína) agregado`,
      [{ text: 'OK', onPress: () => {} }],
      { cancelable: true }
    );
  };

  const renderProteinRing = () => {
    const circumference = 2 * Math.PI * (RING_SIZE / 2 - RING_WIDTH);
    const percentage = Math.min(proteinConsumed / proteinGoal, 1);
    const strokeDashoffset = circumference * (1 - percentage);

    return (
      <View style={styles.ringContainer}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring}>
          {/* Background circle */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_SIZE / 2 - RING_WIDTH}
            stroke={COLORS.border}
            strokeWidth={RING_WIDTH}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_SIZE / 2 - RING_WIDTH}
            stroke={COLORS.primary}
            strokeWidth={RING_WIDTH}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.ringText}>
          <Text style={styles.ringNumber}>{Math.round(proteinConsumed)}</Text>
          <Text style={styles.ringLabel}>g</Text>
          <Text style={styles.ringSeparator}>/</Text>
          <Text style={styles.ringGoal}>{proteinGoal}</Text>
          <Text style={styles.ringGoalLabel}>g</Text>
        </View>
      </View>
    );
  };

  const nextMealProteinTarget = proteinRemaining > 0 ? Math.ceil(proteinRemaining / mealsRemaining) : 0;

  const renderProteinRemainingCard = () => (
    <View style={[styles.card, { backgroundColor: COLORS.surfaceSecondary }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="flame" size={20} color={COLORS.accent} />
        <Text style={styles.cardTitle}>Proteína Restante</Text>
      </View>
      <Text style={styles.remainingText}>Te faltan {proteinRemaining}g</Text>
      <Text style={styles.suggestionsText}>
        {mealsRemaining} comidas restantes × {nextMealProteinTarget}g promedio
      </Text>
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsLabel}>Ideas:</Text>
        <Text style={styles.suggestionItem}>• Pechuga de pollo ({nextMealProteinTarget}g)</Text>
        <Text style={styles.suggestionItem}>• Huevos × 6 ({nextMealProteinTarget}g)</Text>
        <Text style={styles.suggestionItem}>• Atún + Arroz ({nextMealProteinTarget}g)</Text>
      </View>
    </View>
  );

  const renderSecondaryMacros = () => (
    <View style={styles.secondaryMacrosContainer}>
      <View style={styles.macroBar}>
        <View style={styles.macroLabel}>
          <Text style={styles.macroName}>Carbohidratos</Text>
          <Text style={styles.macroValue}>184g / 250g</Text>
        </View>
        <View style={[styles.barBackground, { backgroundColor: COLORS.border }]}>
          <View
            style={[
              styles.barProgress,
              {
                width: '74%',
                backgroundColor: COLORS.info,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.macroBar}>
        <View style={styles.macroLabel}>
          <Text style={styles.macroName}>Grasas</Text>
          <Text style={styles.macroValue}>52g / 65g</Text>
        </View>
        <View style={[styles.barBackground, { backgroundColor: COLORS.border }]}>
          <View
            style={[
              styles.barProgress,
              {
                width: '80%',
                backgroundColor: COLORS.warning,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );

  const renderQuickProteinFoods = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Proteínas Rápidas</Text>
      <View style={styles.foodGrid}>
        {QUICK_PROTEIN_FOODS.map((food) => (
          <TouchableOpacity
            key={food.id}
            style={styles.foodCard}
            onPress={() => handleQuickLog(food)}
          >
            <View style={styles.foodCardContent}>
              <Ionicons
                name={food.icon as any}
                size={32}
                color={COLORS.primary}
                style={styles.foodIcon}
              />
              <Text style={styles.foodName}>{food.name}</Text>
              <Text style={styles.foodProtein}>+{food.protein}g</Text>
              <Text style={styles.foodServing}>{food.serving}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTodaysProteinLog = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Registro Hoy</Text>
      <View style={styles.timelineContainer}>
        {todaysMeals.map((meal, index) => (
          <View key={meal.id} style={styles.timelineItem}>
            <View style={styles.timelineMarker}>
              <View style={styles.timelineCircle} />
              {index < todaysMeals.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.mealTime}>{meal.time}</Text>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text style={styles.mealProtein}>Proteína: {meal.protein}g</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderProteinStreak = () => (
    <View style={[styles.card, { backgroundColor: COLORS.success + '15' }]}>
      <View style={styles.streakContent}>
        <Ionicons name="flame-outline" size={24} color={COLORS.success} />
        <View style={styles.streakText}>
          <Text style={styles.streakNumber}>{proteinStreak.count} días</Text>
          <Text style={styles.streakLabel}>Alcanzando tu objetivo de proteína</Text>
        </View>
      </View>
    </View>
  );

  if (!isProteinPrimero) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.centerText}>Vista estándar</Text>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleToggleProteinPrimero}
        >
          <Text style={styles.buttonText}>Volver a Proteína Primero</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with toggle */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Proteína Primero</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={handleToggleProteinPrimero}
        >
          <Ionicons name="swap-horizontal" size={20} color={COLORS.primary} />
          <Text style={styles.toggleText}>Cambiar vista</Text>
        </TouchableOpacity>
      </View>

      {/* Protein Ring */}
      {renderProteinRing()}

      {/* Protein Remaining Card */}
      {renderProteinRemainingCard()}

      {/* Protein Streak */}
      {renderProteinStreak()}

      {/* Quick Protein Foods */}
      {renderQuickProteinFoods()}

      {/* Secondary Macros */}
      {renderSecondaryMacros()}

      {/* Today's Protein Log */}
      {renderTodaysProteinLog()}

      <View style={styles.spacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 8,
    gap: 6,
  },
  toggleText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  ringContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  ring: {
    marginBottom: -60,
  },
  ringText: {
    alignItems: 'center',
    marginTop: 20,
  },
  ringNumber: {
    fontSize: 44,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ringLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  ringSeparator: {
    fontSize: 20,
    color: COLORS.border,
    marginVertical: 4,
  },
  ringGoal: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  ringGoalLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  remainingText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  suggestionsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  suggestionsContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  suggestionItem: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakText: {
    flex: 1,
  },
  streakNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.success,
  },
  streakLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  foodCard: {
    width: (width - 48) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  foodCardContent: {
    padding: 12,
    alignItems: 'center',
  },
  foodIcon: {
    marginBottom: 8,
  },
  foodName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  foodProtein: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  foodServing: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  secondaryMacrosContainer: {
    gap: 12,
    marginBottom: 24,
  },
  macroBar: {
    gap: 8,
  },
  macroLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  macroValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barProgress: {
    height: '100%',
    borderRadius: 3,
  },
  timelineContainer: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineMarker: {
    alignItems: 'center',
    width: 24,
  },
  timelineCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 2,
  },
  timelineLine: {
    width: 2,
    height: 48,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  mealTime: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  mealName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
  mealProtein: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  centerText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  spacing: {
    height: 20,
  },
});
