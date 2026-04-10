import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS } from '../theme';
import { terraService, TerraProvider, TerraConnection } from '../services/terraService';
import { inBodyService } from '../services/inBodyService';

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

  const [showMealTimeModal, setShowMealTimeModal] = useState(false);
  const [showWeightTimeModal, setShowWeightTimeModal] = useState(false);
  const [tempTime, setTempTime] = useState(settings.reminders.mealsTime);

  // Mock user profile data
  const userProfile = {
    name: 'Juan García',
    email: 'juan@example.com',
    avatar: '👤',
  };

  const handleNutritionModeToggle = (mode: 'simple' | 'advanced') => {
    setSettings({ ...settings, nutritionMode: mode });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
  };

  const handleDayTypeChange = (type: 'training' | 'rest' | 'refeed') => {
    setSettings({ ...settings, dayType: type });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
  };

  const handleReminderToggle = (key: keyof UserSettings['reminders']) => {
    setSettings({
      ...settings,
      reminders: {
        ...settings.reminders,
        [key]: !settings.reminders[key],
      },
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
  };

  const handleUnitsToggle = () => {
    setSettings({
      ...settings,
      units: settings.units === 'metric' ? 'imperial' : 'metric',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
  };

  const handleLanguageToggle = () => {
    setSettings({
      ...settings,
      language: settings.language === 'es' ? 'en' : 'es',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
  };

  const handleConnectService = async (service: string) => {
    setLoading(true);
    try {
      const isCurrentlyConnected = settings.connectedServices[service as keyof typeof settings.connectedServices];

      if (isCurrentlyConnected) {
        // Disconnect
        const terraProviderMap: Record<string, TerraProvider> = {
          garmin: 'GARMIN', fitbit: 'FITBIT', samsungHealth: 'SAMSUNG', wearOS: 'WEAR_OS',
        };
        if (terraProviderMap[service]) {
          await terraService.disconnect(terraProviderMap[service]);
        } else if (service === 'inBody') {
          await inBodyService.disconnect();
        }
      } else {
        // Connect via Terra for third-party wearables
        const terraProviderMap: Record<string, TerraProvider> = {
          garmin: 'GARMIN', fitbit: 'FITBIT', samsungHealth: 'SAMSUNG', wearOS: 'WEAR_OS',
        };
        if (terraProviderMap[service]) {
          const authUrl = await terraService.generateAuthUrl(terraProviderMap[service]);
          if (authUrl) {
            await Linking.openURL(authUrl);
          } else {
            Alert.alert('Error', 'No se pudo generar el enlace de autenticación. Inténtalo de nuevo.');
            setLoading(false);
            return;
          }
        } else if (service === 'inBody') {
          const authUrl = await inBodyService.generateAuthUrl();
          await Linking.openURL(authUrl);
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
        'Éxito',
        isCurrentlyConnected
          ? `${service} desconectado`
          : `${service} conectado correctamente`
      );
    } catch (error) {
      Alert.alert('Error', `No se pudo conectar ${service}`);
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
      Alert.alert('Éxito', 'Backup completado. Se está compartiendo...');
      // In production, would call ExportService.generateBackup and shareExport
    } catch (error) {
      Alert.alert('Error', 'No se pudo realizar el backup');
    } finally {
      setLoading(false);
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      'Importar Backup',
      'Selecciona el archivo de backup que deseas restaurar',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Seleccionar archivo', onPress: () => {} },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
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
      'Eliminar Cuenta',
      'Esta acción no se puede deshacer. Se eliminarán todos tus datos de forma permanente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Mi Cuenta',
          onPress: () => {
            Alert.alert(
              'Confirmar Eliminación',
              'Escribe tu email para confirmar la eliminación de tu cuenta',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: async () => {
                    setLoading(true);
                    try {
                      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      // In production, would handle account deletion
                      Alert.alert('Éxito', 'Tu cuenta ha sido eliminada permanentemente');
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
    <View style={[styles.settingItem, { borderBottomColor: COLORS.border }]}>
      <Text style={[styles.settingLabel, { color: COLORS.text }]}>{label}</Text>
      {value !== undefined && (
        <Text style={[styles.settingValue, { color: COLORS.textSecondary }]}>
          {typeof value === 'boolean' ? (value ? 'Activado' : 'Desactivado') : value}
        </Text>
      )}
    </View>
  );

  const renderButton = (
    icon: string,
    label: string,
    onPress: () => void,
    color: string = COLORS.primary,
    destructive: boolean = false
  ) => (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: destructive ? COLORS.error : color,
        },
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.surface} />
      ) : (
        <>
          <Ionicons name={icon as any} size={20} color={COLORS.surface} />
          <Text style={[styles.buttonText, { color: COLORS.surface }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: COLORS.surface }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: COLORS.text }]}>Ajustes</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <View style={[styles.profileCard, { backgroundColor: COLORS.background }]}>
            <Text style={[styles.profileAvatar, styles.profileAvatarText]}>
              {userProfile.avatar}
            </Text>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: COLORS.text }]}>
                {userProfile.name}
              </Text>
              <Text style={[styles.profileEmail, { color: COLORS.textSecondary }]}>
                {userProfile.email}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: COLORS.primary }]}
              onPress={() => {}}
            >
              <Ionicons name="create" size={18} color={COLORS.surface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Goal Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Meta</Text>
          <View style={[styles.sectionContent, { backgroundColor: COLORS.background }]}>
            {renderSettingItem('Objetivo Actual', 'Pérdida de grasa')}
            <TouchableOpacity
              style={[styles.changeButton, { backgroundColor: COLORS.primary }]}
              onPress={() => router.push('/goal-modes')}
            >
              <Text style={[styles.changeButtonText, { color: COLORS.surface }]}>Cambiar Meta</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nutrition Mode */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Modo de Nutrición</Text>
          <View style={[styles.toggleGroup, { backgroundColor: COLORS.background }]}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                settings.nutritionMode === 'simple' && {
                  backgroundColor: COLORS.primary,
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
                        ? COLORS.surface
                        : COLORS.textSecondary,
                  },
                ]}
              >
                Simple
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                settings.nutritionMode === 'advanced' && {
                  backgroundColor: COLORS.primary,
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
                        ? COLORS.surface
                        : COLORS.textSecondary,
                  },
                ]}
              >
                Avanzado
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Day Type Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Tipo de Día Actual</Text>
          <View style={[styles.toggleGroup, { backgroundColor: COLORS.background }]}>
            {(['training', 'rest', 'refeed'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.toggleButton,
                  settings.dayType === type && {
                    backgroundColor: COLORS.primary,
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
                          ? COLORS.surface
                          : COLORS.textSecondary,
                    },
                  ]}
                >
                  {type === 'training'
                    ? 'Entrenamiento'
                    : type === 'rest'
                      ? 'Descanso'
                      : 'Recarga'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reminders Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Recordatorios</Text>
          <View style={[styles.sectionContent, { backgroundColor: COLORS.background }]}>
            <View style={[styles.reminderItem, { borderBottomColor: COLORS.border }]}>
              <View style={styles.reminderLabel}>
                <Ionicons name="restaurant" size={20} color={COLORS.primary} />
                <Text style={[styles.reminderText, { color: COLORS.text }]}>
                  Recordatorio de Comidas
                </Text>
              </View>
              <Switch
                value={settings.reminders.meals}
                onValueChange={() => handleReminderToggle('meals')}
                trackColor={{ false: COLORS.border, true: `${COLORS.primary}40` }}
                thumbColor={settings.reminders.meals ? COLORS.primary : COLORS.textSecondary}
              />
            </View>

            <View style={[styles.reminderItem, { borderBottomColor: COLORS.border }]}>
              <View style={styles.reminderLabel}>
                <Ionicons name="water" size={20} color={COLORS.secondary} />
                <Text style={[styles.reminderText, { color: COLORS.text }]}>
                  Recordatorio de Agua
                </Text>
              </View>
              <Switch
                value={settings.reminders.water}
                onValueChange={() => handleReminderToggle('water')}
                trackColor={{ false: COLORS.border, true: `${COLORS.secondary}40` }}
                thumbColor={settings.reminders.water ? COLORS.secondary : COLORS.textSecondary}
              />
            </View>

            <View style={[styles.reminderItem, { borderBottomColor: COLORS.border }]}>
              <View style={styles.reminderLabel}>
                <Ionicons name="scale" size={20} color={COLORS.accent} />
                <Text style={[styles.reminderText, { color: COLORS.text }]}>
                  Recordatorio de Peso
                </Text>
              </View>
              <Switch
                value={settings.reminders.weight}
                onValueChange={() => handleReminderToggle('weight')}
                trackColor={{ false: COLORS.border, true: `${COLORS.accent}40` }}
                thumbColor={settings.reminders.weight ? COLORS.accent : COLORS.textSecondary}
              />
            </View>

            <View style={styles.reminderItem}>
              <View style={styles.reminderLabel}>
                <Ionicons name="timer" size={20} color={COLORS.warning} />
                <Text style={[styles.reminderText, { color: COLORS.text }]}>
                  Recordatorio de Ayuno
                </Text>
              </View>
              <Switch
                value={settings.reminders.fasting}
                onValueChange={() => handleReminderToggle('fasting')}
                trackColor={{ false: COLORS.border, true: `${COLORS.warning}40` }}
                thumbColor={settings.reminders.fasting ? COLORS.warning : COLORS.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Datos</Text>
          <View style={styles.buttonGroup}>
            {renderButton('download', 'Exportar Datos', handleExportData)}
            {renderButton('cloud-download', 'Backup Completo', handleBackup)}
            {renderButton('cloud-upload', 'Importar Backup', handleImportBackup)}
          </View>
        </View>

        {/* Units Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Unidades</Text>
          <View style={[styles.sectionContent, { backgroundColor: COLORS.background }]}>
            <View style={[styles.settingRow, { borderBottomColor: COLORS.border }]}>
              <View>
                <Text style={[styles.settingLabel, { color: COLORS.text }]}>Sistema Métrico</Text>
                <Text style={[styles.settingDescription, { color: COLORS.textSecondary }]}>
                  {settings.units === 'metric' ? 'kg, cm' : 'lb, in'}
                </Text>
              </View>
              <Switch
                value={settings.units === 'metric'}
                onValueChange={handleUnitsToggle}
                trackColor={{ false: COLORS.border, true: `${COLORS.primary}40` }}
                thumbColor={settings.units === 'metric' ? COLORS.primary : COLORS.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Idioma</Text>
          <View style={[styles.toggleGroup, { backgroundColor: COLORS.background }]}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                settings.language === 'es' && { backgroundColor: COLORS.primary },
              ]}
              onPress={() => handleLanguageToggle()}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  {
                    color:
                      settings.language === 'es'
                        ? COLORS.surface
                        : COLORS.textSecondary,
                  },
                ]}
              >
                Español
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                settings.language === 'en' && { backgroundColor: COLORS.primary },
              ]}
              onPress={() => handleLanguageToggle()}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  {
                    color:
                      settings.language === 'en'
                        ? COLORS.surface
                        : COLORS.textSecondary,
                  },
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Connected Services */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Servicios Conectados</Text>
          <View style={[styles.sectionContent, { backgroundColor: COLORS.background }]}>
            {/* Apple Health (iOS) / Google Health Connect (Android) */}
            {Platform.OS === 'ios' ? (
              <View style={[styles.serviceItem, { borderBottomColor: COLORS.border }]}>
                <View style={styles.serviceInfo}>
                  <Ionicons name="logo-apple" size={24} color={COLORS.text} />
                  <View style={styles.serviceText}>
                    <Text style={[styles.serviceName, { color: COLORS.text }]}>Apple Health</Text>
                    <Text style={[styles.serviceStatus, { color: COLORS.textSecondary }]}>
                      {settings.connectedServices.appleHealth ? 'Conectado' : 'No conectado'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.connectedServices.appleHealth}
                  onValueChange={() => handleConnectService('appleHealth')}
                  trackColor={{ false: COLORS.border, true: `${COLORS.primary}40` }}
                  thumbColor={settings.connectedServices.appleHealth ? COLORS.primary : COLORS.textSecondary}
                />
              </View>
            ) : (
              <View style={[styles.serviceItem, { borderBottomColor: COLORS.border }]}>
                <View style={styles.serviceInfo}>
                  <Ionicons name="logo-google" size={24} color="#4285F4" />
                  <View style={styles.serviceText}>
                    <Text style={[styles.serviceName, { color: COLORS.text }]}>Google Fit</Text>
                    <Text style={[styles.serviceStatus, { color: COLORS.textSecondary }]}>
                      {settings.connectedServices.googleHealth ? 'Conectado' : 'No conectado'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.connectedServices.googleHealth}
                  onValueChange={() => handleConnectService('googleHealth')}
                  trackColor={{ false: COLORS.border, true: `${COLORS.primary}40` }}
                  thumbColor={settings.connectedServices.googleHealth ? COLORS.primary : COLORS.textSecondary}
                />
              </View>
            )}

            {/* Garmin */}
            <View style={[styles.serviceItem, { borderBottomColor: COLORS.border }]}>
              <View style={styles.serviceInfo}>
                <Ionicons name="watch-outline" size={24} color="#007DC3" />
                <View style={styles.serviceText}>
                  <Text style={[styles.serviceName, { color: COLORS.text }]}>Garmin</Text>
                  <Text style={[styles.serviceStatus, { color: COLORS.textSecondary }]}>
                    {settings.connectedServices.garmin ? 'Conectado' : 'No conectado'}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.connectedServices.garmin}
                onValueChange={() => handleConnectService('garmin')}
                trackColor={{ false: COLORS.border, true: '#007DC340' }}
                thumbColor={settings.connectedServices.garmin ? '#007DC3' : COLORS.textSecondary}
              />
            </View>

            {/* Fitbit */}
            <View style={[styles.serviceItem, { borderBottomColor: COLORS.border }]}>
              <View style={styles.serviceInfo}>
                <Ionicons name="pulse-outline" size={24} color="#00B0B9" />
                <View style={styles.serviceText}>
                  <Text style={[styles.serviceName, { color: COLORS.text }]}>Fitbit</Text>
                  <Text style={[styles.serviceStatus, { color: COLORS.textSecondary }]}>
                    {settings.connectedServices.fitbit ? 'Conectado' : 'No conectado'}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.connectedServices.fitbit}
                onValueChange={() => handleConnectService('fitbit')}
                trackColor={{ false: COLORS.border, true: '#00B0B940' }}
                thumbColor={settings.connectedServices.fitbit ? '#00B0B9' : COLORS.textSecondary}
              />
            </View>

            {/* Samsung Health */}
            <View style={[styles.serviceItem, { borderBottomColor: COLORS.border }]}>
              <View style={styles.serviceInfo}>
                <Ionicons name="heart-circle-outline" size={24} color="#1428A0" />
                <View style={styles.serviceText}>
                  <Text style={[styles.serviceName, { color: COLORS.text }]}>Samsung Health</Text>
                  <Text style={[styles.serviceStatus, { color: COLORS.textSecondary }]}>
                    {settings.connectedServices.samsungHealth ? 'Conectado' : 'No conectado'}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.connectedServices.samsungHealth}
                onValueChange={() => handleConnectService('samsungHealth')}
                trackColor={{ false: COLORS.border, true: '#1428A040' }}
                thumbColor={settings.connectedServices.samsungHealth ? '#1428A0' : COLORS.textSecondary}
              />
            </View>

            {/* Wear OS (Android only) */}
            {Platform.OS === 'android' && (
              <View style={[styles.serviceItem, { borderBottomColor: COLORS.border }]}>
                <View style={styles.serviceInfo}>
                  <Ionicons name="watch-outline" size={24} color="#4285F4" />
                  <View style={styles.serviceText}>
                    <Text style={[styles.serviceName, { color: COLORS.text }]}>Wear OS</Text>
                    <Text style={[styles.serviceStatus, { color: COLORS.textSecondary }]}>
                      {settings.connectedServices.wearOS ? 'Conectado' : 'No conectado'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.connectedServices.wearOS}
                  onValueChange={() => handleConnectService('wearOS')}
                  trackColor={{ false: COLORS.border, true: '#4285F440' }}
                  thumbColor={settings.connectedServices.wearOS ? '#4285F4' : COLORS.textSecondary}
                />
              </View>
            )}

            {/* InBody */}
            <View style={styles.serviceItem}>
              <View style={styles.serviceInfo}>
                <Ionicons name="body-outline" size={24} color="#E8383D" />
                <View style={styles.serviceText}>
                  <Text style={[styles.serviceName, { color: COLORS.text }]}>InBody</Text>
                  <Text style={[styles.serviceStatus, { color: COLORS.textSecondary }]}>
                    {settings.connectedServices.inBody ? 'Conectado' : 'No conectado'}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.connectedServices.inBody}
                onValueChange={() => handleConnectService('inBody')}
                trackColor={{ false: COLORS.border, true: '#E8383D40' }}
                thumbColor={settings.connectedServices.inBody ? '#E8383D' : COLORS.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Coach/Share Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Entrenador/Compartir</Text>
          <View style={styles.buttonGroup}>
            {renderButton(
              'person-add',
              'Conectar con Entrenador',
              handleCoachShare,
              COLORS.secondary
            )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Información</Text>
          <View style={[styles.sectionContent, { backgroundColor: COLORS.background }]}>
            {renderSettingItem('Versión', 'v1.0.0')}
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() =>
                Linking.openURL('https://cals2gains.com/terms')
              }
            >
              <Text style={[styles.linkText, { color: COLORS.primary }]}>Términos de Servicio</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() =>
                Linking.openURL('https://cals2gains.com/privacy')
              }
            >
              <Text style={[styles.linkText, { color: COLORS.primary }]}>Política de Privacidad</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() =>
                Linking.openURL('https://apps.apple.com/app/cals2gains')
              }
            >
              <Text style={[styles.linkText, { color: COLORS.primary }]}>Calificar Aplicación</Text>
              <Ionicons name="star" size={20} color={COLORS.warning} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          {renderButton('log-out', 'Cerrar Sesión', handleLogout, COLORS.warning)}
        </View>

        {/* Delete Account Link */}
        <TouchableOpacity
          style={styles.deleteAccountLink}
          onPress={handleDeleteAccount}
        >
          <Text style={[styles.deleteAccountText, { color: COLORS.error }]}>
            Eliminar Cuenta
          </Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
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
    borderBottomColor: '#e5e5ea',
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
});

export default SettingsScreen;
