/**
 * Coach Sharing & Accountability
 * Share progress with coaches/nutritionists
 * Cals2Gains React Native app
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { format, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

import { useColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { useMealStore } from '../store/mealStore';
import { useWeightStore } from '../store/weightStore';
import { getRecentMeals } from '../services/firebase';
import { Meal } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface SharedPermission {
  key: 'meals' | 'weight' | 'measurements' | 'progress_photos' | 'adherence';
  label: string;
  enabled: boolean;
  icon: string;
}

interface ConnectedCoach {
  id: string;
  email: string;
  name: string;
  connectedDate: Date;
  isActive: boolean;
}

interface WeeklyReport {
  week: string;
  calorieAverage: number | null;
  proteinAverage: number | null;
  weightChange: number | null;
  adherenceScore: number | null;
  daysLogged: number;
}

type ShareFrequency = 'daily' | 'weekly' | 'manual';

// ============================================================================
// HELPERS
// ============================================================================

/** Safely convert any value to a valid Date, or return null */
function safeDate(value: any): Date | null {
  if (!value) return null;
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

/** Safe wrapper around date-fns format — returns fallback on invalid dates */
function safeFormat(date: any, fmt: string, options?: any, fallback = '--'): string {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (!d || isNaN(d.getTime())) return fallback;
    return format(d, fmt, options);
  } catch {
    return fallback;
  }
}

function computeWeeklyReport(
  meals: Meal[],
  weightChange: number | null,
  goals: { calories?: number; protein?: number } | null,
): WeeklyReport {
  const now = new Date();
  const weekStart = subDays(now, 6);
  const weekLabel = `${safeFormat(weekStart, "d 'de' MMMM", { locale: es })} – ${safeFormat(now, "d 'de' MMMM", { locale: es })}`;

  // Group meals by day — skip meals with invalid dates
  const dayMap = new Map<string, Meal[]>();
  for (const m of meals) {
    const parsed = safeDate(m.timestamp);
    if (!parsed) continue; // skip meals with invalid timestamps
    const key = safeFormat(parsed, 'yyyy-MM-dd');
    if (key === '--') continue;
    const dayStart = startOfDay(weekStart).getTime();
    const mealDay = startOfDay(new Date(key)).getTime();
    if (isNaN(mealDay)) continue;
    if (mealDay >= dayStart) {
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key)!.push(m);
    }
  }

  const daysLogged = dayMap.size;

  if (daysLogged === 0) {
    return { week: weekLabel, calorieAverage: null, proteinAverage: null, weightChange, adherenceScore: null, daysLogged: 0 };
  }

  let totalCals = 0;
  let totalProtein = 0;
  let adhereDays = 0;

  for (const [, dayMeals] of dayMap) {
    const dayCals = dayMeals.reduce((s, m) => s + (m.nutrition?.calories ?? 0), 0);
    const dayProt = dayMeals.reduce((s, m) => s + (m.nutrition?.protein ?? 0), 0);
    totalCals += dayCals;
    totalProtein += dayProt;

    if (goals?.calories && Math.abs(dayCals - goals.calories) / goals.calories <= 0.15) {
      adhereDays++;
    }
  }

  const calAvg = Math.round(totalCals / daysLogged);
  const protAvg = Math.round(totalProtein / daysLogged);
  const adherence = Math.round((adhereDays / 7) * 100);

  return {
    week: weekLabel,
    calorieAverage: calAvg,
    proteinAverage: protAvg,
    weightChange,
    adherenceScore: adherence,
    daysLogged,
  };
}

// ============================================================================
// COACH SHARE SCREEN
// ============================================================================

