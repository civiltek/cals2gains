/**
 * Nutrition Mode Selection - Phase 3
 * Simple vs Advanced mode toggle with feature preview
 * Cals2Gains React Native app
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { COLORS } from '../theme';
import { useUserStore } from '../store/userStore';

// ============================================================================
// TYPES
// ============================================================================

type NutritionMode = 'simple' | 'advanced';

interface ModeFeature {
  name: string;
  simple: boolean;
  advanced: boolean;
}

// ============================================================================
// NUTRITION MODE SCREEN
// ============================================================================

export default function NutritionModeScreen() {
  const router = useRouter();
  const { nutritionMode, setNutritionMode } = useUserStore();

  const [selectedMode, setSelectedMode] = useState<NutritionMode>(
    (nutritionMode as NutritionMode) || 'simple'
  );
  const [animScale] = useState(new Animated.Value(1));

  const handleModeToggle = async (mode: NutritionMode) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(animScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedMode(mode);
  };

  const handleApply = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNutritionMode(selectedMode);

    // Return to previous screen or dashboard
    router.back();
  };

  const features: ModeFeature[] = [
    { name: 'Calorías', simple: true, advanced: true },
    { name: 'Proteína', simple: true, advanced: true },
    { name: 'Carbohidratos', simple: false, advanced: true },
    { name: 'Grasas', simple: false, advanced: true },
    { name: 'Micronutrientes (azúcar, sat. grasa, sodio)', simple: false, advanced: true },
    { name: 'Análisis de macros detallado', simple: false, advanced: true },
    { name: 'Gráficos y tendencias', simple: false, advanced: true },
    { name: 'Sistema de recetas completo', simple: false, advanced: true },
    { name: 'Motor adaptativo de objetivos', simple: false, advanced: true },
    { name: 'Registro simplificado (foto + confirmar)', simple: true, advanced: false },
    { name: 'Interfaz minimalista', simple: true, advanced: false },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modo de Nutrición</Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={styles.subtitle}>
        Elige el nivel de detalle que mejor se adapte a ti
      </Text>

      {/* MODE TOGGLE */}
      <View style={styles.modeToggleContainer}>
        <Animated.View
          style={[
            styles.modeCard,
            styles.simpleModeCard,
            selectedMode === 'simple' && styles.modeCardSelected,
            { transform: [{ scale: selectedMode === 'simple' ? 1.02 : 1 }] },
          ]}
        >
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => handleModeToggle('simple')}
            activeOpacity={0.7}
          >
            <View style={styles.modeIconContainer}>
              <Text style={styles.modeEmoji}>🟢</Text>
            </View>
            <Text style={styles.modeTitle}>Modo Simple</Text>
            <Text style={styles.modeDescription}>
              Solo calorías y proteína. Perfecto para empezar.
            </Text>

            {selectedMode === 'simple' && (
              <View style={styles.checkmark}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={COLORS.primary}
                />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.modeCard,
            styles.advancedModeCard,
            selectedMode === 'advanced' && styles.modeCardSelected,
            { transform: [{ scale: selectedMode === 'advanced' ? 1.02 : 1 }] },
          ]}
        >
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => handleModeToggle('advanced')}
            activeOpacity={0.7}
          >
            <View style={styles.modeIconContainer}>
              <Text style={styles.modeEmoji}>🟣</Text>
            </View>
            <Text style={styles.modeTitle}>Modo Avanzado</Text>
            <Text style={styles.modeDescription}>
              Macros completos, micronutrientes y análisis profundo.
            </Text>

            {selectedMode === 'advanced' && (
              <View style={styles.checkmark}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={COLORS.secondary}
                />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* FEATURE COMPARISON TABLE */}
      <View style={styles.comparisonContainer}>
        <Text style={styles.comparisonTitle}>Comparativa de Funciones</Text>

        {features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Text style={styles.featureName}>{feature.name}</Text>
            <View style={styles.featureChecks}>
              <View style={styles.checkCell}>
                {feature.simple && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={COLORS.primary}
                  />
                )}
              </View>
              <View style={styles.checkCell}>
                {feature.advanced && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={COLORS.secondary}
                  />
                )}
              </View>
            </View>
          </View>
        ))}

        <View style={styles.tableHeader}>
          <Text style={styles.modeLabel}>Simple</Text>
          <Text style={styles.modeLabel}>Avanzado</Text>
        </View>
      </View>

      {/* RECOMMENDATION */}
      <View style={styles.recommendationCard}>
        <Ionicons
          name="information-circle"
          size={24}
          color={COLORS.primary}
          style={styles.infoIcon}
        />
        <View style={styles.recommendationContent}>
          <Text style={styles.recommendationTitle}>Recomendación</Text>
          <Text style={styles.recommendationText}>
            Para principiantes recomendamos Modo Simple. Puedes cambiar cuando quieras.
          </Text>
        </View>
      </View>

      {/* APPLY BUTTON */}
      <TouchableOpacity
        style={[
          styles.applyButton,
          selectedMode === 'simple' ? styles.applyButtonSimple : styles.applyButtonAdvanced,
        ]}
        onPress={handleApply}
        activeOpacity={0.8}
      >
        <Text style={styles.applyButtonText}>Aplicar</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },

  // MODE TOGGLE
  modeToggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modeCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: '#f9f9f9',
  },
  simpleModeCard: {
    borderColor: COLORS.primary + '40',
  },
  advancedModeCard: {
    borderColor: COLORS.secondary + '40',
  },
  modeCardSelected: {
    backgroundColor: '#f5f5f5',
  },
  modeButton: {
    padding: 16,
    alignItems: 'center',
  },
  modeIconContainer: {
    marginBottom: 8,
  },
  modeEmoji: {
    fontSize: 32,
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 16,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // COMPARISON TABLE
  comparisonContainer: {
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  featureName: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
  },
  featureChecks: {
    flexDirection: 'row',
    gap: 20,
    marginLeft: 12,
  },
  checkCell: {
    width: 30,
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    width: 30,
    textAlign: 'center',
  },

  // RECOMMENDATION
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 12,
    color: COLORS.primary,
    lineHeight: 16,
  },

  // APPLY BUTTON
  applyButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  applyButtonSimple: {
    backgroundColor: COLORS.primary,
  },
  applyButtonAdvanced: {
    backgroundColor: COLORS.secondary,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
