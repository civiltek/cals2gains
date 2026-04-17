/**
 * Goal Modes Screen
 * Premium feature to select and customize nutrition goal mode
 * Phase 2 - Goal Selection & Adaptive Macros
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { BRAND_COLORS, BRAND_FONTS } from '../theme';
import { useColors } from '../store/themeStore';
import InfoButton from '../components/ui/InfoButton';
import { useUserStore } from '../store/userStore';
import { AdaptiveMacroEngine, GoalMode } from '../services/adaptiveMacroEngine';
import type { GoalModeConfig } from '../services/adaptiveMacroEngine';

// ============================================================================
// Types
// ============================================================================

interface GoalModeOption {
  mode: GoalMode;
  emoji: string;
  nameKey: string;
  descriptionKey: string;
  macroSummaryKey: string;
}

interface CalculatedGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ============================================================================
// Goal Mode Definitions
// ============================================================================

const GOAL_MODES: GoalModeOption[] = [
  {
    mode: 'lose_fat',
    emoji: '🔥',
    nameKey: 'goalModes.loseFat',
    descriptionKey: 'goalModes.loseFatDesc',
    macroSummaryKey: 'goalModes.loseFatMacro',
  },
  {
    mode: 'gain_muscle',
    emoji: '💪',
    nameKey: 'goalModes.gainMuscle',
    descriptionKey: 'goalModes.gainMuscleDesc',
    macroSummaryKey: 'goalModes.gainMuscleMacro',
  },
  {
    mode: 'recomp',
    emoji: '♻️',
    nameKey: 'goalModes.recomp',
    descriptionKey: 'goalModes.recompDesc',
    macroSummaryKey: 'goalModes.recompMacro',
  },
  {
    mode: 'maintain',
    emoji: '⚖️',
    nameKey: 'goalModes.maintain',
    descriptionKey: 'goalModes.maintainDesc',
    macroSummaryKey: 'goalModes.maintainMacro',
  },
  {
    mode: 'mini_cut',
    emoji: '✂️',
    nameKey: 'goalModes.miniCut',
    descriptionKey: 'goalModes.miniCutDesc',
    macroSummaryKey: 'goalModes.miniCutMacro',
  },
  {
    mode: 'lean_bulk',
    emoji: '📈',
    nameKey: 'goalModes.leanBulk',
    descriptionKey: 'goalModes.leanBulkDesc',
    macroSummaryKey: 'goalModes.leanBulkMacro',
  },
];

// ============================================================================
// Goal Modes Screen Component
// ============================================================================

interface GoalModesScreenProps {
  onGoalsUpdated?: () => void;
}

export const GoalModesScreen: React.FC<GoalModesScreenProps> = ({
  onGoalsUpdated,
}) => {
  const { t } = useTranslation();
  const C = useColors();
  const {
    user,
    updateUserGoals,
    toggleAdaptiveMode,
  } = useUserStore();

  const [selectedMode, setSelectedMode] = useState<GoalMode>(
    (user?.goalMode as GoalMode) || 'maintain'
  );
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(
    user?.adaptiveMode || false
  );
  const [calculatedGoals, setCalculatedGoals] = useState<CalculatedGoals | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [modeConfig, setModeConfig] = useState<GoalModeConfig | null>(null);

  // Calculate goals when mode changes
  useEffect(() => {
    calculateGoals(selectedMode);
  }, [selectedMode, user?.tdee, user?.bmr]);

  // Fetch mode config
  useEffect(() => {
    const config = AdaptiveMacroEngine.getGoalModeConfig(selectedMode);
    setModeConfig(config);
  }, [selectedMode]);

  const calculateGoals = useCallback(
    (mode: GoalMode) => {
      if (!user?.tdee || !user?.bmr) {
        return;
      }

      const config = AdaptiveMacroEngine.getGoalModeConfig(mode);
      const targetCalories = Math.round(user.tdee * config.calorieFactor);

      // Protein: multiplier × weight in kg
      const userWeightKg = user?.weight || 75;
      const targetProtein = Math.round(
        userWeightKg * config.proteinMultiplier
      );

      // Calculate carbs and fat from remaining calories
      const proteinCalories = targetProtein * 4;
      const remainingCalories = targetCalories - proteinCalories;

      const carbCalories = Math.round(remainingCalories * config.carbsPct);
      const fatCalories = Math.round(remainingCalories * config.fatPct);

      const targetCarbs = Math.round(carbCalories / 4);
      const targetFat = Math.round(fatCalories / 9);

      setCalculatedGoals({
        calories: targetCalories,
        protein: targetProtein,
        carbs: targetCarbs,
        fat: targetFat,
      });
    },
    [user?.tdee, user?.bmr, user?.weight]
  );

  const handleApplyGoals = useCallback(async () => {
    if (!calculatedGoals) return;

    setLoading(true);
    try {
      await updateUserGoals({
        goalMode: selectedMode,
        targetCalories: calculatedGoals.calories,
        targetProtein: calculatedGoals.protein,
        targetCarbs: calculatedGoals.carbs,
        targetFat: calculatedGoals.fat,
      });

      if (adaptiveEnabled !== user?.adaptiveMode) {
        await toggleAdaptiveMode(adaptiveEnabled);
      }

      onGoalsUpdated?.();
    } catch (error) {
      console.error('Error updating goals:', error);
    } finally {
      setLoading(false);
    }
  }, [calculatedGoals, selectedMode, adaptiveEnabled, user?.adaptiveMode, updateUserGoals, toggleAdaptiveMode, onGoalsUpdated]);

  const getMacroDistribution = (
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  ) => {
    const proteinCals = protein * 4;
    const carbsCals = carbs * 4;
    const fatCals = fat * 9;

    return {
      proteinPct: Math.round((proteinCals / calories) * 100),
      carbsPct: Math.round((carbsCals / calories) * 100),
      fatPct: Math.round((fatCals / calories) * 100),
    };
  };

  const handleModeSelect = (mode: GoalMode) => {
    setSelectedMode(mode);
  };

  // =========================================================================
  // Render Methods
  // =========================================================================

  const renderGoalModeCard = ({ item }: { item: GoalModeOption }) => {
    const isSelected = selectedMode === item.mode;
    const borderColor = isSelected ? C.primary : C.border;
    const borderWidth = isSelected ? 3 : 1;

    return (
      <TouchableOpacity
        style={[
          styles.modeCard,
          {
            borderColor,
            borderWidth,
            backgroundColor: isSelected ? C.cardElevated : C.card,
          },
        ]}
        onPress={() => handleModeSelect(item.mode)}
        activeOpacity={0.7}
      >
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={[styles.modeName, { color: C.text }]}>{t(item.nameKey)}</Text>
        <Text style={[styles.modeDescription, { color: C.textMuted }]}>{t(item.descriptionKey)}</Text>
        <Text style={[styles.macroSummary, { color: C.primary }]}>{t(item.macroSummaryKey)}</Text>
      </TouchableOpacity>
    );
  };

  const macroDistribution = calculatedGoals
    ? getMacroDistribution(
        calculatedGoals.calories,
        calculatedGoals.protein,
        calculatedGoals.carbs,
        calculatedGoals.fat
      )
    : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.headerTitle, { color: C.text }]}>{t('goalModes.title')}</Text>
          <InfoButton
            emoji="🎯"
            title={t('infoTooltips.goalMode_title')}
            body={t('infoTooltips.goalMode_body')}
          />
        </View>
        <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>
          {t('goalModes.subtitle')}
        </Text>
      </View>

      {/* Goal Mode Cards Grid */}
      <View style={styles.gridContainer}>
        <FlatList
          data={GOAL_MODES}
          renderItem={renderGoalModeCard}
          keyExtractor={(item) => item.mode}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
        />
      </View>

      {/* Mode Details & Macro Preview */}
      {modeConfig && calculatedGoals && (
        <View style={styles.previewSection}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('goalModes.personalizedPlan')}</Text>

          {/* Goal Summary */}
          <View style={[styles.summaryCard, { backgroundColor: C.card, borderLeftColor: C.primary }]}>
            <Text style={[styles.summaryTitle, { color: C.text }]}>{modeConfig.descriptionEs || modeConfig.description}</Text>
            {modeConfig.duration && (
              <Text style={[styles.summaryDuration, { color: C.textSecondary }]}>
                {t('goalModes.recommendedDuration', { duration: modeConfig.duration.replace('weeks', 'semanas') })}
              </Text>
            )}
          </View>

          {/* Macro Distribution Preview */}
          <View style={[styles.macroPreviewCard, { backgroundColor: C.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={[styles.macroPreviewTitle, { color: C.text }]}>{t('goalModes.macroDistribution')}</Text>
              <InfoButton
                emoji="🍽️"
                title={t('infoTooltips.macros_title')}
                body={t('infoTooltips.macros_body')}
              />
            </View>

            {/* Macro Bars */}
            <View style={styles.macroBarsContainer}>
              <View style={[styles.macroBar, { backgroundColor: C.background }]}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: `${macroDistribution.proteinPct}%`,
                      backgroundColor: C.primary,
                    },
                  ]}
                />
              </View>

              <View style={[styles.macroBar, { backgroundColor: C.background }]}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: `${macroDistribution.carbsPct}%`,
                      backgroundColor: C.carbs,
                    },
                  ]}
                />
              </View>

              <View style={[styles.macroBar, { backgroundColor: C.background }]}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: `${macroDistribution.fatPct}%`,
                      backgroundColor: C.fat,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Macro Values */}
            <View style={styles.macroValuesGrid}>
              <View style={[styles.macroValue, { backgroundColor: C.background }]}>
                <Text style={[styles.macroLabel, { color: C.textSecondary }]}>{t('goalModes.calories')}</Text>
                <Text style={[styles.macroNumber, { color: C.text }]}>{calculatedGoals.calories}</Text>
                <Text style={[styles.macroUnit, { color: C.textSecondary }]}>{t('goalModes.perDay')}</Text>
              </View>

              <View style={[styles.macroValue, { backgroundColor: C.background }]}>
                <Text style={[styles.macroLabel, { color: C.textSecondary }]}>{t('goalModes.protein')}</Text>
                <Text style={[styles.macroNumber, { color: C.primary }]}>
                  {calculatedGoals.protein}g
                </Text>
                <Text style={[styles.macroUnit, { color: C.textSecondary }]}>
                  {macroDistribution.proteinPct}%
                </Text>
              </View>

              <View style={[styles.macroValue, { backgroundColor: C.background }]}>
                <Text style={[styles.macroLabel, { color: C.textSecondary }]}>{t('goalModes.carbohydrates')}</Text>
                <Text style={[styles.macroNumber, { color: C.carbs }]}>
                  {calculatedGoals.carbs}g
                </Text>
                <Text style={[styles.macroUnit, { color: C.textSecondary }]}>
                  {macroDistribution.carbsPct}%
                </Text>
              </View>

              <View style={[styles.macroValue, { backgroundColor: C.background }]}>
                <Text style={[styles.macroLabel, { color: C.textSecondary }]}>{t('goalModes.fats')}</Text>
                <Text style={[styles.macroNumber, { color: C.fat }]}>
                  {calculatedGoals.fat}g
                </Text>
                <Text style={[styles.macroUnit, { color: C.textSecondary }]}>
                  {macroDistribution.fatPct}%
                </Text>
              </View>
            </View>
          </View>

          {/* Adaptive Mode Toggle */}
          <View style={[styles.adaptiveToggleCard, { backgroundColor: C.card }]}>
            <View style={styles.adaptiveToggleContent}>
              <View>
                <Text style={[styles.adaptiveToggleTitle, { color: C.text }]}>
                  {t('goalModes.adaptiveAdjust')}
                </Text>
                <Text style={[styles.adaptiveToggleDescription, { color: C.textSecondary }]}>
                  {t('goalModes.adaptiveDesc')}
                </Text>
              </View>
              <Switch
                value={adaptiveEnabled}
                onValueChange={setAdaptiveEnabled}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={adaptiveEnabled ? C.accent : C.textSecondary}
              />
            </View>
          </View>

          {/* Apply Button */}
          <TouchableOpacity
            style={[
              styles.applyButton,
              { backgroundColor: C.primary },
              loading && styles.applyButtonDisabled,
            ]}
            onPress={handleApplyGoals}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <Text style={[styles.applyButtonText, { color: C.white }]}>{t('goalModes.applyGoals')}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: BRAND_FONTS.display.family,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: BRAND_FONTS.body.family,
  },
  gridContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridContent: {
    width: '100%',
  },
  modeCard: {
    width: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  modeName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: BRAND_FONTS.body.family,
  },
  modeDescription: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: BRAND_FONTS.body.family,
  },
  macroSummary: {
    fontSize: 11,
    textAlign: 'center',
    fontFamily: BRAND_FONTS.body.family,
  },
  previewSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: BRAND_FONTS.body.family,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: BRAND_FONTS.body.family,
  },
  summaryDuration: {
    fontSize: 12,
    fontFamily: BRAND_FONTS.body.family,
  },
  macroPreviewCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  macroPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: BRAND_FONTS.body.family,
  },
  macroBarsContainer: {
    marginBottom: 16,
    gap: 8,
  },
  macroBar: {
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 12,
  },
  macroValuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  macroValue: {
    flex: 0.48,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontFamily: BRAND_FONTS.body.family,
  },
  macroNumber: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: BRAND_FONTS.display.family,
  },
  macroUnit: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: BRAND_FONTS.body.family,
  },
  adaptiveToggleCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  adaptiveToggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adaptiveToggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: BRAND_FONTS.body.family,
  },
  adaptiveToggleDescription: {
    fontSize: 12,
    fontFamily: BRAND_FONTS.body.family,
  },
  applyButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: BRAND_FONTS.body.family,
  },
});

export default GoalModesScreen;
