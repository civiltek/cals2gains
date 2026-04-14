/**
 * Nutrition Settings Screen
 * Cals2Gains — Editable version of onboarding data
 *
 * Allows users to edit: personal data, activity level, goal mode,
 * deficit/surplus, macro distribution — all with live TDEE breakdown.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { calculateBMR, calculateTDEE } from '../utils/nutrition';
import { calculateGoalsFromPreset, getPresetById, MACRO_PRESETS } from '../constants/macroPresets';
import type { ActivityLevel, GoalMode } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const GENDERS = [
  { id: 'male', labelKey: 'onboarding.male', icon: 'male-outline' },
  { id: 'female', labelKey: 'onboarding.female', icon: 'female-outline' },
];

const ACTIVITIES: { id: ActivityLevel; labelKey: string; mult: number; descKey: string }[] = [
  { id: 'sedentary', labelKey: 'onboarding.sedentary', mult: 1.2, descKey: 'onboarding.sedentaryDesc' },
  { id: 'lightly_active', labelKey: 'onboarding.lightlyActive', mult: 1.375, descKey: 'onboarding.lightlyActiveDesc' },
  { id: 'moderately_active', labelKey: 'onboarding.moderatelyActive', mult: 1.55, descKey: 'onboarding.moderatelyActiveDesc' },
  { id: 'very_active', labelKey: 'onboarding.veryActive', mult: 1.725, descKey: 'onboarding.veryActiveDesc' },
  { id: 'extremely_active', labelKey: 'onboarding.extremelyActive', mult: 1.9, descKey: 'onboarding.extremelyActiveDesc' },
];

interface GoalModeOption {
  id: GoalMode;
  emoji: string;
  labelKey: string;
  descKey: string;
  defaultAdjustPct: number; // e.g. -20 for 20% deficit, +10 for 10% surplus
}

const GOAL_MODES: GoalModeOption[] = [
  { id: 'lose_fat',     emoji: '🔥', labelKey: 'goalModes.loseFat',     descKey: 'goalModes.loseFatDesc',               defaultAdjustPct: -20 },
  { id: 'gain_muscle',  emoji: '💪', labelKey: 'goalModes.gainMuscle',  descKey: 'goalModes.gainMuscleDesc',           defaultAdjustPct: +10 },
  { id: 'recomp',       emoji: '♻️', labelKey: 'goalModes.recomp',      descKey: 'goalModes.recompDesc',               defaultAdjustPct: -5 },
  { id: 'maintain',     emoji: '⚖️', labelKey: 'goalModes.maintain',    descKey: 'goalModes.maintainDesc',             defaultAdjustPct: 0 },
  { id: 'mini_cut',     emoji: '✂️', labelKey: 'goalModes.miniCut',     descKey: 'goalModes.miniCutDesc',              defaultAdjustPct: -25 },
  { id: 'lean_bulk',    emoji: '📈', labelKey: 'goalModes.leanBulk',    descKey: 'goalModes.leanBulkDesc',             defaultAdjustPct: +5 },
];

// ============================================================================
// SCREEN
// ============================================================================

export default function NutritionSettingsScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const { user, updateProfile, updateUserGoals, toggleAdaptiveMode } = useUserStore();
  const nutritionMode = useUserStore((s) => s.user?.nutritionMode || 'simple');

  // ── Initialize from current user data ──
  const [age, setAge] = useState(String(user?.profile?.age || ''));
  const [weight, setWeight] = useState(String(user?.profile?.weight || ''));
  const [height, setHeight] = useState(String(user?.profile?.height || ''));
  const [gender, setGender] = useState(user?.profile?.gender || 'male');
  const [activity, setActivity] = useState<ActivityLevel>(user?.profile?.activityLevel || 'moderately_active');
  const [goalMode, setGoalMode] = useState<GoalMode>((user?.goalMode as GoalMode) || 'maintain');
  const [preset, setPreset] = useState('balanced');
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(user?.adaptiveMode || false);

  // ── Calorie adjustment (in kcal, not %) ──
  // Initialize from current user data: difference between goal calories and TDEE
  const initialAdjust = useMemo(() => {
    if (!user?.goals?.calories || !user?.tdee) {
      const mode = GOAL_MODES.find(m => m.id === goalMode);
      return mode?.defaultAdjustPct || 0;
    }
    const diff = user.goals.calories - (user.tdee || 0);
    return diff;
  }, []);

  const [adjustKcal, setAdjustKcal] = useState(initialAdjust);
  const [useKcalMode, setUseKcalMode] = useState(
    // If the stored adjustment doesn't align with a clean %, use kcal mode
    Math.abs(initialAdjust) > 10
  );
  const [saving, setSaving] = useState(false);

  // ── Derived calculations (live) ──
  const numWeight = parseFloat(weight) || 70;
  const numHeight = parseFloat(height) || 170;
  const numAge = parseInt(age) || 25;

  const bmr = useMemo(() => {
    if (gender === 'female') return 10 * numWeight + 6.25 * numHeight - 5 * numAge - 161;
    return 10 * numWeight + 6.25 * numHeight - 5 * numAge + 5;
  }, [numWeight, numHeight, numAge, gender]);

  const actMult = ACTIVITIES.find(a => a.id === activity)?.mult || 1.55;
  const tdee = Math.round(bmr * actMult);

  // Calorie adjustment — either kcal or percentage-based
  const adjustmentKcal = useKcalMode
    ? adjustKcal
    : Math.round(tdee * (adjustKcal / 100));

  const goalCalories = Math.max(1000, tdee + adjustmentKcal);

  // Macros from preset
  const presetConfig = getPresetById(preset) || MACRO_PRESETS[0];
  const macros = useMemo(
    () => calculateGoalsFromPreset(presetConfig, goalCalories),
    [presetConfig, goalCalories]
  );

  // When goal mode changes, update the adjustment to the mode's default
  const handleGoalModeChange = (mode: GoalMode) => {
    Haptics.selectionAsync();
    setGoalMode(mode);
    const modeConfig = GOAL_MODES.find(m => m.id === mode);
    if (modeConfig) {
      setUseKcalMode(false);
      setAdjustKcal(modeConfig.defaultAdjustPct);
    }
  };

  // ── Save ──
  const handleSave = async () => {
    if (!user) return;

    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (!w || w < 20 || w > 300 || !h || h < 100 || h > 250 || !a || a < 10 || a > 100) {
      Alert.alert(t('nutritionSettings.invalidData'), t('nutritionSettings.checkData'));
      return;
    }

    setSaving(true);
    try {
      // 1. Update profile (triggers TDEE/BMR recalculation in store)
      await updateProfile(
        {
          age: a,
          weight: w,
          height: h,
          gender: gender as 'male' | 'female' | 'other',
          activityLevel: activity,
          goal: goalMode === 'lose_fat' || goalMode === 'mini_cut'
            ? 'lose_weight'
            : goalMode === 'gain_muscle' || goalMode === 'lean_bulk'
            ? 'gain_muscle'
            : goalMode === 'recomp'
            ? 'maintain_weight'
            : 'maintain_weight',
        },
        {
          calories: goalCalories,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat,
          fiber: gender === 'female' ? 25 : 38,
        }
      );

      // 2. Update goal mode
      await updateUserGoals({
        goalMode,
        targetCalories: goalCalories,
        targetProtein: macros.protein,
        targetCarbs: macros.carbs,
        targetFat: macros.fat,
      });

      // 3. Toggle adaptive mode if changed
      if (adaptiveEnabled !== user.adaptiveMode) {
        await toggleAdaptiveMode(adaptiveEnabled);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('nutritionSettings.goalsUpdated'), t('nutritionSettings.newCalories', { kcal: goalCalories }));
      router.back();
    } catch (error) {
      console.error('Error saving nutrition settings:', error);
      Alert.alert('Error', t('nutritionSettings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={28} color={C.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.text }]}>{t('nutritionSettings.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ═══════════════ DATOS PERSONALES ═══════════════ */}
        <SectionHeader icon="person-outline" title={t('nutritionSettings.personalData')} color={C} />

        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {/* Gender */}
          <Text style={[s.fieldLabel, { color: C.textSecondary }]}>{t('nutritionSettings.sex')}</Text>
          <View style={s.chipRow}>
            {GENDERS.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[
                  s.chip,
                  { backgroundColor: gender === g.id ? C.primary + '20' : C.background, borderColor: gender === g.id ? C.primary : C.border },
                ]}
                onPress={() => { setGender(g.id); Haptics.selectionAsync(); }}
              >
                <Ionicons name={g.icon as any} size={18} color={gender === g.id ? C.primary : C.textMuted} />
                <Text style={[s.chipText, { color: gender === g.id ? C.primary : C.textSecondary }]}>{t(g.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Age / Weight / Height */}
          <View style={s.inputRow}>
            <View style={s.inputGroup}>
              <Text style={[s.fieldLabel, { color: C.textSecondary }]}>{t('onboarding.age')}</Text>
              <TextInput
                style={[s.input, { color: C.text, backgroundColor: C.background, borderColor: C.border }]}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="25"
                placeholderTextColor={C.textMuted}
                maxLength={3}
              />
            </View>
            <View style={s.inputGroup}>
              <Text style={[s.fieldLabel, { color: C.textSecondary }]}>{t('onboarding.weight')}</Text>
              <TextInput
                style={[s.input, { color: C.text, backgroundColor: C.background, borderColor: C.border }]}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="75"
                placeholderTextColor={C.textMuted}
                maxLength={5}
              />
            </View>
            <View style={s.inputGroup}>
              <Text style={[s.fieldLabel, { color: C.textSecondary }]}>{t('onboarding.height')}</Text>
              <TextInput
                style={[s.input, { color: C.text, backgroundColor: C.background, borderColor: C.border }]}
                value={height}
                onChangeText={setHeight}
                keyboardType="number-pad"
                placeholder="175"
                placeholderTextColor={C.textMuted}
                maxLength={3}
              />
            </View>
          </View>
        </View>

        {/* ═══════════════ NIVEL DE ACTIVIDAD ═══════════════ */}
        <SectionHeader icon="walk-outline" title={t('nutritionSettings.activityLevel')} color={C} />

        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.hint, { color: C.textTertiary }]}>{t('nutritionSettings.activityHint')}</Text>
          {ACTIVITIES.map(a => {
            const isActive = activity === a.id;
            return (
              <TouchableOpacity
                key={a.id}
                style={[
                  s.listItem,
                  { backgroundColor: isActive ? C.primary + '12' : 'transparent', borderColor: isActive ? C.primary : C.border },
                ]}
                onPress={() => { setActivity(a.id); Haptics.selectionAsync(); }}
              >
                <View style={s.listItemContent}>
                  <Text style={[s.listItemTitle, { color: isActive ? C.primary : C.text }]}>{t(a.labelKey)}</Text>
                  <Text style={[s.listItemDesc, { color: C.textTertiary }]}>{t(a.descKey)}</Text>
                </View>
                <Text style={[s.multBadge, { color: C.primary }]}>×{a.mult}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══════════════ MODO DE OBJETIVO ═══════════════ */}
        <SectionHeader icon="flag-outline" title={t('nutritionSettings.goalMode')} color={C} />

        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {GOAL_MODES.map(mode => {
            const isActive = goalMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[
                  s.goalItem,
                  { backgroundColor: isActive ? C.primary + '12' : 'transparent', borderColor: isActive ? C.primary : C.border },
                ]}
                onPress={() => handleGoalModeChange(mode.id)}
              >
                <Text style={s.goalEmoji}>{mode.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.goalLabel, { color: isActive ? C.primary : C.text }]}>{t(mode.labelKey)}</Text>
                  <Text style={[s.goalDesc, { color: C.textTertiary }]}>{t(mode.descKey)}</Text>
                </View>
                {isActive && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══════════════ AJUSTE CALÓRICO ═══════════════ */}
        <SectionHeader icon="options-outline" title={t('nutritionSettings.calorieAdjust')} color={C} />

        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.hint, { color: C.textTertiary }]}>
            {t('nutritionSettings.adjustHint')}
          </Text>

          {/* Toggle: % vs kcal */}
          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[s.toggleBtn, !useKcalMode && { backgroundColor: C.primary + '20', borderColor: C.primary }]}
              onPress={() => {
                if (useKcalMode) {
                  // Convert current kcal to approximate %
                  const pct = tdee > 0 ? Math.round((adjustKcal / tdee) * 100) : 0;
                  setAdjustKcal(pct);
                  setUseKcalMode(false);
                }
              }}
            >
              <Text style={[s.toggleText, { color: !useKcalMode ? C.primary : C.textSecondary }]}>%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, useKcalMode && { backgroundColor: C.primary + '20', borderColor: C.primary }]}
              onPress={() => {
                if (!useKcalMode) {
                  // Convert current % to kcal
                  const kcal = Math.round(tdee * (adjustKcal / 100));
                  setAdjustKcal(kcal);
                  setUseKcalMode(true);
                }
              }}
            >
              <Text style={[s.toggleText, { color: useKcalMode ? C.primary : C.textSecondary }]}>kcal</Text>
            </TouchableOpacity>
          </View>

          {/* Value display + step buttons */}
          <View style={s.sliderContainer}>
            <Text style={[s.sliderValue, { color: C.text }]}>
              {adjustmentKcal > 0 ? '+' : ''}{adjustmentKcal} kcal
              {!useKcalMode && ` (${adjustKcal > 0 ? '+' : ''}${adjustKcal}%)`}
            </Text>

            <View style={s.stepperRow}>
              <TouchableOpacity
                style={[s.stepperBtn, { backgroundColor: C.accent + '20', borderColor: C.accent }]}
                onPress={() => { setAdjustKcal(prev => prev - (useKcalMode ? 25 : 1)); Haptics.selectionAsync(); }}
              >
                <Ionicons name="remove" size={20} color={C.accent} />
              </TouchableOpacity>

              <View style={[s.stepperTrack, { backgroundColor: C.border }]}>
                <View style={[
                  s.stepperFill,
                  {
                    backgroundColor: adjustmentKcal < 0 ? C.accent : adjustmentKcal > 0 ? C.success : C.primary,
                    width: `${Math.min(100, Math.abs(useKcalMode ? adjustKcal / 10 : adjustKcal) * 2 + 2)}%`,
                    alignSelf: adjustmentKcal < 0 ? 'flex-start' : 'flex-end',
                  }
                ]} />
              </View>

              <TouchableOpacity
                style={[s.stepperBtn, { backgroundColor: C.success + '20', borderColor: C.success }]}
                onPress={() => { setAdjustKcal(prev => prev + (useKcalMode ? 25 : 1)); Haptics.selectionAsync(); }}
              >
                <Ionicons name="add" size={20} color={C.success} />
              </TouchableOpacity>
            </View>

            <View style={s.sliderLabels}>
              <Text style={[s.sliderLabel, { color: C.accent }]}>{t('nutritionSettings.deficit')}</Text>
              <TouchableOpacity onPress={() => { setAdjustKcal(0); Haptics.selectionAsync(); }}>
                <Text style={[s.sliderLabel, { color: C.primary, fontWeight: '700' }]}>{t('nutritionSettings.reset')}</Text>
              </TouchableOpacity>
              <Text style={[s.sliderLabel, { color: C.success }]}>{t('nutritionSettings.surplus')}</Text>
            </View>
          </View>

          {/* Manual input */}
          <View style={s.manualRow}>
            <Text style={[s.fieldLabel, { color: C.textSecondary }]}>{t('nutritionSettings.exactValue')}</Text>
            <TextInput
              style={[s.manualInput, { color: C.text, backgroundColor: C.background, borderColor: C.border }]}
              value={String(adjustKcal)}
              onChangeText={(v) => {
                const n = parseInt(v.replace(/[^0-9-]/g, ''));
                if (!isNaN(n)) setAdjustKcal(n);
                else if (v === '' || v === '-') setAdjustKcal(0);
              }}
              keyboardType="number-pad"
              maxLength={5}
            />
            <Text style={[s.manualUnit, { color: C.textMuted }]}>{useKcalMode ? 'kcal' : '%'}</Text>
          </View>
        </View>

        {/* ═══════════════ DESGLOSE CALÓRICO (LIVE) ═══════════════ */}
        <SectionHeader icon="calculator-outline" title={t('nutritionSettings.calorieBreakdown')} color={C} />

        <View style={[s.breakdownCard, { backgroundColor: C.card, borderColor: C.border }]}>
          {/* BMR */}
          <View style={s.breakdownRow}>
            <View style={s.breakdownLeft}>
              <Text style={s.breakdownEmoji}>🔋</Text>
              <View>
                <Text style={[s.breakdownLabel, { color: C.text }]}>{t('nutritionSettings.bmr')}</Text>
                <Text style={[s.breakdownNote, { color: C.textTertiary }]}>{t('nutritionSettings.restExpenditure')}</Text>
              </View>
            </View>
            <Text style={[s.breakdownValue, { color: C.text }]}>{Math.round(bmr)}</Text>
          </View>

          <View style={[s.breakdownDivider, { backgroundColor: C.border }]} />

          {/* Activity */}
          <View style={s.breakdownRow}>
            <View style={s.breakdownLeft}>
              <Text style={s.breakdownEmoji}>🏃</Text>
              <View>
                <Text style={[s.breakdownLabel, { color: C.text }]}>
                  {t('nutritionSettings.activityCalc', { level: t(ACTIVITIES.find(a => a.id === activity)?.labelKey || 'onboarding.moderatelyActive') })}
                </Text>
                <Text style={[s.breakdownNote, { color: C.textTertiary }]}>{t('nutritionSettings.exerciseMovement')}</Text>
              </View>
            </View>
            <Text style={[s.breakdownValue, { color: C.text }]}>+{tdee - Math.round(bmr)}</Text>
          </View>

          <View style={[s.breakdownDivider, { backgroundColor: C.border }]} />

          {/* TDEE total */}
          <View style={s.breakdownRow}>
            <View style={s.breakdownLeft}>
              <Text style={s.breakdownEmoji}>⚡</Text>
              <Text style={[s.breakdownLabel, { color: C.text, fontWeight: '700' }]}>{t('nutritionSettings.tdeeTotal')}</Text>
            </View>
            <Text style={[s.breakdownValue, { color: C.primary, fontWeight: '800' }]}>{tdee}</Text>
          </View>

          <View style={[s.breakdownDivider, { backgroundColor: C.border }]} />

          {/* Adjustment */}
          <View style={s.breakdownRow}>
            <View style={s.breakdownLeft}>
              <Text style={s.breakdownEmoji}>{adjustmentKcal < 0 ? '📉' : adjustmentKcal > 0 ? '📈' : '➡️'}</Text>
              <Text style={[s.breakdownLabel, { color: C.text }]}>
                {adjustmentKcal < 0 ? t('nutritionSettings.deficitApplied') : adjustmentKcal > 0 ? t('nutritionSettings.surplusApplied') : t('nutritionSettings.noAdjustment')}
              </Text>
            </View>
            <Text style={[s.breakdownValue, { color: adjustmentKcal < 0 ? C.accent : adjustmentKcal > 0 ? C.success : C.textMuted }]}>
              {adjustmentKcal > 0 ? '+' : ''}{adjustmentKcal}
            </Text>
          </View>

          <View style={[s.breakdownDivider, { backgroundColor: C.primary + '30' }]} />

          {/* Final goal */}
          <View style={[s.breakdownRow, { paddingVertical: 12 }]}>
            <View style={s.breakdownLeft}>
              <Text style={s.breakdownEmoji}>🎯</Text>
              <Text style={[s.breakdownLabel, { color: C.primary, fontWeight: '800', fontSize: 16 }]}>{t('nutritionSettings.calorieGoal')}</Text>
            </View>
            <Text style={[s.breakdownValue, { color: C.primary, fontWeight: '800', fontSize: 20 }]}>{goalCalories}</Text>
          </View>
        </View>

        {/* ═══════════════ DISTRIBUCIÓN DE MACROS ═══════════════ */}
        <SectionHeader icon="pie-chart-outline" title={t('nutritionSettings.macroDistribution')} color={C} />

        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {/* Preset selector */}
          {MACRO_PRESETS.map(p => {
            const isActive = preset === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  s.presetItem,
                  { backgroundColor: isActive ? C.primary + '12' : 'transparent', borderColor: isActive ? C.primary : C.border },
                ]}
                onPress={() => { setPreset(p.id); Haptics.selectionAsync(); }}
              >
                <Text style={{ fontSize: 20 }}>{p.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.presetName, { color: isActive ? C.primary : C.text }]}>{p.nameEs}</Text>
                  <Text style={[s.presetDesc, { color: C.textTertiary }]}>{p.descriptionEs}</Text>
                </View>
                {isActive && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
              </TouchableOpacity>
            );
          })}

          {/* Macro summary */}
          <View style={[s.macroSummary, { backgroundColor: C.background, borderColor: C.border }]}>
            <MacroCell label={t('onboarding.protein')} value={macros.protein} unit="g" color={C.protein} textColor={C} />
            <MacroCell label={t('onboarding.carbs')} value={macros.carbs} unit="g" color={C.carbs} textColor={C} />
            <MacroCell label={t('onboarding.fat')} value={macros.fat} unit="g" color={C.fat} textColor={C} />
          </View>

          {/* Visual bar */}
          <View style={s.macroBar}>
            <View style={[s.macroBarSeg, { flex: macros.protein * 4, backgroundColor: C.protein }]} />
            <View style={[s.macroBarSeg, { flex: macros.carbs * 4, backgroundColor: C.carbs }]} />
            <View style={[s.macroBarSeg, { flex: macros.fat * 9, backgroundColor: C.fat }]} />
          </View>
          <View style={s.macroBarLabels}>
            <Text style={[s.macroBarPct, { color: C.protein }]}>
              {Math.round((macros.protein * 4 / goalCalories) * 100)}%
            </Text>
            <Text style={[s.macroBarPct, { color: C.carbs }]}>
              {Math.round((macros.carbs * 4 / goalCalories) * 100)}%
            </Text>
            <Text style={[s.macroBarPct, { color: C.fat }]}>
              {Math.round((macros.fat * 9 / goalCalories) * 100)}%
            </Text>
          </View>
        </View>

        {/* ═══════════════ MODO ADAPTATIVO ═══════════════ */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[s.listItemTitle, { color: C.text }]}>{t('nutritionSettings.adaptive')}</Text>
            <Text style={[s.listItemDesc, { color: C.textTertiary }]}>
              {t('nutritionSettings.adaptiveDesc')}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.toggleSwitch, { backgroundColor: adaptiveEnabled ? C.primary : C.border }]}
            onPress={() => { setAdaptiveEnabled(!adaptiveEnabled); Haptics.selectionAsync(); }}
          >
            <View style={[s.toggleKnob, { transform: [{ translateX: adaptiveEnabled ? 20 : 0 }] }]} />
          </TouchableOpacity>
        </View>

        {/* Informational note */}
        <View style={s.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color={C.textTertiary} />
          <Text style={[s.infoText, { color: C.textTertiary }]}>
            {t('nutritionSettings.liveNote')}
          </Text>
        </View>

        {/* ═══════════════ SAVE BUTTON ═══════════════ */}
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: C.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={s.saveBtnText}>{t('nutritionSettings.saveChanges')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SectionHeader({ icon, title, color: C }: { icon: string; title: string; color: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 10, paddingHorizontal: 16 }}>
      <Ionicons name={icon as any} size={18} color={C.primary} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
    </View>
  );
}

