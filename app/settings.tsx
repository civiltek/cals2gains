import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeStore, ThemeMode, useColors } from '../store/themeStore';
import { terraService, TerraProvider, TerraConnection } from '../services/terraService';
import { inBodyService } from '../services/inBodyService';
import { healthService } from '../services/healthKit';
import { changeLanguage, getCurrentLanguageInfo, SUPPORTED_LANGUAGES, LanguageOption } from '../i18n';
import { useUserStore } from '../store/userStore';
import { useReminderStore } from '../store/reminderStore';
import { ReminderKey } from '../services/reminderService';
import { migrateMealPhotosToFirestore, MigrationResult } from '../services/firebase';
import { FlatList } from 'react-native';

interface UserSettings {
  nutritionMode: 'simple' | 'advanced';
  dayType: 'training' | 'rest' | 'refeed';
  units: 'metric' | 'imperial';
  language: 'es' | 'en';
  reminders: {
    meals: boolean;
    mealsTime: string;
    water: boolean;
    weight: boolean;
    weightTime: string;
    fasting: boolean;
  };
  connectedServices: {
    appleHealth: boolean;
    googleHealth: boolean;
    garmin: boolean;
    fitbit: boolean;
    samsungHealth: boolean;
    wearOS: boolean;
    inBody: boolean;
  };
}

