/**
 * Smart Onboarding Flow - Phase 3
 * 7-step onboarding that learns user habits in 3 minutes
 * Cals2Gains React Native app
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { COLORS } from '../theme';
import { useUserStore } from '../store/userStore';
import PersonalEngine from '../services/personalEngine';

// ============================================================================
// TYPES
// ============================================================================

type GoalMode = 'lose_fat' | 'gain_muscle' | 'recomp' | 'maintain' | 'mini_cut' | 'lean_bulk';
type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete';
type DietaryPreference = 'keto' | 'vegan' | 'vegetarian' | 'gluten_free' | 'none';

interface GoalCard {
  id: GoalMode;
  label: string;
  emoji: string;
  description: string;
}

interface ActivityCard {
  id: ActivityLevel;
  label: string;
  emoji: string;
  description: string;
  mealsPerDay: number;
}

interface OnboardingData {
  goal: GoalMode | null;
  gender: 'male' | 'female' | null;
  age: number | null;
  height: number; // cm
  weight: number; // kg
  activityLevel: ActivityLevel | null;
  mealsPerDay: number;
  cooksAtHome: number; // 0-100 slider
  dietaryPreference: DietaryPreference | null;
  nutritionMode: 'simple' | 'advanced';
  mealReminders: boolean;
  waterReminders: boolean;
  reminderTime: string;
}

const GOAL_CARDS: GoalCard[] = [
  {
    id: 'lose_fat',
    label: 'Perder Grasa',
    emoji: '🔥',
    description: 'Reducir peso corporal manteniendo músculo',
  },
  {
    id: 'gain_muscle',
    label: 'Ganar Músculo',
    emoji: '💪',
    description: 'Aumentar masa muscular de forma controlada',
  },
  {
    id: 'recomp',
    label: 'Recomposición',
    emoji: '⚖️',
    description: 'Cambiar composición corporal (perder y ganar)',
  },
  {
    id: 'maintain',
    label: 'Mantener',
    emoji: '🎯',
    description: 'Mantener peso actual y salud',
  },
  {
    id: 'mini_cut',
    label: 'Mini Cut',
    emoji: '⚡',
    description: 'Pérdida rápida controlada por corto tiempo',
  },
  {
    id: 'lean_bulk',
    label: 'Lean Bulk',
    emoji: '🚀',
    description: 'Ganancia controlada con mínima grasa',
  },
];

const ACTIVITY_CARDS: ActivityCard[] = [
  {
    id: 'sedentary',
    label: 'Sedentario',
    emoji: '💼',
    description: 'Poco ejercicio, vida mayormente sedentaria',
    mealsPerDay: 3,
  },
  {
    id: 'lightly_active',
    label: 'Ligeramente activo',
    emoji: '🚶',
    description: '1-3 días de ejercicio por semana',
    mealsPerDay: 3,
  },
  {
    id: 'moderately_active',
    label: 'Moderadamente activo',
    emoji: '🏋️',
    description: '3-5 días de ejercicio por semana',
    mealsPerDay: 4,
  },
  {
    id: 'very_active',
    label: 'Muy activo',
    emoji: '⚽',
    description: '6-7 días de ejercicio por semana',
    mealsPerDay: 4,
  },
  {
    id: 'athlete',
    label: 'Atleta',
    emoji: '🏆',
    description: 'Entrenamiento intenso diario',
    mealsPerDay: 5,
  },
];

// ============================================================================
// SMART ONBOARDING SCREEN
// ============================================================================

export default function SmartOnboardingScreen() {
  const router = useRouter();
  const { setOnboardingComplete, setUserGoals } = useUserStore();

  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [data, setData] = useState<OnboardingData>({
    goal: null,
    gender: null,
    age: null,
    height: 175,
    weight: 75,
    activityLevel: null,
    mealsPerDay: 3,
    cooksAtHome: 50,
    dietaryPreference: null,
    nutritionMode: 'simple',
    mealReminders: true,
    waterReminders: true,
    reminderTime: '09:00',
  });

  const updateData = (partial: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...partial }));
  };

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });

      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: (currentStep + 1) / 7,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleNext();
  };

  const handleComplete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Calculate goals based on onboarding data
    const calculatedGoals = calculateGoals(data);

    // Save to store
    setUserGoals(calculatedGoals);
    setOnboardingComplete(true);

    // Navigate to dashboard
    router.replace('/(app)/home');
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* PROGRESS BAR */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[styles.progressBar, { width: progressWidth }]}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
      >
        {currentStep === 0 && (
          <Step0_Goals data={data} updateData={updateData} />
        )}
        {currentStep === 1 && (
          <Step1_PersonalInfo data={data} updateData={updateData} />
        )}
        {currentStep === 2 && (
          <Step2_Activity data={data} updateData={updateData} />
        )}
        {currentStep === 3 && (
          <Step3_EatingHabits data={data} updateData={updateData} />
        )}
        {currentStep === 4 && (
          <Step4_NutritionMode data={data} updateData={updateData} />
        )}
        {currentStep === 5 && (
          <Step5_Reminders data={data} updateData={updateData} />
        )}
        {currentStep === 6 && (
          <Step6_Summary data={data} />
        )}

        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Paso {currentStep + 1} de 7</Text>
        </View>
      </ScrollView>

      {/* ACTION BUTTONS */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipButtonText}>Saltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={currentStep === 6 ? handleComplete : handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 6 ? 'Empezar' : 'Siguiente'}
          </Text>
          <Ionicons
            name={currentStep === 6 ? 'checkmark' : 'arrow-forward'}
            size={20}
            color="#fff"
            style={styles.buttonIcon}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

