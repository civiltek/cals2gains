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
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
  const C = useColors();
  const { t } = useTranslation();
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
      Alert.alert('Error', t('fasting.errorStart'));
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

      Alert.alert(t('fasting.success'), t('fasting.fastEnded'));
    } catch (error) {
      Alert.alert('Error', t('fasting.errorEnd'));
    }
  };

  const handleCustomProtocol = async () => {
    if (!customHours || isNaN(parseInt(customHours))) {
      Alert.alert(t('errors.error'), t('fasting.invalidHours'));
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
      return t('fasting.noActiveFast');
    }
    if (isFasting) {
      const targetTime =
        activeFast.startTime.getTime() + activeFast.duration * 3600000;
      const now = new Date().getTime();
      if (now < targetTime) {
        return t('fasting.fasting');
      } else {
        return t('fasting.goalReached');
      }
    }
    return t('fasting.completed');
  };

  const getStatusColor = (): string => {
    if (!activeFast) return C.textMuted;
    if (isFasting) {
      const targetTime =
        activeFast.startTime.getTime() + activeFast.duration * 3600000;
      const now = new Date().getTime();
      return now < targetTime ? C.primary : C.accent;
    }
    return C.text;
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
            stroke={C.surfaceLight}
            strokeWidth={8}
            fill="none"
          />
          <AnimatedCircle
            cx={100}
            cy={100}
            r={radius}
            stroke={C.primary}
            strokeWidth={8}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={styles.timerText}>
          <Text style={[styles.elapsedHours, { color: C.primary }]}>
            {Math.floor(elapsedHours)}h
          </Text>
          <Text style={[styles.elapsedMinutes, { color: C.textSecondary }]}>
            {Math.floor((elapsedHours % 1) * 60)}m
          </Text>
          {activeFast && (
            <Text style={[styles.targetText, { color: C.textMuted }]}>
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
          { backgroundColor: C.surface, borderColor: C.border },
          isSelected && { backgroundColor: C.primary, borderColor: C.primary },
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
            { color: C.textSecondary },
            isSelected && { color: C.background },
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
      <View style={[styles.sessionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={styles.sessionHeader}>
          <View>
            <Text style={[styles.sessionDate, { color: C.text }]}>{dateStr}</Text>
            <Text style={[styles.sessionTime, { color: C.textSecondary }]}>{timeStr}</Text>
          </View>
          <View style={styles.sessionDuration}>
            <Text style={[styles.sessionDurationValue, { color: C.primary }]}>
              {Math.round(session.duration * 10) / 10}h
            </Text>
            <Text style={[styles.sessionDurationLabel, { color: C.textSecondary }]}>{t('fasting.label')}</Text>
          </View>
          {session.completed && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={C.accent} />
            </View>
          )}
        </View>
      </View>
    );
  };

  const EmptySessionsState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="time" size={48} color={C.textMuted} />
      <Text style={[styles.emptyStateText, { color: C.textMuted }]}>
        {t('fasting.emptyHistory')}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: C.text }]}>{t('fasting.title')}</Text>
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
            style={[styles.startButton, { backgroundColor: C.accent }]}
            onPress={handleStartFast}
          >
            <Ionicons name="play" size={20} color={C.background} />
            <Text style={[styles.startButtonText, { color: C.background }]}>{t('fasting.startFast')}</Text>
          </TouchableOpacity>
        )}

        {isFasting && (
          <TouchableOpacity
            style={[styles.stopButton, { backgroundColor: C.primary }]}
            onPress={handleEndFast}
          >
            <Ionicons name="stop" size={20} color={C.background} />
            <Text style={[styles.stopButtonText, { color: C.background }]}>{t('fasting.endFast')}</Text>
          </TouchableOpacity>
        )}

        {/* Protocol Selector */}
        <View style={styles.protocolSection}>
          <View style={styles.protocolHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('fasting.protocol')}</Text>
            <TouchableOpacity
              onPress={() => setShowCustomProtocol(true)}
              disabled={isFasting}
            >
              <Ionicons
                name="add-circle"
                size={24}
                color={isFasting ? C.textMuted : C.primary}
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
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('fasting.eatingWindow')}</Text>
            <View style={styles.timeInputRow}>
              <View style={styles.timeInput}>
                <Text style={[styles.timeInputLabel, { color: C.textSecondary }]}>{t('fasting.start')}</Text>
                <TextInput
                  style={[styles.timeInputField, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
                  placeholder="09:00"
                  placeholderTextColor={C.textMuted}
                  editable={!isFasting}
                />
              </View>
              <View style={styles.timeInputDivider}>
                <Text style={[styles.dividerText, { color: C.textMuted }]}>{t('fasting.until')}</Text>
              </View>
              <View style={styles.timeInput}>
                <Text style={[styles.timeInputLabel, { color: C.textSecondary }]}>{t('fasting.end')}</Text>
                <TextInput
                  style={[styles.timeInputField, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
                  placeholder="17:00"
                  placeholderTextColor={C.textMuted}
                  editable={!isFasting}
                />
              </View>
            </View>
          </View>
        )}

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('fasting.stats')}</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.statValue, { color: C.primary }]}>
                {stats.averageDuration.toFixed(1)}h
              </Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('fasting.averageDuration', { hours: stats.averageDuration.toFixed(1) })}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.statValue, { color: C.primary }]}>{stats.longestFast}h</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('fasting.longestFast', { hours: stats.longestFast })}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.statValue, { color: C.primary }]}>{stats.completionRate}%</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('fasting.successRate', { rate: stats.completionRate })}</Text>
            </View>
          </View>
        </View>

        {/* History Section */}
        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('fasting.history')}</Text>
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
          <View style={[styles.customProtocolDialog, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.dialogTitle, { color: C.text }]}>{t('fasting.createProtocol')}</Text>

            <View style={styles.dialogSection}>
              <Text style={[styles.dialogLabel, { color: C.text }]}>{t('fasting.fastingHours')}</Text>
              <TextInput
                style={[styles.dialogInput, { backgroundColor: C.surfaceLight, borderColor: C.border, color: C.text }]}
                placeholder={t('fasting.hoursPlaceholder')}
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                value={customHours}
                onChangeText={setCustomHours}
              />
            </View>

            <View style={styles.dialogButtonRow}>
              <TouchableOpacity
                style={[styles.dialogButton, { backgroundColor: C.surfaceLight, borderColor: C.border }]}
                onPress={() => setShowCustomProtocol(false)}
              >
                <Text style={[styles.dialogButtonText, { color: C.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, { backgroundColor: C.primary, borderColor: C.primary }]}
                onPress={handleCustomProtocol}
              >
                <Text style={[styles.dialogButtonTextPrimary, { color: C.background }]}>{t('fasting.create')}</Text>
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
    paddingTop: 12,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
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
  },
  elapsedMinutes: {
    fontSize: 18,
    marginTop: 4,
  },
  targetText: {
    fontSize: 12,
    marginTop: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
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
  },
  stopButton: {
    flexDirection: 'row',
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
    borderWidth: 1,
    alignItems: 'center',
  },
  protocolButtonActive: {
  },
  protocolText: {
    fontSize: 14,
    fontWeight: '600',
  },
  protocolTextActive: {
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
    marginBottom: 6,
  },
  timeInputField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  timeInputDivider: {
    paddingBottom: 10,
  },
  dividerText: {
    fontSize: 12,
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
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  historySection: {
    paddingHorizontal: 16,
  },
  sessionCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionTime: {
    fontSize: 12,
    marginTop: 2,
  },
  sessionDuration: {
    alignItems: 'flex-end',
  },
  sessionDurationValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  sessionDurationLabel: {
    fontSize: 11,
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
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    borderWidth: 1,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  dialogSection: {
    marginBottom: 20,
  },
  dialogLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  dialogInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    borderWidth: 1,
  },
  dialogButtonPrimary: {
  },
  dialogButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dialogButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
  },
});
