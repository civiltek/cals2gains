import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme';

// Mock store imports
import { userStore } from '../store/userStore';

const { width } = Dimensions.get('window');

type DayType = 'entreno' | 'descanso' | 'refeed';

interface DayTypeGoals {
  type: DayType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  color: string;
}

interface WeekDay {
  date: string;
  dayName: string;
  dayType: DayType;
  isToday: boolean;
}

const DAY_TYPE_PRESETS: Record<DayType, DayTypeGoals> = {
  entreno: {
    type: 'entreno',
    calories: 2800,
    protein: 160,
    carbs: 380,
    fat: 65,
    color: COLORS.primary,
  },
  descanso: {
    type: 'descanso',
    calories: 2500,
    protein: 160,
    carbs: 250,
    fat: 85,
    color: COLORS.info,
  },
  refeed: {
    type: 'refeed',
    calories: 3100,
    protein: 150,
    carbs: 450,
    fat: 60,
    color: COLORS.success,
  },
};

const DAY_LABELS: Record<DayType, { label: string; emoji: string; icon: string }> = {
  entreno: { label: 'Entreno', emoji: '🏋️', icon: 'barbell' },
  descanso: { label: 'Descanso', emoji: '🛋️', icon: 'bed' },
  refeed: { label: 'Refeed', emoji: '🔄', icon: 'refresh' },
};

