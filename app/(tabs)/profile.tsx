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
import Colors from '../../constants/colors';
import { useUserStore } from '../../store/userStore';
import { changeLanguage } from '../../i18n';
import { calculateTDEE, calculateBMR } from '../../utils/nutrition';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const {
    user,
    signOut,
    isSubscriptionActive,
    isOnTrial,
    trialDaysRemaining,
    updateLanguage,
  } = useUserStore();

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

  const handleLanguageChange = async (lang: 'es' | 'en') => {
    changeLanguage(lang);
    await updateLanguage(lang);
  };

  const tdee = user?.profile ? calculateTDEE(user.profile) : null;
  const bmr = user?.profile ? calculateBMR(user.profile) : null;

  const subscriptionStatus = () => {
    if (!user) return '';
    if (isOnTrial()) {
      return `${t('profile.trial')} · ${trialDaysRemaining()} días`;
    }
    if (user.subscriptionType === 'monthly') return t('profile.monthly');
    if (user.subscriptionType === 'annual') return t('profile.annual');
    return t('auth.trialInfo');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.title')}</Text>
        </View>

        {/* User card */}
        <View style={styles.userCard}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {user?.displayName?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <View style={styles.subscriptionBadge}>
            <Ionicons
              name={isSubscriptionActive() ? 'checkmark-circle' : 'lock-closed'}
              size={14}
              color={isSubscriptionActive() ? Colors.accent : Colors.warning}
            />
            <Text style={[
              styles.subscriptionBadgeText,
              { color: isSubscriptionActive() ? Colors.accent : Colors.warning }
            ]}>
              {subscriptionStatus()}
            </Text>
          </View>
        </View>

        {/* Goals section */}
        {user?.goals && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.dailyGoals')}</Text>
            <View style={styles.goalsGrid}>
              <GoalCell
                emoji="🔥"
                value={user.goals.calories}
                unit={t('common.kcal')}
                label={t('onboarding.calories')}
                color={Colors.calories}
              />
              <GoalCell
                emoji="🥩"
                value={user.goals.protein}
                unit={t('common.g')}
                label={t('onboarding.protein')}
                color={Colors.protein}
              />
              <GoalCell
                emoji="🌾"
                value={user.goals.carbs}
                unit={t('common.g')}
                label={t('onboarding.carbs')}
                color={Colors.carbs}
              />
              <GoalCell
                emoji="🥑"
                value={user.goals.fat}
                unit={t('common.g')}
                label={t('onboarding.fat')}
                color={Colors.fat}
              />
            </View>

            {tdee && bmr && (
              <View style={styles.metabolismRow}>
                <View style={styles.metabolismStat}>
                  <Text style={styles.metabolismLabel}>BMR</Text>
                  <Text style={styles.metabolismValue}>{Math.round(bmr)} kcal</Text>
                </View>
                <View style={styles.metabolismDivider} />
                <View style={styles.metabolismStat}>
                  <Text style={styles.metabolismLabel}>TDEE</Text>
                  <Text style={styles.metabolismValue}>{Math.round(tdee)} kcal</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.editGoalsButton}
              onPress={() => router.push('/(auth)/onboarding')}
            >
              <Ionicons name="settings-outline" size={16} color={Colors.primary} />
              <Text style={styles.editGoalsText}>{t('profile.editProfile')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subscription section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.subscription')}</Text>

          <TouchableOpacity
            style={styles.subscriptionCard}
            onPress={() => router.push('/paywall')}
          >
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionTitle}>
                {isSubscriptionActive()
                  ? (isOnTrial() ? t('profile.trial') : 'Cals2Gains Premium')
                  : 'Cals2Gains Premium'}
              </Text>
              {user?.subscriptionExpiresAt && isSubscriptionActive() && (
                <Text style={styles.subscriptionExpiry}>
                  {t('profile.trialExpires')} {format(user.subscriptionExpiresAt, 'dd/MM/yyyy')}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Language section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
          <View style={styles.languageRow}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                i18n.language === 'es' && styles.languageButtonSelected,
              ]}
              onPress={() => handleLanguageChange('es')}
            >
              <Text style={styles.languageFlag}>🇪🇸</Text>
              <Text style={[
                styles.languageLabel,
                i18n.language === 'es' && styles.languageLabelSelected,
              ]}>
                {t('profile.spanish')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageButton,
                i18n.language === 'en' && styles.languageButtonSelected,
              ]}
              onPress={() => handleLanguageChange('en')}
            >
              <Text style={styles.languageFlag}>🇬🇧</Text>
              <Text style={[
                styles.languageLabel,
                i18n.language === 'en' && styles.languageLabelSelected,
              ]}>
                {t('profile.english')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <SettingsRow
            icon="notifications-outline"
            label={t('profile.notifications')}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                thumbColor={notificationsEnabled ? Colors.primary : Colors.textMuted}
              />
            }
          />
          <SettingsRow
            icon="help-circle-outline"
            label={t('profile.help')}
            onPress={() => {}}
          />
          <SettingsRow
            icon="information-circle-outline"
            label={t('profile.about')}
            onPress={() => {}}
          />
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.signOutText}>{t('auth.signOut')}</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>Cals2Gains v1.0.0</Text>

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
}> = ({ emoji, value, unit, label, color }) => (
  <View style={[styles.goalCell, { borderTopColor: color }]}>
    <Text style={styles.goalEmoji}>{emoji}</Text>
    <Text style={[styles.goalValue, { color }]}>{value}</Text>
    <Text style={styles.goalUnit}>{unit}</Text>
    <Text style={styles.goalLabel}>{label}</Text>
  </View>
);

const SettingsRow: React.FC<{
  icon: string;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
}> = ({ icon, label, onPress, right }) => (
  <TouchableOpacity
    style={styles.settingsRow}
    onPress={onPress}
    disabled={!onPress && !right}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <Ionicons name={icon as any} size={20} color={Colors.textSecondary} />
    <Text style={styles.settingsLabel}>{label}</Text>
    {right || (onPress && (
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    ))}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    backgroundColor: Colors.background,
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
    color: Colors.textMuted,
  },
  goalLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  metabolismRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
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
    color: Colors.textMuted,
    marginBottom: 4,
  },
  metabolismValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  metabolismDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  editGoalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary + '50',
    gap: 8,
  },
  editGoalsText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  subscriptionExpiry: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 8,
  },
  languageButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  languageFlag: {
    fontSize: 20,
  },
  languageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  languageLabelSelected: {
    color: Colors.primary,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
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
    color: Colors.error,
  },
  versionText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
});
