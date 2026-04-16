// ============================================
// Cals2Gains - Profile / Settings Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useUserStore } from '../../store/userStore';
import { useColors, useThemeStore } from '../../store/themeStore';

// Brand logo assets
const LOGO_MARK = require('../../brand-assets/C2G-Mark-512.png');
import { calculateTDEE, calculateBMR } from '../../utils/nutrition';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const {
    user,
    signOut,
    isSubscriptionActive,
    isOnTrial,
    trialDaysRemaining,
  } = useUserStore();
  const C = useColors(); // Reactive theme colors
  const isDark = useThemeStore(s => s.isDark);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSignOut = () => {
    Alert.alert(
      t('auth.signOut'),
      t('auth.signOutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/welcome');
            } catch {
              Alert.alert(t('errors.generic'));
            }
          },
        },
      ]
    );
  };

  const tdee = user?.profile ? calculateTDEE(user.profile) : null;
  const bmr = user?.profile ? calculateBMR(user.profile) : null;

  const subscriptionStatus = () => {
    if (!user) return '';
    if (isOnTrial()) {
      return `${t('profile.trial')} · ${trialDaysRemaining()} ${t('common.days')}`;
    }
    if (user.subscriptionType === 'monthly') return t('profile.monthly');
    if (user.subscriptionType === 'annual') return t('profile.annual');
    return t('auth.trialInfo');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.brandRow}>
            <Image source={LOGO_MARK} style={styles.brandLogo} resizeMode="contain" />
            <View style={styles.brandWordmark}>
              <Text style={[styles.brandName, { color: C.text }]}>
                <Text style={{ color: C.violet }}>Cals</Text>
                <Text style={{ color: C.coral, fontSize: 15, fontFamily: 'Outfit-Bold' }}>2</Text>
                <Text style={{ color: C.violet }}>Gains</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/paywall')}>
            <Ionicons name="notifications-outline" size={22} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>{t('profile.title')}</Text>
        </View>

        {/* User card — tap to edit */}
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => router.push('/edit-profile')}
          activeOpacity={0.7}
        >
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: C.primary + '30' }]}>
              <Text style={[styles.avatarInitial, { color: C.primary }]}>
                {user?.displayName?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: C.text }]}>{user?.displayName || t('common.user')}</Text>
            <Text style={[styles.userEmail, { color: C.textSecondary }]}>{user?.email}</Text>
          </View>
          <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <Ionicons name="create-outline" size={18} color={C.textMuted} />
            <View style={styles.subscriptionBadge}>
              <Ionicons
                name={isSubscriptionActive() ? 'checkmark-circle' : 'lock-closed'}
                size={14}
                color={isSubscriptionActive() ? C.accent : C.warning}
              />
              <Text style={[
                styles.subscriptionBadgeText,
                { color: isSubscriptionActive() ? C.accent : C.warning }
              ]}>
                {subscriptionStatus()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Goals section */}
        {user?.goals && (
          <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{t('profile.dailyGoals')}</Text>
            <View style={styles.goalsGrid}>
              <GoalCell
                emoji="🔥"
                value={user.goals.calories}
                unit={t('common.kcal')}
                label={t('onboarding.calories')}
                color={C.calories}
              />
              <GoalCell
                emoji="🥩"
                value={user.goals.protein}
                unit={t('common.g')}
                label={t('onboarding.protein')}
                color={C.protein}
              />
              <GoalCell
                emoji="🌾"
                value={user.goals.carbs}
                unit={t('common.g')}
                label={t('onboarding.carbs')}
                color={C.carbs}
              />
              <GoalCell
                emoji="🥑"
                value={user.goals.fat}
                unit={t('common.g')}
                label={t('onboarding.fat')}
                color={C.fat}
              />
            </View>

            {tdee && bmr && (
              <View style={[styles.metabolismRow, { backgroundColor: C.background }]}>
                <View style={styles.metabolismStat}>
                  <Text style={[styles.metabolismLabel, { color: C.textMuted }]}>BMR</Text>
                  <Text style={[styles.metabolismValue, { color: C.text }]}>{Math.round(bmr)} {t('common.kcal')}</Text>
                </View>
                <View style={[styles.metabolismDivider, { backgroundColor: C.border }]} />
                <View style={styles.metabolismStat}>
                  <Text style={[styles.metabolismLabel, { color: C.textMuted }]}>TDEE</Text>
                  <Text style={[styles.metabolismValue, { color: C.text }]}>{Math.round(tdee)} {t('common.kcal')}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.editGoalsButton, { borderColor: C.primary + '50' }]}
              onPress={() => router.push('/nutrition-settings')}
            >
              <Ionicons name="settings-outline" size={16} color={C.primary} />
              <Text style={[styles.editGoalsText, { color: C.primary }]}>{t('tools.nutritionSettings')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subscription section */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{t('profile.subscription')}</Text>

          <TouchableOpacity
            style={[styles.subscriptionCard, { backgroundColor: C.background }]}
            onPress={() => router.push('/paywall')}
          >
            <View style={styles.subscriptionInfo}>
              <Text style={[styles.subscriptionTitle, { color: C.text }]}>
                {isSubscriptionActive()
                  ? (isOnTrial() ? t('profile.trial') : t('profile.currentPlan'))
                  : t('profile.currentPlan')}
              </Text>
              {user?.subscriptionExpiresAt && isSubscriptionActive() && (
                <Text style={[styles.subscriptionExpiry, { color: C.textSecondary }]}>
                  {t('profile.trialExpires')} {format(user.subscriptionExpiresAt, 'dd/MM/yyyy')}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>


        {/* Settings */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{t('profile.settings')}</Text>
          <SettingsRow
            colors={C}
            icon="notifications-outline"
            label={t('profile.notifications')}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: C.border, true: C.primary + '60' }}
                thumbColor={notificationsEnabled ? C.primary : C.textMuted}
              />
            }
          />
          <SettingsRow colors={C} icon="settings-outline" label={t('profile.advancedSettings')} onPress={() => router.push('/settings')} />
          <SettingsRow
            colors={C}
            icon="help-circle-outline"
            label={t('profile.help')}
            onPress={() => router.push('/help')}
          />
          <SettingsRow
            colors={C}
            icon="information-circle-outline"
            label={t('profile.about')}
            onPress={() => router.push('/about')}
          />
        </View>

        {/* Sign out */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={C.error} />
            <Text style={[styles.signOutText, { color: C.error }]}>{t('auth.signOut')}</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={[styles.versionText, { color: C.textMuted }]}>Cals2Gains {t('profile.version')} 1.0.0</Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const GoalCell: React.FC<{
  emoji: string;
  value: number;
  unit: string;
  label: string;
  color: string;
}> = ({ emoji, value, unit, label, color }) => {
  const C = useColors();
  return (
    <View style={[styles.goalCell, { borderTopColor: color, backgroundColor: C.background }]}>
      <Text style={styles.goalEmoji}>{emoji}</Text>
      <Text style={[styles.goalValue, { color }]}>{value}</Text>
      <Text style={[styles.goalUnit, { color: C.textMuted }]}>{unit}</Text>
      <Text style={[styles.goalLabel, { color: C.textSecondary }]}>{label}</Text>
    </View>
  );
};

const SettingsRow: React.FC<{
  icon: string;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  colors: any;
}> = ({ icon, label, onPress, right, colors }) => (
  <TouchableOpacity
    style={[styles.settingsRow, { borderBottomColor: colors.border }]}
    onPress={onPress}
    disabled={!onPress && !right}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <Ionicons name={icon as any} size={20} color={colors.textSecondary} />
    <Text style={[styles.settingsLabel, { color: colors.text }]}>{label}</Text>
    {right || (onPress && (
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    ))}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 32,
    height: 32,
  },
  brandWordmark: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Outfit-Bold',
    letterSpacing: -0.3,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(247, 242, 234, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 14,
    flexWrap: 'wrap',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subscriptionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  goalCell: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 3,
  },
  goalEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  goalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  goalUnit: {
    fontSize: 10,
  },
  goalLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  metabolismRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  metabolismStat: {
    flex: 1,
    alignItems: 'center',
  },
  metabolismLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metabolismValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metabolismDivider: {
    width: 1,
  },
  editGoalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  editGoalsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  subscriptionExpiry: {
    fontSize: 12,
    marginTop: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: 1,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
