// ============================================
// Cals2Gains - Macro Progress Bar Component
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Colors from '../../constants/colors';

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
  const progress = Math.min(current / Math.max(goal, 1), 1);
  const isOver = current > goal;

  const animatedWidth = useSharedValue(0);

  React.useEffect(() => {
    animatedWidth.value = withTiming(progress * 100, {
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  const remaining = Math.max(0, goal - current);
  const overAmount = Math.max(0, current - goal);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactLabel}>{label}</Text>
          <Text style={[styles.compactValue, isOver && { color: Colors.error }]}>
            {Math.round(current)}<Text style={styles.compactUnit}>{unit}</Text>
          </Text>
        </View>
        <View style={styles.barBackground}>
          <Animated.View
            style={[
              styles.barFill,
              { backgroundColor: isOver ? Colors.error : color },
              animatedStyle,
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
          <Text style={[styles.current, isOver && { color: Colors.error }]}>
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
            { backgroundColor: isOver ? Colors.error : color },
            animatedStyle,
          ]}
        />
      </View>

      <Text style={styles.remaining}>
        {isOver
          ? `+${Math.round(overAmount)}${unit} excedido`
          : `${Math.round(remaining)}${unit} restante`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
    color: Colors.text,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  current: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  separator: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  goal: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  barBackground: {
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  remaining: {
    fontSize: 11,
    color: Colors.textMuted,
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
    color: Colors.textSecondary,
  },
  compactValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  compactUnit: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.textMuted,
  },
});

export default MacroBar;
