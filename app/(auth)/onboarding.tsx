// ============================================
// Cals2Gains - Enhanced Onboarding (7 Steps)
// ============================================
import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  Dimensions, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../../store/userStore';
import { calculateGoalsFromPreset, getPresetById, MACRO_PRESETS } from '../../constants/macroPresets';

const { width: SW } = Dimensions.get('window');
const C = {
  bg: '#17121D', card: '#1E1829', violet: '#9C8CFF', coral: '#FF6A4D',
  bone: '#F7F2EA', sec: 'rgba(247,242,234,0.6)', ter: 'rgba(247,242,234,0.35)',
  border: 'rgba(156,140,255,0.15)', success: '#4ADE80',
};

const TOTAL_STEPS = 7;
const GENDERS = [
  { id: 'male', label: 'Hombre', icon: 'male-outline' },
  { id: 'female', label: 'Mujer', icon: 'female-outline' },
];
const GOALS = [
  { id: 'lose_weight', label: 'Perder grasa', icon: 'trending-down', desc: 'Deficit calorico controlado' },
  { id: 'gain_muscle', label: 'Ganar musculo', icon: 'barbell-outline', desc: 'Superavit con alto proteina' },
  { id: 'recomposition', label: 'Recomposicion', icon: 'swap-horizontal-outline', desc: 'Perder grasa y ganar musculo' },
  { id: 'improve_health', label: 'Mejorar salud', icon: 'heart-outline', desc: 'Mantenimiento equilibrado' },
];
const RATES = [
  { id: 'slow', label: 'Lento', desc: '~0.25 kg/sem', kcal: 250 },
  { id: 'moderate', label: 'Moderado', desc: '~0.5 kg/sem', kcal: 500 },
  { id: 'fast', label: 'Rapido', desc: '~0.75 kg/sem', kcal: 750 },
];
const ACTIVITIES = [
  { id: 'sedentary', label: 'Sedentario', mult: 1.2, desc: 'Oficina, poco movimiento' },
  { id: 'light', label: 'Ligero', mult: 1.375, desc: '1-3 dias ejercicio/sem' },
  { id: 'moderate', label: 'Moderado', mult: 1.55, desc: '3-5 dias ejercicio/sem' },
  { id: 'active', label: 'Activo', mult: 1.725, desc: '6-7 dias ejercicio/sem' },
  { id: 'very_active', label: 'Muy activo', mult: 1.9, desc: 'Atleta o trabajo fisico' },
];
const EXPERIENCE = [
  { id: 'beginner', label: 'Principiante', desc: '<1 ano entrenando' },
  { id: 'intermediate', label: 'Intermedio', desc: '1-3 anos entrenando' },
  { id: 'advanced', label: 'Avanzado', desc: '>3 anos entrenando' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { updateProfile, completeOnboarding } = useUserStore();
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic info
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('');

  // Step 2: Body composition
  const [bodyFat, setBodyFat] = useState('');
  const [experience, setExperience] = useState('');
  const [trainingDays, setTrainingDays] = useState('4');

  // Step 3: Goal
  const [goal, setGoal] = useState('');
  const [rate, setRate] = useState('moderate');
  const [targetWeight, setTargetWeight] = useState('');

  // Step 4: Activity
  const [activity, setActivity] = useState('');

  // Step 5: Macro preset
  const [preset, setPreset] = useState('balanced');

  // Step 6: Health integration (simplified - no native modules)
  const [healthConnected, setHealthConnected] = useState(false);

  // Navigation
  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  const goBack = () => {
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  // Calculations
  const numWeight = parseFloat(weight) || 70;
  const numHeight = parseFloat(height) || 170;
  const numAge = parseInt(age) || 25;

  const bmr = gender === 'female'
    ? 10 * numWeight + 6.25 * numHeight - 5 * numAge - 161
    : 10 * numWeight + 6.25 * numHeight - 5 * numAge + 5;

  const actMult = ACTIVITIES.find(a => a.id === activity)?.mult || 1.55;
  const tdee = Math.round(bmr * actMult);

  const rateKcal = RATES.find(r => r.id === rate)?.kcal || 500;
  const goalCalories = goal === 'lose_weight' ? tdee - rateKcal
    : goal === 'gain_muscle' ? tdee + Math.round(rateKcal * 0.6)
    : goal === 'recomposition' ? tdee - 100
    : tdee;

  const proteinMin = (goal === 'gain_muscle' || experience === 'advanced') ? 2.0 : 1.6;
  const macros = calculateGoalsFromPreset(preset, Math.max(1200, goalCalories));
  const adjustedProtein = Math.max(macros.protein, Math.round(numWeight * proteinMin));

  // Finish onboarding
  const handleFinish = async () => {
    setLoading(true);
    try {
      await updateProfile({
        age: numAge, weight: numWeight, height: numHeight, gender,
        goal, activityLevel: activity,
        calorieGoal: Math.max(1200, goalCalories),
        proteinGoal: adjustedProtein,
        carbGoal: macros.carbs,
        fatGoal: macros.fat,
      });
      await completeOnboarding();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar tu perfil');
    } finally {
      setLoading(false);
    }
  };

  // Validation per step
  const canProceed = () => {
    switch (step) {
      case 0: return age && weight && height && gender;
      case 1: return experience;
      case 2: return goal;
      case 3: return activity;
      case 4: return preset;
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  };

  // ============================================
  // STEP RENDERERS
  // ============================================

  const renderStep0 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Datos basicos</Text>
      <Text style={s.stepDesc}>Para calcular tus necesidades calorias</Text>

      <Text style={s.label}>Genero</Text>
      <View style={s.optionRow}>
        {GENDERS.map(g => (
          <TouchableOpacity key={g.id} style={[s.optionCard, gender === g.id && s.optionActive]}
            onPress={() => setGender(g.id)}>
            <Ionicons name={g.icon as any} size={24} color={gender === g.id ? C.bone : C.sec} />
            <Text style={[s.optionLabel, gender === g.id && s.optionLabelActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Edad</Text>
      <TextInput style={s.input} placeholder="25" placeholderTextColor={C.ter}
        value={age} onChangeText={setAge} keyboardType="number-pad" />

      <View style={s.inputRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Peso (kg)</Text>
          <TextInput style={s.input} placeholder="75" placeholderTextColor={C.ter}
            value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Altura (cm)</Text>
          <TextInput style={s.input} placeholder="175" placeholderTextColor={C.ter}
            value={height} onChangeText={setHeight} keyboardType="number-pad" />
        </View>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Composicion corporal</Text>
      <Text style={s.stepDesc}>Para ajustar mejor tus macros</Text>

      <Text style={s.label}>Experiencia de entrenamiento</Text>
      {EXPERIENCE.map(e => (
        <TouchableOpacity key={e.id} style={[s.listOption, experience === e.id && s.listOptionActive]}
          onPress={() => setExperience(e.id)}>
          <View>
            <Text style={[s.listOptionTitle, experience === e.id && { color: C.bone }]}>{e.label}</Text>
            <Text style={s.listOptionDesc}>{e.desc}</Text>
          </View>
          {experience === e.id && <Ionicons name="checkmark-circle" size={22} color={C.violet} />}
        </TouchableOpacity>
      ))}

      <Text style={s.label}>Dias de entrenamiento / semana</Text>
      <View style={s.optionRow}>
        {['2','3','4','5','6'].map(d => (
          <TouchableOpacity key={d} style={[s.dayBtn, trainingDays === d && s.dayBtnActive]}
            onPress={() => setTrainingDays(d)}>
            <Text style={[s.dayTxt, trainingDays === d && { color: C.bone }]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>% Grasa corporal (opcional)</Text>
      <TextInput style={s.input} placeholder="Ej: 18" placeholderTextColor={C.ter}
        value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" />
    </View>
  );

  const renderStep2 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Tu objetivo</Text>
      <Text style={s.stepDesc}>Elegimos la estrategia adecuada</Text>

      {GOALS.map(g => (
        <TouchableOpacity key={g.id} style={[s.goalCard, goal === g.id && s.goalCardActive]}
          onPress={() => setGoal(g.id)}>
          <View style={[s.goalIcon, goal === g.id && { backgroundColor: `${C.violet}30` }]}>
            <Ionicons name={g.icon as any} size={24} color={goal === g.id ? C.violet : C.sec} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.goalTitle, goal === g.id && { color: C.bone }]}>{g.label}</Text>
            <Text style={s.goalDesc}>{g.desc}</Text>
          </View>
          {goal === g.id && <Ionicons name="checkmark-circle" size={22} color={C.violet} />}
        </TouchableOpacity>
      ))}

      {(goal === 'lose_weight' || goal === 'gain_muscle') && (
        <>
          <Text style={[s.label, { marginTop: 16 }]}>Ritmo</Text>
          <View style={s.optionRow}>
            {RATES.map(r => (
              <TouchableOpacity key={r.id} style={[s.rateCard, rate === r.id && s.rateCardActive]}
                onPress={() => setRate(r.id)}>
                <Text style={[s.rateName, rate === r.id && { color: C.bone }]}>{r.label}</Text>
                <Text style={s.rateDesc}>{r.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Peso objetivo (kg, opcional)</Text>
          <TextInput style={s.input} placeholder="Ej: 70" placeholderTextColor={C.ter}
            value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" />
        </>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Nivel de actividad</Text>
      <Text style={s.stepDesc}>Sin contar entrenamiento dedicado</Text>
      {ACTIVITIES.map(a => (
        <TouchableOpacity key={a.id} style={[s.listOption, activity === a.id && s.listOptionActive]}
          onPress={() => setActivity(a.id)}>
          <View style={{ flex: 1 }}>
            <Text style={[s.listOptionTitle, activity === a.id && { color: C.bone }]}>{a.label}</Text>
            <Text style={s.listOptionDesc}>{a.desc}</Text>
          </View>
          <Text style={s.multText}>x{a.mult}</Text>
          {activity === a.id && <Ionicons name="checkmark-circle" size={22} color={C.violet} style={{ marginLeft: 8 }} />}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep4 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Distribucion de macros</Text>
      <Text style={s.stepDesc}>Elige un perfil o personaliza despues</Text>
      {MACRO_PRESETS.filter(p => p.id !== 'custom').map(p => {
        const isSel = preset === p.id;
        return (
          <TouchableOpacity key={p.id} style={[s.presetCard, isSel && s.presetCardActive]}
            onPress={() => setPreset(p.id)}>
            <View style={{ flex: 1 }}>
              <Text style={[s.presetName, isSel && { color: C.bone }]}>{p.name}</Text>
              <Text style={s.presetDesc}>{p.description}</Text>
              <View style={s.presetBar}>
                <View style={[s.presetSeg, { flex: p.proteinPct, backgroundColor: C.coral }]} />
                <View style={[s.presetSeg, { flex: p.carbsPct, backgroundColor: C.violet }]} />
                <View style={[s.presetSeg, { flex: p.fatPct, backgroundColor: C.bone + '40' }]} />
              </View>
              <Text style={s.presetPcts}>P {p.proteinPct}% · C {p.carbsPct}% · G {p.fatPct}%</Text>
            </View>
            {isSel && <Ionicons name="checkmark-circle" size={22} color={C.violet} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderStep5 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Integraciones de salud</Text>
      <Text style={s.stepDesc}>Conecta tus dispositivos para mejor precision</Text>

      <TouchableOpacity style={[s.integrationCard, healthConnected && s.integrationCardActive]}
        onPress={() => {
          Alert.alert('Proximamente',
            Platform.OS === 'ios'
              ? 'La integracion con Apple Health estara disponible en la proxima version.'
              : 'La integracion con Google Health Connect estara disponible en la proxima version.');
        }}>
        <Ionicons name={Platform.OS === 'ios' ? 'heart' : 'fitness'} size={28}
          color={healthConnected ? C.success : C.sec} />
        <View style={{ flex: 1 }}>
          <Text style={s.integrationName}>
            {Platform.OS === 'ios' ? 'Apple Health' : 'Google Health Connect'}
          </Text>
          <Text style={s.integrationDesc}>
            Pasos, calorias activas, ejercicio y peso
          </Text>
        </View>
        <View style={[s.connectBadge, healthConnected && { backgroundColor: C.success + '20' }]}>
          <Text style={[s.connectText, healthConnected && { color: C.success }]}>
            {healthConnected ? 'Conectado' : 'Proximamente'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={s.integrationCard} onPress={() => {
        Alert.alert('InBody', 'La integracion con InBody para composicion corporal avanzada estara disponible proximamente. Usaremos la API de Terra para sincronizar tus datos.');
      }}>
        <Ionicons name="body-outline" size={28} color={C.sec} />
        <View style={{ flex: 1 }}>
          <Text style={s.integrationName}>InBody</Text>
          <Text style={s.integrationDesc}>Composicion corporal avanzada via Terra API</Text>
        </View>
        <View style={s.connectBadge}>
          <Text style={s.connectText}>Proximamente</Text>
        </View>
      </TouchableOpacity>

      <Text style={[s.stepDesc, { marginTop: 16 }]}>
        Puedes conectar estos servicios mas tarde desde Ajustes
      </Text>
    </View>
  );

  const renderStep6 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Resumen de tus objetivos</Text>
      <Text style={s.stepDesc}>Revisa antes de empezar</Text>

      <View style={s.summaryCard}>
        <View style={s.summaryRow}>
          <Text style={s.summaryLabel}>TDEE estimado</Text>
          <Text style={s.summaryValue}>{tdee} kcal</Text>
        </View>
        <View style={s.summaryRow}>
          <Text style={s.summaryLabel}>Objetivo calorico</Text>
          <Text style={[s.summaryValue, { color: C.violet, fontSize: 22 }]}>
            {Math.max(1200, goalCalories)} kcal
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.macroSummary}>
          <View style={s.macroItem}>
            <Text style={[s.macroValue, { color: C.coral }]}>{adjustedProtein}g</Text>
            <Text style={s.macroLabel}>Proteina</Text>
          </View>
          <View style={s.macroItem}>
            <Text style={[s.macroValue, { color: C.violet }]}>{macros.carbs}g</Text>
            <Text style={s.macroLabel}>Carbos</Text>
          </View>
          <View style={s.macroItem}>
            <Text style={s.macroValue}>{macros.fat}g</Text>
            <Text style={s.macroLabel}>Grasa</Text>
          </View>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryRow}>
          <Text style={s.summaryLabel}>Proteina minima</Text>
          <Text style={s.summaryNote}>{proteinMin}g/kg ({Math.round(numWeight * proteinMin)}g)</Text>
        </View>
        {bodyFat && (
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Grasa corporal</Text>
            <Text style={s.summaryNote}>{bodyFat}%</Text>
          </View>
        )}
      </View>

      <Text style={[s.stepDesc, { marginTop: 12, fontSize: 13 }]}>
        Estos valores se ajustaran semanalmente segun tu progreso
      </Text>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return null;
    }
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={s.container}>
      {/* Progress bar */}
      <View style={s.progressContainer}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.bone} />
        </TouchableOpacity>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
        </View>
        <Text style={s.stepIndicator}>{step + 1}/{TOTAL_STEPS}</Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
      </ScrollView>

      {/* Bottom button */}
      <View style={s.bottomBar}>
        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity
            style={[s.nextBtn, !canProceed() && s.nextBtnDisabled]}
            onPress={goNext}
            disabled={!canProceed()}
          >
            <Text style={s.nextBtnText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color={C.bone} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.finishBtn} onPress={handleFinish} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={C.bone} />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={20} color={C.bone} />
                <Text style={s.finishBtnText}>Empezar mi viaje</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  progressContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, gap: 12 },
  backBtn: { padding: 4 },
  progressBar: { flex: 1, height: 4, backgroundColor: 'rgba(247,242,234,0.1)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.violet, borderRadius: 2 },
  stepIndicator: { fontSize: 13, color: C.sec, fontWeight: '600' },
  scrollContent: { paddingBottom: 100 },
  stepContent: { padding: 20 },
  stepTitle: { fontSize: 26, fontWeight: '800', color: C.bone, marginBottom: 6 },
  stepDesc: { fontSize: 15, color: C.sec, marginBottom: 20, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '700', color: C.sec, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: '600', color: C.bone, borderWidth: 1, borderColor: C.border },
  inputRow: { flexDirection: 'row', gap: 12 },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionCard: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: 'transparent', gap: 6 },
  optionActive: { borderColor: C.violet, backgroundColor: C.violet + '20' },
  optionLabel: { fontSize: 14, fontWeight: '600', color: C.sec },
  optionLabelActive: { color: C.bone },
  listOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  listOptionActive: { borderColor: C.violet, backgroundColor: C.violet + '15' },
  listOptionTitle: { fontSize: 16, fontWeight: '600', color: C.sec },
  listOptionDesc: { fontSize: 13, color: C.ter, marginTop: 2 },
  multText: { fontSize: 14, fontWeight: '700', color: C.violet },
  dayBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  dayBtnActive: { borderColor: C.violet, backgroundColor: C.violet + '20' },
  dayTxt: { fontSize: 16, fontWeight: '700', color: C.sec },
  goalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'transparent', gap: 14 },
  goalCardActive: { borderColor: C.violet, backgroundColor: C.violet + '12' },
  goalIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(247,242,234,0.05)', alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 16, fontWeight: '700', color: C.sec },
  goalDesc: { fontSize: 13, color: C.ter, marginTop: 2 },
  rateCard: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: 'transparent', gap: 4 },
  rateCardActive: { borderColor: C.violet, backgroundColor: C.violet + '20' },
  rateName: { fontSize: 14, fontWeight: '700', color: C.sec },
  rateDesc: { fontSize: 11, color: C.ter },
  presetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'transparent', gap: 12 },
  presetCardActive: { borderColor: C.violet, backgroundColor: C.violet + '12' },
  presetName: { fontSize: 16, fontWeight: '700', color: C.sec },
  presetDesc: { fontSize: 12, color: C.ter, marginTop: 2 },
  presetBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8, gap: 2 },
  presetSeg: { borderRadius: 3 },
  presetPcts: { fontSize: 11, color: C.ter, marginTop: 4 },
  integrationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'transparent', gap: 14 },
  integrationCardActive: { borderColor: C.success, backgroundColor: C.success + '10' },
  integrationName: { fontSize: 16, fontWeight: '700', color: C.bone },
  integrationDesc: { fontSize: 13, color: C.sec, marginTop: 2 },
  connectBadge: { backgroundColor: 'rgba(247,242,234,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  connectText: { fontSize: 12, fontWeight: '600', color: C.sec },
  summaryCard: { backgroundColor: C.card, borderRadius: 16, padding: 20, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: C.sec },
  summaryValue: { fontSize: 18, fontWeight: '700', color: C.bone },
  summaryNote: { fontSize: 14, fontWeight: '600', color: C.ter },
  summaryDivider: { height: 1, backgroundColor: C.border },
  macroSummary: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  macroItem: { alignItems: 'center', gap: 4 },
  macroValue: { fontSize: 22, fontWeight: '800', color: C.bone },
  macroLabel: { fontSize: 12, color: C.sec },
  bottomBar: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 34, backgroundColor: C.bg },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.violet, paddingVertical: 16, borderRadius: 14 },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: C.bone },
  finishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.coral, paddingVertical: 16, borderRadius: 14 },
  finishBtnText: { fontSize: 17, fontWeight: '700', color: C.bone },
});