const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();
  const C = useColors();
  const user = useUserStore((s) => s.user);
  const setHealthEnabled = useUserStore((s) => s.setHealthEnabled);
  const reminderState = useReminderStore();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    nutritionMode: 'advanced',
    dayType: 'training',
    units: 'metric',
    language: 'es',
    reminders: {
      meals: true,
      mealsTime: '08:00',
      water: true,
      weight: true,
      weightTime: '07:00',
      fasting: false,
    },
    connectedServices: {
      appleHealth: false,
      googleHealth: false,
      garmin: false,
      fitbit: false,
      samsungHealth: false,
      wearOS: false,
      inBody: false,
    },
  });

  // Sync native health toggle with persisted user.healthEnabled
  useEffect(() => {
    if (user?.healthEnabled == null) return;
    setSettings((prev) => {
      const key = Platform.OS === 'ios' ? 'appleHealth' : 'googleHealth';
      if (prev.connectedServices[key] === user.healthEnabled) return prev;
      return {
        ...prev,
        connectedServices: { ...prev.connectedServices, [key]: user.healthEnabled },
      };
    });
  }, [user?.healthEnabled]);

  const [showMealTimeModal, setShowMealTimeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(getCurrentLanguageInfo());
  const [showWeightTimeModal, setShowWeightTimeModal] = useState(false);
  const [tempTime, setTempTime] = useState(settings.reminders.mealsTime);

  // InBody manual entry
  const [showInBodyModal, setShowInBodyModal] = useState(false);
  const [inBodyFat, setInBodyFat] = useState('');
  const [inBodyMuscle, setInBodyMuscle] = useState('');
  const [inBodyWater, setInBodyWater] = useState('');
  const [inBodyVisceral, setInBodyVisceral] = useState('');
  const [lastInBodyDate, setLastInBodyDate] = useState<Date | null>(null);

  useEffect(() => {
    inBodyService.initialize().then(() => {
      const last = inBodyService.getLastMeasurement();
      if (last) setLastInBodyDate(last.date);
      if (inBodyService.hasData()) {
        setSettings(prev => ({ ...prev, connectedServices: { ...prev.connectedServices, inBody: true } }));
      }
    });
  }, []);

  // Real user data from store
  const userProfile = {
    name: user?.displayName || t('settings.user'),
    email: user?.email || '',
    avatar: user?.photoURL ? null : '👤',
    photoURL: user?.photoURL || null,
  };

  const handleNutritionModeToggle = (mode: 'simple' | 'advanced') => {
    setSettings({ ...settings, nutritionMode: mode });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDayTypeChange = (type: 'training' | 'rest' | 'refeed') => {
    setSettings({ ...settings, dayType: type });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleReminderToggle = async (key: ReminderKey) => {
    const success = await reminderState.toggleReminder(key, t);
    if (success) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Permission denied — inform user
      Alert.alert(
        t('reminders.permissionDeniedTitle'),
        t('reminders.permissionDeniedBody'),
      );
    }
  };

  const handleUnitsToggle = () => {
    setSettings({
      ...settings,
      units: settings.units === 'metric' ? 'imperial' : 'metric',
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLanguageSelect = async (lang: LanguageOption) => {
    setSelectedLanguage(lang);
    await changeLanguage(lang.code);
    setSettings({ ...settings, language: lang.code as any });
    setShowLanguageModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleConnectService = async (service: string) => {
    setLoading(true);
    try {
      const isCurrentlyConnected = settings.connectedServices[service as keyof typeof settings.connectedServices];

      // Native health (HealthKit on iOS, Health Connect on Android) — includes Samsung Health on Android
      // since Samsung Health exposes data to Health Connect natively.
      const isNativeHealth = service === 'appleHealth'
        || service === 'googleHealth'
        || (service === 'samsungHealth' && Platform.OS === 'android');

      if (isNativeHealth) {
        if (isCurrentlyConnected) {
          await setHealthEnabled(false);
        } else {
          const available = await healthService.checkAvailability();
          if (!available) {
            const isIOS = Platform.OS === 'ios';
            Alert.alert(
              isIOS ? 'Apple Health' : 'Health Connect',
              isIOS
                ? t('settings.healthNotAvailableIOS', { defaultValue: 'Apple Health no está disponible en este dispositivo. Asegúrate de tener la app Salud instalada y de usar la versión más reciente de Cals2Gains.' })
                : t('settings.healthNotAvailableAndroid', { defaultValue: 'Health Connect no está disponible. Instala la app "Health Connect" de Google Play y asegúrate de usar la versión más reciente de Cals2Gains.' })
            );
            setLoading(false);
            return;
          }
          const granted = await healthService.requestAuthorization();
          if (!granted) {
            Alert.alert('Error', t('settings.serviceError', { service }));
            setLoading(false);
            return;
          }
          await setHealthEnabled(true);
        }

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSettings({
          ...settings,
          connectedServices: {
            ...settings.connectedServices,
            [service]: !isCurrentlyConnected,
          },
        });
        Alert.alert(
          t('common.success'),
          isCurrentlyConnected
            ? t('settings.serviceDisconnected', { service })
            : t('settings.serviceConnected', { service })
        );
        return;
      }

      // Terra wearables (Garmin, Fitbit, WearOS, Samsung on iOS)
      const terraProviderMap: Record<string, TerraProvider> = {
        garmin: 'GARMIN', fitbit: 'FITBIT', samsungHealth: 'SAMSUNG', wearOS: 'WEAR_OS',
      };

      if (isCurrentlyConnected) {
        if (terraProviderMap[service]) {
          await terraService.disconnect(terraProviderMap[service]);
        } else if (service === 'inBody') {
          await inBodyService.disconnect();
          setLastInBodyDate(null);
        }
      } else {
        if (terraProviderMap[service]) {
          const authUrl = await terraService.generateAuthUrl(terraProviderMap[service]);
          if (authUrl) {
            await Linking.openURL(authUrl);
          } else {
            Alert.alert('Error', t('settings.authLinkError'));
            setLoading(false);
            return;
          }
        } else if (service === 'inBody') {
          // InBody API is B2B only — open manual entry modal instead.
          setLoading(false);
          setShowInBodyModal(true);
          return;
        }
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSettings({
        ...settings,
        connectedServices: {
          ...settings.connectedServices,
          [service]: !isCurrentlyConnected,
        },
      });

      Alert.alert(
        t('common.success'),
        isCurrentlyConnected
          ? t('settings.serviceDisconnected', { service })
          : t('settings.serviceConnected', { service })
      );
    } catch (error) {
      Alert.alert('Error', t('settings.serviceError', { service }));
    } finally {
      setLoading(false);
    }
  };

  const handleMigratePhotos = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const r = await migrateMealPhotosToFirestore(user.uid);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Build diagnostic message
      let msg = `Total: ${r.total} comidas\n`;
      msg += `Subidas: ${r.migrated}\n`;
      if (r.alreadySynced > 0) msg += `Ya sincronizadas: ${r.alreadySynced}\n`;
      if (r.noPhoto > 0) msg += `Sin foto: ${r.noPhoto}\n`;
      if (r.failed > 0) msg += `Fallidas: ${r.failed}\n`;
      if (r.errors.length > 0) {
        msg += `\nErrores:\n${r.errors.slice(0, 3).join('\n')}`;
      }

      Alert.alert(t('settings.syncPhotos'), msg);
    } catch (error: any) {
      Alert.alert('Error', error?.message || t('settingsScreen.photosMigrateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    router.push('/export-data');
  };

  const handleCoachShare = () => {
    router.push('/coach-share');
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      // Simulate backup generation
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.success'), t('settingsScreen.backupComplete'));
      // In production, would call ExportService.generateBackup and shareExport
    } catch (error) {
      Alert.alert('Error', t('settingsScreen.backupFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInBody = async () => {
    const fat = parseFloat(inBodyFat);
    const muscle = parseFloat(inBodyMuscle);
    if (isNaN(fat) || fat < 1 || fat > 70) {
      Alert.alert('Error', 'Introduce un porcentaje de grasa válido (1–70%)');
      return;
    }
    if (isNaN(muscle) || muscle < 5 || muscle > 100) {
      Alert.alert('Error', 'Introduce una masa muscular válida (5–100 kg)');
      return;
    }
    try {
      await inBodyService.saveManualMeasurement({
        bodyFatPercent: fat,
        skeletalMuscleMass: muscle,
        waterPercent: inBodyWater ? parseFloat(inBodyWater) : undefined,
        visceralFatLevel: inBodyVisceral ? parseFloat(inBodyVisceral) : undefined,
      });
      const last = inBodyService.getLastMeasurement();
      if (last) setLastInBodyDate(last.date);
      setSettings(prev => ({ ...prev, connectedServices: { ...prev.connectedServices, inBody: true } }));
      setInBodyFat(''); setInBodyMuscle(''); setInBodyWater(''); setInBodyVisceral('');
      setShowInBodyModal(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.success'), `Grasa: ${fat}% · Músculo: ${muscle} kg`);
    } catch {
      Alert.alert('Error', t('settings.serviceError', { service: 'InBody' }));
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      t('settingsScreen.importBackup'),
      t('settingsScreen.importDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settingsScreen.selectFile'), onPress: () => {} },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('settingsScreen.signOut'),
      t('settingsScreen.signOutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settingsScreen.signOut'),
          onPress: async () => {
            setLoading(true);
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // In production, would handle logout logic
              router.replace('/login');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settingsScreen.deleteAccount'),
      t('settingsScreen.deleteWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settingsScreen.deleteMyAccount'),
          onPress: () => {
            Alert.alert(
              t('settingsScreen.confirmDeletion'),
              t('settingsScreen.confirmDeletionDesc'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: async () => {
                    setLoading(true);
                    try {
                      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      // In production, would handle account deletion
                      Alert.alert(t('common.success'), t('settingsScreen.accountDeleted'));
                      router.replace('/login');
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ]
            );
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderSettingItem = (label: string, value?: string | boolean) => (
    <View style={[styles.settingItem, { borderBottomColor: C.border }]}>
      <Text style={[styles.settingLabel, { color: C.text }]}>{label}</Text>
      {value !== undefined && (
        <Text style={[styles.settingValue, { color: C.textSecondary }]}>
          {typeof value === 'boolean' ? (value ? t('common.enabled') : t('common.disabled')) : value}
        </Text>
      )}
    </View>
  );

  const renderButton = (
    icon: string,
    label: string,
    onPress: () => void,
    color: string = C.primary,
    destructive: boolean = false
  ) => (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: destructive ? C.error : color,
        },
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={C.surface} />
      ) : (
        <>
          <Ionicons name={icon as any} size={20} color={C.surface} />
          <Text style={[styles.buttonText, { color: C.surface }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.surface }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: C.text }]}>{t('common.settings')}</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <View style={[styles.profileCard, { backgroundColor: C.background }]}>
            {userProfile.photoURL ? (
              <Image
                source={{ uri: userProfile.photoURL }}
                style={{ width: 60, height: 60, borderRadius: 30 }}
              />
            ) : (
              <View style={[styles.profileAvatar, { backgroundColor: `${C.primary}30` }]}>
                <Text style={[styles.profileAvatarText, { color: C.primary }]}>
                  {userProfile.name?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: C.text }]}>
                {userProfile.name}
              </Text>
              <Text style={[styles.profileEmail, { color: C.textSecondary }]}>
                {userProfile.email}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: C.primary }]}
              onPress={() => router.push('/edit-profile')}
            >
              <Ionicons name="create" size={18} color={C.surface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Goal Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('settings.goal')}</Text>
          <View style={[styles.sectionContent, { backgroundColor: C.background }]}>
            {renderSettingItem(t('settingsScreen.currentGoal'), t('settings.fatLoss'))}
            <TouchableOpacity
              style={[styles.changeButton, { backgroundColor: C.primary }]}
              onPress={() => router.push('/goal-modes')}
            >
              <Text style={[styles.changeButtonText, { color: C.surface }]}>{t('common.change')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Allergies & Intolerances */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('allergies.title')}</Text>
          <View style={[styles.sectionContent, { backgroundColor: C.background }]}>
            <TouchableOpacity
              style={[styles.linkItem, { borderBottomColor: C.border }]}
              onPress={() => router.push('/allergy-settings')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Ionicons name="warning-outline" size={20} color={C.error} />
                <Text style={[styles.linkText, { color: C.text }]}>{t('allergies.title')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Nutrition Mode */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('settings.nutritionMode')}</Text>
          <View style={[styles.toggleGroup, { backgroundColor: C.background }]}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                settings.nutritionMode === 'simple' && {
                  backgroundColor: C.primary,
                },
              ]}
              onPress={() => handleNutritionModeToggle('simple')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  {
                    color:
                      settings.nutritionMode === 'simple'
                        ? C.surface
                        : C.textSecondary,
                  },
                ]}
              >
                {t('nutritionMode.simple')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                settings.nutritionMode === 'advanced' && {
                  backgroundColor: C.primary,
                },
              ]}
              onPress={() => handleNutritionModeToggle('advanced')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  {
                    color:
                      settings.nutritionMode === 'advanced'
                        ? C.surface
                        : C.textSecondary,
                  },
                ]}
              >
                {t('nutritionMode.advanced')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Day Type Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('settings.currentDayType')}</Text>
          <View style={[styles.toggleGroup, { backgroundColor: C.background }]}>
            {(['training', 'rest', 'refeed'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.toggleButton,
                  settings.dayType === type && {
                    backgroundColor: C.primary,
                  },
                ]}
                onPress={() => handleDayTypeChange(type)}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    {
                      color:
                        settings.dayType === type
                          ? C.surface
                          : C.textSecondary,
                    },
                  ]}
                >
                  {type === 'training'
                    ? t('settings.training')
                    : type === 'rest'
                      ? t('settings.rest')
                      : t('settings.refeed')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reminders Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('settings.reminders')}</Text>
          <View style={[styles.sectionContent, { backgroundColor: C.background }]}>
            <View style={[styles.reminderItem, { borderBottomColor: C.border }]}>
              <View style={styles.reminderLabel}>
                <Ionicons name="restaurant" size={20} color={C.primary} />
                <Text style={[styles.reminderText, { color: C.text }]}>
                  {t('settings.mealReminder')}
                </Text>
              </View>
              <Switch
                value={reminderState.reminders.meals.enabled}
                onValueChange={() => handleReminderToggle('meals')}
                trackColor={{ false: C.border, true: `${C.primary}40` }}
                thumbColor={reminderState.reminders.meals.enabled ? C.primary : C.textSecondary}
              />
            </View>

            <View style={[styles.reminderItem, { borderBottomColor: C.border }]}>
              <View style={styles.reminderLabel}>
                <Ionicons name="water" size={20} color={C.info} />
                <Text style={[styles.reminderText, { color: C.text }]}>
                  {t('settings.waterReminder')}
                </Text>
              </View>
              <Switch
                value={reminderState.reminders.water.enabled}
                onValueChange={() => handleReminderToggle('water')}
                trackColor={{ false: C.border, true: `${C.info}40` }}
                thumbColor={reminderState.reminders.water.enabled ? C.info : C.textSecondary}
              />
            </View>

            <View style={[styles.reminderItem, { borderBottomColor: C.border }]}>
              <View style={styles.reminderLabel}>
                <Ionicons name="scale" size={20} color={C.accent} />
                <Text style={[styles.reminderText, { color: C.text }]}>
                  {t('settings.weightReminder')}
                </Text>
              </View>
              <Switch
                value={reminderState.reminders.weight.enabled}
                onValueChange={() => handleReminderToggle('weight')}
                trackColor={{ false: C.border, true: `${C.accent}40` }}
                thumbColor={reminderState.reminders.weight.enabled ? C.accent : C.textSecondary}
              />
            </View>

            <View style={styles.reminderItem}>
              <View style={styles.reminderLabel}>
                <Ionicons name="timer" size={20} color={C.warning} />
                <Text style={[styles.reminderText, { color: C.text }]}>
                  {t('settings.fastingReminder')}
                </Text>
              </View>
              <Switch
                value={reminderState.reminders.fasting.enabled}
                onValueChange={() => handleReminderToggle('fasting')}
                trackColor={{ false: C.border, true: `${C.warning}40` }}
                thumbColor={reminderState.reminders.fasting.enabled ? C.warning : C.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('settings.data')}</Text>
          <View style={styles.buttonGroup}>
            {renderButton('download', t('settingsScreen.exportData'), handleExportData)}
            {renderButton('cloud-upload', t('settingsScreen.syncPhotos'), handleMigratePhotos)}
            {renderButton('cloud-download', t('settingsScreen.fullBackup'), handleBackup)}
            {renderButton('cloud-upload', t('settingsScreen.importBackup'), handleImportBackup)}
          </View>
        </View>

        {/* Units Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('settings.units')}</Text>
          <View style={[styles.sectionContent, { backgroundColor: C.background }]}>
            <View style={[styles.settingRow, { borderBottomColor: C.border }]}>
              <View>
                <Text style={[styles.settingLabel, { color: C.text }]}>{t('settings.metricSystem')}</Text>
                <Text style={[styles.settingDescription, { color: C.textSecondary }]}>
                  {settings.units === 'metric' ? 'kg, cm' : 'lb, in'}
                </Text>
              </View>
              <Switch
                value={settings.units === 'metric'}
                onValueChange={handleUnitsToggle}
                trackColor={{ false: C.border, true: `${C.primary}40` }}
                thumbColor={settings.units === 'metric' ? C.primary : C.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Appearance & Language Section (Combined) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('settings.appearanceLanguage')}</Text>

          {/* Theme selector */}
          <Text style={[styles.subsectionLabel, { color: C.textSecondary }]}>{t('settings.theme')}</Text>
          <View style={[styles.toggleGroup, { backgroundColor: C.background }]}>
            {([
              { key: 'light' as ThemeMode, label: t('settings.light'), icon: 'sunny-outline' as const },
              { key: 'dark' as ThemeMode, label: t('settings.dark'), icon: 'moon-outline' as const },
              { key: 'system' as ThemeMode, label: t('settings.system'), icon: 'phone-portrait-outline' as const },
            ]).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.toggleButton,
                  themeMode === opt.key && { backgroundColor: C.primary },
                ]}
                onPress={() => setThemeMode(opt.key)}
              >
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={themeMode === opt.key ? C.surface : C.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.toggleButtonText,
                    {
                      color:
                        themeMode === opt.key
                          ? C.surface
                          : C.textSecondary,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Language selector */}
          <Text style={[styles.subsectionLabel, { color: C.textSecondary, marginTop: 16 }]}>{t('settings.language')}</Text>
          <TouchableOpacity
            style={[styles.languageSelector, { backgroundColor: C.card, borderColor: C.border }]}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.languageSelectorFlag}>{selectedLanguage.flag}</Text>
            <Text style={[styles.languageSelectorLabel, { color: C.text }]}>
              {selectedLanguage.label}
            </Text>
            <Ionicons name="chevron-down" size={18} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Connected Services */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('settings.connectedServices')}</Text>
          <View style={[styles.sectionContent, { backgroundColor: C.background }]}>
            {/* Apple Health (iOS) / Google Health Connect (Android) */}
            {Platform.OS === 'ios' ? (
              <View style={[styles.serviceItem, { borderBottomColor: C.border }]}>
                <View style={styles.serviceInfo}>
                  <Ionicons name="logo-apple" size={24} color={C.text} />
                  <View style={styles.serviceText}>
                    <Text style={[styles.serviceName, { color: C.text }]}>Apple Health</Text>
                    <Text style={[styles.serviceStatus, { color: C.textSecondary }]}>
                      {settings.connectedServices.appleHealth ? t('settingsScreen.connected') : t('settingsScreen.notConnected')}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.connectedServices.appleHealth}
                  onValueChange={() => handleConnectService('appleHealth')}
                  trackColor={{ false: C.border, true: `${C.primary}40` }}
                  thumbColor={settings.connectedServices.appleHealth ? C.primary : C.textSecondary}
                />
              </View>
            ) : (
              <View style={[styles.serviceItem, { borderBottomColor: C.border }]}>
                <View style={styles.serviceInfo}>
                  <Ionicons name="logo-google" size={24} color="#4285F4" />
                  <View style={styles.serviceText}>
                    <Text style={[styles.serviceName, { color: C.text }]}>Google Fit</Text>
                    <Text style={[styles.serviceStatus, { color: C.textSecondary }]}>
                      {settings.connectedServices.googleHealth ? t('settingsScreen.connected') : t('settingsScreen.notConnected')}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.connectedServices.googleHealth}
                  onValueChange={() => handleConnectService('googleHealth')}
                  trackColor={{ false: C.border, true: `${C.primary}40` }}
                  thumbColor={settings.connectedServices.googleHealth ? C.primary : C.textSecondary}
                />
              </View>
            )}

            {/* Garmin */}
            <View style={[styles.serviceItem, { borderBottomColor: C.border }]}>
              <View style={styles.serviceInfo}>
                <Ionicons name="watch-outline" size={24} color="#007DC3" />
                <View style={styles.serviceText}>
                  <Text style={[styles.serviceName, { color: C.text }]}>Garmin</Text>
                  <Text style={[styles.serviceStatus, { color: C.textSecondary }]}>
                    {settings.connectedServices.garmin ? t('settingsScreen.connected') : t('settingsScreen.notConnected')}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.connectedServices.garmin}
                onValueChange={() => handleConnectService('garmin')}
                trackColor={{ false: C.border, true: '#007DC340' }}
                thumbColor={settings.connectedServices.garmin ? '#007DC3' : C.textSecondary}
              />
            </View>

            {/* Fitbit */}
            <View style={[styles.serviceItem, { borderBottomColor: C.border }]}>
              <View style={styles.serviceInfo}>
                <Ionicons name="pulse-outline" size={24} color="#00B0B9" />
                <View style={styles.serviceText}>
                  <Text style={[styles.serviceName, { color: C.text }]}>Fitbit</Text>
                  <Text style={[styles.serviceStatus, { color: C.textSecondary }]}>
                    {settings.connectedServices.fitbit ? t('settingsScreen.connected') : t('settingsScreen.notConnected')}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.connectedServices.fitbit}
                onValueChange={() => handleConnectService('fitbit')}
                trackColor={{ false: C.border, true: '#00B0B940' }}
                thumbColor={settings.connectedServices.fitbit ? '#00B0B9' : C.textSecondary}
              />
            </View>

            {/* Samsung Health */}
            <View style={[styles.serviceItem, { borderBottomColor: C.border }]}>
              <View style={styles.serviceInfo}>
                <Ionicons name="heart-circle-outline" size={24} color="#1428A0" />
                <View style={styles.serviceText}>
                  <Text style={[styles.serviceName, { color: C.text }]}>Samsung Health</Text>
                  <Text style={[styles.serviceStatus, { color: C.textSecondary }]}>
                    {settings.connectedServices.samsungHealth ? t('settingsScreen.connected') : t('settingsScreen.notConnected')}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.connectedServices.samsungHealth}
                onValueChange={() => handleConnectService('samsungHealth')}
                trackColor={{ false: C.border, true: '#1428A040' }}
                thumbColor={settings.connectedServices.samsungHealth ? '#1428A0' : C.textSecondary}
              />
            </View>

            {/* Wear OS (Android only) */}
            {Platform.OS === 'android' && (
              <View style={[styles.serviceItem, { borderBottomColor: C.border }]}>
                <View style={styles.serviceInfo}>
                  <Ionicons name="watch-outline" size={24} color="#4285F4" />
                  <View style={styles.serviceText}>
                    <Text style={[styles.serviceName, { color: C.text }]}>Wear OS</Text>
                    <Text style={[styles.serviceStatus, { color: C.textSecondary }]}>
                      {settings.connectedServices.wearOS ? t('settingsScreen.connected') : t('settingsScreen.notConnected')}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.connectedServices.wearOS}
                  onValueChange={() => handleConnectService('wearOS')}
                  trackColor={{ false: C.border, true: '#4285F440' }}
                  thumbColor={settings.connectedServices.wearOS ? '#4285F4' : C.textSecondary}
                />
              </View>
            )}

            {/* InBody — manual entry, no OAuth */}
            <View style={[styles.serviceItem, { borderBottomWidth: 0 }]}>
              <View style={styles.serviceInfo}>
                <Ionicons name="body-outline" size={24} color="#E8383D" />
                <View style={styles.serviceText}>
                  <Text style={[styles.serviceName, { color: C.text }]}>InBody</Text>
                  <Text style={[styles.serviceStatus, { color: C.textSecondary }]}>
                    {settings.connectedServices.inBody && lastInBodyDate
                      ? `Última: ${lastInBodyDate.toLocaleDateString()}`
                      : settings.connectedServices.inBody
                      ? t('settingsScreen.connected')
                      : t('settingsScreen.notConnected')}
                  </Text>
                </View>
              </View>
              {settings.connectedServices.inBody ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity onPress={() => setShowInBodyModal(true)}>
                    <Ionicons name="add-circle-outline" size={24} color="#E8383D" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleConnectService('inBody')}>
                    <Ionicons name="close-circle-outline" size={24} color={C.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.inBodyRegisterBtn, { backgroundColor: '#E8383D15', borderColor: '#E8383D50' }]}
                  onPress={() => setShowInBodyModal(true)}
                >
                  <Text style={{ color: '#E8383D', fontSize: 13, fontWeight: '600' }}>Registrar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Coach/Share Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('settings.coachShare')}</Text>
          <View style={styles.buttonGroup}>
            {renderButton(
              'person-add',
              t('settings.connectCoach'),
              handleCoachShare,
              C.accent
            )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('settings.about')}</Text>
          <View style={[styles.sectionContent, { backgroundColor: C.background }]}>
            {renderSettingItem(t('settings.version'), 'v1.0.0')}
            <TouchableOpacity
              style={[styles.linkItem, { borderBottomColor: C.border }]}
              onPress={() => router.push('/help')}
            >
              <Text style={[styles.linkText, { color: C.primary }]}>{t('common.help')}</Text>
              <Ionicons name="help-circle-outline" size={20} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkItem, { borderBottomColor: C.border }]}
              onPress={() => router.push('/about')}
            >
              <Text style={[styles.linkText, { color: C.primary }]}>{t('common.about')}</Text>
              <Ionicons name="information-circle-outline" size={20} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkItem, { borderBottomColor: C.border }]}
              onPress={() =>
                Linking.openURL('https://cals2gains.com/terms')
              }
            >
              <Text style={[styles.linkText, { color: C.primary }]}>{t('auth.termsOfService')}</Text>
              <Ionicons name="chevron-forward" size={20} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkItem, { borderBottomColor: C.border }]}
              onPress={() =>
                Linking.openURL('https://cals2gains.com/privacy')
              }
            >
              <Text style={[styles.linkText, { color: C.primary }]}>{t('auth.privacyPolicy')}</Text>
              <Ionicons name="chevron-forward" size={20} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkItem, { borderBottomColor: C.border }]}
              onPress={() =>
                Linking.openURL('https://apps.apple.com/app/cals2gains')
              }
            >
              <Text style={[styles.linkText, { color: C.primary }]}>{t('settings.rateApp')}</Text>
              <Ionicons name="star" size={20} color={C.warning} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          {renderButton('log-out', t('settingsScreen.signOut'), handleLogout, C.warning)}
        </View>

        {/* Delete Account Link */}
        <TouchableOpacity
          style={styles.deleteAccountLink}
          onPress={handleDeleteAccount}
        >
          <Text style={[styles.deleteAccountText, { color: C.error }]}>
            {t('settingsScreen.deleteAccount')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* InBody Manual Entry Modal */}
      <Modal
        visible={showInBodyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInBodyModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={[styles.inBodyModal, { backgroundColor: C.cardElevated || C.surface }]}>
              <View style={styles.languageModalHeader}>
                <Text style={[styles.languageModalTitle, { color: C.text }]}>Medición InBody</Text>
                <TouchableOpacity onPress={() => setShowInBodyModal(false)}>
                  <Ionicons name="close" size={24} color={C.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.inBodySubtitle, { color: C.textSecondary }]}>
                Introduce los datos del informe InBody
              </Text>

              <View style={styles.inBodyField}>
                <Text style={[styles.inBodyLabel, { color: C.text }]}>Grasa corporal (%) *</Text>
                <TextInput
                  style={[styles.inBodyInput, { color: C.text, borderColor: C.border, backgroundColor: C.background }]}
                  value={inBodyFat}
                  onChangeText={setInBodyFat}
                  keyboardType="decimal-pad"
                  placeholder="ej. 18.5"
                  placeholderTextColor={C.textSecondary}
                />
              </View>

              <View style={styles.inBodyField}>
                <Text style={[styles.inBodyLabel, { color: C.text }]}>Masa muscular esquelética (kg) *</Text>
                <TextInput
                  style={[styles.inBodyInput, { color: C.text, borderColor: C.border, backgroundColor: C.background }]}
                  value={inBodyMuscle}
                  onChangeText={setInBodyMuscle}
                  keyboardType="decimal-pad"
                  placeholder="ej. 32.4"
                  placeholderTextColor={C.textSecondary}
                />
              </View>

              <View style={styles.inBodyField}>
                <Text style={[styles.inBodyLabel, { color: C.text }]}>
                  Agua corporal (%){'  '}<Text style={{ color: C.textSecondary, fontWeight: '400' }}>opcional</Text>
                </Text>
                <TextInput
                  style={[styles.inBodyInput, { color: C.text, borderColor: C.border, backgroundColor: C.background }]}
                  value={inBodyWater}
                  onChangeText={setInBodyWater}
                  keyboardType="decimal-pad"
                  placeholder="ej. 60.1"
                  placeholderTextColor={C.textSecondary}
                />
              </View>

              <View style={styles.inBodyField}>
                <Text style={[styles.inBodyLabel, { color: C.text }]}>
                  Grasa visceral (1-20){'  '}<Text style={{ color: C.textSecondary, fontWeight: '400' }}>opcional</Text>
                </Text>
                <TextInput
                  style={[styles.inBodyInput, { color: C.text, borderColor: C.border, backgroundColor: C.background }]}
                  value={inBodyVisceral}
                  onChangeText={setInBodyVisceral}
                  keyboardType="number-pad"
                  placeholder="ej. 5"
                  placeholderTextColor={C.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={[styles.inBodySaveBtn, { backgroundColor: '#E8383D' }]}
                onPress={handleSaveInBody}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.inBodySaveBtnText}>Guardar medición</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Language Modal — OUTSIDE ScrollView so it renders as true overlay */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.languageModal, { backgroundColor: C.cardElevated || C.surface }]}>
            <View style={styles.languageModalHeader}>
              <Text style={[styles.languageModalTitle, { color: C.text }]}>{t('settings.selectLanguage')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageModalItem,
                    { borderBottomColor: C.border },
                    item.code === selectedLanguage.code && { backgroundColor: `${C.primary}15` },
                  ]}
                  onPress={() => handleLanguageSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageModalFlag}>{item.flag}</Text>
                  <Text style={[styles.languageModalLabel, { color: C.text }]}>
                    {item.label}
                  </Text>
                  {item.code === selectedLanguage.code && (
                    <Ionicons name="checkmark-circle" size={22} color={C.primary} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  profileAvatarText: {
    fontSize: 32,
    textAlign: 'center',
    lineHeight: 60,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 13,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  toggleGroup: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  reminderLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reminderText: {
    fontSize: 15,
    fontWeight: '500',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  serviceText: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  serviceStatus: {
    fontSize: 12,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '500',
  },
  buttonGroup: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  deleteAccountText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Subsection label
  subsectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Language selector button
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  languageSelectorFlag: {
    fontSize: 20,
  },
  languageSelectorLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },

  // Language modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  languageModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  languageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  languageModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  languageModalFlag: {
    fontSize: 22,
  },
  languageModalLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },

  // InBody manual entry
  inBodyModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  inBodySubtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  inBodyField: {
    marginBottom: 16,
  },
  inBodyLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inBodyInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  inBodySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  inBodySaveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  inBodyRegisterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});

export default SettingsScreen;
