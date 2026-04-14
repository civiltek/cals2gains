/**
 * Nutrition Mode Selection - Phase 3
 * Simple vs Advanced mode toggle with feature preview
 * Cals2Gains React Native app
 */

import React, { useState, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../store/themeStore';
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
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(C), [C]);
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
    { name: t('nutritionMode.featureCalories'), simple: true, advanced: true },
    { name: t('nutritionMode.featureProtein'), simple: true, advanced: true },
    { name: t('nutritionMode.featureCarbs'), simple: false, advanced: true },
    { name: t('nutritionMode.featureFat'), simple: false, advanced: true },
    { name: t('nutritionMode.featureMicro'), simple: false, advanced: true },
    { name: t('nutritionMode.featureDetailedMacros'), simple: false, advanced: true },
    { name: t('nutritionMode.featureCharts'), simple: false, advanced: true },
    { name: t('nutritionMode.featureRecipes'), simple: false, advanced: true },
    { name: t('nutritionMode.featureAdaptive'), simple: false, advanced: true },
    { name: t('nutritionMode.featureSimpleLog'), simple: true, advanced: false },
    { name: t('nutritionMode.featureMinimalUI'), simple: true, advanced: false },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 8, zIndex: 10 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.6}
          style={{ padding: 4 }}
        >
          <Ionicons name="chevron-back" size={28} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nutritionMode.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={styles.subtitle}>
        {t('nutritionMode.subtitle')}
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
            <Text style={styles.modeTitle}>{t('nutritionMode.simple')}</Text>
            <Text style={styles.modeDescription}>
              {t('nutritionMode.simpleDesc')}
            </Text>

            {selectedMode === 'simple' && (
              <View style={styles.checkmark}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={C.primary}
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
            <Text style={styles.modeTitle}>{t('nutritionMode.advanced')}</Text>
            <Text style={styles.modeDescription}>
              {t('nutritionMode.advancedDesc')}
            </Text>

            {selectedMode === 'advanced' && (
              <View style={styles.checkmark}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={C.primary}
                />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* FEATURE COMPARISON TABLE */}
      <View style={styles.comparisonContainer}>
        <Text style={styles.comparisonTitle}>{t('nutritionMode.comparison')}</Text>

        {features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Text style={styles.featureName}>{feature.name}</Text>
            <View style={styles.featureChecks}>
              <View style={styles.checkCell}>
                {feature.simple && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={C.primary}
                  />
                )}
              </View>
              <View style={styles.checkCell}>
                {feature.advanced && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={C.primary}
                  />
                )}
              </View>
            </View>
          </View>
        ))}

        <View style={styles.tableHeader}>
          <Text style={styles.modeLabel}>{t('nutritionMode.simple')}</Text>
          <Text style={styles.modeLabel}>{t('nutritionMode.advanced')}</Text>
        </View>
      </View>

      {/* RECOMMENDATION */}
      <View style={styles.recommendationCard}>
        <Ionicons
          name="information-circle"
          size={24}
          color={C.primary}
          style={styles.infoIcon}
        />
        <View style={styles.recommendationContent}>
          <Text style={styles.recommendationTitle}>{t('nutritionMode.recommendation')}</Text>
          <Text style={styles.recommendationText}>
            {t('nutritionMode.recommendationText')}
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
        <Text style={styles.applyButtonText}>{t('nutritionMode.apply')}</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
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
      color: C.text,
    },
    subtitle: {
      fontSize: 14,
      color: C.textSecondary,
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
      backgroundColor: C.surface,
    },
    simpleModeCard: {
      borderColor: C.primary + '40',
    },
    advancedModeCard: {
      borderColor: C.primary + '40',
    },
    modeCardSelected: {
      backgroundColor: C.surfaceLight,
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
      color: C.text,
      marginBottom: 4,
    },
    modeDescription: {
      fontSize: 12,
      color: C.textSecondary,
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
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 16,
    },
    comparisonTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
      marginBottom: 12,
    },
    featureRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    featureName: {
      flex: 1,
      fontSize: 12,
      color: C.text,
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
      borderTopColor: C.border,
    },
    modeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: C.textSecondary,
      width: 30,
      textAlign: 'center',
    },

    // RECOMMENDATION
    recommendationCard: {
      flexDirection: 'row',
      backgroundColor: C.primary + '10',
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
      color: C.primary,
      marginBottom: 4,
    },
    recommendationText: {
      fontSize: 12,
      color: C.primary,
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
      backgroundColor: C.primary,
    },
    applyButtonAdvanced: {
      backgroundColor: C.primary,
    },
    applyButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: C.white,
    },
  });
}