const Step0_Goals = ({ data, updateData }: any) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>¿Cuál es tu objetivo?</Text>
    <Text style={styles.stepSubtitle}>Elige el que mejor represente tu meta</Text>

    <View style={styles.goalGrid}>
      {GOAL_CARDS.map(goal => (
        <TouchableOpacity
          key={goal.id}
          style={[
            styles.goalCard,
            data.goal === goal.id && styles.goalCardSelected,
          ]}
          onPress={() => updateData({ goal: goal.id })}
          activeOpacity={0.7}
        >
          <Text style={styles.goalEmoji}>{goal.emoji}</Text>
          <Text style={styles.goalLabel}>{goal.label}</Text>
          <Text style={styles.goalDescription}>{goal.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const Step1_PersonalInfo = ({ data, updateData }: any) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Cuéntanos sobre ti</Text>

    <View style={styles.infoSection}>
      <Text style={styles.label}>Género</Text>
      <View style={styles.genderButtons}>
        {['male', 'female'].map(gender => (
          <TouchableOpacity
            key={gender}
            style={[
              styles.genderButton,
              data.gender === gender && styles.genderButtonActive,
            ]}
            onPress={() => updateData({ gender })}
          >
            <Ionicons
              name={gender === 'male' ? 'male' : 'female'}
              size={24}
              color={data.gender === gender ? '#fff' : COLORS.primary}
            />
            <Text
              style={[
                styles.genderButtonText,
                data.gender === gender && styles.genderButtonTextActive,
              ]}
            >
              {gender === 'male' ? 'Hombre' : 'Mujer'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Edad</Text>
      <View style={styles.ageInputContainer}>
        <TouchableOpacity
          onPress={() => updateData({ age: Math.max(15, (data.age || 25) - 1) })}
        >
          <Ionicons name="remove-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.ageValue}>{data.age || 25}</Text>
        <TouchableOpacity
          onPress={() => updateData({ age: Math.min(100, (data.age || 25) + 1) })}
        >
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Altura (cm)</Text>
      <Text style={styles.sliderValue}>{data.height} cm</Text>
      {/* In production, use actual Slider component */}

      <Text style={styles.label}>Peso (kg)</Text>
      <Text style={styles.sliderValue}>{data.weight} kg</Text>
      {/* In production, use actual Slider component */}
    </View>
  </View>
);

const Step2_Activity = ({ data, updateData }: any) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Tu nivel de actividad</Text>
    <Text style={styles.stepSubtitle}>¿Cuánto ejercicio haces?</Text>

    {ACTIVITY_CARDS.map(activity => (
      <TouchableOpacity
        key={activity.id}
        style={[
          styles.activityCard,
          data.activityLevel === activity.id && styles.activityCardSelected,
        ]}
        onPress={() => updateData({
          activityLevel: activity.id,
          mealsPerDay: activity.mealsPerDay,
        })}
        activeOpacity={0.7}
      >
        <View style={styles.activityContent}>
          <Text style={styles.activityEmoji}>{activity.emoji}</Text>
          <View style={styles.activityText}>
            <Text style={styles.activityLabel}>{activity.label}</Text>
            <Text style={styles.activityDescription}>
              {activity.description}
            </Text>
          </View>
        </View>
        {data.activityLevel === activity.id && (
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={COLORS.primary}
          />
        )}
      </TouchableOpacity>
    ))}
  </View>
);

const Step3_EatingHabits = ({ data, updateData }: any) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>¿Cómo comes normalmente?</Text>

    <View style={styles.habitSection}>
      <Text style={styles.label}>¿Cuántas comidas al día?</Text>
      <View style={styles.mealButtons}>
        {[2, 3, 4, 5].map(meals => (
          <TouchableOpacity
            key={meals}
            style={[
              styles.mealButton,
              data.mealsPerDay === meals && styles.mealButtonActive,
            ]}
            onPress={() => updateData({ mealsPerDay: meals })}
          >
            <Text
              style={[
                styles.mealButtonText,
                data.mealsPerDay === meals && styles.mealButtonTextActive,
              ]}
            >
              {meals}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>¿Cocinas o comes fuera?</Text>
      <Text style={styles.sliderValue}>
        {data.cooksAtHome}% cocinas en casa
      </Text>

      <Text style={styles.label}>¿Sigues alguna dieta?</Text>
      {(['keto', 'vegan', 'vegetarian', 'gluten_free', 'none'] as const).map(diet => (
        <TouchableOpacity
          key={diet}
          style={[
            styles.dietButton,
            data.dietaryPreference === diet && styles.dietButtonActive,
          ]}
          onPress={() => updateData({ dietaryPreference: diet })}
        >
          <Text
            style={[
              styles.dietButtonText,
              data.dietaryPreference === diet && styles.dietButtonTextActive,
            ]}
          >
            {diet === 'keto' ? 'Keto' : diet === 'vegan' ? 'Vegano' : diet === 'vegetarian' ? 'Vegetariano' : diet === 'gluten_free' ? 'Sin gluten' : 'Ninguna'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const Step4_NutritionMode = ({ data, updateData }: any) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Modo de Nutrición</Text>

    <View style={styles.modeToggleContainer}>
      {(['simple', 'advanced'] as const).map(mode => (
        <TouchableOpacity
          key={mode}
          style={[
            styles.modeCard,
            data.nutritionMode === mode && styles.modeCardActive,
          ]}
          onPress={() => updateData({ nutritionMode: mode })}
        >
          <Text style={styles.modeEmoji}>
            {mode === 'simple' ? '🟢' : '🟣'}
          </Text>
          <Text style={styles.modeTitle}>
            {mode === 'simple' ? 'Modo Simple' : 'Modo Avanzado'}
          </Text>
          <Text style={styles.modeCardDescription}>
            {mode === 'simple'
              ? 'Solo calorías y proteína'
              : 'Macros completos y análisis profundo'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const Step5_Reminders = ({ data, updateData }: any) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Recordatorios</Text>

    <View style={styles.reminderRow}>
      <View>
        <Text style={styles.label}>Recordatorios de comidas</Text>
        <Text style={styles.reminderDesc}>
          Notificaciones para registrar tus comidas
        </Text>
      </View>
      <Switch
        value={data.mealReminders}
        onValueChange={val => updateData({ mealReminders: val })}
        trackColor={{ false: '#ccc', true: COLORS.primary + '50' }}
        thumbColor={data.mealReminders ? COLORS.primary : '#fff'}
      />
    </View>

    <View style={styles.reminderRow}>
      <View>
        <Text style={styles.label}>Recordatorios de agua</Text>
        <Text style={styles.reminderDesc}>
          Notificaciones para beber agua
        </Text>
      </View>
      <Switch
        value={data.waterReminders}
        onValueChange={val => updateData({ waterReminders: val })}
        trackColor={{ false: '#ccc', true: COLORS.primary + '50' }}
        thumbColor={data.waterReminders ? COLORS.primary : '#fff'}
      />
    </View>

    {(data.mealReminders || data.waterReminders) && (
      <View style={styles.timePickerContainer}>
        <Text style={styles.label}>Hora de recordatorios</Text>
        <View style={styles.timeInputContainer}>
          <Ionicons
            name="time"
            size={20}
            color={COLORS.primary}
            style={styles.timeIcon}
          />
          <Text style={styles.timeValue}>{data.reminderTime}</Text>
        </View>
      </View>
    )}
  </View>
);

const Step6_Summary = ({ data }: any) => {
  const goals = calculateGoals(data);

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>¡Todo listo!</Text>
      <Text style={styles.stepSubtitle}>Aquí está tu plan personalizado</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Objetivo</Text>
          <Text style={styles.summaryValue}>
            {data.goal === 'lose_fat'
              ? 'Perder Grasa'
              : data.goal === 'gain_muscle'
              ? 'Ganar Músculo'
              : 'Otro'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Calorías diarias</Text>
          <Text style={styles.summaryValue}>{goals.dailyCalories} kcal</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Proteína</Text>
          <Text style={styles.summaryValue}>{goals.proteinGrams}g</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Carbohidratos</Text>
          <Text style={styles.summaryValue}>{goals.carbsGrams}g</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Grasas</Text>
          <Text style={styles.summaryValue}>{goals.fatGrams}g</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tiempo estimado</Text>
          <Text style={styles.summaryValue}>8-12 semanas</Text>
        </View>
      </View>

      <Text style={styles.finalNote}>
        Puedes ajustar estos valores en tu perfil en cualquier momento.
      </Text>
    </View>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateGoals(data: OnboardingData) {
  // Simplified calorie calculation based on Harris-Benedict equation
  let tdee = 2000; // Default

  if (data.gender && data.age && data.height && data.weight) {
    const h = data.height;
    const w = data.weight;
    const a = data.age;

    if (data.gender === 'male') {
      tdee = 88.362 + 13.397 * w + 4.799 * h - 5.677 * a;
    } else {
      tdee = 447.593 + 9.247 * w + 3.098 * h - 4.33 * a;
    }

    // Adjust by activity level
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      athlete: 1.9,
    };

    tdee *= multipliers[data.activityLevel || 'moderately_active'] || 1.55;
  }

  // Adjust by goal
  let adjustedCalories = tdee;
  if (data.goal === 'lose_fat' || data.goal === 'mini_cut') {
    adjustedCalories = tdee * 0.85; // 15% deficit
  } else if (data.goal === 'gain_muscle' || data.goal === 'lean_bulk') {
    adjustedCalories = tdee * 1.1; // 10% surplus
  }

  // Calculate macros
  return {
    dailyCalories: Math.round(adjustedCalories),
    proteinGrams: Math.round((adjustedCalories * 0.30) / 4), // 30% protein
    carbsGrams: Math.round((adjustedCalories * 0.40) / 4), // 40% carbs
    fatGrams: Math.round((adjustedCalories * 0.30) / 9), // 30% fat
  };
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  stepContainer: {
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },

  // STEP 0: GOALS
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalCard: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  goalCardSelected: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  goalEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },

  // STEP 1: PERSONAL INFO
  infoSection: {
    gap: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  genderButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  genderButtonTextActive: {
    color: '#fff',
  },
  ageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  ageValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    minWidth: 60,
    textAlign: 'center',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },

  // STEP 2: ACTIVITY
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  activityCardSelected: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  activityText: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  activityDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  // STEP 3: EATING HABITS
  habitSection: {
    gap: 16,
  },
  mealButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  mealButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  mealButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  mealButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  mealButtonTextActive: {
    color: '#fff',
  },
  dietButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  dietButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dietButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  dietButtonTextActive: {
    color: '#fff',
  },

  // STEP 4: NUTRITION MODE
  modeToggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  modeCardActive: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  modeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  modeCardDescription: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },

  // STEP 5: REMINDERS
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  reminderDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  timePickerContainer: {
    marginTop: 16,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timeIcon: {
    marginRight: 10,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // STEP 6: SUMMARY
  summaryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  finalNote: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // STEP INDICATOR
  stepIndicator: {
    alignItems: 'center',
    marginTop: 20,
  },
  stepText: {
    fontSize: 12,
    color: '#aaa',
  },

  // BUTTONS
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonIcon: {
    marginLeft: 4,
  },
});
