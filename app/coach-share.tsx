/**
 * Coach Sharing & Accountability - Phase 3
 * Share progress with coaches/nutritionists
 * Cals2Gains React Native app
 */

import React, { useState } from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { COLORS } from '../theme';
import { useUserStore } from '../store/userStore';

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
  calorieAverage: number;
  proteinAverage: number;
  weightChange: number;
  adherenceScore: number;
  workoutsLogged: number;
}

type ShareFrequency = 'daily' | 'weekly' | 'manual';

// ============================================================================
// COACH SHARE SCREEN
// ============================================================================

export default function CoachShareScreen() {
  const router = useRouter();
  const { userId } = useUserStore();

  const [coachEmail, setCoachEmail] = useState('');
  const [shareFrequency, setShareFrequency] = useState<ShareFrequency>('weekly');
  const [showPermissions, setShowPermissions] = useState(false);
  const [showCoachList, setShowCoachList] = useState(false);

  const [permissions, setPermissions] = useState<SharedPermission[]>([
    { key: 'meals', label: 'Comidas registradas', enabled: true, icon: 'restaurant' },
    { key: 'weight', label: 'Peso', enabled: true, icon: 'scale' },
    { key: 'measurements', label: 'Medidas corporales', enabled: false, icon: 'body' },
    { key: 'progress_photos', label: 'Fotos de progreso', enabled: false, icon: 'image' },
    { key: 'adherence', label: 'Adherencia y consistencia', enabled: true, icon: 'checkmark-circle' },
  ]);

  const [connectedCoaches, setConnectedCoaches] = useState<ConnectedCoach[]>([
    {
      id: '1',
      email: 'coach@nutrition.com',
      name: 'María González',
      connectedDate: new Date('2026-03-15'),
      isActive: true,
    },
  ]);

  // Mock weekly report data
  const weeklyReport: WeeklyReport = {
    week: 'Semana 9-15 de abril',
    calorieAverage: 2150,
    proteinAverage: 165,
    weightChange: -0.8,
    adherenceScore: 92,
    workoutsLogged: 5,
  };

  const togglePermission = (key: SharedPermission['key']) => {
    setPermissions(perms =>
      perms.map(p => (p.key === key ? { ...p, enabled: !p.enabled } : p))
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddCoach = async () => {
    if (!coachEmail.includes('@')) {
      Alert.alert('Email inválido', 'Por favor ingresa un email válido');
      return;
    }

    // In real app: send invitation via backend
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Invitación enviada',
      `Se envió una invitación a ${coachEmail} para compartir tu progreso.`
    );
    setCoachEmail('');
  };

  const handleRemoveCoach = (coachId: string) => {
    Alert.alert(
      'Eliminar acceso',
      '¿Desconectar este coach? Perderá acceso a tu progreso.',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Desconectar',
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

  const handleDirectShare = async (platform: 'whatsapp' | 'email' | 'link') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const shareText = `Mi progreso de esta semana en Cals2Gains:\n\nCalorías promedio: ${weeklyReport.calorieAverage} cal/día\nProteína: ${weeklyReport.proteinAverage}g/día\nCambio de peso: ${weeklyReport.weightChange}lb\nAdherencia: ${weeklyReport.adherenceScore}%\nEntrenamientos: ${weeklyReport.workoutsLogged}\n\nhttps://cals2gains.app/progress/${userId}`;

    if (platform === 'whatsapp') {
      Share.share({
        message: shareText,
        title: 'Mi progreso en Cals2Gains',
      });
    } else if (platform === 'email') {
      Share.share({
        message: shareText,
        title: 'Mi progreso en Cals2Gains',
        url: undefined,
      });
    } else {
      // Copy link to clipboard
      Alert.alert('Enlace copiado', 'Puedes compartir tu progreso con este enlace');
    }
  };

  const handleScreenshot = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Captura lista', 'Se capturó tu resumen de progreso (en producción)');
  };

  const enabledPermissionCount = permissions.filter(p => p.enabled).length;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compartir Progreso</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* ADD COACH SECTION */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Compartir con Coach</Text>

        <View style={styles.emailInputContainer}>
          <Ionicons
            name="mail"
            size={20}
            color={COLORS.primary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.emailInput}
            placeholder="Email del coach o nutricionista"
            placeholderTextColor="#bbb"
            keyboardType="email-address"
            value={coachEmail}
            onChangeText={setCoachEmail}
          />
        </View>

        {/* FREQUENCY SELECTOR */}
        <Text style={styles.label}>Frecuencia de reporte:</Text>
        <View style={styles.frequencyButtons}>
          {(['daily', 'weekly', 'manual'] as const).map(freq => (
            <TouchableOpacity
              key={freq}
              style={[
                styles.frequencyButton,
                shareFrequency === freq && styles.frequencyButtonActive,
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
                ]}
              >
                {freq === 'daily' ? 'Diario' : freq === 'weekly' ? 'Semanal' : 'Manual'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PERMISSIONS */}
        <Text style={styles.label}>Permisos de acceso:</Text>
        {permissions.map(perm => (
          <View key={perm.key} style={styles.permissionRow}>
            <View style={styles.permissionLabel}>
              <Ionicons
                name={perm.icon as any}
                size={20}
                color={COLORS.primary}
                style={styles.permIcon}
              />
              <Text style={styles.permissionText}>{perm.label}</Text>
            </View>
            <Switch
              value={perm.enabled}
              onValueChange={() => togglePermission(perm.key)}
              trackColor={{ false: '#ccc', true: COLORS.primary + '50' }}
              thumbColor={perm.enabled ? COLORS.primary : '#fff'}
            />
          </View>
        ))}

        <Text style={styles.permissionNote}>
          Solo se comparten los datos que tú elijas
        </Text>

        <TouchableOpacity
          style={styles.addCoachButton}
          onPress={handleAddCoach}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.addCoachButtonText}>Enviar invitación</Text>
        </TouchableOpacity>
      </View>

      {/* WEEKLY REPORT PREVIEW */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reporte Semanal</Text>
          <TouchableOpacity onPress={handleScreenshot}>
            <Ionicons name="camera" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportWeek}>{weeklyReport.week}</Text>
            <View style={styles.adherenceBadge}>
              <Text style={styles.adherenceText}>{weeklyReport.adherenceScore}%</Text>
            </View>
          </View>

          <View style={styles.reportGrid}>
            <View style={styles.reportItem}>
              <Text style={styles.reportLabel}>Calorías</Text>
              <Text style={styles.reportValue}>
                {weeklyReport.calorieAverage}
              </Text>
              <Text style={styles.reportUnit}>cal/día</Text>
            </View>

            <View style={styles.reportItem}>
              <Text style={styles.reportLabel}>Proteína</Text>
              <Text style={styles.reportValue}>
                {weeklyReport.proteinAverage}
              </Text>
              <Text style={styles.reportUnit}>g/día</Text>
            </View>

            <View style={styles.reportItem}>
              <Text style={styles.reportLabel}>Peso</Text>
              <Text
                style={[
                  styles.reportValue,
                  { color: weeklyReport.weightChange < 0 ? COLORS.success : COLORS.danger },
                ]}
              >
                {weeklyReport.weightChange > 0 ? '+' : ''}
                {weeklyReport.weightChange}
              </Text>
              <Text style={styles.reportUnit}>lb</Text>
            </View>

            <View style={styles.reportItem}>
              <Text style={styles.reportLabel}>Entrenamientos</Text>
              <Text style={styles.reportValue}>
                {weeklyReport.workoutsLogged}
              </Text>
              <Text style={styles.reportUnit}>sesiones</Text>
            </View>
          </View>
        </View>
      </View>

      {/* DIRECT SHARE */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Compartir rápido</Text>

        <View style={styles.shareButtonsContainer}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => handleDirectShare('whatsapp')}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            <Text style={styles.shareButtonLabel}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => handleDirectShare('email')}
            activeOpacity={0.7}
          >
            <Ionicons name="mail" size={24} color={COLORS.primary} />
            <Text style={styles.shareButtonLabel}>Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => handleDirectShare('link')}
            activeOpacity={0.7}
          >
            <Ionicons name="link" size={24} color="#FF6B6B" />
            <Text style={styles.shareButtonLabel}>Copiar enlace</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* COACH NOTES */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Comentarios del Coach</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Tu coach podrá escribir comentarios aquí..."
          placeholderTextColor="#bbb"
          multiline
          editable={false}
        />
        {connectedCoaches.length > 0 && (
          <Text style={styles.coachNameSmall}>
            — {connectedCoaches[0].name}
          </Text>
        )}
      </View>

      {/* CONNECTED COACHES */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Coaches conectados</Text>
          <Text style={styles.coachCount}>{connectedCoaches.length}</Text>
        </View>

        {connectedCoaches.length === 0 ? (
          <Text style={styles.emptyState}>
            No tienes coaches conectados. Envía una invitación arriba.
          </Text>
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
                    Conectado desde {coach.connectedDate.toLocaleDateString('es-ES')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveCoach(coach.id)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={24} color="#999" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: COLORS.text,
  },

  // SECTIONS
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
    color: COLORS.text,
  },

  // EMAIL INPUT
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    marginBottom: 16,
    paddingBottom: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  emailInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 8,
  },

  // LABELS & BUTTONS
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
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
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  frequencyButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  frequencyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  frequencyButtonTextActive: {
    color: '#fff',
  },

  // PERMISSIONS
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: COLORS.text,
  },
  permissionNote: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 12,
  },

  // ADD COACH BUTTON
  addCoachButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
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

  // REPORT CARD
  reportCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
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
    color: COLORS.text,
  },
  adherenceBadge: {
    backgroundColor: COLORS.success,
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
    minWidth: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  reportLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
  reportValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  reportUnit: {
    fontSize: 10,
    color: '#999',
  },

  // SHARE BUTTONS
  shareButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  shareButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 6,
  },

  // NOTES INPUT
  notesInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    fontSize: 13,
    color: '#999',
  },
  coachNameSmall: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'right',
  },

  // COACHES LIST
  coachCount: {
    backgroundColor: COLORS.primary,
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  emptyState: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 16,
  },
  coachCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  coachInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  coachAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coachInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  coachDetails: {
    flex: 1,
  },
  coachName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  coachEmail: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  connectedDate: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
});
