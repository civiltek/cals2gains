/**
 * Training Plan Screen
 * Plan de comida adaptado al entrenamiento deportivo.
 * Ajusta macros día a día según el tipo de sesión.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { useTrainingPlanStore } from '../store/trainingPlanStore';
import {
  TrainingPlanEngine,
  TrainingSession,
  TrainingSessionType,
  PLAN_TEMPLATES,
  SessionTypeConfig,
} from '../services/trainingPlanEngine';
import { BRAND_FONTS, BRAND_COLORS } from '../theme';

// ============================================================================
// Constants
// ============================================================================

const DAY_LABELS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SESSION_TYPES: TrainingSessionType[] = [
  'rest', 'easy', 'tempo', 'intervals', 'long_run',
  'strength', 'crossfit', 'competition', 'recovery',
];

// ============================================================================
// Sub-components
// ============================================================================

interface MacroDeltaBadgeProps {
  delta: number;
  unit?: string;
  C: ReturnType<typeof useColors>;
}

function MacroDeltaBadge({ delta, unit = 'kcal', C }: MacroDeltaBadgeProps) {
  if (Math.abs(delta) < 5) return null;
  const isPositive = delta > 0;
  return (
    <View style={[
      styles.deltaBadge,
      { backgroundColor: isPositive ? BRAND_COLORS.violet + '22' : BRAND_COLORS.coral + '22' },
    ]}>
      <Text style={[
        styles.deltaBadgeText,
        { color: isPositive ? BRAND_COLORS.violet : BRAND_COLORS.coral, fontFamily: BRAND_FONTS.mono },
      ]}>
        {isPositive ? '+' : ''}{delta}{unit}
      </Text>
    </View>
  );
}

interface DayCardProps {
  dayIndex: number;
  session: TrainingSession | undefined;
  isToday: boolean;
  macroAdjustment: ReturnType<typeof TrainingPlanEngine.adjustMacrosForSession> | null;
  onPress: () => void;
  C: ReturnType<typeof useColors>;
  lang: string;
}

function DayCard({ dayIndex, session, isToday, macroAdjustment, onPress, C, lang }: DayCardProps) {
  const dayLabels = lang === 'es' ? DAY_LABELS_ES : DAY_LABELS_EN;
  const config = session ? TrainingPlanEngine.getSessionConfig(session.type) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.dayCard,
        {
          backgroundColor: isToday ? BRAND_COLORS.violet + '18' : C.card,
          borderColor: isToday ? BRAND_COLORS.violet : C.border,
          borderWidth: isToday ? 1.5 : 1,
        },
      ]}
      activeOpacity={0.7}
    >
      {/* Day label */}
      <Text style={[styles.dayLabel, { color: isToday ? BRAND_COLORS.violet : C.textMuted }]}>
        {dayLabels[dayIndex]}
      </Text>

      {/* Session emoji */}
      <Text style={styles.sessionEmoji}>
        {config ? config.emoji : '➕'}
      </Text>

      {/* Session name */}
      <Text
        style={[styles.sessionName, { color: session ? C.text : C.textMuted }]}
        numberOfLines={2}
      >
        {session
          ? (lang === 'es' ? session.nameEs : session.name)
          : '—'}
      </Text>

      {/* Duration */}
      {session && session.durationMinutes > 0 && (
        <Text style={[styles.sessionDuration, { color: C.textMuted }]}>
          {session.durationMinutes} min
        </Text>
      )}

      {/* Calorie delta */}
      {macroAdjustment && (
        <MacroDeltaBadge delta={macroAdjustment.caloriesDelta} C={C} />
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

export default function TrainingPlanScreen() {
  const C = useColors();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const { user } = useUserStore();
  const {
    plans,
    activePlanId,
    getActivePlan,
    addPlan,
    removePlan,
    setActivePlan,
    addSession,
    removeSession,
    syncCurrentWeek,
  } = useTrainingPlanStore();

  const activePlan = getActivePlan();

  // Tabs: 'week' | 'plan' | 'import'
  const [activeTab, setActiveTab] = useState<'week' | 'plan' | 'import'>('week');

  // Modal: editar sesión de un día
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);

  // Modal: detalle de ajuste de macros del día
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailAdjustment, setDetailAdjustment] = useState<ReturnType<typeof TrainingPlanEngine.adjustMacrosForSession> | null>(null);
  const [detailSession, setDetailSession] = useState<TrainingSession | null>(null);

  // Modal: importar plantilla
  const [importModalVisible, setImportModalVisible] = useState(false);

  // Macros base del usuario
  const baseGoals = useMemo(() => ({
    calories: user?.targetCalories ?? 2000,
    protein: user?.targetProtein ?? 150,
    carbs: user?.targetCarbs ?? 200,
    fat: user?.targetFat ?? 65,
  }), [user]);

  // Semana actual del plan activo
  const currentWeekSessions = useMemo(() => {
    if (!activePlan) return [];
    return TrainingPlanEngine.getCurrentWeekSessions(activePlan);
  }, [activePlan]);

  // Detectar hoy (día de la semana, 0=lunes)
  const todayDayIndex = useMemo(() => {
    const jsDay = new Date().getDay(); // 0=domingo en JS
    return jsDay === 0 ? 6 : jsDay - 1; // convertir a 0=lunes
  }, []);

  // Calcular ajuste de macros para cada día de la semana
  const weekAdjustments = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const session = currentWeekSessions.find(s => s.dayOfWeek === i);
      if (!session) return null;
      return TrainingPlanEngine.adjustMacrosForSession(session, baseGoals);
    });
  }, [currentWeekSessions, baseGoals]);

  const handleDayPress = useCallback((dayIndex: number) => {
    const session = currentWeekSessions.find(s => s.dayOfWeek === dayIndex);
    setSelectedDayIndex(dayIndex);
    setSelectedSession(session ?? null);
    setEditModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [currentWeekSessions]);

  const handleShowDetail = useCallback((dayIndex: number) => {
    const session = currentWeekSessions.find(s => s.dayOfWeek === dayIndex);
    if (!session) return;
    const adj = TrainingPlanEngine.adjustMacrosForSession(session, baseGoals);
    setDetailAdjustment(adj);
    setDetailSession(session);
    setDetailModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [currentWeekSessions, baseGoals]);

  const handleSelectSessionType = useCallback((type: TrainingSessionType) => {
    if (!activePlan) {
      Alert.alert(
        t('trainingPlan.noPlanTitle'),
        t('trainingPlan.noPlanMessage'),
      );
      return;
    }
    const config = TrainingPlanEngine.getSessionConfig(type);
    const session: TrainingSession = {
      id: TrainingPlanEngine.generateSessionId(),
      type,
      name: config.nameEn,
      nameEs: config.nameEs,
      durationMinutes: type === 'rest' || type === 'recovery' ? 0 : 45,
      dayOfWeek: selectedDayIndex as TrainingSession['dayOfWeek'],
    };
    addSession(activePlan.id, activePlan.currentWeek, session);
    setEditModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [activePlan, selectedDayIndex, addSession, t]);

  const handleRemoveSession = useCallback(() => {
    if (!activePlan || !selectedSession) return;
    removeSession(activePlan.id, activePlan.currentWeek, selectedSession.id);
    setEditModalVisible(false);
  }, [activePlan, selectedSession, removeSession]);

  const handleImportTemplate = useCallback((templateIndex: number) => {
    const template = PLAN_TEMPLATES[templateIndex];
    const plan = TrainingPlanEngine.createPlanFromTemplate(template, new Date());
    addPlan(plan);
    setImportModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      t('trainingPlan.planAdded'),
      lang === 'es' ? `"${plan.nameEs}" activado.` : `"${plan.name}" activated.`
    );
  }, [addPlan, t, lang]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: BRAND_FONTS.display }]}>
          {t('trainingPlan.title')}
        </Text>
        <Text style={[styles.headerSub, { color: C.textMuted }]}>
          {activePlan
            ? (lang === 'es' ? activePlan.nameEs : activePlan.name)
            : t('trainingPlan.noPlan')}
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        {(['week', 'plan', 'import'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab ? BRAND_COLORS.violet : C.textMuted },
            ]}>
              {t(`trainingPlan.tab_${tab}`)}
            </Text>
            {activeTab === tab && (
              <View style={[styles.tabIndicator, { backgroundColor: BRAND_COLORS.violet }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── TAB: SEMANA ─────────────────────────────────────── */}
        {activeTab === 'week' && (
          <View style={styles.tabContent}>
            {/* Week label */}
            {activePlan && (
              <Text style={[styles.weekLabel, { color: C.textMuted }]}>
                {t('trainingPlan.week')} {activePlan.currentWeek}/{activePlan.totalWeeks}
              </Text>
            )}

            {/* 7-day grid */}
            <View style={styles.weekGrid}>
              {Array.from({ length: 7 }, (_, i) => {
                const session = currentWeekSessions.find(s => s.dayOfWeek === i);
                const adj = weekAdjustments[i];
                return (
                  <DayCard
                    key={i}
                    dayIndex={i}
                    session={session}
                    isToday={i === todayDayIndex}
                    macroAdjustment={adj}
                    onPress={() => handleDayPress(i)}
                    C={C}
                    lang={lang}
                  />
                );
              })}
            </View>

            {/* Today's macro detail */}
            {weekAdjustments[todayDayIndex] && (
              <TouchableOpacity
                style={[styles.todayCard, { backgroundColor: C.card, borderColor: BRAND_COLORS.violet }]}
                onPress={() => handleShowDetail(todayDayIndex)}
                activeOpacity={0.8}
              >
                <View style={styles.todayCardHeader}>
                  <Ionicons name="nutrition-outline" size={18} color={BRAND_COLORS.violet} />
                  <Text style={[styles.todayCardTitle, { color: C.text }]}>
                    {t('trainingPlan.todayMacros')}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                </View>

                <View style={styles.macroRow}>
                  {[
                    { label: t('trainingPlan.cal'), value: weekAdjustments[todayDayIndex]!.calories, unit: 'kcal', color: BRAND_COLORS.coral },
                    { label: t('trainingPlan.prot'), value: weekAdjustments[todayDayIndex]!.protein, unit: 'g', color: BRAND_COLORS.violet },
                    { label: t('trainingPlan.carbs'), value: weekAdjustments[todayDayIndex]!.carbs, unit: 'g', color: BRAND_COLORS.bone },
                    { label: t('trainingPlan.fat'), value: weekAdjustments[todayDayIndex]!.fat, unit: 'g', color: BRAND_COLORS.orange },
                  ].map((item) => (
                    <View key={item.label} style={styles.macroItem}>
                      <Text style={[styles.macroValue, { color: item.color, fontFamily: BRAND_FONTS.mono }]}>
                        {item.value}
                      </Text>
                      <Text style={[styles.macroUnit, { color: C.textMuted }]}>{item.unit}</Text>
                      <Text style={[styles.macroLabel, { color: C.textMuted }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.todayRationale, { color: C.textMuted }]}>
                  {lang === 'es'
                    ? weekAdjustments[todayDayIndex]!.rationaleEs
                    : weekAdjustments[todayDayIndex]!.rationale}
                </Text>
              </TouchableOpacity>
            )}

            {/* Empty state */}
            {!activePlan && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🏋️</Text>
                <Text style={[styles.emptyTitle, { color: C.text }]}>
                  {t('trainingPlan.emptyTitle')}
                </Text>
                <Text style={[styles.emptyDesc, { color: C.textMuted }]}>
                  {t('trainingPlan.emptyDesc')}
                </Text>
                <TouchableOpacity
                  style={[styles.importBtn, { backgroundColor: BRAND_COLORS.violet }]}
                  onPress={() => setImportModalVisible(true)}
                >
                  <Text style={styles.importBtnText}>{t('trainingPlan.importPlan')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── TAB: PLAN COMPLETO ──────────────────────────────── */}
        {activeTab === 'plan' && (
          <View style={styles.tabContent}>
            {activePlan ? (
              <>
                <View style={[styles.planInfoCard, { backgroundColor: C.card }]}>
                  <Text style={[styles.planInfoName, { color: C.text, fontFamily: BRAND_FONTS.display }]}>
                    {lang === 'es' ? activePlan.nameEs : activePlan.name}
                  </Text>
                  {activePlan.goalEvent && (
                    <Text style={[styles.planInfoGoal, { color: BRAND_COLORS.coral }]}>
                      🎯 {activePlan.goalEvent}
                    </Text>
                  )}
                  <Text style={[styles.planInfoMeta, { color: C.textMuted }]}>
                    {t('trainingPlan.startDate')}: {activePlan.startDate}
                    {'  ·  '}{activePlan.totalWeeks} {t('trainingPlan.weeks')}
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: BRAND_COLORS.violet,
                          width: `${(activePlan.currentWeek / activePlan.totalWeeks) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressLabel, { color: C.textMuted }]}>
                    {t('trainingPlan.week')} {activePlan.currentWeek}/{activePlan.totalWeeks}
                  </Text>
                </View>

                {/* Listado de semanas */}
                {activePlan.weeks.map((week) => (
                  <View key={week.weekNumber} style={[styles.weekSection, { backgroundColor: C.card }]}>
                    <Text style={[styles.weekSectionTitle, { color: C.text }]}>
                      {t('trainingPlan.week')} {week.weekNumber}
                      {week.labelEs && lang === 'es' ? ` — ${week.labelEs}` : week.label ? ` — ${week.label}` : ''}
                    </Text>
                    {week.sessions.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((session) => {
                      const cfg = TrainingPlanEngine.getSessionConfig(session.type);
                      return (
                        <View key={session.id} style={[styles.sessionRow, { borderBottomColor: C.border }]}>
                          <Text style={styles.sessionRowEmoji}>{cfg.emoji}</Text>
                          <View style={styles.sessionRowInfo}>
                            <Text style={[styles.sessionRowDay, { color: C.textMuted }]}>
                              {lang === 'es' ? DAY_LABELS_ES[session.dayOfWeek] : DAY_LABELS_EN[session.dayOfWeek]}
                            </Text>
                            <Text style={[styles.sessionRowName, { color: C.text }]}>
                              {lang === 'es' ? session.nameEs : session.name}
                            </Text>
                          </View>
                          {session.durationMinutes > 0 && (
                            <Text style={[styles.sessionRowDuration, { color: C.textMuted, fontFamily: BRAND_FONTS.mono }]}>
                              {session.durationMinutes}'
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}

                {/* Eliminar plan */}
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: BRAND_COLORS.coral }]}
                  onPress={() => {
                    Alert.alert(
                      t('trainingPlan.deletePlan'),
                      t('trainingPlan.deletePlanConfirm'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.delete'),
                          style: 'destructive',
                          onPress: () => removePlan(activePlan.id),
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color={BRAND_COLORS.coral} />
                  <Text style={[styles.deleteBtnText, { color: BRAND_COLORS.coral }]}>
                    {t('trainingPlan.deletePlan')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={[styles.emptyTitle, { color: C.text }]}>
                  {t('trainingPlan.emptyTitle')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── TAB: IMPORTAR ───────────────────────────────────── */}
        {activeTab === 'import' && (
          <View style={styles.tabContent}>
            <Text style={[styles.importSectionTitle, { color: C.text }]}>
              {t('trainingPlan.templates')}
            </Text>
            <Text style={[styles.importSectionSub, { color: C.textMuted }]}>
              {t('trainingPlan.templatesDesc')}
            </Text>

            {PLAN_TEMPLATES.map((template, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.templateCard, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => {
                  Alert.alert(
                    lang === 'es' ? template.nameEs : template.name,
                    t('trainingPlan.importConfirm'),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('trainingPlan.importBtn'), onPress: () => handleImportTemplate(index) },
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <View style={styles.templateHeader}>
                  <View style={[styles.templateSportBadge, { backgroundColor: BRAND_COLORS.violet + '20' }]}>
                    <Text style={[styles.templateSportText, { color: BRAND_COLORS.violet }]}>
                      {template.sport.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.templateWeeks, { color: C.textMuted }]}>
                    {template.totalWeeks} {t('trainingPlan.weeks')}
                  </Text>
                </View>
                <Text style={[styles.templateName, { color: C.text, fontFamily: BRAND_FONTS.display }]}>
                  {lang === 'es' ? template.nameEs : template.name}
                </Text>
                {template.goalEvent && (
                  <Text style={[styles.templateGoal, { color: BRAND_COLORS.coral }]}>
                    🎯 {template.goalEvent}
                  </Text>
                )}
                <View style={styles.templateSessions}>
                  {template.weeks[0]?.sessions.map((s) => {
                    const cfg = TrainingPlanEngine.getSessionConfig(s.type);
                    return (
                      <Text key={s.id} style={styles.templateSessionEmoji}>{cfg.emoji}</Text>
                    );
                  })}
                </View>
                <View style={[styles.templateImportRow]}>
                  <Text style={[styles.templateImportText, { color: BRAND_COLORS.violet }]}>
                    {t('trainingPlan.importPlan')}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={BRAND_COLORS.violet} />
                </View>
              </TouchableOpacity>
            ))}

            {/* Crear plan manual */}
            <View style={[styles.manualCard, { backgroundColor: C.card, borderColor: BRAND_COLORS.violet + '40' }]}>
              <Ionicons name="create-outline" size={24} color={BRAND_COLORS.violet} />
              <Text style={[styles.manualTitle, { color: C.text }]}>
                {t('trainingPlan.createManual')}
              </Text>
              <Text style={[styles.manualDesc, { color: C.textMuted }]}>
                {t('trainingPlan.createManualDesc')}
              </Text>
              <Text style={[styles.manualHint, { color: C.textMuted }]}>
                {t('trainingPlan.createManualHint')}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ── MODAL: EDITAR SESIÓN DEL DÍA ───────────────────────── */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: C.text, fontFamily: BRAND_FONTS.display }]}>
              {lang === 'es' ? DAY_LABELS_ES[selectedDayIndex] : DAY_LABELS_EN[selectedDayIndex]}
              {' — '}
              {t('trainingPlan.selectSession')}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {SESSION_TYPES.map((type) => {
                const config = TrainingPlanEngine.getSessionConfig(type);
                const isSelected = selectedSession?.type === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.sessionTypeRow,
                      { borderColor: isSelected ? BRAND_COLORS.violet : C.border },
                      isSelected && { backgroundColor: BRAND_COLORS.violet + '15' },
                    ]}
                    onPress={() => handleSelectSessionType(type)}
                  >
                    <Text style={styles.sessionTypeEmoji}>{config.emoji}</Text>
                    <View style={styles.sessionTypeInfo}>
                      <Text style={[styles.sessionTypeName, { color: C.text }]}>
                        {lang === 'es' ? config.nameEs : config.nameEn}
                      </Text>
                      <Text style={[styles.sessionTypeDesc, { color: C.textMuted }]}>
                        {lang === 'es' ? config.descriptionEs : config.descriptionEn}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={BRAND_COLORS.violet} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Eliminar sesión */}
            {selectedSession && (
              <TouchableOpacity style={[styles.removeSessionBtn, { borderColor: BRAND_COLORS.coral }]} onPress={handleRemoveSession}>
                <Ionicons name="trash-outline" size={16} color={BRAND_COLORS.coral} />
                <Text style={[styles.removeSessionText, { color: BRAND_COLORS.coral }]}>
                  {t('trainingPlan.removeSession')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: C.border }]}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={[styles.closeModalText, { color: C.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: DETALLE MACROS DEL DÍA ─────────────────────── */}
      <Modal visible={detailModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.detailSheet, { backgroundColor: C.card }]}>
            {detailSession && detailAdjustment && (
              <>
                <Text style={[styles.detailTitle, { color: C.text, fontFamily: BRAND_FONTS.display }]}>
                  {TrainingPlanEngine.getSessionConfig(detailSession.type).emoji}{' '}
                  {lang === 'es' ? detailSession.nameEs : detailSession.name}
                </Text>

                <Text style={[styles.detailRationale, { color: C.textMuted }]}>
                  {lang === 'es' ? detailAdjustment.rationaleEs : detailAdjustment.rationale}
                </Text>

                {/* Macro comparison table */}
                {[
                  { label: t('trainingPlan.cal'), base: baseGoals.calories, adjusted: detailAdjustment.calories, delta: detailAdjustment.caloriesDelta, unit: 'kcal', color: BRAND_COLORS.coral },
                  { label: t('trainingPlan.prot'), base: baseGoals.protein, adjusted: detailAdjustment.protein, delta: detailAdjustment.proteinDelta, unit: 'g', color: BRAND_COLORS.violet },
                  { label: t('trainingPlan.carbs'), base: baseGoals.carbs, adjusted: detailAdjustment.carbs, delta: detailAdjustment.carbsDelta, unit: 'g', color: BRAND_COLORS.bone },
                  { label: t('trainingPlan.fat'), base: baseGoals.fat, adjusted: detailAdjustment.fat, delta: 0, unit: 'g', color: BRAND_COLORS.orange },
                ].map((row) => (
                  <View key={row.label} style={[styles.detailRow, { borderBottomColor: C.border }]}>
                    <Text style={[styles.detailRowLabel, { color: C.textMuted }]}>{row.label}</Text>
                    <Text style={[styles.detailRowBase, { color: C.textMuted, fontFamily: BRAND_FONTS.mono }]}>
                      {row.base}{row.unit}
                    </Text>
                    <Ionicons name="arrow-forward" size={12} color={C.textMuted} />
                    <Text style={[styles.detailRowAdjusted, { color: row.color, fontFamily: BRAND_FONTS.mono }]}>
                      {row.adjusted}{row.unit}
                    </Text>
                    {Math.abs(row.delta) >= 5 && (
                      <Text style={[
                        styles.detailRowDelta,
                        { color: row.delta > 0 ? BRAND_COLORS.violet : BRAND_COLORS.coral, fontFamily: BRAND_FONTS.mono },
                      ]}>
                        {row.delta > 0 ? '+' : ''}{row.delta}
                      </Text>
                    )}
                  </View>
                ))}
              </>
            )}

            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: BRAND_COLORS.violet, marginTop: 16 }]}
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={[styles.closeModalText, { color: '#fff' }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabActive: {},
  tabLabel: { fontSize: 13, fontWeight: '600' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 1,
  },

  content: { flex: 1 },
  tabContent: { padding: 16 },

  weekLabel: { fontSize: 12, marginBottom: 12, textAlign: 'center' },

  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dayCard: {
    width: '13%',
    minWidth: 44,
    flex: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
  },
  dayLabel: { fontSize: 10, fontWeight: '600' },
  sessionEmoji: { fontSize: 20 },
  sessionName: { fontSize: 9, textAlign: 'center', lineHeight: 12 },
  sessionDuration: { fontSize: 9 },

  deltaBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 2,
  },
  deltaBadgeText: { fontSize: 9, fontWeight: '600' },

  todayCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  todayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayCardTitle: { flex: 1, fontSize: 14, fontWeight: '600' },

  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: { alignItems: 'center', gap: 2 },
  macroValue: { fontSize: 18, fontWeight: '700' },
  macroUnit: { fontSize: 11 },
  macroLabel: { fontSize: 11 },

  todayRationale: { fontSize: 12, lineHeight: 17, fontStyle: 'italic' },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyDesc: { fontSize: 14, textAlign: 'center', maxWidth: 260 },
  importBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  importBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  planInfoCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 6,
  },
  planInfoName: { fontSize: 20, fontWeight: '700' },
  planInfoGoal: { fontSize: 14 },
  planInfoMeta: { fontSize: 12 },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff18',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 11, marginTop: 4 },

  weekSection: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  weekSectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sessionRowEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  sessionRowInfo: { flex: 1 },
  sessionRowDay: { fontSize: 11, marginBottom: 1 },
  sessionRowName: { fontSize: 13, fontWeight: '500' },
  sessionRowDuration: { fontSize: 12 },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 8,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600' },

  importSectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  importSectionSub: { fontSize: 13, marginBottom: 16 },

  templateCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 8,
  },
  templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  templateSportBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  templateSportText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  templateWeeks: { fontSize: 12 },
  templateName: { fontSize: 18, fontWeight: '700' },
  templateGoal: { fontSize: 13 },
  templateSessions: { flexDirection: 'row', gap: 6 },
  templateSessionEmoji: { fontSize: 20 },
  templateImportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  templateImportText: { fontSize: 13, fontWeight: '600' },

  manualCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  manualTitle: { fontSize: 16, fontWeight: '700' },
  manualDesc: { fontSize: 13, textAlign: 'center' },
  manualHint: { fontSize: 12, textAlign: 'center', fontStyle: 'italic' },

  bottomPadding: { height: 48 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000060',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    gap: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff40',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },

  sessionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  sessionTypeEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  sessionTypeInfo: { flex: 1 },
  sessionTypeName: { fontSize: 14, fontWeight: '600' },
  sessionTypeDesc: { fontSize: 12, marginTop: 1 },

  removeSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
  removeSessionText: { fontSize: 14, fontWeight: '600' },

  closeModalBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeModalText: { fontSize: 15, fontWeight: '600' },

  // Detail modal
  detailSheet: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  detailTitle: { fontSize: 18, fontWeight: '700' },
  detailRationale: { fontSize: 13, lineHeight: 18, fontStyle: 'italic', marginBottom: 8 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailRowLabel: { width: 50, fontSize: 13 },
  detailRowBase: { fontSize: 13 },
  detailRowAdjusted: { fontSize: 14, fontWeight: '700' },
  detailRowDelta: { fontSize: 12, marginLeft: 'auto' },
});