export default function TrainingDay() {
  const insets = useSafeAreaInsets();
  const [todayType, setTodayType] = useState<DayType>('entreno');
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [autoDetect, setAutoDetect] = useState(false);
  const [selectedDayForEdit, setSelectedDayForEdit] = useState<string | null>(null);

  useEffect(() => {
    // Generate week days
    const today = new Date();
    const week: WeekDay[] = [];
    for (let i = -2; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const dateStr = date.toISOString().split('T')[0];
      const isToday = i === 0;

      week.push({
        date: dateStr,
        dayName: dayNames[date.getDay()],
        dayType: isToday ? 'entreno' : 'descanso',
        isToday,
      });
    }
    setWeekDays(week);
  }, []);

  const handleSelectDayType = (type: DayType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTodayType(type);
  };

  const handleToggleAutoDetect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAutoDetect(!autoDetect);
  };

  const handleApplyToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const goalData = DAY_TYPE_PRESETS[todayType];
    Alert.alert(
      'Objetivos Actualizados',
      `Hoy es un día de ${DAY_LABELS[todayType].label}\n\nCal: ${goalData.calories}\nProteína: ${goalData.protein}g\nCarbohidratos: ${goalData.carbs}g\nGrasas: ${goalData.fat}g`,
      [{ text: 'OK', onPress: () => {} }],
      { cancelable: true }
    );
  };

  const handleChangeWeekDay = (date: string, type: DayType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWeekDays(
      weekDays.map((day) =>
        day.date === date ? { ...day, dayType: type } : day
      )
    );
    setSelectedDayForEdit(null);
  };

  const renderDayTypeSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Tipo de Día Hoy</Text>
      <View style={styles.buttonGroup}>
        {(Object.keys(DAY_LABELS) as DayType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.dayTypeButton,
              todayType === type && styles.dayTypeButtonActive,
            ]}
            onPress={() => handleSelectDayType(type)}
          >
            <Text style={styles.dayTypeEmoji}>{DAY_LABELS[type].emoji}</Text>
            <Text style={[styles.dayTypeLabel, todayType === type && styles.dayTypeLabelActive]}>
              {DAY_LABELS[type].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderMacroComparison = () => (
    <View style={styles.comparisonContainer}>
      <Text style={styles.comparisonTitle}>Comparación de Macros</Text>

      <View style={styles.comparisonTable}>
        {/* Header row */}
        <View style={styles.tableHeaderRow}>
          <View style={[styles.tableCell, styles.tableCellLabel]} />
          {(Object.keys(DAY_LABELS) as DayType[]).map((type) => (
            <View
              key={type}
              style={[
                styles.tableCell,
                { backgroundColor: DAY_TYPE_PRESETS[type].color + '15' },
              ]}
            >
              <Text style={[styles.tableCellText, { color: DAY_TYPE_PRESETS[type].color }]}>
                {DAY_LABELS[type].emoji}
              </Text>
              <Text style={styles.tableHeaderText}>{DAY_LABELS[type].label}</Text>
            </View>
          ))}
        </View>

        {/* Calories row */}
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, styles.tableCellLabel]}>
            <Text style={styles.tableLabelText}>Calorías</Text>
          </View>
          {(Object.keys(DAY_LABELS) as DayType[]).map((type) => (
            <View
              key={type}
              style={[
                styles.tableCell,
                { backgroundColor: DAY_TYPE_PRESETS[type].color + '08' },
              ]}
            >
              <Text
                style={[
                  styles.tableMacroValue,
                  { color: DAY_TYPE_PRESETS[type].color },
                ]}
              >
                {DAY_TYPE_PRESETS[type].calories}
              </Text>
              <Text style={styles.tableMacroUnit}>kcal</Text>
            </View>
          ))}
        </View>

        {/* Protein row */}
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, styles.tableCellLabel]}>
            <Text style={styles.tableLabelText}>Proteína</Text>
          </View>
          {(Object.keys(DAY_LABELS) as DayType[]).map((type) => (
            <View
              key={type}
              style={[
                styles.tableCell,
                { backgroundColor: DAY_TYPE_PRESETS[type].color + '08' },
              ]}
            >
              <Text
                style={[
                  styles.tableMacroValue,
                  { color: DAY_TYPE_PRESETS[type].color },
                ]}
              >
                {DAY_TYPE_PRESETS[type].protein}
              </Text>
              <Text style={styles.tableMacroUnit}>g</Text>
            </View>
          ))}
        </View>

        {/* Carbs row */}
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, styles.tableCellLabel]}>
            <Text style={styles.tableLabelText}>Carbohidratos</Text>
          </View>
          {(Object.keys(DAY_LABELS) as DayType[]).map((type) => (
            <View
              key={type}
              style={[
                styles.tableCell,
                { backgroundColor: DAY_TYPE_PRESETS[type].color + '08' },
              ]}
            >
              <Text
                style={[
                  styles.tableMacroValue,
                  { color: DAY_TYPE_PRESETS[type].color },
                ]}
              >
                {DAY_TYPE_PRESETS[type].carbs}
              </Text>
              <Text style={styles.tableMacroUnit}>g</Text>
            </View>
          ))}
        </View>

        {/* Fat row */}
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, styles.tableCellLabel]}>
            <Text style={styles.tableLabelText}>Grasas</Text>
          </View>
          {(Object.keys(DAY_LABELS) as DayType[]).map((type) => (
            <View
              key={type}
              style={[
                styles.tableCell,
                { backgroundColor: DAY_TYPE_PRESETS[type].color + '08' },
              ]}
            >
              <Text
                style={[
                  styles.tableMacroValue,
                  { color: DAY_TYPE_PRESETS[type].color },
                ]}
              >
                {DAY_TYPE_PRESETS[type].fat}
              </Text>
              <Text style={styles.tableMacroUnit}>g</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderMacroDistribution = () => (
    <View style={styles.distributionContainer}>
      <Text style={styles.distributionTitle}>Distribución de Macros - {DAY_LABELS[todayType].label}</Text>

      <View style={styles.distributionBars}>
        {/* Protein */}
        <View style={styles.distributionItem}>
          <View style={styles.distributionLabelRow}>
            <Text style={styles.distributionLabel}>Proteína</Text>
            <Text style={styles.distributionValue}>
              {DAY_TYPE_PRESETS[todayType].protein}g ({Math.round((DAY_TYPE_PRESETS[todayType].protein * 4) / DAY_TYPE_PRESETS[todayType].calories * 100)}%)
            </Text>
          </View>
          <View style={[styles.distributionBarBg, { backgroundColor: COLORS.border }]}>
            <View
              style={[
                styles.distributionBarFill,
                {
                  width: `${Math.round((DAY_TYPE_PRESETS[todayType].protein * 4) / DAY_TYPE_PRESETS[todayType].calories * 100)}%`,
                  backgroundColor: COLORS.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* Carbs */}
        <View style={styles.distributionItem}>
          <View style={styles.distributionLabelRow}>
            <Text style={styles.distributionLabel}>Carbohidratos</Text>
            <Text style={styles.distributionValue}>
              {DAY_TYPE_PRESETS[todayType].carbs}g ({Math.round((DAY_TYPE_PRESETS[todayType].carbs * 4) / DAY_TYPE_PRESETS[todayType].calories * 100)}%)
            </Text>
          </View>
          <View style={[styles.distributionBarBg, { backgroundColor: COLORS.border }]}>
            <View
              style={[
                styles.distributionBarFill,
                {
                  width: `${Math.round((DAY_TYPE_PRESETS[todayType].carbs * 4) / DAY_TYPE_PRESETS[todayType].calories * 100)}%`,
                  backgroundColor: COLORS.info,
                },
              ]}
            />
          </View>
        </View>

        {/* Fat */}
        <View style={styles.distributionItem}>
          <View style={styles.distributionLabelRow}>
            <Text style={styles.distributionLabel}>Grasas</Text>
            <Text style={styles.distributionValue}>
              {DAY_TYPE_PRESETS[todayType].fat}g ({Math.round((DAY_TYPE_PRESETS[todayType].fat * 9) / DAY_TYPE_PRESETS[todayType].calories * 100)}%)
            </Text>
          </View>
          <View style={[styles.distributionBarBg, { backgroundColor: COLORS.border }]}>
            <View
              style={[
                styles.distributionBarFill,
                {
                  width: `${Math.round((DAY_TYPE_PRESETS[todayType].fat * 9) / DAY_TYPE_PRESETS[todayType].calories * 100)}%`,
                  backgroundColor: COLORS.warning,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );

  const renderAutoDetect = () => (
    <TouchableOpacity
      style={[styles.card, autoDetect && styles.cardActive]}
      onPress={handleToggleAutoDetect}
    >
      <View style={styles.autoDetectContent}>
        <View style={styles.autoDetectLeft}>
          <Ionicons
            name={autoDetect ? 'checkmark-circle' : 'circle-outline'}
            size={24}
            color={autoDetect ? COLORS.success : COLORS.textSecondary}
          />
          <View style={styles.autoDetectText}>
            <Text style={styles.autoDetectTitle}>Detectar Automáticamente</Text>
            <Text style={styles.autoDetectDesc}>Basado en tu aplicación de entreno</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderWeekCalendar = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Semana</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
        <View style={styles.weekContainer}>
          {weekDays.map((day) => (
            <TouchableOpacity
              key={day.date}
              style={[
                styles.weekDay,
                day.isToday && styles.weekDayToday,
              ]}
              onPress={() => setSelectedDayForEdit(day.date)}
            >
              <Text style={styles.weekDayName}>{day.dayName}</Text>
              <View
                style={[
                  styles.weekDayBadge,
                  {
                    backgroundColor: DAY_TYPE_PRESETS[day.dayType].color + '25',
                    borderColor: DAY_TYPE_PRESETS[day.dayType].color,
                  },
                ]}
              >
                <Text style={styles.weekDayEmoji}>{DAY_LABELS[day.dayType].emoji}</Text>
              </View>

              {selectedDayForEdit === day.date && (
                <View style={styles.dayTypePickerModal}>
                  {(Object.keys(DAY_LABELS) as DayType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.pickerOption,
                        day.dayType === type && styles.pickerOptionSelected,
                      ]}
                      onPress={() => handleChangeWeekDay(day.date, type)}
                    >
                      <Text style={styles.pickerOptionText}>
                        {DAY_LABELS[type].emoji} {DAY_LABELS[type].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderExplanationCard = () => (
    <View style={[styles.card, { backgroundColor: COLORS.info + '10' }]}>
      <View style={styles.explanationHeader}>
        <Ionicons name="information-circle" size={20} color={COLORS.info} />
        <Text style={styles.explanationTitle}>¿Por qué diferentes macros?</Text>
      </View>
      <Text style={styles.explanationText}>
        Los días de entreno tienen más carbohidratos para rendimiento y recuperación. Los días de descanso reducen carbohidratos y aumentan grasas. Los días de refeed elevan carbohidratos para normalizar hormonas.
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Días de Entreno</Text>

      {renderDayTypeSelector()}

      {renderMacroComparison()}

      {renderMacroDistribution()}

      {renderAutoDetect()}

      {renderWeekCalendar()}

      {renderExplanationCard()}

      <TouchableOpacity
        style={[styles.applyButton, { backgroundColor: DAY_TYPE_PRESETS[todayType].color }]}
        onPress={handleApplyToday}
      >
        <Ionicons name="checkmark" size={20} color="#fff" />
        <Text style={styles.applyButtonText}>Aplicar Hoy</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  section: {
    marginBottom: 24,
  },
  selectorContainer: {
    marginBottom: 32,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  dayTypeButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  dayTypeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  dayTypeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  dayTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dayTypeLabelActive: {
    color: COLORS.primary,
  },
  comparisonContainer: {
    marginBottom: 32,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  comparisonTable: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellLabel: {
    minWidth: 100,
    flex: 0.9,
  },
  tableCellText: {
    fontSize: 18,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  tableLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  tableMacroValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'GeistMono',
  },
  tableMacroUnit: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  distributionContainer: {
    marginBottom: 24,
  },
  distributionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  distributionBars: {
    gap: 16,
  },
  distributionItem: {
    gap: 8,
  },
  distributionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distributionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  distributionValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'GeistMono',
  },
  distributionBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '08',
  },
  autoDetectContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoDetectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  autoDetectText: {
    flex: 1,
  },
  autoDetectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  autoDetectDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  weekScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  weekContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  weekDay: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    minWidth: 70,
  },
  weekDayToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  weekDayName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  weekDayBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  weekDayEmoji: {
    fontSize: 20,
  },
  dayTypePickerModal: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    zIndex: 10,
    minWidth: 130,
  },
  pickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.primary + '15',
  },
  pickerOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.info,
  },
  explanationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  bottomSpacing: {
    height: 20,
  },
});
