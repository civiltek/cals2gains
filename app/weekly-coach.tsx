import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS } from '../theme';

const { width } = Dimensions.get('window');

interface WeeklyMetrics {
  avgCalories: number;
  avgProtein: number;
  daysLogged: number;
  weightChange: number;
  calorieAdherence: number;
  proteinAdherence: number;
  consistency: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  wins: string[];
  improvements: string[];
  insights: string[];
  actionItems: string[];
  previousWeekChange: number;
}

export default function WeeklyCoachedScreen() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(new Date());

  useEffect(() => {
    calculateWeeklyMetrics();
  }, []);

  const calculateWeeklyMetrics = async () => {
    try {
      // Mock calculation - in production, pull from mealStore, weightStore, waterStore
      const mockMetrics: WeeklyMetrics = {
        avgCalories: 2150,
        avgProtein: 145,
        daysLogged: 6,
        weightChange: -0.8,
        calorieAdherence: 88,
        proteinAdherence: 92,
        consistency: 86,
        grade: 'A',
        wins: [
          'Lograste 6 de 7 días registrados',
          'Tu proteína mejoró 12% vs semana anterior',
          'Consistencia semanal: 86% - ¡Excelente!',
        ],
        improvements: [
          'Los fines de semana suben calorías un 18%',
          'Martes fue tu día más bajo en proteína',
          'Registra comidas más temprano para mejor precisión',
        ],
        insights: [
          'Tu peso bajó 0.8kg esta semana - sigue así',
          'Perfil proteico: 27% de calorías - muy bueno',
          'Picos de calorías: viernes y sábado',
        ],
        actionItems: [
          'Planifica snacks proteicos para el fin de semana',
          'Prueba 3 nuevas recetas altas en proteína',
          'Registra agua: promedio 1.5L/día',
        ],
        previousWeekChange: 6,
      };
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error calculating weekly metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string): string => {
    const gradeColors: { [key: string]: string } = {
      A: COLORS.success,
      B: COLORS.info,
      C: COLORS.warning,
      D: '#FF9500',
      F: COLORS.error,
    };
    return gradeColors[grade] || COLORS.primary;
  };

  const getAdherenceColor = (value: number): string => {
    if (value >= 85) return COLORS.success;
    if (value >= 70) return COLORS.warning;
    return COLORS.error;
  };

  const handleShare = async () => {
    try {
      await Haptics.selectionAsync();
      await Share.share({
        message: `Mi Resumen Semanal Cals2Gains:\nCalificación: ${metrics?.grade}\nAdherencia Calórica: ${metrics?.calorieAdherence}%\nAdherencia Proteína: ${metrics?.proteinAdherence}%`,
        title: 'Mi Resumen Semanal - Cals2Gains',
      });
    } catch (error) {
      console.error('Error sharing:', error);
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
        <Text style={styles.errorText}>Error cargando datos</Text>
      </View>
    );
  }

  const currentDate = new Date();
  const currentWeekStart = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatDate = (date: Date) => date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Resumen Semanal</Text>
          <Text style={styles.dateRange}>
            {formatDate(currentWeekStart)} - {formatDate(weekEnd)}
          </Text>
        </View>
        <TouchableOpacity onPress={handleShare} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="share-social" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Grade Circle */}
      <View style={styles.gradeSection}>
        <View style={[styles.gradeCircle, { borderColor: getGradeColor(metrics.grade) }]}>
          <Text style={[styles.gradeText, { color: getGradeColor(metrics.grade) }]}>
            {metrics.grade}
          </Text>
        </View>
        <Text style={styles.gradeLabel}>Desempeño Semanal</Text>
      </View>

      {/* Key Metrics Row */}
      <View style={styles.metricsGrid}>
        <MetricCard
          label="Calorías Promedio"
          value={metrics.avgCalories.toFixed(0)}
          unit="kcal"
          icon="flame"
        />
        <MetricCard
          label="Proteína Promedio"
          value={metrics.avgProtein.toFixed(0)}
          unit="g"
          icon="barbell"
        />
        <MetricCard
          label="Días Registrados"
          value={metrics.daysLogged}
          unit="/7"
          icon="calendar"
        />
        <MetricCard
          label="Cambio de Peso"
          value={Math.abs(metrics.weightChange).toFixed(1)}
          unit="kg"
          icon="scale"
          isNegative={metrics.weightChange < 0}
        />
      </View>

      {/* Adherence Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adherencia</Text>

        <AdherenceRing
          label="Calorías"
          value={metrics.calorieAdherence}
          color={getAdherenceColor(metrics.calorieAdherence)}
        />
        <AdherenceRing
          label="Proteína"
          value={metrics.proteinAdherence}
          color={getAdherenceColor(metrics.proteinAdherence)}
        />
        <AdherenceRing
          label="Consistencia"
          value={metrics.consistency}
          color={getAdherenceColor(metrics.consistency)}
        />
      </View>

      {/* Wins Section */}
      {metrics.wins.length > 0 && (
        <View style={[styles.section, styles.winsSection]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.sectionTitle}>Logros</Text>
          </View>
          {metrics.wins.map((win, index) => (
            <View key={index} style={styles.winCard}>
              <Ionicons name="checkmark" size={20} color={COLORS.success} />
              <Text style={styles.winText}>{win}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Areas to Improve */}
      {metrics.improvements.length > 0 && (
        <View style={[styles.section, styles.improvementSection]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
            <Text style={styles.sectionTitle}>A Mejorar</Text>
          </View>
          {metrics.improvements.map((improvement, index) => (
            <View key={index} style={styles.improvementCard}>
              <Ionicons name="arrow-up" size={20} color={COLORS.warning} />
              <Text style={styles.improvementText}>{improvement}</Text>
            </View>
          ))}
        </View>
      )}

      {/* AI Insights */}
      {metrics.insights.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Insights IA</Text>
          </View>
          {metrics.insights.map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Items */}
      {metrics.actionItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-done" size={24} color={COLORS.info} />
            <Text style={styles.sectionTitle}>Plan para la Próxima Semana</Text>
          </View>
          {metrics.actionItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.actionItemCard}>
              <View style={styles.actionDot} />
              <Text style={styles.actionItemText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Comparison */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>vs Semana Anterior</Text>
        <View style={styles.comparisonCard}>
          <Ionicons
            name={metrics.previousWeekChange > 0 ? 'arrow-up' : 'arrow-down'}
            size={24}
            color={metrics.previousWeekChange > 0 ? COLORS.success : COLORS.error}
          />
          <Text style={styles.comparisonText}>
            {metrics.previousWeekChange > 0 ? '+' : ''}{metrics.previousWeekChange}% adherencia
          </Text>
        </View>
      </View>

      {/* Footer Spacing */}
      <View style={styles.footerSpacing} />
    </ScrollView>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  unit: string;
  icon: string;
  isNegative?: boolean;
}

function MetricCard({ label, value, unit, icon, isNegative }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <Ionicons name={icon as any} size={20} color={COLORS.primary} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {isNegative && (
        <View style={styles.negativeBadge}>
          <Ionicons name="arrow-down" size={12} color={COLORS.success} />
        </View>
      )}
    </View>
  );
}

interface AdherenceRingProps {
  label: string;
  value: number;
  color: string;
}

function AdherenceRing({ label, value, color }: AdherenceRingProps) {
  return (
    <View style={styles.adherenceRow}>
      <View style={[styles.adherenceCircle, { borderColor: color }]}>
        <Text style={[styles.adherenceValue, { color }]}>{value}%</Text>
      </View>
      <Text style={styles.adherenceLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  gradeSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  gradeCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradeText: {
    fontSize: 56,
    fontWeight: '800',
  },
  gradeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    gap: 8,
  },
  metricCard: {
    width: (width - 32) / 2 - 4,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  metricUnit: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  negativeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  adherenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  adherenceCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adherenceValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  adherenceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  winsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  winCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  winCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  winText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    fontWeight: '500',
  },
  improvementSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  improvementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  improvementText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    fontWeight: '500',
  },
  insightCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  insightText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  actionItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.info,
    marginRight: 12,
  },
  actionItemText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  comparisonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  comparisonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
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
