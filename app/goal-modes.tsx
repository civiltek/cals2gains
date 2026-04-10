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
import { COLORS, BRAND_COLORS, BRAND_FONTS } from '../theme';
import { useUserStore } from '../store/userStore';
import { AdaptiveMacroEngine, GoalMode } from '../services/adaptiveMacroEngine';
import type { GoalModeConfig } from '../services/adaptiveMacroEngine';

// ============================================================================
// Types
// ============================================================================

interface GoalModeOption {
  mode: GoalMode;
  emoji: string;
  nameEs: string;
  descriptionEs: string;
  macroSummary: string;
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
    nameEs: 'Perder grasa',
    descriptionEs: 'Déficit de 20% para pérdida rápida de grasa',
    macroSummary: 'Alta proteína, carbos moderados',
  },
  {
    mode: 'gain_muscle',
    emoji: '💪',
    nameEs: 'Ganar músculo',
    descriptionEs: 'Superávit de 10% para ganancia limpia',
    macroSummary: 'Alta proteína, carbos elevados',
  },
  {
    mode: 'recomp',
    emoji: '♻️',
    nameEs: 'Recomposición',
    descriptionEs: 'Mantener peso, ganar músculo y perder grasa',
    macroSummary: 'Proteína muy alta, balance calórico',
  },
  {
    mode: 'maintain',
    emoji: '⚖️',
    nameEs: 'Mantenimiento',
    descriptionEs: 'Mantener peso actual y rendimiento',
    macroSummary: 'Proteína moderada, balance flexible',
  },
  {
    mode: 'mini_cut',
    emoji: '✂️',
    nameEs: 'Mini corte',
    descriptionEs: 'Déficit de 25% por 4-6 semanas',
    macroSummary: 'Proteína máxima, carbos mínimos',
  },
  {
    mode: 'lean_bulk',
    emoji: '📈',
    nameEs: 'Lean bulk',
    descriptionEs: 'Superávit de 5% para ganancia limpia',
    macroSummary: 'Proteína alta, carbos altos',
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
    const borderColor = isSelected ? BRAND_COLORS.primary : COLORS.border;
    const borderWidth = isSelected ? 3 : 1;

    return (
      <TouchableOpacity
        style={[
          styles.modeCard,
          {
            borderColor,
            borderWidth,
            backgroundColor: isSelected ? COLORS.surfaceSelected : COLORS.surface,
          },
        ]}
        onPress={() => handleModeSelect(item.mode)}
        activeOpacity={0.7}
      >
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={styles.modeName}>{item.nameEs}</Text>
        <Text style={styles.modeDescription}>{item.descriptionEs}</Text>
        <Text style={styles.macroSummary}>{item.macroSummary}</Text>
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
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Objetivo</Text>
        <Text style={styles.headerSubtitle}>
          Elige tu objetivo nutricional
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
          <Text style={styles.sectionTitle}>Tu plan personalizado</Text>

          {/* Goal Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{modeConfig.description}</Text>
            {modeConfig.duration && (
              <Text style={styles.summaryDuration}>
                Duración recomendada: {modeConfig.duration}
              </Text>
            )}
          </View>

          {/* Macro Distribution Preview */}
          <View style={styles.macroPreviewCard}>
            <Text style={styles.macroPreviewTitle}>Distribución de macros</Text>

            {/* Macro Bars */}
            <View style={styles.macroBarsContainer}>
              <View style={styles.macroBar}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: `${macroDistribution.proteinPct}%`,
                      backgroundColor: BRAND_COLORS.primary,
                    },
                  ]}
                />
              </View>

              <View style={styles.macroBar}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: `${macroDistribution.carbsPct}%`,
                      backgroundColor: '#FFA500',
                    },
                  ]}
                />
              </View>

              <View style={styles.macroBar}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: `${macroDistribution.fatPct}%`,
                      backgroundColor: '#FF6B6B',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Macro Values */}
            <View style={styles.macroValuesGrid}>
              <View style={styles.macroValue}>
                <Text style={styles.macroLabel}>Calorías</Text>
                <Text style={styles.macroNumber}>{calculatedGoals.calories}</Text>
                <Text style={styles.macroUnit}>kcal/día</Text>
              </View>

              <View style={styles.macroValue}>
                <Text style={styles.macroLabel}>Proteína</Text>
                <Text style={[styles.macroNumber, { color: BRAND_COLORS.primary }]}>
                  {calculatedGoals.protein}g
                </Text>
                <Text style={styles.macroUnit}>
                  {macroDistribution.proteinPct}%
                </Text>
              </View>

              <View style={styles.macroValue}>
                <Text style={styles.macroLabel}>Carbohidratos</Text>
                <Text style={[styles.macroNumber, { color: '#FFA500' }]}>
                  {calculatedGoals.carbs}g
                </Text>
                <Text style={styles.macroUnit}>
                  {macroDistribution.carbsPct}%
                </Text>
              </View>

              <View style={styles.macroValue}>
                <Text style={styles.macroLabel}>Grasas</Text>
                <Text style={[styles.macroNumber, { color: '#FF6B6B' }]}>
                  {calculatedGoals.fat}g
                </Text>
                <Text style={styles.macroUnit}>
                  {macroDistribution.fatPct}%
                </Text>
              </View>
            </View>
          </View>

          {/* Adaptive Mode Toggle */}
          <View style={styles.adaptiveToggleCard}>
            <View style={styles.adaptiveToggleContent}>
              <View>
                <Text style={styles.adaptiveToggleTitle}>
                  Ajuste adaptativo
                </Text>
                <Text style={styles.adaptiveToggleDescription}>
                  Ajusta automáticamente tus objetivos según tu progreso
                </Text>
              </View>
              <Switch
                value={adaptiveEnabled}
                onValueChange={setAdaptiveEnabled}
                trackColor={{ false: COLORS.border, true: BRAND_COLORS.primary }}
                thumbColor={adaptiveEnabled ? BRAND_COLORS.accent : COLORS.textSecondary}
              />
            </View>
          </View>

          {/* Apply Button */}
          <TouchableOpacity
            style={[
              styles.applyButton,
              loading && styles.applyButtonDisabled,
            ]}
            onPress={handleApplyGoals}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.applyButtonText}>Aplicar objetivos</Text>
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
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    fontFamily: BRAND_FONTS.bold,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: BRAND_FONTS.regular,
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
    backgroundColor: COLORS.surface,
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
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: BRAND_FONTS.semibold,
  },
  modeDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: BRAND_FONTS.regular,
  },
  macroSummary: {
    fontSize: 11,
    color: BRAND_COLORS.primary,
    textAlign: 'center',
    fontFamily: BRAND_FONTS.regular,
  },
  previewSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    fontFamily: BRAND_FONTS.semibold,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.primary,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    fontFamily: BRAND_FONTS.semibold,
  },
  summaryDuration: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: BRAND_FONTS.regular,
  },
  macroPreviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  macroPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    fontFamily: BRAND_FONTS.semibold,
  },
  macroBarsContainer: {
    marginBottom: 16,
    gap: 8,
  },
  macroBar: {
    height: 24,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontFamily: BRAND_FONTS.regular,
  },
  macroNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: BRAND_FONTS.bold,
  },
  macroUnit: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontFamily: BRAND_FONTS.regular,
  },
  adaptiveToggleCard: {
    backgroundColor: COLORS.surface,
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
    color: COLORS.text,
    marginBottom: 4,
    fontFamily: BRAND_FONTS.semibold,
  },
  adaptiveToggleDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: BRAND_FONTS.regular,
  },
  applyButton: {
    backgroundColor: BRAND_COLORS.primary,
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
    color: COLORS.white,
    fontFamily: BRAND_FONTS.semibold,
  },
});

export default GoalModesScreen;
