// ============================================
// Cals2Gains - Training Plans Screen
// ============================================
// Lists all training plans (presets + custom), allows activating one
// and navigating to create/edit.

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '../store/themeStore';
import { usePremiumGate } from '../hooks/usePremiumGate';
import { useTrainingPlanStore, TrainingPlan, TrainingDayType } from '../store/trainingPlanStore';

// ============================================
// HELPERS
// ============================================

const DAY_TYPE_CONFIG: Record<TrainingDayType, { label: string; emoji: string; color: string }> = {
  entreno:    { label: 'Entreno',     emoji: '🏋️', color: '#FF6A4D' },
  descanso:   { label: 'Descanso',   emoji: '🛋️', color: '#9C8CFF' },
  refeed:     { label: 'Refeed',     emoji: '🔄', color: '#FFD700' },
  competicion:{ label: 'Competición',emoji: '🏁', color: '#FF9800' },
};

function WeekPreview({ weeks }: { weeks: TrainingPlan['weeks'] }) {
  const C = useColors();
  // Show first week as representative
  const week = weeks[0] ?? [];
  const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
      {DAY_LABELS.map((label, i) => {
        const day = week[i];
        const cfg = day ? DAY_TYPE_CONFIG[day.type] : null;
        return (
          <View key={i} style={{ alignItems: 'center', flex: 1 }}>
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: cfg ? cfg.color + '30' : C.border,
              borderWidth: 1.5,
              borderColor: cfg ? cfg.color : C.border,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 11 }}>{cfg?.emoji ?? '—'}</Text>
            </View>
            <Text style={{ fontSize: 9, color: C.textSecondary, marginTop: 2 }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function PlanCard({
  plan,
  isActive,
  onActivate,
  onEdit,
  onDelete,
}: {
  plan: TrainingPlan;
  isActive: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const C = useColors();
  const totalDays = plan.weeks.length * 7;
  const totalWeeks = plan.weeks.length;

  return (
    <View style={[styles.card, {
      backgroundColor: C.surface,
      borderColor: isActive ? '#FF6A4D' : C.border,
      borderWidth: isActive ? 2 : 1,
    }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={{ fontSize: 28 }}>{plan.emoji}</Text>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{plan.name}</Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVO</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardDesc, { color: C.textSecondary }]} numberOfLines={2}>
            {plan.description}
          </Text>
          <Text style={[styles.cardMeta, { color: C.textSecondary }]}>
            {totalWeeks === 1 ? 'Se repite semanalmente' : `${totalWeeks} semanas · ${totalDays} días`}
          </Text>
        </View>
      </View>

      {/* Week preview */}
      <WeekPreview weeks={plan.weeks} />

      {/* Actions */}
      <View style={styles.cardActions}>
        {isActive ? (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF6A4D20', borderColor: '#FF6A4D50' }]}
            onPress={onActivate}>
            <Ionicons name="stop-circle-outline" size={16} color="#FF6A4D" />
            <Text style={[styles.actionBtnText, { color: '#FF6A4D' }]}>Desactivar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF6A4D', borderColor: '#FF6A4D' }]}
            onPress={onActivate}>
            <Ionicons name="play-circle-outline" size={16} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Activar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.border + '40', borderColor: C.border }]}
          onPress={onEdit}>
          <Ionicons name="pencil-outline" size={16} color={C.textSecondary} />
          <Text style={[styles.actionBtnText, { color: C.textSecondary }]}>Editar</Text>
        </TouchableOpacity>
        {!plan.isPreset && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF453A20', borderColor: '#FF453A50' }]}
            onPress={onDelete}>
            <Ionicons name="trash-outline" size={16} color="#FF453A" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================
// SCREEN
// ============================================

export default function TrainingPlansScreen() {
  const isPremium = usePremiumGate();
  if (!isPremium) return null;

  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const { plans, activePlan, activatePlan, deactivatePlan, deletePlan } = useTrainingPlanStore();

  const handleActivate = (plan: TrainingPlan) => {
    if (activePlan?.planId === plan.id) {
      Alert.alert(
        'Desactivar plan',
        `¿Desactivar "${plan.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desactivar', style: 'destructive',
            onPress: () => { deactivatePlan(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
          },
        ]
      );
    } else {
      Alert.alert(
        'Activar plan',
        `¿Activar "${plan.name}" desde hoy?${activePlan ? '\n\nSe desactivará el plan actual.' : ''}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Activar',
            onPress: () => {
              activatePlan(plan.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    }
  };

  const handleDelete = (plan: TrainingPlan) => {
    Alert.alert(
      'Eliminar plan',
      `¿Eliminar "${plan.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: () => { deletePlan(plan.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); },
        },
      ]
    );
  };

  const presetPlans = plans.filter((p) => p.isPreset);
  const customPlans = plans.filter((p) => !p.isPreset);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.text }]}>Planes de entrenamiento</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: '#FF6A4D' }]}
          onPress={() => router.push('/create-training-plan')}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Legend */}
        <View style={[styles.legend, { backgroundColor: C.surface, borderColor: C.border }]}>
          {Object.entries(DAY_TYPE_CONFIG).map(([type, cfg]) => (
            <View key={type} style={styles.legendItem}>
              <Text style={{ fontSize: 14 }}>{cfg.emoji}</Text>
              <Text style={[styles.legendLabel, { color: C.textSecondary }]}>{cfg.label}</Text>
            </View>
          ))}
        </View>

        {/* Custom plans */}
        {customPlans.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Mis planes</Text>
            {customPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isActive={activePlan?.planId === plan.id}
                onActivate={() => handleActivate(plan)}
                onEdit={() => router.push({ pathname: '/create-training-plan', params: { planId: plan.id } })}
                onDelete={() => handleDelete(plan)}
              />
            ))}
          </>
        )}

        {/* Preset plans */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>Planes predefinidos</Text>
        {presetPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isActive={activePlan?.planId === plan.id}
            onActivate={() => handleActivate(plan)}
            onEdit={() => router.push({ pathname: '/create-training-plan', params: { planId: plan.id } })}
            onDelete={() => handleDelete(plan)}
          />
        ))}

        {/* Create new */}
        <TouchableOpacity
          style={[styles.createCard, { borderColor: '#FF6A4D', backgroundColor: '#FF6A4D10' }]}
          onPress={() => router.push('/create-training-plan')}
        >
          <Ionicons name="add-circle-outline" size={28} color="#FF6A4D" />
          <Text style={[styles.createCardText, { color: '#FF6A4D' }]}>Crear plan personalizado</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12, gap: 12,
    },
    backBtn: { padding: 4 },
    title: { flex: 1, fontSize: 20, fontWeight: '700' },
    newBtn: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 16,
    },
    legend: {
      flexDirection: 'row', borderRadius: 12, borderWidth: 1,
      padding: 12, gap: 4, justifyContent: 'space-around',
    },
    legendItem: { alignItems: 'center', gap: 2 },
    legendLabel: { fontSize: 10, fontWeight: '500' },
    card: {
      borderRadius: 16, padding: 14, marginBottom: 12,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    cardTitle: { fontSize: 16, fontWeight: '700' },
    cardDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
    cardMeta: { fontSize: 11, marginTop: 4, fontWeight: '500' },
    activeBadge: {
      backgroundColor: '#FF6A4D', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    },
    activeBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1,
    },
    actionBtnText: { fontSize: 13, fontWeight: '600' },
    createCard: {
      borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16,
      padding: 20, alignItems: 'center', gap: 8, marginTop: 8,
    },
    createCardText: { fontSize: 15, fontWeight: '600' },
  });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '700' },
  newBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 16 },
  legend: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 12, gap: 4, justifyContent: 'space-around' },
  legendItem: { alignItems: 'center', gap: 2 },
  legendLabel: { fontSize: 10, fontWeight: '500' },
  card: { borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  cardMeta: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  activeBadge: { backgroundColor: '#FF6A4D', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  activeBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  createCard: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, marginTop: 8 },
  createCardText: { fontSize: 15, fontWeight: '600' },
});
