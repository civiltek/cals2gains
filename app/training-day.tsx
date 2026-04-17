import React, { useState, useEffect, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import { PersonalEngine, QuickAction } from '../services/personalEngine';
import { format } from 'date-fns';

// Mock store imports
import { useUserStore } from '../store/userStore';
import { useTrainingPlanStore } from '../store/trainingPlanStore';

const { width } = Dimensions.get('window');

type DayType = 'entreno' | 'descanso' | 'refeed' | 'competicion';

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

// DAY_TYPE_PRESETS will be created inside component with access to theme colors
const BASE_DAY_TYPE_PRESETS = {
  entreno: {
    type: 'entreno' as DayType,
    calories: 2800,
    protein: 160,
    carbs: 380,
    fat: 65,
  },
  descanso: {
    type: 'descanso' as DayType,
    calories: 2500,
    protein: 160,
    carbs: 250,
    fat: 85,
  },
  refeed: {
    type: 'refeed' as DayType,
    calories: 3100,
    protein: 150,
    carbs: 450,
    fat: 60,
  },
  competicion: {
    type: 'competicion' as DayType,
    calories: 2600,
    protein: 140,
    carbs: 350,
    fat: 60,
  },
};

// DAY_LABELS will be created inside component with access to t() for translations
const BASE_DAY_LABELS: Record<DayType, { emoji: string; icon: string }> = {
  entreno: { emoji: '🏋️', icon: 'barbell' },
  descanso: { emoji: '🛋️', icon: 'bed' },
  refeed: { emoji: '🔄', icon: 'refresh' },
  competicion: { emoji: '🏁', icon: 'flag' },
};

export default function TrainingDay() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(C), [C]);

  // Build DAY_LABELS with translations
  const DAY_LABELS: Record<DayType, { label: string; emoji: string; icon: string }> = useMemo(() => ({
    entreno:     { label: t('trainingDay.dayTypeTraining'),     emoji: BASE_DAY_LABELS.entreno.emoji,     icon: BASE_DAY_LABELS.entreno.icon },
    descanso:    { label: t('trainingDay.dayTypeRest'),         emoji: BASE_DAY_LABELS.descanso.emoji,    icon: BASE_DAY_LABELS.descanso.icon },
    refeed:      { label: t('trainingDay.dayTypeRefeed'),       emoji: BASE_DAY_LABELS.refeed.emoji,      icon: BASE_DAY_LABELS.refeed.icon },
    competicion: { label: 'Competición',                        emoji: BASE_DAY_LABELS.competicion.emoji, icon: BASE_DAY_LABELS.competicion.icon },
  }), [t]);

  // Build DAY_TYPE_PRESETS with theme colors
  const DAY_TYPE_PRESETS: Record<DayType, DayTypeGoals> = useMemo(() => ({
    entreno:     { ...BASE_DAY_TYPE_PRESETS.entreno,     color: C.primary },
    descanso:    { ...BASE_DAY_TYPE_PRESETS.descanso,    color: C.info },
    refeed:      { ...BASE_DAY_TYPE_PRESETS.refeed,      color: C.success },
    competicion: { ...BASE_DAY_TYPE_PRESETS.competicion, color: '#FF9800' },
  }), [C.primary, C.info, C.success]);

  // Read active training plan for today
  const getTodayTrainingInfo = useTrainingPlanStore((s) => s.getTodayInfo);
  const todayTrainingInfo = getTodayTrainingInfo();
  const planDayType = todayTrainingInfo?.dayType as DayType | undefined;
  const planMacros = todayTrainingInfo?.macros;

  const [todayType, setTodayType] = useState<DayType>(planDayType ?? 'entreno');
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [autoDetect, setAutoDetect] = useState(false);
  const [selectedDayForEdit, setSelectedDayForEdit] = useState<string | null>(null);
  const [gymActions, setGymActions] = useState<QuickAction[]>([]);

  useEffect(() => {
    // Generate week days
    const today = new Date();
    const week: WeekDay[] = [];
    for (let i = -2; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dayNames = [t('trainingDay.sun'), t('trainingDay.mon'), t('trainingDay.tue'), t('trainingDay.wed'), t('trainingDay.thu'), t('trainingDay.fri'), t('trainingDay.sat')];
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

  // PersonalEngine: gym flow suggestions based on day type + time of day
  useEffect(() => {
    try {
      const dayTypeMap: Record<DayType, 'training' | 'rest' | 'light'> = {
        entreno: 'training',
        descanso: 'rest',
        refeed: 'light',
        competicion: 'training',
      };
      const timeStr = format(new Date(), 'HH:mm');
      const actions = PersonalEngine.getGymFlowSuggestions(dayTypeMap[todayType], timeStr);
      setGymActions(actions);
    } catch (err) {
      console.warn('PersonalEngine gym flow error:', err);
    }
  }, [todayType]);

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
      t('trainingDay.goalsUpdated'),
      `${t('trainingDay.todayType')}: ${DAY_LABELS[todayType].label}\n\n${t('trainingDay.calories')}: ${goalData.calories}\n${t('trainingDay.protein')}: ${goalData.protein}g\n${t('trainingDay.carbohydrates')}: ${goalData.carbs}g\n${t('trainingDay.fats')}: ${goalData.fat}g`,
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
      <Text style={styles.selectorLabel}>{t('trainingDay.todayType')}</Text>
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
      <Text style={styles.comparisonTitle}>{t('trainingDay.macroComparison')}</Text>

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
            <Text style={styles.tableLabelText}>{t('trainingDay.calories')}</Text>
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
            <Text style={styles.tableLabelText}>{t('trainingDay.protein')}</Text>
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
            <Text style={styles.tableLabelText}>{t('trainingDay.carbohydrates')}</Text>
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
            <Text style={styles.tableLabelText}>{t('trainingDay.fats')}</Text>
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
      <Text style={styles.distributionTitle}>{t('trainingDay.macroDistribution', { type: DAY_LABELS[todayType].label })}</Text>

      <View style={styles.distributionBars}>
        {/* Protein */}
        <View style={styles.distributionItem}>
          <View style={styles.distributionLabelRow}>
            <Text style={styles.distributionLabel}>{t('trainingDay.protein')}</Text>
            <Text style={styles.distributionValue}>
              {DAY_TYPE_PRESETS[todayType].protein}g ({Math.round((DAY_TYPE_PRESETS[todayType].protein * 4) / DAY_TYPE_PRESETS[todayType].calories * 100)}%)
            </Text>
          </View>
          <View style={[styles.distributionBarBg, { backgroundColor: C.border }]}>
            <View
              style={[
                styles.distributionBarFill,
                {
                  width: `${Math.round((DAY_TYPE_PRESETS[todayType].protein * 4) / DAY_TYPE_PRESETS[todayType].calories * 100)}%`,
                  backgroundColor: '#9C8CFF',
                },
              ]}
            />
          </View>
        </View>

        {/* Carbs */}
        <View style={styles.distributionItem}>
          <View style={styles.distributionLabelRow}>
            <Text style={styles.distributionLabel}>{t('trainingDay.carbohydrates')}</Text>
            <Text style={styles.distributionValue}>
              {DAY_TYPE_PRESETS[todayType].carbs}g ({Math.round((DAY_TYPE_PRESETS[todayType].carbs * 4) / DAY_TYPE_PRESETS[todayType].calories * 100)}%)
            </Text>
          </View>
          <View style={[styles.distributionBarBg, { backgroundColor: C.border }]}>
            <View
              style={[
                styles.distributionBarFill,
                {
                  width: `${Math.round((DAY_TYPE_PRESETS[todayType].carbs * 4) / DAY_TYPE_PRESETS[todayType].calories * 100)}%`,
                  backgroundColor: '#4ADE80',
                },
              ]}
            />
          </View>
        </View>

        {/* Fat */}
        <View style={styles.distributionItem}>
          <View style={styles.distributionLabelRow}>
            <Text style={styles.distributionLabel}>{t('trainingDay.fats')}</Text>
            <Text style={styles.distributionValue}>
              {DAY_TYPE_PRESETS[todayType].fat}g ({Math.round((DAY_TYPE_PRESETS[todayType].fat * 9) / DAY_TYPE_PRESETS[todayType].calories * 100)}%)
            </Text>
          </View>
          <View style={[styles.distributionBarBg, { backgroundColor: C.border }]}>
            <View
              style={[
                styles.distributionBarFill,
                {
                  width: `${Math.round((DAY_TYPE_PRESETS[todayType].fat * 9) / DAY_TYPE_PRESETS[todayType].calories * 100)}%`,
                  backgroundColor: '#FFA726',
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
            name={(autoDetect ? 'checkmark-circle' : 'circle-outline') as any}
            size={24}
            color={autoDetect ? C.success : C.textSecondary}
          />
          <View style={styles.autoDetectText}>
            <Text style={styles.autoDetectTitle}>{t('trainingDay.autoDetect')}</Text>
            <Text style={styles.autoDetectDesc}>{t('trainingDay.autoDetectDesc')}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderWeekCalendar = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('trainingDay.week')}</Text>
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
    <View style={[styles.card, { backgroundColor: C.info + '10' }]}>
      <View style={styles.explanationHeader}>
        <Ionicons name="information-circle" size={20} color={C.info} />
        <Text style={styles.explanationTitle}>{t('trainingDay.whyDifferent')}</Text>
      </View>
      <Text style={styles.explanationText}>
        {t('trainingDay.whyExplanation')}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t('trainingDay.title')}</Text>

      {/* Active plan banner */}
      {todayTrainingInfo && (
        <View style={[styles.card, { backgroundColor: '#FF6A4D15', borderColor: '#FF6A4D40', borderWidth: 1, marginBottom: 12 }]}>
          <Text style={{ fontSize: 12, color: '#FF6A4D', fontWeight: '700', marginBottom: 2 }}>
            📋 {todayTrainingInfo.plan.name}
          </Text>
          <Text style={{ fontSize: 13, color: C.text }}>
            Día {todayTrainingInfo.dayNumber} de {todayTrainingInfo.totalDays} · {todayTrainingInfo.daysRemaining} días restantes
          </Text>
          {planMacros && (
            <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 4 }}>
              Objetivo del plan: {planMacros.calories} kcal · {planMacros.protein}g prot
            </Text>
          )}
        </View>
      )}

      {renderDayTypeSelector()}

      {renderMacroComparison()}

      {renderMacroDistribution()}

      {/* PersonalEngine Gym Flow Quick Actions */}
      {gymActions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('trainingDay.quickActions')}</Text>
          <View style={styles.gymActionsRow}>
            {gymActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.gymActionCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[styles.gymActionIcon, { backgroundColor: C.primary + '15' }]}>
                  <Ionicons name={(action.icon || 'flash') as any} size={20} color={C.primary} />
                </View>
                <Text style={styles.gymActionLabel}>{
                  action.id === 'preworkout_carbs' ? t('trainingDay.gymPreWorkout') :
                  action.id === 'postworkout_protein' ? t('trainingDay.gymPostWorkout') :
                  action.id === 'water_reminder' ? t('trainingDay.gymWaterReminder') :
                  action.label
                }</Text>
                {action.suggestedCalories && (
                  <Text style={styles.gymActionCal}>~{action.suggestedCalories} kcal</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {renderAutoDetect()}

      {renderWeekCalendar()}

      {renderExplanationCard()}

      <TouchableOpacity
        style={[styles.applyButton, { backgroundColor: DAY_TYPE_PRESETS[todayType].color }]}
        onPress={handleApplyToday}
      >
        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        <Text style={styles.applyButtonText}>{t('trainingDay.applyToday')}</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: C.text,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: C.text,
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
      color: C.textSecondary,
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
      borderColor: C.border,
      alignItems: 'center',
      backgroundColor: C.surface,
    },
    dayTypeButtonActive: {
      borderColor: C.primary,
      backgroundColor: C.primary + '10',
    },
    dayTypeEmoji: {
      fontSize: 32,
      marginBottom: 8,
    },
    dayTypeLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: C.textSecondary,
    },
    dayTypeLabelActive: {
      color: C.primary,
    },
    comparisonContainer: {
      marginBottom: 32,
    },
    comparisonTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: C.text,
      marginBottom: 16,
    },
    comparisonTable: {
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: C.surfaceSecondary || C.surface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: C.border,
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
      color: C.text,
    },
    tableLabelText: {
      fontSize: 12,
      fontWeight: '600',
      color: C.text,
    },
    tableMacroValue: {
      fontSize: 16,
      fontWeight: '700',
      fontFamily: 'GeistMono',
    },
    tableMacroUnit: {
      fontSize: 9,
      color: C.textSecondary,
      marginTop: 2,
    },
    distributionContainer: {
      marginBottom: 24,
    },
    distributionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: C.text,
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
      color: C.text,
    },
    distributionValue: {
      fontSize: 12,
      color: C.textSecondary,
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
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    cardActive: {
      borderColor: C.success,
      backgroundColor: C.success + '08',
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
      color: C.text,
    },
    autoDetectDesc: {
      fontSize: 12,
      color: C.textSecondary,
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
      borderColor: C.border,
      backgroundColor: C.surface,
      minWidth: 70,
    },
    weekDayToday: {
      borderWidth: 2,
      borderColor: C.primary,
      backgroundColor: C.primary + '08',
    },
    weekDayName: {
      fontSize: 11,
      fontWeight: '600',
      color: C.textSecondary,
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
      backgroundColor: C.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      zIndex: 10,
      minWidth: 130,
    },
    pickerOption: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    pickerOptionSelected: {
      backgroundColor: C.primary + '15',
    },
    pickerOptionText: {
      fontSize: 12,
      fontWeight: '600',
      color: C.text,
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
      color: C.info,
    },
    explanationText: {
      fontSize: 12,
      color: C.textSecondary,
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
      color: '#FFFFFF',
    },
    gymActionsRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    gymActionCard: {
      flex: 1,
      minWidth: 100,
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    gymActionIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    gymActionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: C.text,
      textAlign: 'center',
    },
    gymActionCal: {
      fontSize: 11,
      color: C.textSecondary,
    },
    bottomSpacing: {
      height: 20,
    },
  });
}
