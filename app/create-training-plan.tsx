// ============================================
// Cals2Gains - Create / Edit Training Plan
// ============================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { usePremiumGate } from '../hooks/usePremiumGate';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '../store/themeStore';
import {
  useTrainingPlanStore,
  TrainingDayType,
  TrainingDay,
  MacroPreset,
  DEFAULT_MACRO_PRESETS,
} from '../store/trainingPlanStore';

// ============================================
// CONSTANTS
// ============================================

const DAY_TYPE_ORDER: TrainingDayType[] = ['entreno', 'descanso', 'refeed', 'competicion'];

const DAY_TYPE_CONFIG: Record<TrainingDayType, { label: string; emoji: string; color: string }> = {
  entreno:    { label: 'Entreno',      emoji: '🏋️', color: '#FF6A4D' },
  descanso:   { label: 'Descanso',    emoji: '🛋️', color: '#9C8CFF' },
  refeed:     { label: 'Refeed',      emoji: '🔄', color: '#FFD700' },
  competicion:{ label: 'Competición', emoji: '🏁', color: '#FF9800' },
};

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const EMOJIS = ['🏋️','💪','🏃','🚴','🤸','⚽','🎽','🥊','🧘','🏊','🎯','🔥','⚡','🌟','💥'];

// ============================================
// HELPERS
// ============================================

function makeEmptyWeek(): TrainingDay[] {
  return Array(7).fill(null).map(() => ({ type: 'descanso' as TrainingDayType }));
}

function cycleType(current: TrainingDayType): TrainingDayType {
  const idx = DAY_TYPE_ORDER.indexOf(current);
  return DAY_TYPE_ORDER[(idx + 1) % DAY_TYPE_ORDER.length];
}

// ============================================
// SUB-COMPONENTS
// ============================================

function DayCell({
  day,
  label,
  onPress,
}: {
  day: TrainingDay;
  label: string;
  onPress: () => void;
}) {
  const C = useColors();
  const cfg = DAY_TYPE_CONFIG[day.type];
  return (
    <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', flex: 1 }}>
      <View style={{
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: cfg.color + '25',
        borderWidth: 1.5, borderColor: cfg.color,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 13 }}>{cfg.emoji}</Text>
      </View>
      <Text style={{ fontSize: 9, color: C.textSecondary, marginTop: 2 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function WeekRow({
  weekIndex,
  week,
  onCellPress,
  onRemove,
  canRemove,
}: {
  weekIndex: number;
  week: TrainingDay[];
  onCellPress: (weekIndex: number, dayIndex: number) => void;
  onRemove: (weekIndex: number) => void;
  canRemove: boolean;
}) {
  const C = useColors();
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.textSecondary, flex: 1 }}>
          Semana {weekIndex + 1}
        </Text>
        {canRemove && (
          <TouchableOpacity onPress={() => onRemove(weekIndex)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="remove-circle-outline" size={18} color="#FF453A" />
          </TouchableOpacity>
        )}
      </View>
      <View style={{
        flexDirection: 'row', backgroundColor: C.surface,
        borderRadius: 12, borderWidth: 1, borderColor: C.border,
        padding: 10, gap: 2,
      }}>
        {DAY_LABELS.map((label, dayIdx) => (
          <DayCell
            key={dayIdx}
            label={label}
            day={week[dayIdx] ?? { type: 'descanso' }}
            onPress={() => onCellPress(weekIndex, dayIdx)}
          />
        ))}
      </View>
    </View>
  );
}

function MacroField({
  label,
  value,
  unit,
  color,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  onChange: (v: number) => void;
}) {
  const C = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4, fontWeight: '600' }}>{label}</Text>
      <View style={{
        borderWidth: 1.5, borderColor: color + '60', borderRadius: 10,
        backgroundColor: color + '15', paddingHorizontal: 6, paddingVertical: 4,
        alignItems: 'center', width: '100%',
      }}>
        <TextInput
          style={{ fontSize: 16, fontWeight: '700', color, textAlign: 'center', padding: 0, minWidth: 40 }}
          keyboardType="numeric"
          value={String(value)}
          onChangeText={(t) => {
            const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(n)) onChange(n);
          }}
          selectTextOnFocus
        />
        <Text style={{ fontSize: 9, color, fontWeight: '600' }}>{unit}</Text>
      </View>
    </View>
  );
}

