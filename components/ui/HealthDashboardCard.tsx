// ============================================
// Cals2Gains - HealthDashboardCard Component
// ============================================
// Shows today's HealthKit / Health Connect data:
//   · Steps, active calories, exercise minutes
//   · TDEE impact (static vs dynamic)
//   · Toggle to enable/disable dynamic TDEE
//   · Link to connect health if not enabled

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../store/themeStore';
import { useUserStore } from '../../store/userStore';
import { calculateBMR, calculateTDEE } from '../../utils/nutrition';

// ============================================================================
// Stat pill
// ============================================================================

function StatPill({
  icon,
  value,
  label,
  color,
  C,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
  C: any;
}) {
  return (
    <View style={[pillStyles.container, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[pillStyles.value, { color: C.text }]}>{value}</Text>
      <Text style={[pillStyles.label, { color: C.textMuted }]}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    gap: 2,
  },
  value: { fontSize: 14, fontWeight: '700' },
  label: { fontSize: 10, textAlign: 'center' },
});

// ============================================================================
// Main component
// ============================================================================

interface HealthDashboardCardProps {
  onConnect?: () => void;
}

export function HealthDashboardCard({ onConnect }: HealthDashboardCardProps) {
  const { t } = useTranslation();
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);

  const user = useUserStore((s) => s.user);
  const healthData = useUserStore((s) => s.healthData);
  const setDynamicTDEEEnabled = useUserStore((s) => s.setDynamicTDEEEnabled);

  const isConnected = !!user?.healthEnabled;
  const isDynamic = !!user?.dynamicTDEEEnabled;

  // Static TDEE for comparison
  const staticTDEE = user?.profile ? calculateTDEE(user.profile) : null;
  const dynamicTDEE = user?.tdee ?? null;

  // How much extra activity vs baseline
  const activityDelta = useMemo(() => {
    if (!healthData || !staticTDEE || !user?.bmr) return null;
    const expectedActive = staticTDEE - user.bmr;
    return healthData.activeCalories - expectedActive;
  }, [healthData, staticTDEE, user?.bmr]);

  if (!isConnected) {
    return (
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={styles.headerRow}>
          <Ionicons
            name={Platform.OS === 'ios' ? 'heart-outline' : 'fitness-outline'}
            size={20}
            color={C.primary}
          />
          <Text style={[styles.title, { color: C.text }]}>{t('health.title')}</Text>
        </View>
        <Text style={[styles.notConnectedDesc, { color: C.textSecondary }]}>
          {t('health.connectToEnable', {
            platform: Platform.OS === 'ios' ? 'Apple Health' : 'Google Health Connect',
          })}
        </Text>
        {onConnect && (
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: C.primary }]}
            onPress={onConnect}
          >
            <Ionicons name="link-outline" size={16} color="#fff" />
            <Text style={styles.connectButtonText}>{t('health.connect')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons
          name={Platform.OS === 'ios' ? 'heart' : 'fitness'}
          size={20}
          color={C.success}
        />
        <Text style={[styles.title, { color: C.text }]}>{t('health.title')}</Text>
        <View style={[styles.connectedBadge, { backgroundColor: C.success + '20' }]}>
          <Text style={[styles.connectedText, { color: C.success }]}>
            {t('health.connected')}
          </Text>
        </View>
      </View>

      {/* No data yet */}
      {!healthData && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={[styles.loadingText, { color: C.textMuted }]}>
            {t('health.syncing')}
          </Text>
        </View>
      )}

      {/* Stats grid */}
      {healthData && (
        <>
          <View style={styles.statsRow}>
            <StatPill
              icon="footsteps-outline"
              value={healthData.steps.toLocaleString()}
              label={t('health.steps')}
              color={C.primary}
              C={C}
            />
            <StatPill
              icon="flame-outline"
              value={`${healthData.activeCalories} kcal`}
              label={t('health.activeCalories')}
              color="#FF6A4D"
              C={C}
            />
            <StatPill
              icon="time-outline"
              value={`${healthData.exerciseMinutes} min`}
              label={t('health.exerciseMinutes')}
              color="#9C8CFF"
              C={C}
            />
          </View>

          {/* TDEE comparison */}
          {staticTDEE !== null && (
            <View style={[styles.tdeeRow, { backgroundColor: C.background, borderColor: C.border }]}>
              <View style={styles.tdeeStat}>
                <Text style={[styles.tdeLabel, { color: C.textMuted }]}>
                  {t('health.staticTDEE')}
                </Text>
                <Text style={[styles.tdeeValue, { color: C.textSecondary }]}>
                  {staticTDEE} kcal
                </Text>
              </View>
              {isDynamic && dynamicTDEE && dynamicTDEE !== staticTDEE && (
                <>
                  <Ionicons name="arrow-forward" size={14} color={C.textMuted} />
                  <View style={styles.tdeeStat}>
                    <Text style={[styles.tdeLabel, { color: C.textMuted }]}>
                      {t('health.dynamicTDEE')}
                    </Text>
                    <Text style={[styles.tdeeValue, { color: C.primary, fontWeight: '700' }]}>
                      {dynamicTDEE} kcal
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Activity delta message */}
          {activityDelta !== null && Math.abs(activityDelta) >= 150 && (
            <View style={[
              styles.deltaRow,
              { backgroundColor: activityDelta > 0 ? C.success + '15' : C.warning + '15' },
            ]}>
              <Ionicons
                name={activityDelta > 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={activityDelta > 0 ? C.success : C.warning}
              />
              <Text style={[
                styles.deltaText,
                { color: activityDelta > 0 ? C.success : C.warning },
              ]}>
                {activityDelta > 0
                  ? t('health.moreActive', { extra: Math.round(activityDelta) })
                  : t('health.lessActive', { less: Math.round(Math.abs(activityDelta)) })}
              </Text>
            </View>
          )}
        </>
      )}

      {/* Dynamic TDEE toggle */}
      <View style={[styles.toggleRow, { borderTopColor: C.border }]}>
        <View style={styles.toggleInfo}>
          <Text style={[styles.toggleTitle, { color: C.text }]}>
            {t('health.dynamicTDEETitle')}
          </Text>
          <Text style={[styles.toggleDesc, { color: C.textMuted }]}>
            {t('health.dynamicTDEEDesc')}
          </Text>
        </View>
        <Switch
          value={isDynamic}
          onValueChange={(v) => setDynamicTDEEEnabled(v)}
          trackColor={{ false: C.border, true: C.primary + '80' }}
          thumbColor={isDynamic ? C.primary : C.textSecondary}
        />
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

function createStyles(C: any) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      gap: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      flex: 1,
    },
    connectedBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 20,
    },
    connectedText: {
      fontSize: 11,
      fontWeight: '600',
    },
    notConnectedDesc: {
      fontSize: 13,
      lineHeight: 18,
    },
    connectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    connectButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    loadingText: {
      fontSize: 13,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    tdeeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    tdeeStat: {
      alignItems: 'center',
      gap: 2,
    },
    tdeLabel: {
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tdeeValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    deltaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    deltaText: {
      fontSize: 12,
      fontWeight: '500',
      flex: 1,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingTop: 12,
      borderTopWidth: 1,
    },
    toggleInfo: {
      flex: 1,
      gap: 2,
    },
    toggleTitle: {
      fontSize: 13,
      fontWeight: '600',
    },
    toggleDesc: {
      fontSize: 11,
      lineHeight: 15,
    },
  });
}
