// ============================================
// Cals2Gains - Water Tracker Screen
// ============================================

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '../store/themeStore';
import { useWaterStore } from '../store/waterStore';
import { useUserStore } from '../store/userStore';

const GLASS_ML = 250;
const GLASS_PRESETS = [4, 6, 8, 10, 12];

export default function WaterTrackerScreen() {
  const C = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const { user } = useUserStore();
  const {
    todayGlasses,
    goal,
    isLoading,
    loadToday,
    addGlass,
    removeGlass,
    setGoal,
    getProgress,
    getMl,
  } = useWaterStore();

  useEffect(() => {
    if (user?.uid) {
      loadToday(user.uid);
    }
  }, [user?.uid]);

  const progress = getProgress();
  const totalMl = getMl();
  const goalMl = goal * GLASS_ML;

  // SVG ring dimensions
  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - Math.min(progress, 1));

  const handleAdd = async () => {
    if (!user?.uid) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addGlass(user.uid);
  };

  const handleRemove = async () => {
    if (!user?.uid) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await removeGlass(user.uid);
  };

  const handleSetGoal = (newGoal: number) => {
    setGoal(newGoal, user?.uid);
    Haptics.selectionAsync();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>{t('waterTracker.title')}</Text>
        <Text style={styles.subtitle}>{t('waterTracker.subtitle')}</Text>

        {/* Progress Ring */}
        <View style={styles.ringContainer}>
          <Svg width={size} height={size}>
            {/* Background ring */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={C.surfaceLight || C.border}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress ring */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#4FC3F7"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Ionicons name="water" size={28} color="#4FC3F7" />
            <Text style={styles.ringGlasses}>{todayGlasses}</Text>
            <Text style={styles.ringLabel}>{t('waterTracker.ofGoal', { current: todayGlasses, goal })}</Text>
            <Text style={styles.ringMl}>{t('waterTracker.mlDisplay', { current: totalMl, goal: goalMl })}</Text>
          </View>
        </View>

        {/* Achievement message */}
        {progress >= 1 && (
          <View style={styles.achievementBanner}>
            <Ionicons name="checkmark-circle" size={20} color={C.success} />
            <Text style={styles.achievementText}>{t('waterTracker.goalReached')}</Text>
          </View>
        )}

        {/* Add / Remove buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.removeBtn]}
            onPress={handleRemove}
            disabled={todayGlasses <= 0}
          >
            <Ionicons name="remove" size={28} color={todayGlasses > 0 ? C.text : C.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Ionicons name="add" size={32} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{t('waterTracker.addGlass')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.removeBtn]}
            onPress={handleRemove}
            disabled={todayGlasses <= 0}
          >
            <Ionicons name="water" size={22} color="#4FC3F7" />
            <Text style={styles.miniLabel}>{t('waterTracker.mlPerGlass', { ml: GLASS_ML })}</Text>
          </TouchableOpacity>
        </View>

        {/* Goal selector */}
        <View style={styles.goalSection}>
          <Text style={styles.sectionTitle}>{t('waterTracker.dailyGoal')}</Text>
          <View style={styles.goalPresets}>
            {GLASS_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.goalChip,
                  goal === preset && styles.goalChipActive,
                ]}
                onPress={() => handleSetGoal(preset)}
              >
                <Text style={[
                  styles.goalChipText,
                  goal === preset && styles.goalChipTextActive,
                ]}>
                  {preset} {t('waterTracker.glasses')}
                </Text>
                <Text style={[
                  styles.goalChipMl,
                  goal === preset && styles.goalChipMlActive,
                ]}>
                  {preset * GLASS_ML}ml
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={C.info} />
          <Text style={styles.infoText}>
            {t('waterTracker.recommendation')}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },
    backBtn: {
      marginTop: 8,
      marginBottom: 4,
      width: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: C.text,
    },
    subtitle: {
      fontSize: 14,
      color: C.textSecondary,
      marginBottom: 24,
    },
    ringContainer: {
      alignSelf: 'center',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    ringCenter: {
      position: 'absolute',
      alignItems: 'center',
    },
    ringGlasses: {
      fontSize: 36,
      fontWeight: '700',
      color: C.text,
      marginTop: 4,
    },
    ringLabel: {
      fontSize: 14,
      color: C.textSecondary,
    },
    ringMl: {
      fontSize: 12,
      color: C.textMuted,
      marginTop: 2,
    },
    achievementBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.success + '15',
      borderRadius: 12,
      padding: 12,
      marginBottom: 24,
      gap: 8,
    },
    achievementText: {
      fontSize: 14,
      fontWeight: '600',
      color: C.success,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      marginBottom: 32,
    },
    actionBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: C.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    removeBtn: {
      borderWidth: 1,
      borderColor: C.border,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#4FC3F7',
      borderRadius: 28,
      paddingHorizontal: 24,
      paddingVertical: 14,
      gap: 8,
    },
    addBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    miniLabel: {
      fontSize: 9,
      color: C.textSecondary,
      marginTop: 2,
    },
    goalSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: C.text,
      marginBottom: 12,
    },
    goalPresets: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    goalChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: C.card,
      borderWidth: 2,
      borderColor: C.border,
      alignItems: 'center',
    },
    goalChipActive: {
      borderColor: '#4FC3F7',
      backgroundColor: '#4FC3F7' + '15',
    },
    goalChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
    },
    goalChipTextActive: {
      color: '#4FC3F7',
    },
    goalChipMl: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 2,
    },
    goalChipMlActive: {
      color: '#4FC3F7',
    },
    infoCard: {
      flexDirection: 'row',
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      gap: 10,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: C.textSecondary,
      lineHeight: 18,
    },
  });
}
