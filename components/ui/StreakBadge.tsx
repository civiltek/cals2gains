// ============================================
// Cals2Gains - Streak Badge Component
// ============================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../../store/themeStore';
import { useStreakStore } from '../../store/streakStore';
import { useTranslation } from 'react-i18next';

interface StreakBadgeProps {
  compact?: boolean;
}

export default function StreakBadge({ compact = false }: StreakBadgeProps) {
  const C = useColors();
  const { t } = useTranslation();
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when streak > 0
  useEffect(() => {
    if (currentStreak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => pulseAnim.stopAnimation();
  }, [currentStreak > 0]);

  if (currentStreak === 0 && compact) return null;

  return (
    <TouchableOpacity
      onPress={() => router.push('/achievements')}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.badge,
          compact ? styles.badgeCompact : styles.badgeFull,
          {
            backgroundColor: currentStreak > 0 ? C.primary + '22' : C.card,
            borderColor: currentStreak > 0 ? C.primary : C.border,
          },
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Text style={styles.emoji}>
          {currentStreak >= 30 ? '👑' : currentStreak >= 7 ? '🔥' : '⚡'}
        </Text>
        <View>
          <Text style={[styles.number, { color: currentStreak > 0 ? C.primary : C.textSecondary }]}>
            {currentStreak}
          </Text>
          {!compact && (
            <Text style={[styles.label, { color: C.textSecondary }]}>
              {t('achievements.days')}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeFull: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emoji: {
    fontSize: 16,
  },
  number: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 11,
  },
});
