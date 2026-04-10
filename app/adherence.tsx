import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS } from '../theme';

const { width } = Dimensions.get('window');

type Period = 'semana' | 'mes' | '3-meses';
type DayStatus = 'good' | 'ok' | 'missed';

interface AdherenceMetrics {
  overallScore: number;
  calorieScore: number;
  proteinScore: number;
  consistencyScore: number;
  currentStreak: number;
  longestStreak: number;
  dailyStatus: DayStatus[];
  monthlyDays: { day: number; status: DayStatus }[];
  trend: number[];
  tips: string[];
}

export default function AdherenceScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('semana');
  const [metrics, setMetrics] = useState<AdherenceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const periods: { id: Period; label: string }[] = [
    { id: 'semana', label: 'Semana' },
    { id: 'mes', label: 'Mes' },
    { id: '3-meses', label: '3 Meses' },
  ];

  useEffect(() => {
    calculateAdherence();
  }, [period]);

  const calculateAdherence = async () => {
    try {
      setLoading(true);

      // Mock adherence calculation from adaptiveMacroEngine.calculateAdherenceScore()
      const mockMetrics: AdherenceMetrics = {
        overallScore: 82,
        calorieScore: 85,
        proteinScore: 88,
        consistencyScore: 78,
        currentStreak: 8,
        longestStreak: 15,
        dailyStatus: ['good', 'good', 'ok', 'good', 'good', 'ok', 'good'],
        monthlyDays: Array.from({ length: 30 }, (_, i) => ({
          day: i + 1,
          status: Math.random() > 0.3 ? 'good' : Math.random() > 0.5 ? 'ok' : 'missed',
        })),
        trend: [65, 68, 72, 75, 78, 80, 82],
        tips: [
          'Tu adherencia de proteína es excelente, mantén ese ritmo',
          'Los lunes tienes tendencia a calorías más altas, planifica mejor ese día',
          'Consistencia en registrar es clave, ¡vas bien!',
          'Los fines de semana son tu punto débil, prepara snacks proteicos',
        ],
      };

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error calculating adherence:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 75) return COLORS.success;
    if (score >= 50) return COLORS.warning;
    return COLORS.error;
  };

  const getDayStatusColor = (status: DayStatus): string => {
    switch (status) {
      case 'good':
        return COLORS.success;
      case 'ok':
        return COLORS.warning;
      case 'missed':
        return COLORS.error;
      default:
        return COLORS.border;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error cargando datos de adherencia</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Adherencia</Text>
      </View>

      {/* Overall Score Ring */}
      <View style={styles.scoreSection}>
        <View
          style={[
            styles.scoreRing,
            { borderColor: getScoreColor(metrics.overallScore) },
          ]}
        >
          <Text
            style={[
              styles.scoreValue,
              { color: getScoreColor(metrics.overallScore) },
            ]}
          >
            {metrics.overallScore}
          </Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.periodButton,
              period === p.id && styles.periodButtonActive,
            ]}
            onPress={() => setPeriod(p.id)}
          >
            <Text
              style={[
                styles.periodText,
                period === p.id && styles.periodTextActive,
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Score Breakdown */}
      <View style={styles.breakdownSection}>
        <Text style={styles.sectionTitle}>Desglose de Puntuación</Text>

        <ScoreBreakdownCard
          icon="flame"
          label="Calorías"
          score={metrics.calorieScore}
          description="% de días dentro de ±10% del objetivo"
          color={getScoreColor(metrics.calorieScore)}
        />

        <ScoreBreakdownCard
          icon="barbell"
          label="Proteína"
          score={metrics.proteinScore}
          description="% de días con objetivo proteico alcanzado"
          color={getScoreColor(metrics.proteinScore)}
        />

        <ScoreBreakdownCard
          icon="checkmark-circle"
          label="Consistencia"
          score={metrics.consistencyScore}
          description="% de días con comidas registradas"
          color={getScoreColor(metrics.consistencyScore)}
        />
      </View>

      {/* Daily Heatmap */}
      {period === 'semana' && (
        <View style={styles.heatmapSection}>
          <Text style={styles.sectionTitle}>Últimos 7 Días</Text>
          <View style={styles.heatmapWeek}>
            {metrics.dailyStatus.map((status, index) => {
              const days = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
              return (
                <View key={index} style={styles.heatmapDayContainer}>
                  <View
                    style={[
                      styles.heatmapDay,
                      { backgroundColor: getDayStatusColor(status) },
                    ]}
                  />
                  <Text style={styles.heatmapDayLabel}>{days[index]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Monthly Calendar */}
      {period === 'mes' && (
        <View style={styles.heatmapSection}>
          <Text style={styles.sectionTitle}>Calendario Mensual</Text>
          <View style={styles.monthlyCalendar}>
            {Array.from({ length: 6 }).map((_, weekIndex) => (
              <View key={weekIndex} style={styles.calendarWeek}>
                {metrics.monthlyDays
                  .slice(weekIndex * 7, (weekIndex + 1) * 7)
                  .map((dayData) => (
                    <View
                      key={dayData.day}
                      style={styles.calendarDayContainer}
                    >
                      <View
                        style={[
                          styles.calendarDay,
                          { backgroundColor: getDayStatusColor(dayData.status) },
                        ]}
                      />
                      <Text style={styles.calendarDayNumber}>{dayData.day}</Text>
                    </View>
                  ))}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Streak Info */}
      <View style={styles.streakSection}>
        <Text style={styles.sectionTitle}>Racha</Text>
        <View style={styles.streakContainer}>
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakLabel}>Racha Actual</Text>
            <Text style={styles.streakNumber}>{metrics.currentStreak}</Text>
            <Text style={styles.streakUnit}>días</Text>
          </View>
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>⭐</Text>
            <Text style={styles.streakLabel}>Racha Máxima</Text>
            <Text style={styles.streakNumber}>{metrics.longestStreak}</Text>
            <Text style={styles.streakUnit}>días</Text>
          </View>
        </View>
      </View>

      {/* Trend Chart (Simple SVG representation) */}
      <View style={styles.trendSection}>
        <Text style={styles.sectionTitle}>Tendencia de Adherencia</Text>
        <View style={styles.trendChart}>
          <TrendChart data={metrics.trend} color={COLORS.primary} />
        </View>
      </View>

      {/* Tips Section */}
      {metrics.tips.length > 0 && (
        <View style={styles.tipsSection}>
          <View style={styles.tipsHeader}>
            <Ionicons name="lightbulb" size={24} color={COLORS.warning} />
            <Text style={styles.sectionTitle}>Consejos</Text>
          </View>
          {metrics.tips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer Spacing */}
      <View style={styles.footerSpacing} />
    </ScrollView>
  );
}

interface ScoreBreakdownCardProps {
  icon: string;
  label: string;
  score: number;
  description: string;
  color: string;
}

function ScoreBreakdownCard({
  icon,
  label,
  score,
  description,
  color,
}: ScoreBreakdownCardProps) {
  return (
    <View style={styles.breakdownCard}>
      <View style={styles.breakdownLeft}>
        <View style={[styles.breakdownIcon, { backgroundColor: color }]}>
          <Ionicons name={icon as any} size={20} color={COLORS.background} />
        </View>
        <View style={styles.breakdownText}>
          <Text style={styles.breakdownLabel}>{label}</Text>
          <Text style={styles.breakdownDescription}>{description}</Text>
        </View>
      </View>
      <View style={[styles.breakdownScore, { borderColor: color }]}>
        <Text style={[styles.breakdownScoreValue, { color }]}>{score}%</Text>
      </View>
    </View>
  );
}

interface TrendChartProps {
  data: number[];
  color: string;
}

function TrendChart({ data, color }: TrendChartProps) {
  const chartWidth = width - 32;
  const chartHeight = 120;
  const maxScore = Math.max(...data, 100);
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * chartWidth;
    const y = chartHeight - (value / maxScore) * chartHeight;
    return { x, y, value };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartAxis}>
        <Text style={styles.axisLabel}>100</Text>
      </View>
      <View style={styles.chartAxis}>
        <Text style={styles.axisLabel}>50</Text>
      </View>
      <View style={styles.chartAxis}>
        <Text style={styles.axisLabel}>0</Text>
      </View>
      <View style={styles.chartContent}>
        {points.map((point, index) => (
          <View
            key={index}
            style={[
              styles.chartPoint,
              { left: point.x, top: point.y, backgroundColor: color },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  scoreRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 52,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  periodTextActive: {
    color: COLORS.background,
  },
  breakdownSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  breakdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  breakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownText: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  breakdownDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  breakdownScore: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownScoreValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  heatmapSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  heatmapWeek: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  heatmapDayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  heatmapDay: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  heatmapDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  monthlyCalendar: {
    gap: 8,
  },
  calendarWeek: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'space-between',
  },
  calendarDayContainer: {
    flex: 1,
    alignItems: 'center',
  },
  calendarDay: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 6,
    marginBottom: 4,
  },
  calendarDayNumber: {
    fontSize: 9,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  streakSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  streakContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  streakCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  streakLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  streakUnit: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  trendSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  trendChart: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    height: 150,
  },
  chartContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  chartAxis: {
    width: 30,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  axisLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  chartContent: {
    flex: 1,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginLeft: 8,
  },
  chartPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    marginLeft: -4,
    marginTop: -4,
  },
  tipsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.warning,
    marginTop: 8,
  },
  tipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  footerSpacing: {
    height: 40,
  },
});