export default function CoachShareScreen() {
  const C = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { user, userId } = useUserStore();
  const { todayMeals, recentMeals } = useMealStore();
  const { getWeightChange, loadHistory } = useWeightStore();

  const [coachEmail, setCoachEmail] = useState('');
  const [shareFrequency, setShareFrequency] = useState<ShareFrequency>('weekly');

  const [permissions, setPermissions] = useState<SharedPermission[]>([
    { key: 'meals', label: t('coachShare.loggedMeals'), enabled: true, icon: 'restaurant' },
    { key: 'weight', label: t('coachShare.weight'), enabled: true, icon: 'scale' },
    { key: 'measurements', label: t('coachShare.bodyMeasurements'), enabled: false, icon: 'body' },
    { key: 'progress_photos', label: t('coachShare.progressPhotos'), enabled: false, icon: 'image' },
    { key: 'adherence', label: t('coachShare.consistency'), enabled: true, icon: 'checkmark-circle' },
  ]);

  // Start with no mock coaches — empty state
  const [connectedCoaches, setConnectedCoaches] = useState<ConnectedCoach[]>([]);

  // Load weight history for change calculation
  useEffect(() => {
    if (userId) loadHistory(userId, 14);
  }, [userId]);

  // Compute weekly report from real data
  const allMeals = useMemo(() => {
    const combined = [...todayMeals, ...recentMeals];
    const seen = new Set<string>();
    return combined.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [todayMeals, recentMeals]);

  const goals = user?.goals ?? null;
  const weightChange = getWeightChange(7);

  const weeklyReport = useMemo(
    () => computeWeeklyReport(allMeals, weightChange, goals),
    [allMeals, weightChange, goals],
  );

  const userName = user?.displayName || t('coach.user');

  const togglePermission = (key: SharedPermission['key']) => {
    setPermissions(perms =>
      perms.map(p => (p.key === key ? { ...p, enabled: !p.enabled } : p))
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddCoach = async () => {
    const email = coachEmail.trim();
    if (!email.includes('@')) {
      Alert.alert(t('coachShare.invalidEmail'), t('coachShare.invalidEmailMsg'));
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userName = user?.displayName?.split(' ')[0] || t('coachShare.aUser');
    const subject = encodeURIComponent(t('coachShare.emailSubject'));
    const body = encodeURIComponent(
      t('coachShare.emailBody', { userName, appUrl: 'https://cals2gains.com' })
    );
    const mailUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailUrl);
      if (canOpen) {
        await Linking.openURL(mailUrl);
        Alert.alert(t('coachShare.inviteReady'), t('coachShare.inviteReadyMsg', { email }));
      } else {
        // Fallback: copy email to clipboard
        await Clipboard.setStringAsync(email);
        Alert.alert(
          t('coachShare.noEmailApp'),
          t('coachShare.noEmailAppMsg')
        );
      }
    } catch (error) {
      console.error('Error opening mail:', error);
      Alert.alert('Error', t('coachShare.emailError'));
    }
    setCoachEmail('');
  };

  const handleRemoveCoach = (coachId: string) => {
    Alert.alert(
      t('coachShare.removeAccess'),
      t('coachShare.disconnectConfirm'),
      [
        { text: t('common.cancel'), onPress: () => {}, style: 'cancel' },
        {
          text: t('coachShare.disconnect'),
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setConnectedCoaches(coaches =>
              coaches.filter(c => c.id !== coachId)
            );
          },
          style: 'destructive',
        },
      ]
    );
  };

  // Build share text from real data — NO URL
  const buildShareText = () => {
    const calPart = weeklyReport.calorieAverage != null ? `${weeklyReport.calorieAverage} kcal ${t('coachShare.average')}` : t('coachShare.noCalorieData');
    const protPart = weeklyReport.proteinAverage != null ? `${weeklyReport.proteinAverage}g ${t('coachShare.protein')}` : '';
    const daysPart = `${weeklyReport.daysLogged}/7 ${t('coachShare.daysLogged')}`;
    const parts = [calPart, protPart, daysPart].filter(Boolean).join(', ');
    return `🏋️ ${t('coachShare.myProgress')}\n${parts} 💪\n#Cals2Gains`;
  };

  const handleDirectShare = async (platform: 'whatsapp' | 'email' | 'copy') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const shareText = buildShareText();

    if (platform === 'whatsapp') {
      Share.share({ message: shareText, title: t('coach.myProgress') });
    } else if (platform === 'email') {
      const subject = encodeURIComponent(t('coach.myProgress'));
      const body = encodeURIComponent(shareText);
      const mailto = `mailto:?subject=${subject}&body=${body}`;
      const canOpen = await Linking.canOpenURL(mailto);
      if (canOpen) {
        Linking.openURL(mailto);
      } else {
        // Fallback to generic share
        Share.share({ message: shareText, title: t('coach.myProgress') });
      }
    } else {
      // Copy to clipboard
      Share.share({ message: shareText, title: t('coach.myProgress') });
    }
  };

  const formatVal = (val: number | null, suffix: string) =>
    val != null ? `${val}${suffix}` : '--';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={C.violet} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>{t('coachShare.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* ADD COACH SECTION */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('coachShare.shareWithCoach')}</Text>

        <View style={[styles.emailInputContainer, { borderBottomColor: C.violet }]}>
          <Ionicons name="mail" size={20} color={C.violet} style={styles.inputIcon} />
          <TextInput
            style={styles.emailInput}
            placeholder={t('coachShare.emailPlaceholder')}
            placeholderTextColor={C.textTertiary}
            keyboardType="email-address"
            value={coachEmail}
            onChangeText={setCoachEmail}
          />
        </View>

        {/* FREQUENCY SELECTOR */}
        <Text style={[styles.label, { color: C.textSecondary }]}>{t('coachShare.frequency')}</Text>
        <View style={styles.frequencyButtons}>
          {(['daily', 'weekly', 'manual'] as const).map(freq => (
            <TouchableOpacity
              key={freq}
              style={[
                styles.frequencyButton,
                shareFrequency === freq && styles.frequencyButtonActive,
                { borderColor: shareFrequency === freq ? C.violet : C.border, backgroundColor: shareFrequency === freq ? C.violet : C.card },
              ]}
              onPress={() => {
                setShareFrequency(freq);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  shareFrequency === freq && styles.frequencyButtonTextActive,
                  { color: shareFrequency === freq ? '#fff' : C.textSecondary },
                ]}
              >
                {freq === 'daily' ? t('coachShare.daily') : freq === 'weekly' ? t('coachShare.weekly') : t('coachShare.manual')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PERMISSIONS */}
        <Text style={[styles.label, { color: C.textSecondary }]}>{t('coachShare.permissions')}</Text>
        {permissions.map(perm => (
          <View key={perm.key} style={[styles.permissionRow, { borderBottomColor: C.border }]}>
            <View style={styles.permissionLabel}>
              <Ionicons
                name={perm.icon as any}
                size={20}
                color={C.violet}
                style={styles.permIcon}
              />
              <Text style={[styles.permissionText, { color: C.text }]}>{perm.label}</Text>
            </View>
            <Switch
              value={perm.enabled}
              onValueChange={() => togglePermission(perm.key)}
              trackColor={{ false: C.border, true: C.violet + '50' }}
              thumbColor={perm.enabled ? C.violet : C.textTertiary}
            />
          </View>
        ))}

        <Text style={[styles.permissionNote, { color: C.textTertiary }]}>
          {t('coachShare.privacyNote')}
        </Text>

        <TouchableOpacity
          style={styles.addCoachButton}
          onPress={handleAddCoach}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.addCoachButtonText}>{t('coachShare.sendInvite')}</Text>
        </TouchableOpacity>
      </View>

      {/* WEEKLY REPORT PREVIEW */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('coachShare.weeklyReport')}</Text>
        </View>

        {weeklyReport.daysLogged === 0 ? (
          <View style={[styles.emptyReport, { backgroundColor: C.card }]}>
            <Ionicons name="bar-chart-outline" size={32} color={C.textTertiary} />
            <Text style={[styles.emptyReportText, { color: C.textSecondary }]}>
              {t('coachShare.weeklyReportEmpty')}
            </Text>
          </View>
        ) : (
          <View style={[styles.reportCard, { backgroundColor: C.card, borderLeftColor: C.violet }]}>
            <View style={styles.reportHeader}>
              <Text style={[styles.reportWeek, { color: C.text }]}>{weeklyReport.week}</Text>
              {weeklyReport.adherenceScore != null && (
                <View style={[styles.adherenceBadge, { backgroundColor: C.success }]}>
                  <Text style={styles.adherenceText}>{weeklyReport.adherenceScore}%</Text>
                </View>
              )}
            </View>

            <View style={styles.reportGrid}>
              <View style={[styles.reportItem, { backgroundColor: C.cardElevated }]}>
                <Text style={[styles.reportLabel, { color: C.textTertiary }]}>{t('coachShare.avgCalories')}</Text>
                <Text style={[styles.reportValue, { color: C.violet }]}>
                  {formatVal(weeklyReport.calorieAverage, '')}
                </Text>
                <Text style={[styles.reportUnit, { color: C.textTertiary }]}>{t('coachShare.calUnit')}</Text>
              </View>

              <View style={[styles.reportItem, { backgroundColor: C.cardElevated }]}>
                <Text style={[styles.reportLabel, { color: C.textTertiary }]}>{t('coachShare.avgProtein')}</Text>
                <Text style={[styles.reportValue, { color: C.violet }]}>
                  {formatVal(weeklyReport.proteinAverage, '')}
                </Text>
                <Text style={[styles.reportUnit, { color: C.textTertiary }]}>{t('coachShare.proteinUnit')}</Text>
              </View>

              <View style={[styles.reportItem, { backgroundColor: C.cardElevated }]}>
                <Text style={[styles.reportLabel, { color: C.textTertiary }]}>{t('coachShare.weightLabel')}</Text>
                <Text
                  style={[
                    styles.reportValue,
                    weeklyReport.weightChange != null
                      ? { color: weeklyReport.weightChange < 0 ? C.success : C.coral }
                      : {},
                  ]}
                >
                  {weeklyReport.weightChange != null
                    ? `${weeklyReport.weightChange > 0 ? '+' : ''}${weeklyReport.weightChange.toFixed(1)}`
                    : '--'}
                </Text>
                <Text style={[styles.reportUnit, { color: C.textTertiary }]}>{t('coachShare.kgUnit')}</Text>
              </View>

              <View style={[styles.reportItem, { backgroundColor: C.cardElevated }]}>
                <Text style={[styles.reportLabel, { color: C.textTertiary }]}>{t('coachShare.daysLabel')}</Text>
                <Text style={[styles.reportValue, { color: C.violet }]}>{weeklyReport.daysLogged}</Text>
                <Text style={[styles.reportUnit, { color: C.textTertiary }]}>{t('coachShare.ofSeven')}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* DIRECT SHARE */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('coachShare.quickShare')}</Text>

        <View style={styles.shareButtonsContainer}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => handleDirectShare('whatsapp')}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            <Text style={[styles.shareButtonLabel, { color: C.text }]}>{t('coachShare.whatsapp')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => handleDirectShare('email')}
            activeOpacity={0.7}
          >
            <Ionicons name="mail" size={24} color={C.violet} />
            <Text style={[styles.shareButtonLabel, { color: C.text }]}>{t('coachShare.email')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => handleDirectShare('copy')}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={24} color={C.coral} />
            <Text style={[styles.shareButtonLabel, { color: C.text }]}>{t('coachShare.share')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* COACH NOTES */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('coachShare.coachComments')}</Text>
        <TextInput
          style={styles.notesInput}
          placeholder={t('coachShare.coachPlaceholder')}
          placeholderTextColor={C.textTertiary}
          multiline
          editable={false}
        />
        {connectedCoaches.length > 0 && (
          <Text style={[styles.coachNameSmall, { color: C.text }]}>
            — {connectedCoaches[0].name}
          </Text>
        )}
      </View>

      {/* CONNECTED COACHES */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('coachShare.connectedCoaches')}</Text>
          <Text style={styles.coachCount}>{connectedCoaches.length}</Text>
        </View>

        {connectedCoaches.length === 0 ? (
          <View style={styles.emptyCoachState}>
            <Ionicons name="people-outline" size={32} color={C.textTertiary} />
            <Text style={styles.emptyState}>
              {t('coachShare.noCoaches')}
            </Text>
          </View>
        ) : (
          connectedCoaches.map(coach => (
            <View key={coach.id} style={styles.coachCard}>
              <View style={styles.coachInfo}>
                <View style={styles.coachAvatar}>
                  <Text style={styles.coachInitial}>
                    {coach.name[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.coachDetails}>
                  <Text style={styles.coachName}>{coach.name}</Text>
                  <Text style={styles.coachEmail}>{coach.email}</Text>
                  <Text style={styles.connectedDate}>
                    {t('coachShare.connectedSince', { date: coach.connectedDate.toLocaleDateString('es-ES') })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveCoach(coach.id)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={24} color={C.textTertiary} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ============================================================================
// STYLES — Dark theme (Plum background)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    marginBottom: 16,
    paddingBottom: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  emailInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  frequencyButtonActive: {
    borderWidth: 1,
  },
  frequencyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  frequencyButtonTextActive: {
    color: '#fff',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  permissionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permIcon: {
    marginRight: 12,
  },
  permissionText: {
    fontSize: 14,
  },
  permissionNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 12,
  },
  addCoachButton: {
    flexDirection: 'row',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  addCoachButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reportCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportWeek: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  adherenceBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  adherenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reportItem: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  reportLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  reportValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  reportUnit: {
    fontSize: 10,
  },
  emptyReport: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyReportText: {
    fontSize: 13,
    textAlign: 'center',
  },
  shareButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  shareButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  notesInput: {
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    fontSize: 13,
  },
  coachNameSmall: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  coachsList: {
    gap: 12,
  },
  coachCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCoachState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyState: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.6,
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coachInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  coachDetails: {
    flex: 1,
  },
  coachName: {
    fontSize: 14,
    fontWeight: '600',
  },
  coachEmail: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  connectedDate: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
});

