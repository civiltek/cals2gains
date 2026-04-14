/**
 * Smart Onboarding Flow - Phase 3
 * 7-step onboarding that learns user habits in 3 minutes
 * Cals2Gains React Native app
 */

import React, { useState, useRef, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';

import { useColors } from '../store/themeStore';
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

// Goal cards - labels and descriptions will use t() in Step0_Goals
const GOAL_CARDS_METADATA: Array<{ id: GoalMode; emoji: string; labelKey: string; descKey: string }> = [
  {
    id: 'lose_fat',
    emoji: '🔥',
    labelKey: 'goalModes.loseFat',
    descKey: 'goalModes.loseFatDesc',
  },
  {
    id: 'gain_muscle',
    emoji: '💪',
    labelKey: 'goalModes.gainMuscle',
    descKey: 'goalModes.gainMuscleDesc',
  },
  {
    id: 'recomp',
    emoji: '⚖️',
    labelKey: 'goalModes.recomp',
    descKey: 'goalModes.recompDesc',
  },
  {
    id: 'maintain',
    emoji: '🎯',
    labelKey: 'goalModes.maintain',
    descKey: 'goalModes.maintainDesc',
  },
  {
    id: 'mini_cut',
    emoji: '⚡',
    labelKey: 'goalModes.miniCut',
    descKey: 'goalModes.miniCutDesc',
  },
  {
    id: 'lean_bulk',
    emoji: '🚀',
    labelKey: 'goalModes.leanBulk',
    descKey: 'goalModes.leanBulkDesc',
  },
];

// Activity cards - labels and descriptions will use t() in Step2_Activity
const ACTIVITY_CARDS_METADATA: Array<{ id: ActivityLevel; emoji: string; labelKey: string; descKey: string; mealsPerDay: number }> = [
  {
    id: 'sedentary',
    emoji: '💼',
    labelKey: 'activityLevels.sedentary',
    descKey: 'activityLevels.sedentaryDesc',
    mealsPerDay: 3,
  },
  {
    id: 'lightly_active',
    emoji: '🚶',
    labelKey: 'activityLevels.lightlyActive',
    descKey: 'activityLevels.lightlyActiveDesc',
    mealsPerDay: 3,
  },
  {
    id: 'moderately_active',
    emoji: '🏋️',
    labelKey: 'activityLevels.moderatelyActive',
    descKey: 'activityLevels.moderatelyActiveDesc',
    mealsPerDay: 4,
  },
  {
    id: 'very_active',
    emoji: '⚽',
    labelKey: 'activityLevels.veryActive',
    descKey: 'activityLevels.veryActiveDesc',
    mealsPerDay: 4,
  },
  {
    id: 'athlete',
    emoji: '🏆',
    labelKey: 'activityLevels.athlete',
    descKey: 'activityLevels.athleteDesc',
    mealsPerDay: 5,
  },
];

// ============================================================================
// SMART ONBOARDING SCREEN
// ============================================================================

export default function SmartOnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setOnboardingComplete, setUserGoals } = useUserStore();
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);

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
          <Step0_Goals data={data} updateData={updateData} t={t} styles={styles} C={C} />
        )}
        {currentStep === 1 && (
          <Step1_PersonalInfo data={data} updateData={updateData} t={t} styles={styles} C={C} />
        )}
        {currentStep === 2 && (
          <Step2_Activity data={data} updateData={updateData} t={t} styles={styles} C={C} />
        )}
        {currentStep === 3 && (
          <Step3_EatingHabits data={data} updateData={updateData} t={t} styles={styles} C={C} />
        )}
        {currentStep === 4 && (
          <Step4_NutritionMode data={data} updateData={updateData} t={t} styles={styles} C={C} />
        )}
        {currentStep === 5 && (
          <Step5_Reminders data={data} updateData={updateData} t={t} styles={styles} C={C} />
        )}
        {currentStep === 6 && (
          <Step6_Summary data={data} t={t} styles={styles} C={C} />
        )}

        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>{t('onboarding.stepOf', { current: currentStep + 1, total: 7 })}</Text>
        </View>
      </ScrollView>

      {/* ACTION BUTTONS */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipButtonText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={currentStep === 6 ? handleComplete : handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 6 ? t('onboarding.start') : t('common.next')}
          </Text>
          <Ionicons
            name={currentStep === 6 ? 'checkmark' : 'arrow-forward'}
            size={20}
            color="#FFFFFF"
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

const Step0_Goals = ({ data, updateData, t, styles, C }: any) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>{t('onboarding.goal')}</Text>
    <Text style={styles.stepSubtitle}>{t('goalModes.subtitle')}</Text>

    <View style={styles.goalGrid}>
      {GOAL_CARDS_METADATA.map(goal => (
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
          <Text style={styles.goalLabel}>{t(goal.labelKey)}</Text>
          <Text style={styles.goalDescription}>{t(goal.descKey)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const Step1_PersonalInfo = ({ data, updateData, t, styles, C }: any) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>{t('onboarding.step1')}</Text>

    <View style={styles.infoSection}>
      <Text style={styles.label}>{t('onboarding.gender')}</Text>
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
              color={data.gender === gender ? '#FFFFFF' : C.primary}
            />
            <Text
              style={[
                styles.genderButtonText,
                data.gender === gender && styles.genderButtonTextActive,
              ]}
            >
              {gender === 'male' ? t('onboarding.male') : t('onboarding.female')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('onboarding.age')}</Text>
      <View style={styles.ageInputContainer}>
        <TouchableOpacity
          onPress={() => updateData({ age: Math.max(15, (data.age || 25) - 1) })}
        >
          <Ionicons name="remove-circle" size={28} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.ageValue}>{data.age || 25}</Text>
        <TouchableOpacity
          onPress={() => updateData({ age: Math.min(100, (data.age || 25) + 1) })}
        >
          <Ionicons name="add-circle" size={28} color={C.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>{t('onboarding.height')}</Text>
      <Text style={styles.sliderValue}>{data.height} {t('common.cm')}</Text>
      {/* In production, use actual Slider component */}

      <Text style={styles.label}>{t('onboarding.weight')}</Text>
      <Text style={styles.sliderValue}>{data.weight} {t('common.kg')}</Text>
      {/* In production, use actual Slider component */}
    </View>
  </View>
);

const Step2_Activity = ({ data, updateData, t, styles, C }: any) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>{t('onboarding.step3')}</Text>
    <Text style={styles.stepSubtitle}>{t('onboarding.activityLevel')}</Text>

    {ACTIVITY_CARDS_METADATA.map(activity => (
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
            <Text style={styles.activityLabel}>{t(activity.labelKey)}</Text>
            <Text style={styles.activityDescription}>
              {t(activity.descKey)}
            </Text>
          </View>
        </View>
        {data.activityLevel === activity.id && (
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={C.primary}
          />
        )}
      </TouchableOpacity>
    ))}
  </View>
);

const Step3_EatingHabits = ({ data, updateData, t, styles, C }: any) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>{t('onboarding.howDoYouEat')}</Text>

    <View style={styles.habitSection}>
      <Text style={styles.label}>{t('onboarding.mealsPerDay')}</Text>
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

      <Text style={styles.label}>{t('onboarding.cookOrEatOut')}</Text>
      <Text style={styles.sliderValue}>
        {data.cooksAtHome}% {t('common.cookAtHome')}
      </Text>

      <Text style={styles.label}>{t('onboarding.followDiet')}</Text>
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
            {t(
              diet === 'keto'
                ? 'dietaryPreferences.keto'
                : diet === 'vegan'
                ? 'dietaryPreferences.vegan'
                : diet === 'vegetarian'
                ? 'dietaryPreferences.vegetarian'
                : diet === 'gluten_free'
                ? 'dietaryPreferences.glutenFree'
                : 'dietaryPreferences.none'
            )}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const Step4_NutritionMode = ({ data, updateData, t, styles, C }: any) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>{t('onboarding.nutritionMode')}</Text>

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
            {mode === 'simple' ? t('onboarding.simpleMode') : t('onboarding.advancedMode')}
          </Text>
          <Text style={styles.modeCardDescription}>
            {mode === 'simple'
              ? t('onboarding.simpleModeDesc')
              : t('onboarding.advancedModeDesc')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const Step5_Reminders = ({ data, updateData, t, styles, C }: any) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>{t('onboarding.reminders')}</Text>

    <View style={styles.reminderRow}>
      <View>
        <Text style={styles.label}>{t('onboarding.mealReminders')}</Text>
        <Text style={styles.reminderDesc}>
          {t('onboarding.mealRemindersDesc')}
        </Text>
      </View>
      <Switch
        value={data.mealReminders}
        onValueChange={val => updateData({ mealReminders: val })}
        trackColor={{ false: '#ccc', true: C.primary + '50' }}
        thumbColor={data.mealReminders ? C.primary : '#FFFFFF'}
      />
    </View>

    <View style={styles.reminderRow}>
      <View>
        <Text style={styles.label}>{t('onboarding.waterReminders')}</Text>
        <Text style={styles.reminderDesc}>
          {t('onboarding.waterRemindersDesc')}
        </Text>
      </View>
      <Switch
        value={data.waterReminders}
        onValueChange={val => updateData({ waterReminders: val })}
        trackColor={{ false: '#ccc', true: C.primary + '50' }}
        thumbColor={data.waterReminders ? C.primary : '#FFFFFF'}
      />
    </View>

    {(data.mealReminders || data.waterReminders) && (
      <View style={styles.timePickerContainer}>
        <Text style={styles.label}>{t('onboarding.reminderTime')}</Text>
        <View style={styles.timeInputContainer}>
          <Ionicons
            name="time"
            size={20}
            color={C.primary}
            style={styles.timeIcon}
          />
          <Text style={styles.timeValue}>{data.reminderTime}</Text>
        </View>
      </View>
    )}
  </View>
);

const Step6_Summary = ({ data, t, styles, C }: any) => {
  const goals = calculateGoals(data);

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('onboarding.allSet')}</Text>
      <Text style={styles.stepSubtitle}>{t('onboarding.personalizedPlan')}</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('onboarding.summary.goal')}</Text>
          <Text style={styles.summaryValue}>
            {t(
              data.goal === 'lose_fat'
                ? 'goalModes.loseFat'
                : data.goal === 'gain_muscle'
                ? 'goalModes.gainMuscle'
                : 'common.other'
            )}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('onboarding.summary.dailyCalories')}</Text>
          <Text style={styles.summaryValue}>{goals.dailyCalories} kcal</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('onboarding.summary.protein')}</Text>
          <Text style={styles.summaryValue}>{goals.proteinGrams}g</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('onboarding.summary.carbs')}</Text>
          <Text style={styles.summaryValue}>{goals.carbsGrams}g</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('onboarding.summary.fats')}</Text>
          <Text style={styles.summaryValue}>{goals.fatGrams}g</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('onboarding.summary.estimatedTime')}</Text>
          <Text style={styles.summaryValue}>{t('onboarding.summary.timeframe')}</Text>
        </View>
      </View>

      <Text style={styles.finalNote}>
        {t('onboarding.summary.adjustNote')}
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

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.surface,
    },
    progressBarContainer: {
      height: 4,
      backgroundColor: C.border,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: C.primary,
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
      color: C.text,
      marginBottom: 8,
    },
  stepSubtitle: {
    fontSize: 14,
    color: C.textSecondary,
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
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.border,
  },
    goalCardSelected: {
      backgroundColor: C.primary + '10',
      borderColor: C.primary,
    },
  goalEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
    goalLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: C.text,
      marginBottom: 4,
    },
  goalDescription: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: 'center',
  },

  // STEP 1: PERSONAL INFO
  infoSection: {
    gap: 20,
  },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
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
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
  },
    genderButtonActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    genderButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: C.text,
    },
  genderButtonTextActive: {
    color: C.surface,
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
      color: C.primary,
      minWidth: 60,
      textAlign: 'center',
    },
    sliderValue: {
      fontSize: 14,
      fontWeight: '600',
      color: C.primary,
      marginBottom: 12,
    },

  // STEP 2: ACTIVITY
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: C.border,
  },
    activityCardSelected: {
      backgroundColor: C.primary + '10',
      borderColor: C.primary,
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
      color: C.text,
    },
  activityDescription: {
    fontSize: 12,
    color: C.textSecondary,
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
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
  },
    mealButtonActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    mealButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
    },
  mealButtonTextActive: {
    color: C.surface,
  },
  dietButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    marginBottom: 8,
  },
    dietButtonActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    dietButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: C.text,
    },
  dietButtonTextActive: {
    color: C.surface,
  },

  // STEP 4: NUTRITION MODE
  modeToggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.border,
  },
    modeCardActive: {
      backgroundColor: C.primary + '10',
      borderColor: C.primary,
    },
  modeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
    modeTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: C.text,
      marginBottom: 4,
    },
  modeCardDescription: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: 'center',
  },

  // STEP 5: REMINDERS
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  reminderDesc: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 2,
  },
  timePickerContainer: {
    marginTop: 16,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
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
      color: C.primary,
    },

  // STEP 6: SUMMARY
    summaryCard: {
      backgroundColor: C.surface,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: C.primary,
      padding: 16,
      marginBottom: 16,
    },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: C.textSecondary,
  },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: C.primary,
    },
  finalNote: {
    fontSize: 12,
    color: C.textSecondary,
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
    color: C.textSecondary,
  },

  // BUTTONS
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSecondary,
  },
    nextButton: {
      flex: 2,
      flexDirection: 'row',
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.surface,
  },
    buttonIcon: {
      marginLeft: 4,
    },
  });
}
