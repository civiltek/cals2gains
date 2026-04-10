import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../theme';

// Mock store - replace with actual fastingStore
const fastingStore = {
  startFast: async (protocolId: string) => true,
  endFast: async () => true,
  getFastingSessions: async () => [
    {
      id: '1',
      startTime: new Date(Date.now() - 24 * 3600000),
      endTime: new Date(Date.now() - 8 * 3600000),
      duration: 16,
      completed: true,
    },
  ],
  getStats: async () => ({
    averageDuration: 15.5,
    longestFast: 20,
    completionRate: 85,
  }),
};

const { width } = Dimensions.get('window');

interface FastingProtocol {
  id: string;
  label: string;
  hours: number;
  breakdownStart?: number;
  breakdownEnd?: number;
}

interface FastingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  completed: boolean;
}

interface FastingStats {
  averageDuration: number;
  longestFast: number;
  completionRate: number;
}

export default function FastingScreen() {
  const [activeFast, setActiveFast] = useState<FastingSession | null>(null);
  const [protocols, setProtocols] = useState<FastingProtocol[]>([
    { id: '16-8', label: '16:8', hours: 16 },
    { id: '18-6', label: '18:6', hours: 18 },
    { id: '20-4', label: '20:4', hours: 20 },
    { id: '5-2', label: '5:2', hours: 24 },
  ]);
  const [selectedProtocol, setSelectedProtocol] = useState<FastingProtocol>(
    protocols[0]
  );
  const [sessions, setSessions] = useState<FastingSession[]>([]);
  const [stats, setStats] = useState<FastingStats>({
    averageDuration: 0,
    longestFast: 0,
    completionRate: 0,
  });
  const [showCustomProtocol, setShowCustomProtocol] = useState(false);
  const [customHours, setCustomHours] = useState('');
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [elapsedHours, setElapsedHours] = useState(0);
  const [isFasting, setIsFasting] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeFast && isFasting) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed =
          (now.getTime() - activeFast.startTime.getTime()) / (1000 * 60 * 60);
        setElapsedHours(elapsed);

        const progress =
          Math.min(elapsed / selectedProtocol.hours, 1) * 100;
        Animated.timing(progressAnim, {
          toValue: progress,
          duration: 500,
          useNativeDriver: false,
        }).start();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeFast, isFasting, selectedProtocol.hours]);

  const loadData = async () => {
    try {
      const sessionsData = await fastingStore.getFastingSessions();
      const statsData = await fastingStore.getStats();
      setSessions(sessionsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading fasting data:', error);
    }
  };

  const handleStartFast = async () => {
    try {
      await fastingStore.startFast(selectedProtocol.id);
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      const newFast: FastingSession = {
        id: Date.now().toString(),
        startTime: new Date(),
        duration: selectedProtocol.hours,
        completed: false,
      };

      setActiveFast(newFast);
      setIsFasting(true);
      setElapsedHours(0);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: false,
      }).start();
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar el ayuno');
    }
  };

  const handleEndFast = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (activeFast) {
        const completedFast: FastingSession = {
          ...activeFast,
          endTime: new Date(),
          completed: elapsedHours >= activeFast.duration,
        };

        setSessions((prev) => [completedFast, ...prev]);
      }

      setActiveFast(null);
      setIsFasting(false);
      setElapsedHours(0);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: false,
      }).start();

      await fastingStore.endFast();
      const statsData = await fastingStore.getStats();
      setStats(statsData);

      Alert.alert('Éxito', 'Ayuno finalizado. Buen trabajo!');
    } catch (error) {
      Alert.alert('Error', 'No se pudo finalizar el ayuno');
    }
  };

  const handleCustomProtocol = async () => {
    if (!customHours || isNaN(parseInt(customHours))) {
      Alert.alert('Error', 'Por favor ingresa un número válido de horas');
      return;
    }

    const newProtocol: FastingProtocol = {
      id: `custom-${Date.now()}`,
      label: `${customHours}:${24 - parseInt(customHours)}`,
      hours: parseInt(customHours),
    };

    setProtocols((prev) => [...prev, newProtocol]);
    setSelectedProtocol(newProtocol);
    setCustomHours('');
    setShowCustomProtocol(false);
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
  };

  const getStatusText = (): string => {
    if (!activeFast) {
      return 'Sin ayuno activo';
    }
    if (isFasting) {
      const targetTime =
        activeFast.startTime.getTime() + activeFast.duration * 3600000;
      const now = new Date().getTime();
      if (now < targetTime) {
        return 'Ayunando...';
      } else {
        return 'Objetivo alcanzado!';
      }
    }
    return 'Ayuno completado';
  };

  const getStatusColor = (): string => {
    if (!activeFast) return COLORS.textTertiary;
    if (isFasting) {
      const targetTime =
        activeFast.startTime.getTime() + activeFast.duration * 3600000;
      const now = new Date().getTime();
      return now < targetTime ? COLORS.violet : COLORS.coral;
    }
    return COLORS.bone;
  };

  const CircleTimer = () => {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: [circumference, 0],
    });

    return (
      <View style={styles.timerContainer}>
        <Svg width={200} height={200} style={styles.svg}>
          <Circle
            cx={100}
            cy={100}
            r={radius}
            stroke={COLORS.cardHover}
            strokeWidth={8}
            fill="none"
          />
          <Animated.Circle
            cx={100}
            cy={100}
            r={radius}
            stroke={COLORS.violet}
            strokeWidth={8}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={styles.timerText}>
          <Text style={styles.elapsedHours}>
            {Math.floor(elapsedHours)}h
          </Text>
          <Text style={styles.elapsedMinutes}>
            {Math.floor((elapsedHours % 1) * 60)}m
          </Text>
          {activeFast && (
            <Text style={styles.targetText}>
              / {activeFast.duration}h
            </Text>
          )}
        </View>
      </View>
    );
  };

  const ProtocolButton = ({ protocol }: { protocol: FastingProtocol }) => {
    const isSelected = selectedProtocol.id === protocol.id;
    return (
      <TouchableOpacity
        style={[
          styles.protocolButton,
          isSelected && styles.protocolButtonActive,
        ]}
        onPress={() => {
          setSelectedProtocol(protocol);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        disabled={isFasting}
      >
        <Text
          style={[
            styles.protocolText,
            isSelected && styles.protocolTextActive,
          ]}
        >
          {protocol.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const SessionCard = ({ session }: { session: FastingSession }) => {
    const date = new Date(session.startTime);
    const dateStr = date.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <View>
            <Text style={styles.sessionDate}>{dateStr}</Text>
            <Text style={styles.sessionTime}>{timeStr}</Text>
          </View>
          <View style={styles.sessionDuration}>
            <Text style={styles.sessionDurationValue}>
              {Math.round(session.duration * 10) / 10}h
            </Text>
            <Text style={styles.sessionDurationLabel}>ayuno</Text>
          </View>
          {session.completed && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.coral} />
            </View>
          )}
        </View>
      </View>
    );
  };

  const EmptySessionsState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="time" size={48} color={COLORS.textTertiary} />
      <Text style={styles.emptyStateText}>
        Inicia tu primer ayuno para ver el historial
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ayuno Intermitente</Text>
        </View>

        {/* Timer Section */}
        <View style={styles.timerSection}>
          <CircleTimer />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        {/* Start/Stop Button */}
        {!isFasting && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartFast}
          >
            <Ionicons name="play" size={20} color={COLORS.background} />
            <Text style={styles.startButtonText}>Iniciar Ayuno</Text>
          </TouchableOpacity>
        )}

        {isFasting && (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleEndFast}
          >
            <Ionicons name="stop" size={20} color={COLORS.background} />
            <Text style={styles.stopButtonText}>Finalizar Ayuno</Text>
          </TouchableOpacity>
        )}

        {/* Protocol Selector */}
        <View style={styles.protocolSection}>
          <View style={styles.protocolHeader}>
            <Text style={styles.sectionTitle}>Protocolo</Text>
            <TouchableOpacity
              onPress={() => setShowCustomProtocol(true)}
              disabled={isFasting}
            >
              <Ionicons
                name="add-circle"
                size={24}
                color={isFasting ? COLORS.textTertiary : COLORS.violet}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.protocolGrid}>
            {protocols.slice(0, 4).map((protocol) => (
              <ProtocolButton key={protocol.id} protocol={protocol} />
            ))}
          </View>

          {protocols.length > 4 && (
            <View style={styles.extraProtocols}>
              {protocols.slice(4).map((protocol) => (
                <ProtocolButton key={protocol.id} protocol={protocol} />
              ))}
            </View>
          )}
        </View>

        {/* Time Window Config */}
        {selectedProtocol && !selectedProtocol.id.includes('5-2') && (
          <View style={styles.timeWindowSection}>
            <Text style={styles.sectionTitle}>Ventana de Comida</Text>
            <View style={styles.timeInputRow}>
              <View style={styles.timeInput}>
                <Text style={styles.timeInputLabel}>Inicio</Text>
                <TextInput
                  style={styles.timeInputField}
                  placeholder="09:00"
                  placeholderTextColor={COLORS.textTertiary}
                  editable={!isFasting}
                />
              </View>
              <View style={styles.timeInputDivider}>
                <Text style={styles.dividerText}>hasta</Text>
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.timeInputLabel}>Fin</Text>
                <TextInput
                  style={styles.timeInputField}
                  placeholder="17:00"
                  placeholderTextColor={COLORS.textTertiary}
                  editable={!isFasting}
                />
              </View>
            </View>
          </View>
        )}

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Estadísticas</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {stats.averageDuration.toFixed(1)}h
              </Text>
              <Text style={styles.statLabel}>Promedio</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.longestFast}h</Text>
              <Text style={styles.statLabel}>Máximo</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.completionRate}%</Text>
              <Text style={styles.statLabel}>Tasa Éxito</Text>
            </View>
          </View>
        </View>

        {/* History Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Historial</Text>
          {sessions.length > 0 ? (
            <FlatList
              data={sessions}
              renderItem={({ item }) => <SessionCard session={item} />}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          ) : (
            <EmptySessionsState />
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Custom Protocol Modal */}
      <Modal
        visible={showCustomProtocol}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomProtocol(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customProtocolDialog}>
            <Text style={styles.dialogTitle}>Crear Protocolo Personalizado</Text>

            <View style={styles.dialogSection}>
              <Text style={styles.dialogLabel}>Horas de Ayuno</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="p.ej., 14, 16, 18"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
                value={customHours}
                onChangeText={setCustomHours}
              />
            </View>

            <View style={styles.dialogButtonRow}>
              <TouchableOpacity
                style={styles.dialogButton}
                onPress={() => setShowCustomProtocol(false)}
              >
                <Text style={styles.dialogButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={handleCustomProtocol}
              >
                <Text style={styles.dialogButtonTextPrimary}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 12,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.bone,
  },
  timerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  timerContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  svg: {
    position: 'absolute',
  },
  timerText: {
    alignItems: 'center',
    zIndex: 10,
  },
  elapsedHours: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.violet,
  },
  elapsedMinutes: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  targetText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.coral,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  stopButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.violet,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  protocolSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  protocolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bone,
  },
  protocolGrid: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  protocolButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  protocolButtonActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  protocolText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  protocolTextActive: {
    color: COLORS.background,
  },
  extraProtocols: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  timeWindowSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  timeInput: {
    flex: 1,
  },
  timeInputLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  timeInputField: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.bone,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  timeInputDivider: {
    paddingBottom: 10,
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.violet,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  historySection: {
    paddingHorizontal: 16,
  },
  sessionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.bone,
  },
  sessionTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sessionDuration: {
    alignItems: 'flex-end',
  },
  sessionDurationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.violet,
  },
  sessionDurationLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  completedBadge: {
    marginLeft: 8,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 12,
    color: COLORS.textTertiary,
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customProtocolDialog: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bone,
    marginBottom: 20,
  },
  dialogSection: {
    marginBottom: 20,
  },
  dialogLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.bone,
    marginBottom: 8,
  },
  dialogInput: {
    backgroundColor: COLORS.cardHover,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.bone,
    fontSize: 14,
  },
  dialogButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.cardHover,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dialogButtonPrimary: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  dialogButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.bone,
  },
  dialogButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
});
