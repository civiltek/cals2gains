// ============================================
// Cals2Gains - Macro Ring Chart Component
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Colors from '../../constants/colors';

interface MacroRingProps {
  calories: number;
  calorieGoal: number;
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
}

const MacroRing: React.FC<MacroRingProps> = ({
  calories,
  calorieGoal,
  protein,
  carbs,
  fat,
  size = 160,
}) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate macro calorie contributions
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const totalMacroCals = proteinCals + carbsCals + fatCals;

  const maxCals = Math.max(calorieGoal, totalMacroCals, 1);

  // Calculate arc lengths
  const proteinArc = (proteinCals / maxCals) * circumference;
  const carbsArc = (carbsCals / maxCals) * circumference;
  const fatArc = (fatCals / maxCals) * circumference;

  // Offsets for each segment (stacked)
  const proteinOffset = 0;
  const carbsOffset = circumference - proteinArc;
  const fatOffset = carbsOffset - carbsArc;

  // Overall calorie progress ring
  const calorieProgress = Math.min(calories / calorieGoal, 1);
  const calorieArc = calorieProgress * circumference;

  const percentComplete = Math.round((calories / calorieGoal) * 100);
  const isOver = calories > calorieGoal;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={Colors.surface}
          strokeWidth={strokeWidth}
          fill="none"
          rotation="-90"
          origin={`${center}, ${center}`}
        />

        {/* Macro segments ring (inner) */}
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Protein segment */}
          <Circle
            cx={center}
            cy={center}
            r={radius - strokeWidth - 4}
            stroke={Colors.protein}
            strokeWidth={8}
            fill="none"
            strokeDasharray={`${proteinArc} ${circumference - proteinArc}`}
            strokeDashoffset={-proteinOffset}
            strokeLinecap="round"
          />
          {/* Carbs segment */}
          <Circle
            cx={center}
            cy={center}
            r={radius - strokeWidth - 4}
            stroke={Colors.carbs}
            strokeWidth={8}
            fill="none"
            strokeDasharray={`${carbsArc} ${circumference - carbsArc}`}
            strokeDashoffset={carbsOffset - circumference}
            strokeLinecap="round"
          />
          {/* Fat segment */}
          <Circle
            cx={center}
            cy={center}
            r={radius - strokeWidth - 4}
            stroke={Colors.fat}
            strokeWidth={8}
            fill="none"
            strokeDasharray={`${fatArc} ${circumference - fatArc}`}
            strokeDashoffset={fatOffset - circumference}
            strokeLinecap="round"
          />
        </G>

        {/* Calorie progress ring (outer) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={isOver ? Colors.error : Colors.accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${calorieArc} ${circumference - calorieArc}`}
          strokeDashoffset={0}
          rotation="-90"
          origin={`${center}, ${center}`}
          strokeLinecap="round"
        />
      </Svg>

      {/* Center text */}
      <View style={styles.centerContent}>
        <Text style={[styles.caloriesText, isOver && styles.overText]}>
          {Math.round(calories)}
        </Text>
        <Text style={styles.kcalText}>kcal</Text>
        <Text style={styles.percentText}>{percentComplete}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 32,
  },
  overText: {
    color: Colors.error,
  },
  kcalText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  percentText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
});

export default MacroRing;