function DayTypePresets({
  dayType,
  preset,
  onChange,
}: {
  dayType: TrainingDayType;
  preset: MacroPreset;
  onChange: (p: MacroPreset) => void;
}) {
  const C = useColors();
  const cfg = DAY_TYPE_CONFIG[dayType];

  const update = (key: keyof MacroPreset, val: number) =>
    onChange({ ...preset, [key]: val });

  return (
    <View style={{
      borderRadius: 14, borderWidth: 1, borderColor: C.border,
      backgroundColor: C.surface, padding: 14, marginBottom: 10,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{cfg.label}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <MacroField label="Calorías" value={preset.calories} unit="kcal" color="#FF6A4D"
          onChange={(v) => update('calories', v)} />
        <MacroField label="Proteína" value={preset.protein} unit="g" color="#9C8CFF"
          onChange={(v) => update('protein', v)} />
        <MacroField label="Carbos" value={preset.carbs} unit="g" color="#FF9800"
          onChange={(v) => update('carbs', v)} />
        <MacroField label="Grasas" value={preset.fat} unit="g" color="#FFD700"
          onChange={(v) => update('fat', v)} />
      </View>
    </View>
  );
}

// ============================================
// SCREEN
// ============================================

export default function CreateTrainingPlanScreen() {
  const isPremium = usePremiumGate();
  if (!isPremium) return null;

  const C = useColors();
  const { planId } = useLocalSearchParams<{ planId?: string }>();

  const { plans, addPlan, updatePlan } = useTrainingPlanStore();

  const existingPlan = planId ? plans.find((p) => p.id === planId) : undefined;
  const isEdit = !!existingPlan;

  // Form state
  const [name, setName] = useState(existingPlan?.name ?? '');
  const [description, setDescription] = useState(existingPlan?.description ?? '');
  const [emoji, setEmoji] = useState(existingPlan?.emoji ?? '🏋️');
  const [weeks, setWeeks] = useState<TrainingDay[][]>(
    existingPlan?.weeks ?? [makeEmptyWeek()]
  );
  const [macroPresets, setMacroPresets] = useState<Record<TrainingDayType, MacroPreset>>(
    existingPlan?.macroPresets ?? { ...DEFAULT_MACRO_PRESETS }
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'days' | 'macros'>('days');

  const handleCellPress = useCallback((weekIndex: number, dayIndex: number) => {
    Haptics.selectionAsync();
    setWeeks((prev) => {
      const next = prev.map((w) => [...w]);
      next[weekIndex][dayIndex] = { type: cycleType(next[weekIndex][dayIndex].type) };
      return next;
    });
  }, []);

  const handleAddWeek = () => {
    setWeeks((prev) => [...prev, makeEmptyWeek()]);
    Haptics.selectionAsync();
  };

  const handleRemoveWeek = (idx: number) => {
    setWeeks((prev) => prev.filter((_, i) => i !== idx));
    Haptics.selectionAsync();
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Nombre requerido', 'Por favor, introduce un nombre para el plan.');
      return;
    }
    if (weeks.length === 0) {
      Alert.alert('Semanas requeridas', 'El plan debe tener al menos una semana.');
      return;
    }

    const data = { name: name.trim(), description: description.trim(), emoji, weeks, macroPresets, isPreset: false };

    if (isEdit && planId) {
      updatePlan(planId, data);
    } else {
      addPlan(data);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const repeatsWeekly = weeks.length === 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: C.text }]}>
            {isEdit ? 'Editar plan' : 'Nuevo plan'}
          </Text>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#FF6A4D' }]} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Guardar</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: C.border }]}>
          {(['days', 'macros'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { borderBottomColor: '#FF6A4D', borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? '#FF6A4D' : C.textSecondary }]}>
                {tab === 'days' ? 'Días' : 'Macros por tipo'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'days' ? (
            <>
              {/* Basic info */}
              <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
                {/* Emoji picker */}
                <TouchableOpacity
                  style={styles.emojiRow}
                  onPress={() => setShowEmojiPicker((v) => !v)}
                >
                  <Text style={{ fontSize: 36 }}>{emoji}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 12, color: C.textSecondary }}>Emoji del plan</Text>
                    <Text style={{ fontSize: 12, color: '#FF6A4D', marginTop: 2 }}>
                      {showEmojiPicker ? 'Cerrar' : 'Cambiar'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {showEmojiPicker && (
                  <View style={styles.emojiGrid}>
                    {EMOJIS.map((e) => (
                      <TouchableOpacity
                        key={e}
                        onPress={() => { setEmoji(e); setShowEmojiPicker(false); }}
                        style={[styles.emojiOption, emoji === e && { backgroundColor: '#FF6A4D20' }]}
                      >
                        <Text style={{ fontSize: 24 }}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.divider} />

                {/* Name */}
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Nombre</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: C.text, borderColor: C.border }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ej: Mi plan personalizado"
                    placeholderTextColor={C.textMuted}
                    maxLength={50}
                  />
                </View>

                {/* Description */}
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Descripción</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: C.text, borderColor: C.border, height: 60 }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe brevemente el plan..."
                    placeholderTextColor={C.textMuted}
                    multiline
                    maxLength={150}
                  />
                </View>
              </View>

              {/* Legend */}
              <View style={[styles.legend, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[styles.legendTitle, { color: C.textSecondary }]}>Toca cada día para cambiar el tipo</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  {DAY_TYPE_ORDER.map((t) => {
                    const cfg = DAY_TYPE_CONFIG[t];
                    return (
                      <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 14 }}>{cfg.emoji}</Text>
                        <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>{cfg.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Week mode info */}
              <Text style={[styles.sectionTitle, { color: C.text }]}>
                Semanas
                <Text style={{ color: C.textSecondary, fontSize: 12, fontWeight: '400' }}>
                  {repeatsWeekly ? '  (se repite semanalmente)' : `  (${weeks.length} semanas en total)`}
                </Text>
              </Text>

              {/* Week rows */}
              {weeks.map((week, weekIdx) => (
                <WeekRow
                  key={weekIdx}
                  weekIndex={weekIdx}
                  week={week}
                  onCellPress={handleCellPress}
                  onRemove={handleRemoveWeek}
                  canRemove={weeks.length > 1}
                />
              ))}

              {/* Add week */}
              <TouchableOpacity
                style={[styles.addWeekBtn, { borderColor: '#FF6A4D' }]}
                onPress={handleAddWeek}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FF6A4D" />
                <Text style={{ fontSize: 14, color: '#FF6A4D', fontWeight: '600' }}>Añadir semana</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: C.text }]}>Objetivos de macros por tipo de día</Text>
              <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16, lineHeight: 18 }}>
                Cuando este plan esté activo, los objetivos del día de inicio se ajustarán automáticamente según el tipo de día.
              </Text>
              {DAY_TYPE_ORDER.map((dayType) => (
                <DayTypePresets
                  key={dayType}
                  dayType={dayType}
                  preset={macroPresets[dayType]}
                  onChange={(p) => setMacroPresets((prev) => ({ ...prev, [dayType]: p }))}
                />
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '700' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  tabs: {
    flexDirection: 'row', borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 8 },
  tabText: { fontSize: 14, fontWeight: '600' },
  section: {
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16,
  },
  emojiRow: { flexDirection: 'row', alignItems: 'center' },
  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 12,
  },
  emojiOption: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10,
  },
  divider: { height: 1, backgroundColor: 'rgba(128,128,128,0.15)', marginVertical: 12 },
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1, borderRadius: 10, padding: 10,
    fontSize: 15, textAlignVertical: 'top',
  },
  legend: {
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16,
  },
  legendTitle: { fontSize: 12, fontWeight: '600' },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 4,
  },
  addWeekBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14,
    padding: 14, marginTop: 4,
  },
});
