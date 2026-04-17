/**
 * Goal Modes Screen
 * Premium feature to select and customize nutrition goal mode
 * Phase 2 - Goal Selection & Adaptive Macros
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { calculateMacroTargets } from '../utils/macros';
import { Ionicons } from '@expo/vector-icons';
import { isMinor } from '../types';

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

  // --- Fase B: flags de salud y edad ---
  const minor = useMemo(() => isMinor(user?.dateOfBirth), [user?.dateOfBirth]);
  const flags = user?.medicalFlags || [];
  const hasPregnancy = flags.includes('pregnancy_lactation');
  const hasDiabetes = flags.includes('diabetes');
  const hasKidney = flags.includes('kidney_disease');

  // lose_fat y mini_cut bloqueados si hay embarazo/lactancia o si es menor de edad
  const DEFICIT_MODES: GoalMode[] = ['lose_fat', 'mini_cut'];
  const deficitBlocked = hasPregnancy || minor;

  const isModeLocked = useCallback(
    (m: GoalMode) => deficitBlocked && DEFICIT_MODES.includes(m),
    [deficitBlocked],
  );

  // Valor inicial — si el modo guardado está bloqueado, caemos a 'maintain'.
  const initialMode: GoalMode = (() => {
    const saved = (user?.goalMode as GoalMode) || 'maintain';
    return deficitBlocked && DEFICIT_MODES.includes(saved) ? 'maintain' : saved;
  })();

  const [selectedMode, setSelectedMode] = useState<GoalMode>(initialMode);
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
  }, [selectedMode, user?.profile]);

  // Fetch mode config
  useEffect(() => {
    const config = AdaptiveMacroEngine.getGoalModeConfig(selectedMode);
    setModeConfig(config);
  }, [selectedMode]);

  const calculateGoals = useCallback(
    (mode: GoalMode) => {
      // Canonical calculation — requires a full profile. If the user hasn't
      // completed onboarding yet, we skip the preview (parent UI handles it).
      if (!user?.profile) {
        return;
      }
      const targets = calculateMacroTargets(user.profile, mode);
      setCalculatedGoals({
        calories: targets.calories,
        protein: targets.protein,
        carbs: targets.carbs,
        fat: targets.fat,
      });
    },
    [user?.profile]
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
    if (isModeLocked(mode)) {
      // No permitir selección — chip "Consulta con profesional"
      return;
    }
    setSelectedMode(mode);
  };

  // Callout visible cuando el modo seleccionado implica déficit y el usuario
  // declaró diabetes o enf. renal: recomendamos seguimiento profesional.
  // Solo aplica a déficit (lose_fat, mini_cut) porque es donde el riesgo clínico
  // crece. recomp y maintain no activan callout.
  const shouldShowProCallout =
    DEFICIT_MODES.includes(selectedMode) && (hasDiabetes || hasKidney);
  const proCalloutKey = hasDiabetes
    ? 'screening.calloutDiabetes'
    : 'screening.calloutKidney';

  // =========================================================================
  // Render Methods
  // =========================================================================

  const renderGoalModeCard = ({ item }: { item: GoalModeOption }) => {
    const isSelected = selectedMode === item.mode;
    const locked = isModeLocked(item.mode);
    const borderColor = locked
      ? C.border
      : isSelected
      ? C.primary
      : C.border;
    const borderWidth = isSelected && !locked ? 3 : 1;

    return (
      <TouchableOpacity
        style={[
          styles.modeCard,
          {
            borderColor,
            borderWidth,
            backgroundColor: isSelected && !locked ? C.cardElevated : C.card,
            opacity: locked ? 0.55 : 1,
          },
        ]}
        onPress={() => handleModeSelect(item.mode)}
        activeOpacity={locked ? 1 : 0.7}
        accessibilityRole="button"
        accessibilityState={{ disabled: locked, selected: isSelected }}
      >
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={[styles.modeName, { color: C.text }]}>{t(item.nameKey)}</Text>
        <Text style={[styles.modeDescription, { color: C.textMuted }]}>{t(item.descriptionKey)}</Text>
        <Text style={[styles.macroSummary, { color: C.primary }]}>{t(item.macroSummaryKey)}</Text>
        {locked && (
          <View style={[styles.lockChip, { backgroundColor: `${C.warning}20` }]}>
            <Ionicons name="information-circle" size={12} color={C.warning} />
            <Text style={[styles.lockChipText, { color: C.warning }]}>
              {t('screening.blockLoseFatTitle')}
            </Text>
          </View>
        )}
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

      {/* Bloque informativo si hay modos bloqueados por edad/embarazo */}
      {deficitBlocked && (
        <View style={[styles.blockBanner, { backgroundColor: `${C.warning}15`, borderColor: `${C.warning}40` }]}>
          <Ionicons name="information-circle-outline" size={20} color={C.warning} />
          <Text style={[styles.blockBannerText, { color: C.text }]}>
            {minor
              ? t('onboarding.ageGate.minorDeficitBlock')
              : t('screening.blockLoseFatBody')}
          </Text>
        </View>
      )}

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

      {/* Callout profesional para diabetes/renal con modo déficit */}
      {shouldShowProCallout && (
        <View style={[styles.callout, { backgroundColor: `${BRAND_COLORS.violet}12`, borderColor: `${BRAND_COLORS.violet}40` }]}>
          <Ionicons name="medkit-outline" size={18} color={BRAND_COLORS.violet} />
          <Text style={[styles.calloutText, { color: C.text }]}>
            {t(proCalloutKey)}
          </Text>
        </View>
      )}

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
  // Fase B — bloqueos / callouts
  blockBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    marginHorizontal: 20, marginBottom: 16,
    borderRadius: 12, borderWidth: 1,
  },
  blockBannerText: {
    flex: 1, fontSize: 13, lineHeight: 19,
    fontFamily: BRAND_FONTS.body.family,
  },
  callout: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    marginHorizontal: 20, marginBottom: 16,
    borderRadius: 12, borderWidth: 1,
  },
  calloutText: {
    flex: 1, fontSize: 13, lineHeight: 19,
    fontFamily: BRAND_FONTS.body.family,
  },
  lockChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  lockChipText: {
    fontSize: 10, fontWeight: '600',
    fontFamily: BRAND_FONTS.body.family,
  },
});

export default GoalModesScreen;
