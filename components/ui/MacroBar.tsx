// ============================================
// Cals2Gains - Macro Progress Bar Component
// ============================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../store/themeStore';

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  compact?: boolean;
}

const MacroBar: React.FC<MacroBarProps> = ({
  label,
  current,
  goal,
  unit,
  color,
  compact = false,
}) => {
  const C = useColors();
  const { t } = useTranslation();
  const styles = createStyles(C);
  const progress = Math.min(current / Math.max(goal, 1), 1);
  const isOver = current > goal;

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress * 100,
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const remaining = Math.max(0, goal - current);
  const overAmount = Math.max(0, current - goal);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactLabel}>{label}</Text>
          <Text style={[styles.compactValue, isOver && { color: C.error }]}>
            {Math.round(current)}<Text style={styles.compactUnit}>{unit}</Text>
          </Text>
        </View>
        <View style={styles.barBackground}>
          <Animated.View
            style={[
              styles.barFill,
              { backgroundColor: isOver ? C.error : color },
              { width: widthInterpolation },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueContainer}>
          <Text style={[styles.current, isOver && { color: C.error }]}>
            {Math.round(current)}
          </Text>
          <Text style={styles.separator}> / </Text>
          <Text style={styles.goal}>{Math.round(goal)}{unit}</Text>
        </View>
      </View>

      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: isOver ? C.error : color },
            { width: widthInterpolation },
          ]}
        />
      </View>

      <Text style={styles.remaining}>
        {isOver
          ? t('macroBar.exceeded', { amount: Math.round(overAmount), unit })
          : t('macroBar.remaining', { amount: Math.round(remaining), unit })}
      </Text>
    </View>
  );
};

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      marginVertical: 6,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: C.text,
    },
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    current: {
      fontSize: 15,
      fontWeight: '700',
      color: C.text,
    },
    separator: {
      fontSize: 13,
      color: C.textMuted,
    },
    goal: {
      fontSize: 13,
      color: C.textSecondary,
    },
    barBackground: {
      height: 8,
      backgroundColor: C.surfaceLight || C.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 4,
    },
    remaining: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 4,
    },

    // Compact styles
    compactContainer: {
      marginVertical: 4,
    },
    compactHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    compactLabel: {
      fontSize: 12,
      color: C.textSecondary,
    },
    compactValue: {
      fontSize: 12,
      fontWeight: '600',
      color: C.text,
    },
    compactUnit: {
      fontSize: 10,
      fontWeight: '400',
      color: C.textMuted,
    },
  });
}

export default MacroBar;
