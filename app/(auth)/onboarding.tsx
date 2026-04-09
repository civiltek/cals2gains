// ============================================
// Cals2Gains - Onboarding Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors from '../../constants/colors';
import { useUserStore } from '../../store/userStore';
import {
  calculateRecommendedGoals,
  calculateTDEE,
} from '../../utils/nutrition';
import {
  ActivityLevel,
  FitnessGoal,
  UserProfile,
  UserGoals,
} from '../../types';

const STEPS = 4;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { user, updateProfile } = useUserStore();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('female');
  const [goal, setGoal] = useState<FitnessGoal>('maintain_weight');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');
  const [customGoals, setCustomGoals] = useState<UserGoals | null>(null);

  const getCalculatedProfile = (): UserProfile => ({
    age: parseInt(age) || 25,
    weight: parseFloat(weight) || 65,
    height: parseFloat(height) || 165,
    gender,
    activityLevel,
    goal,
  });

  const getRecommendedGoals = () => {
    const profile = getCalculatedProfile();
    return calculateRecommendedGoals(profile);
  };

  const handleNext = () => {
    if (step === 1) {
      // Validate basic info
      if (!age || !weight || !height) {
        Alert.alert('', t('errors.generic'));
        return;
      }
    }
    if (step < STEPS) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const profile = getCalculatedProfile();
      const goals = customGoals || getRecommendedGoals();

      await updateProfile(profile, goals);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const goals = step === 4 ? getRecommendedGoals() : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.progressDot, i + 1 <= step && styles.progressDotActive]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Basic info */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('onboarding.step1')}</Text>
            <Text style={styles.stepSubtitle}>{t('onboarding.subtitle')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('onboarding.age')}</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="25"
                placeholderTextColor={Colors.textMuted}
                maxLength={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{t('onboarding.weight')}</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="65"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={5}
                />
              </View>
              <View style={{ width: 16 }} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{t('onboarding.height')}</Text>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  placeholder="165"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={5}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('onboarding.gender')}</Text>
              <View style={styles.optionRow}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.optionChip, gender === g && styles.optionChipSelected]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.optionChipText, gender === g && styles.optionChipTextSelected]}>
                      {g === 'male' ? '♂ ' + t('onboarding.male') :
                       g === 'female' ? '♀ ' + t('onboarding.female') :
                       '⚥ ' + t('onboarding.other')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Goal */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('onboarding.step2')}</Text>
            <Text style={styles.stepSubtitle}>{t('onboarding.subtitle')}</Text>

            {([
              { value: 'lose_weight', icon: '⬇️', label: t('onboarding.loseWeight') },
              { value: 'maintain_weight', icon: '⚖️', label: t('onboarding.maintainWeight') },
              { value: 'gain_muscle', icon: '💪', label: t('onboarding.gainMuscle') },
              { value: 'improve_health', icon: '🌱', label: t('onboarding.improveHealth') },
            ] as { value: FitnessGoal; icon: string; label: string }[]).map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.goalCard, goal === item.value && styles.goalCardSelected]}
                onPress={() => setGoal(item.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.goalIcon}>{item.icon}</Text>
                <Text style={[styles.goalLabel, goal === item.value && styles.goalLabelSelected]}>
                  {item.label}
                </Text>
                {goal === item.value && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 3: Activity */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('onboarding.step3')}</Text>

            {([
              { value: 'sedentary', label: t('onboarding.sedentary'), desc: t('onboarding.sedentaryDesc'), icon: '🪑' },
              { value: 'lightly_active', label: t('onboarding.lightlyActive'), desc: t('onboarding.lightlyActiveDesc'), icon: '🚶' },
              { value: 'moderately_active', label: t('onboarding.moderatelyActive'), desc: t('onboarding.moderatelyActiveDesc'), icon: '🏃' },
              { value: 'very_active', label: t('onboarding.veryActive'), desc: t('onboarding.veryActiveDesc'), icon: '🏋️' },
              { value: 'extremely_active', label: t('onboarding.extremelyActive'), desc: t('onboarding.extremelyActiveDesc'), icon: '⚡' },
            ] as { value: ActivityLevel; label: string; desc: string; icon: string }[]).map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.activityCard, activityLevel === item.value && styles.activityCardSelected]}
                onPress={() => setActivityLevel(item.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.activityIcon}>{item.icon}</Text>
                <View style={styles.activityTextContainer}>
                  <Text style={[styles.activityLabel, activityLevel === item.value && styles.activityLabelSelected]}>
                    {item.label}
                  </Text>
                  <Text style={styles.activityDesc}>{item.desc}</Text>
                </View>
                {activityLevel === item.value && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 4: Goals review */}
        {step === 4 && goals && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('onboarding.yourGoals')}</Text>
            <Text style={styles.stepSubtitle}>{t('onboarding.calculatedFor')}</Text>

            <View style={styles.goalsCard}>
              <GoalRow
                label={t('onboarding.calories')}
                value={goals.calories}
                unit={t('onboarding.kcal')}
                color={Colors.calories}
              />
              <GoalRow
                label={t('onboarding.protein')}
                value={goals.protein}
                unit={t('onboarding.grams')}
                color={Colors.protein}
              />
              <GoalRow
                label={t('onboarding.carbs')}
                value={goals.carbs}
                unit={t('onboarding.grams')}
                color={Colors.carbs}
              />
              <GoalRow
                label={t('onboarding.fat')}
                value={goals.fat}
                unit={t('onboarding.grams')}
                color={Colors.fat}
                isLast
              />
            </View>

            <Text style={styles.goalsNote}>
              {t('onboarding.adjustManually')} ✏️
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navContainer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
            <Text style={styles.backButtonText}>{t('onboarding.back')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
          onPress={handleNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {step === STEPS ? t('onboarding.finish') : t('onboarding.continue')}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const GoalRow: React.FC<{
  label: string;
  value: number;
  unit: string;
  color: string;
  isLast?: boolean;
}> = ({ label, value, unit, color, isLast }) => (
  <View style={[styles.goalRow, !isLast && styles.goalRowBorder]}>
    <View style={[styles.goalColorDot, { backgroundColor: color }]} />
    <Text style={styles.goalRowLabel}>{label}</Text>
    <Text style={[styles.goalRowValue, { color }]}>
      {value} <Text style={styles.goalRowUnit}>{unit}</Text>
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceLight,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  optionChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  optionChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  optionChipTextSelected: {
    color: Colors.primary,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
  },
  goalCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  goalIcon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  goalLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  goalLabelSelected: {
    color: Colors.text,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
  },
  activityCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  activityIcon: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  activityTextContainer: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activityLabelSelected: {
    color: Colors.text,
  },
  activityDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  goalsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  goalRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  goalColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  goalRowLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  goalRowValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  goalRowUnit: {
    fontSize: 13,
    fontWeight: '400',
  },
  goalsNote: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  navContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
