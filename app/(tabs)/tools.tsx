import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useColors, useThemeStore } from '../../store/themeStore';
import { useUserStore } from '../../store/userStore';

// Brand logo assets
const LOGO_MARK = require('../../brand-assets/C2G-Mark-512.png');

export default function ToolsScreen() {
  const C = useColors();
  const isDark = useThemeStore(s => s.isDark);
  const { t } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const styles = useMemo(() => createStyles(C), [C]);

  // ToolRow component definition
  const ToolRow = ({
    icon,
    label,
    desc,
    color,
    onPress,
  }: {
    icon: any;
    label: string;
    desc: string;
    color: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={styles.toolRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.toolIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.toolInfo}>
        <Text style={styles.toolLabel}>{label}</Text>
        <Text style={styles.toolDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
    </TouchableOpacity>
  );

  // SettingsRow component definition
  const SettingsRow = ({
    icon,
    label,
    right,
    onPress,
  }: {
    icon: any;
    label: string;
    right?: React.ReactNode;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={styles.settingsRow}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress && !right}
    >
      <View style={styles.settingsContent}>
        <Ionicons name={icon} size={20} color={C.primary} />
        <Text style={styles.settingsLabel}>{label}</Text>
      </View>
      {right ? (
        right
      ) : (
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={styles.headerTitle}>{t('tools.title')}</Text>
        </View>

        {/* Section: Seguimiento (Tracking) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tools.tracking')}</Text>
          <View style={styles.sectionContent}>
            <ToolRow
              icon="scale-outline"
              label={t('tools.weight')}
              desc={t('tools.weightDesc')}
              color="#FF6A4D"
              onPress={() => router.push('/weight-tracker')}
            />
            <ToolRow
              icon="water-outline"
              label={t('tools.water')}
              desc={t('tools.waterDesc')}
              color="#4FC3F7"
              onPress={() => router.push('/water-tracker')}
            />
            <ToolRow
              icon="timer-outline"
              label={t('tools.fasting')}
              desc={t('tools.fastingDesc')}
              color="#FFA726"
              onPress={() => router.push('/fasting')}
            />
            <ToolRow
              icon="barbell-outline"
              label={t('tools.trainingDay')}
              desc={t('tools.trainingDayDesc')}
              color="#9C8CFF"
              onPress={() => router.push('/training-day')}
            />
            <ToolRow
              icon="body-outline"
              label={t('tools.measurements')}
              desc={t('tools.measurementsDesc')}
              color="#4ADE80"
              onPress={() => router.push('/measurements')}
            />
            <ToolRow
              icon="camera-outline"
              label={t('tools.photos')}
              desc={t('tools.photosDesc')}
              color="#AB47BC"
              onPress={() => router.push('/progress-photos')}
            />
          </View>
        </View>

        {/* Section: IA y Análisis (AI & Analytics) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tools.aiAndAnalysis')}</Text>
          <View style={styles.sectionContent}>
            <ToolRow
              icon="sparkles-outline"
              label={t('tools.weeklyCoach')}
              desc={t('tools.weeklyCoachDesc')}
              color="#9C8CFF"
              onPress={() => router.push('/weekly-coach')}
            />
            <ToolRow
              icon="analytics-outline"
              label={t('tools.analytics')}
              desc={t('tools.analyticsDesc')}
              color="#4FC3F7"
              onPress={() => router.push('/analytics')}
            />
            <ToolRow
              icon="fitness-outline"
              label={t('tools.proteinDashboard')}
              desc={t('tools.proteinDesc')}
              color="#FF6A4D"
              onPress={() => router.push('/protein-dashboard')}
            />
            <ToolRow
              icon="checkmark-done-outline"
              label={t('tools.consistency')}
              desc={t('tools.consistencyDesc')}
              color="#4ADE80"
              onPress={() => router.push('/adherence')}
            />
            <ToolRow
              icon="star-outline"
              label={t('tools.aiReview')}
              desc={t('tools.aiReviewDesc')}
              color="#FFA726"
              onPress={() => router.push('/ai-review')}
            />
          </View>
        </View>

        {/* Section: Planificación (Planning) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tools.planning')}</Text>
          <View style={styles.sectionContent}>
            <ToolRow
              icon="book-outline"
              label={t('tools.recipes')}
              desc={t('tools.recipesDesc')}
              color="#4ADE80"
              onPress={() => router.push('/recipes')}
            />
            <ToolRow
              icon="calendar-outline"
              label={t('tools.mealPlan')}
              desc={t('tools.mealPlanDesc')}
              color="#9C8CFF"
              onPress={() => router.push('/meal-plan')}
            />
            <ToolRow
              icon="cart-outline"
              label={t('tools.shoppingList')}
              desc={t('tools.shoppingListDesc')}
              color="#FF6A4D"
              onPress={() => router.push('/shopping-list')}
            />
            <ToolRow
              icon="restaurant-outline"
              label={t('tools.whatToEat')}
              desc={t('tools.whatToEatDesc')}
              color="#4ADE80"
              onPress={() => router.push('/what-to-eat')}
            />
            <ToolRow
              icon="options-outline"
              label={t('tools.goalModes')}
              desc={t('tools.goalModesDesc')}
              color="#4FC3F7"
              onPress={() => router.push('/goal-modes')}
            />
            <ToolRow
              icon="share-outline"
              label={t('tools.exportData')}
              desc={t('tools.exportDataDesc')}
              color="#AB47BC"
              onPress={() => router.push('/export-data')}
            />
          </View>
        </View>

        {/* Section: Ajustes (Settings) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tools.settings')}</Text>
          <View style={styles.sectionContent}>
            <SettingsRow
              icon="notifications-outline"
              label={t('profile.notifications')}
              right={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{
                    false: C.border,
                    true: C.primary + '40',
                  }}
                  thumbColor={notificationsEnabled ? C.primary : C.textMuted}
                />
              }
            />
            <SettingsRow
              icon="share-social-outline"
              label={t('profile.exportData')}
              onPress={() => router.push('/coach-share')}
            />
            <SettingsRow
              icon="settings-outline"
              label={t('profile.advancedSettings')}
              onPress={() => router.push('/settings')}
            />
            <SettingsRow
              icon="help-circle-outline"
              label={t('profile.help')}
              onPress={() => router.push('/help')}
            />
            <SettingsRow
              icon="information-circle-outline"
              label={t('profile.about')}
              onPress={() => router.push('/about')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (C: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    brandHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 0,
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
      backgroundColor: C.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      paddingVertical: 16,
      paddingHorizontal: 0,
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 32,
      fontWeight: '700',
      color: C.text,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: C.textMuted,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionContent: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    },
    toolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 0,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    toolIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    toolInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    toolLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
      marginBottom: 2,
    },
    toolDesc: {
      fontSize: 12,
      color: C.textMuted,
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 0,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    settingsContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingsLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: C.text,
      marginLeft: 12,
    },
  });
