// ============================================
// Cals2Gains - Achievements Screen
// ============================================

import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format, Locale } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useColors } from '../store/themeStore';
import { useStreakStore, ACHIEVEMENT_DEFS } from '../store/streakStore';

// ── Celebration overlay ───────────────────────────────────

function CelebrationOverlay({ onDismiss }: { onDismiss: () => void }) {
  const C = useColors();
  const { t, i18n } = useTranslation();
  const newlyUnlocked = useStreakStore((s) => s.newlyUnlocked);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (newlyUnlocked.length === 0) return;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 3.5 seconds
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [newlyUnlocked.length]);

  if (newlyUnlocked.length === 0) return null;

  const latest = newlyUnlocked[newlyUnlocked.length - 1];
  const def = ACHIEVEMENT_DEFS.find((d) => d.id === latest.id);
  if (!def) return null;

  return (
    <TouchableOpacity
      style={styles.celebrationBackdrop}
      activeOpacity={1}
      onPress={onDismiss}
    >
      <Animated.View
        style={[
          styles.celebrationCard,
          {
            backgroundColor: C.card,
            borderColor: C.primary,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={styles.celebrationEmoji}>{def.icon}</Text>
        <Text style={[styles.celebrationTitle, { color: C.primary }]}>
          {t('achievements.milestoneReached')}
        </Text>
        <Text style={[styles.celebrationName, { color: C.text }]}>
          {i18n.language === 'es' ? def.nameEs : def.nameEn}
        </Text>
        <Text style={[styles.celebrationDesc, { color: C.textSecondary }]}>
          {i18n.language === 'es' ? def.descriptionEs : def.descriptionEn}
        </Text>
        <Text style={[styles.celebrationDismiss, { color: C.textMuted }]}>
          {t('achievements.tapToDismiss')}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Achievement card ──────────────────────────────────────

interface AchCardProps {
  defId: string;
  unlocked: boolean;
  unlockedAt?: string;
  locale: Locale;
}

function AchievementCard({ defId, unlocked, unlockedAt, locale }: AchCardProps) {
  const C = useColors();
  const { i18n } = useTranslation();
  const def = ACHIEVEMENT_DEFS.find((d) => d.id === defId);
  if (!def) return null;

  const name = i18n.language === 'es' ? def.nameEs : def.nameEn;
  const desc = i18n.language === 'es' ? def.descriptionEs : def.descriptionEn;

  return (
    <View
      style={[
        styles.achCard,
        {
          backgroundColor: C.card,
          borderColor: unlocked ? C.primary + '60' : C.border,
          opacity: unlocked ? 1 : 0.55,
        },
      ]}
    >
      <View style={[styles.achIcon, { backgroundColor: unlocked ? C.primary + '22' : C.background }]}>
        <Text style={styles.achEmoji}>{unlocked ? def.icon : '🔒'}</Text>
      </View>
      <View style={styles.achInfo}>
        <Text style={[styles.achName, { color: unlocked ? C.text : C.textSecondary }]}>
          {name}
        </Text>
        <Text style={[styles.achDesc, { color: C.textMuted }]} numberOfLines={2}>
          {desc}
        </Text>
        {unlocked && unlockedAt && (
          <Text style={[styles.achDate, { color: C.primary }]}>
            {format(new Date(unlockedAt), 'd MMM yyyy', { locale })}
          </Text>
        )}
      </View>
      {unlocked && (
        <Ionicons name="checkmark-circle" size={20} color={C.primary} />
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────

export default function AchievementsScreen() {
  const C = useColors();
  const { t, i18n } = useTranslation();
  const styles_dyn = useMemo(() => createStyles(C), [C]);

  const currentStreak = useStreakStore((s) => s.currentStreak);
  const longestStreak = useStreakStore((s) => s.longestStreak);
  const achievements = useStreakStore((s) => s.achievements);
  const newlyUnlocked = useStreakStore((s) => s.newlyUnlocked);
  const clearNewlyUnlocked = useStreakStore((s) => s.clearNewlyUnlocked);

  const dateLocale = i18n.language === 'es' ? es : enUS;
  const unlockedMap = useMemo(() => {
    const m = new Map<string, string>();
    achievements.forEach((a) => m.set(a.id, a.unlockedAt));
    return m;
  }, [achievements]);

  const unlockedCount = achievements.length;
  const totalCount = ACHIEVEMENT_DEFS.length;

  return (
    <SafeAreaView style={[styles_dyn.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Celebration overlay */}
      {newlyUnlocked.length > 0 && (
        <CelebrationOverlay onDismiss={clearNewlyUnlocked} />
      )}

      {/* Header */}
      <View style={styles_dyn.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles_dyn.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles_dyn.title}>{t('achievements.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Streak section */}
        <View style={styles_dyn.streakSection}>
          <View style={[styles_dyn.streakCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles_dyn.streakItem}>
              <Text style={styles_dyn.streakEmoji}>🔥</Text>
              <Text style={[styles_dyn.streakNumber, { color: C.primary }]}>{currentStreak}</Text>
              <Text style={[styles_dyn.streakLabel, { color: C.textSecondary }]}>
                {t('achievements.currentStreak')}
              </Text>
            </View>
            <View style={[styles_dyn.streakDivider, { backgroundColor: C.border }]} />
            <View style={styles_dyn.streakItem}>
              <Text style={styles_dyn.streakEmoji}>⭐</Text>
              <Text style={[styles_dyn.streakNumber, { color: C.primary }]}>{longestStreak}</Text>
              <Text style={[styles_dyn.streakLabel, { color: C.textSecondary }]}>
                {t('achievements.bestStreak')}
              </Text>
            </View>
          </View>
          <Text style={[styles_dyn.streakNote, { color: C.textMuted }]}>
            {t('achievements.streakNote')}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles_dyn.progressSection}>
          <View style={styles_dyn.progressHeader}>
            <Text style={[styles_dyn.progressTitle, { color: C.text }]}>
              {t('achievements.title')}
            </Text>
            <Text style={[styles_dyn.progressCount, { color: C.primary }]}>
              {unlockedCount}/{totalCount}
            </Text>
          </View>
          <View style={[styles_dyn.progressBarBg, { backgroundColor: C.border }]}>
            <View
              style={[
                styles_dyn.progressBarFill,
                {
                  backgroundColor: C.primary,
                  width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Achievement list */}
        <View style={styles_dyn.list}>
          {ACHIEVEMENT_DEFS.map((def) => {
            const unlocked = unlockedMap.has(def.id);
            return (
              <AchievementCard
                key={def.id}
                defId={def.id}
                unlocked={unlocked}
                unlockedAt={unlockedMap.get(def.id)}
                locale={dateLocale}
              />
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: { width: 40, alignItems: 'flex-start' },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: C.text,
    },
    streakSection: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    streakCard: {
      flexDirection: 'row',
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      alignItems: 'center',
    },
    streakItem: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    streakEmoji: { fontSize: 28 },
    streakNumber: {
      fontSize: 32,
      fontWeight: '800',
    },
    streakLabel: {
      fontSize: 11,
      fontWeight: '500',
      textAlign: 'center',
    },
    streakDivider: {
      width: 1,
      height: 60,
      marginHorizontal: 16,
    },
    streakNote: {
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 16,
    },
    progressSection: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    progressTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    progressCount: {
      fontSize: 16,
      fontWeight: '700',
    },
    progressBarBg: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    list: {
      paddingHorizontal: 16,
      gap: 10,
    },
  });
}

// ── Shared styles ────────────────────────────────────────

const styles = StyleSheet.create({
  achCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  achIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achEmoji: { fontSize: 24 },
  achInfo: { flex: 1, gap: 2 },
  achName: {
    fontSize: 14,
    fontWeight: '700',
  },
  achDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  achDate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  // Celebration overlay
  celebrationBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  celebrationCard: {
    width: 300,
    borderRadius: 24,
    borderWidth: 2,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  celebrationEmoji: { fontSize: 64, marginBottom: 8 },
  celebrationTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  celebrationName: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  celebrationDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  celebrationDismiss: {
    fontSize: 11,
    marginTop: 8,
  },
});