function MacroCell({ label, value, unit, color, textColor: C }: { label: string; value: number; unit: string; color: string; textColor: any }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: C.textSecondary }}>{unit}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: C.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    scrollContent: { paddingBottom: 40 },

    // Cards
    card: {
      marginHorizontal: 16,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      marginBottom: 4,
    },
    breakdownCard: {
      marginHorizontal: 16,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      marginBottom: 4,
    },

    // Fields
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 17,
      fontWeight: '600',
      borderWidth: 1,
      textAlign: 'center',
    },
    inputRow: {
      flexDirection: 'row',
      gap: 10,
    },
    inputGroup: { flex: 1 },
    hint: {
      fontSize: 13,
      marginBottom: 12,
    },

    // Chips (gender)
    chipRow: { flexDirection: 'row', gap: 10 },
    chip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    chipText: { fontSize: 15, fontWeight: '600' },

    // List items (activity, goal mode)
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 6,
    },
    listItemContent: { flex: 1 },
    listItemTitle: { fontSize: 15, fontWeight: '600' },
    listItemDesc: { fontSize: 12, marginTop: 2 },
    multBadge: { fontSize: 14, fontWeight: '700' },

    // Goal mode items
    goalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 6,
      gap: 12,
    },
    goalEmoji: { fontSize: 24 },
    goalLabel: { fontSize: 15, fontWeight: '600' },
    goalDesc: { fontSize: 12, marginTop: 2 },

    // Toggle (% vs kcal)
    toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    toggleBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    toggleText: { fontSize: 14, fontWeight: '700' },

    // Stepper
    sliderContainer: { alignItems: 'center', marginBottom: 8 },
    sliderValue: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', marginBottom: 8 },
    stepperBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    stepperTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
    stepperFill: { height: '100%', borderRadius: 4, minWidth: 4 },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    sliderLabel: { fontSize: 11, fontWeight: '600' },

    // Manual input
    manualRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    manualInput: {
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
      fontWeight: '700',
      borderWidth: 1,
      textAlign: 'center',
      width: 80,
    },
    manualUnit: { fontSize: 14, fontWeight: '600' },

    // Breakdown
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    breakdownEmoji: { fontSize: 18 },
    breakdownLabel: { fontSize: 14 },
    breakdownNote: { fontSize: 11, marginTop: 1 },
    breakdownValue: { fontSize: 16, fontWeight: '700' },
    breakdownDivider: { height: 1 },

    // Presets
    presetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 6,
      gap: 10,
    },
    presetName: { fontSize: 14, fontWeight: '600' },
    presetDesc: { fontSize: 11, marginTop: 1 },

    // Macro summary
    macroSummary: {
      flexDirection: 'row',
      borderRadius: 10,
      borderWidth: 1,
      padding: 14,
      marginTop: 12,
    },
    macroBar: {
      flexDirection: 'row',
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      marginTop: 10,
      gap: 2,
    },
    macroBarSeg: { borderRadius: 4 },
    macroBarLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    macroBarPct: { fontSize: 11, fontWeight: '600' },

    // Adaptive toggle
    toggleSwitch: {
      width: 48,
      height: 28,
      borderRadius: 14,
      padding: 4,
      justifyContent: 'center',
    },
    toggleKnob: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#fff',
    },

    // Info note
    infoNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      paddingHorizontal: 20,
      marginTop: 16,
      marginBottom: 8,
    },
    infoText: { fontSize: 12, flex: 1, lineHeight: 16 },

    // Save button
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      paddingVertical: 16,
      borderRadius: 14,
    },
    saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  });
}
