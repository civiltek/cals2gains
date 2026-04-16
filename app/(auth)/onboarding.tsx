// ============================================
// Cals2Gains - Enhanced Onboarding (7 Steps)
// ============================================
import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  Dimensions, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../store/themeStore';
import { useUserStore } from '../../store/userStore';
import { markOnboardingCompleted } from '../../services/firebase';
import { calculateGoalsFromPreset, getPresetById, MACRO_PRESETS } from '../../constants/macroPresets';
import { healthService } from '../../services/healthKit';

const { width: SW } = Dimensions.get('window');

const TOTAL_STEPS = 8;

const ALLERGENS = [
  { id: 'gluten', key: 'allergies.gluten' },
  { id: 'lactose', key: 'allergies.lactose' },
  { id: 'nuts', key: 'allergies.nuts' },
  { id: 'peanuts', key: 'allergies.peanuts' },
  { id: 'shellfish', key: 'allergies.shellfish' },
  { id: 'fish', key: 'allergies.fish' },
  { id: 'egg', key: 'allergies.egg' },
  { id: 'soy', key: 'allergies.soy' },
  { id: 'sesame', key: 'allergies.sesame' },
  { id: 'mustard', key: 'allergies.mustard' },
  { id: 'celery', key: 'allergies.celery' },
  { id: 'molluscs', key: 'allergies.molluscs' },
  { id: 'lupin', key: 'allergies.lupin' },
  { id: 'sulphites', key: 'allergies.sulphites' },
];

const INTOLERANCES = [
  { id: 'fructose', key: 'allergies.fructose' },
  { id: 'sorbitol', key: 'allergies.sorbitol' },
  { id: 'histamine', key: 'allergies.histamine' },
  { id: 'fodmap', key: 'allergies.fodmap' },
];
const GENDERS = [
  { id: 'male', labelKey: 'onboarding.male', icon: 'male-outline' },
  { id: 'female', labelKey: 'onboarding.female', icon: 'female-outline' },
];
const GOALS = [
  { id: 'lose_weight', labelKey: 'onboarding.loseFat', icon: 'trending-down', descKey: 'onboarding.loseFatDesc' },
  { id: 'gain_muscle', labelKey: 'onboarding.gainMuscle', icon: 'barbell-outline', descKey: 'onboarding.gainMuscleDesc' },
  { id: 'recomposition', labelKey: 'onboarding.recomposition', icon: 'swap-horizontal-outline', descKey: 'onboarding.recompositionDesc' },
  { id: 'improve_health', labelKey: 'onboarding.improveHealth', icon: 'heart-outline', descKey: 'onboarding.maintainDesc' },
];
const RATES = [
  { id: 'slow', labelKey: 'onboarding.slow', desc: '~0.25 kg/sem', kcal: 250 },
  { id: 'moderate', labelKey: 'onboarding.moderate', desc: '~0.5 kg/sem', kcal: 500 },
  { id: 'fast', labelKey: 'onboarding.fast', desc: '~0.75 kg/sem', kcal: 750 },
];
const ACTIVITIES = [
  { id: 'sedentario', labelKey: 'onboarding.sedentary', mult: 1.2, descKey: 'onboarding.sedentaryDesc' },
  { id: 'light', labelKey: 'onboarding.lightlyActive', mult: 1.375, descKey: 'onboarding.lightlyActiveDesc' },
  { id: 'moderate', labelKey: 'onboarding.moderatelyActive', mult: 1.55, descKey: 'onboarding.moderatelyActiveDesc' },
  { id: 'active', labelKey: 'onboarding.veryActive', mult: 1.725, descKey: 'onboarding.veryActiveDesc' },
  { id: 'very_active', labelKey: 'onboarding.extremelyActive', mult: 1.9, descKey: 'onboarding.extremelyActiveDesc' },
];
const EXPERIENCE = [
  { id: 'beginner', labelKey: 'onboarding.beginner', descKey: 'onboarding.beginnerDesc' },
  { id: 'intermediate', labelKey: 'onboarding.intermediate', descKey: 'onboarding.intermediateDesc' },
  { id: 'advanced', labelKey: 'onboarding.advanced', descKey: 'onboarding.advancedDesc' },
];

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    progressContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, gap: 12 },
    backBtn: { padding: 4 },
    progressBar: { flex: 1, height: 4, backgroundColor: C.text + '10', borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 2 },
    stepIndicator: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
    scrollContent: { paddingBottom: 100 },
    stepContent: { padding: 20 },
    stepTitle: { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 6 },
    stepDesc: { fontSize: 15, color: C.textSecondary, marginBottom: 20, lineHeight: 22, includeFontPadding: false },
    label: { fontSize: 13, fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: '600', color: C.text, borderWidth: 1, borderColor: C.border },
    inputRow: { flexDirection: 'row', gap: 12 },
    optionRow: { flexDirection: 'row', gap: 10 },
    optionCard: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: 'transparent', gap: 6 },
    optionActive: { borderColor: C.primary, backgroundColor: C.primary + '20' },
    optionLabel: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
    optionLabelActive: { color: C.primary },
    listOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
    listOptionActive: { borderColor: C.primary, backgroundColor: C.primary + '15' },
    listOptionTitle: { fontSize: 16, fontWeight: '600', color: C.textSecondary },
    listOptionDesc: { fontSize: 13, color: C.textTertiary, marginTop: 2 },
    multText: { fontSize: 14, fontWeight: '700', color: C.primary },
    dayBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
    dayBtnActive: { borderColor: C.primary, backgroundColor: C.primary + '20' },
    dayTxt: { fontSize: 16, fontWeight: '700', color: C.textSecondary },
    goalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'transparent', gap: 14 },
    goalCardActive: { borderColor: C.primary, backgroundColor: C.primary + '12' },
    goalIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.text + '05', alignItems: 'center', justifyContent: 'center' },
    goalTitle: { fontSize: 16, fontWeight: '700', color: C.textSecondary },
    goalDesc: { fontSize: 13, color: C.textTertiary, marginTop: 2 },
    rateCard: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: 'transparent', gap: 4 },
    rateCardActive: { borderColor: C.primary, backgroundColor: C.primary + '20' },
    rateName: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
    rateDesc: { fontSize: 11, color: C.textTertiary },
    presetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'transparent', gap: 12 },
    presetCardActive: { borderColor: C.primary, backgroundColor: C.primary + '12' },
    presetName: { fontSize: 16, fontWeight: '700', color: C.textSecondary },
    presetDesc: { fontSize: 12, color: C.textTertiary, marginTop: 2 },
    presetBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8, gap: 2 },
    presetSeg: { borderRadius: 3 },
    presetPcts: { fontSize: 11, color: C.textTertiary, marginTop: 4 },
    integrationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'transparent', gap: 14 },
    integrationCardActive: { borderColor: C.success, backgroundColor: C.success + '10' },
    integrationName: { fontSize: 16, fontWeight: '700', color: C.text },
    integrationDesc: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
    connectBadge: { backgroundColor: C.text + '08', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    connectText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
    summaryCard: { backgroundColor: C.card, borderRadius: 16, padding: 20, gap: 12 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 14, color: C.textSecondary },
    summaryValue: { fontSize: 18, fontWeight: '700', color: C.text },
    summaryNote: { fontSize: 14, fontWeight: '600', color: C.textTertiary },
    summaryDivider: { height: 1, backgroundColor: C.border },
    macroSummary: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
    macroItem: { alignItems: 'center', gap: 4 },
    macroValue: { fontSize: 22, fontWeight: '800', color: C.text },
    macroLabel: { fontSize: 12, color: C.textSecondary },
    bottomBar: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 34, backgroundColor: C.background },
    nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, paddingVertical: 16, borderRadius: 14 },
    nextBtnDisabled: { opacity: 0.4 },
    nextBtnText: { fontSize: 17, fontWeight: '700', color: C.white },
    finishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, paddingVertical: 16, borderRadius: 14 },
    finishBtnText: { fontSize: 17, fontWeight: '700', color: C.white },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
    chipActive: { backgroundColor: C.error + '20', borderColor: C.error },
    chipText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
    chipTextActive: { color: C.error },
    disclaimerBox: { backgroundColor: C.warning + '15', borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: C.warning + '40' },
    disclaimerText: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },
  });
}

export default function OnboardingScreen() {
  const C = useColors();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { updateProfile, updateAllergies, user, loadUserData } = useUserStore();
  const scrollRef = useRef<ScrollView>(null);
  const s = useMemo(() => createStyles(C), [C]);

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

  // Step 5: Allergies & intolerances
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([]);
  const [otherAllergy, setOtherAllergy] = useState('');

  // Step 6: Health integration
  const [healthConnected, setHealthConnected] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const setHealthEnabled = useUserStore((s) => s.setHealthEnabled);

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
  const presetConfig = getPresetById(preset) || MACRO_PRESETS[0];
  const macros = calculateGoalsFromPreset(presetConfig, Math.max(1200, goalCalories));
  const adjustedProtein = Math.max(macros.protein, Math.round(numWeight * proteinMin));

  // Map onboarding activity IDs to ActivityLevel type
  const activityLevelMap: Record<string, string> = {
    sedentary: 'sedentary',
    light: 'lightly_active',
    moderate: 'moderately_active',
    active: 'very_active',
    very_active: 'extremely_active',
  };

  // Map onboarding goal IDs to FitnessGoal type
  const fitnessGoalMap: Record<string, string> = {
    lose_weight: 'lose_weight',
    gain_muscle: 'gain_muscle',
    recomposition: 'maintain_weight',
    improve_health: 'improve_health',
  };

  // Finish onboarding
  const handleFinish = async () => {
    setLoading(true);
    try {
      const finalCalories = Math.max(1200, goalCalories);
      const finalProtein = isNaN(adjustedProtein) ? Math.round(numWeight * proteinMin) : adjustedProtein;
      const finalCarbs = isNaN(macros.carbs) ? Math.round((finalCalories * 0.4) / 4) : macros.carbs;
      const finalFat = isNaN(macros.fat) ? Math.round((finalCalories * 0.3) / 9) : macros.fat;

      await updateProfile(
        {
          age: numAge,
          weight: numWeight,
          height: numHeight,
          gender: gender as 'male' | 'female' | 'other',
          goal: (fitnessGoalMap[goal] || 'maintain_weight') as any,
          activityLevel: (activityLevelMap[activity] || 'moderately_active') as any,
        },
        {
          calories: finalCalories,
          protein: finalProtein,
          carbs: finalCarbs,
          fat: finalFat,
          fiber: 30,
        }
      );

      // Save allergies & intolerances
      const allAllergies = [
        ...selectedAllergies,
        ...otherAllergy.split(',').map(s => s.trim()).filter(Boolean),
      ];
      await updateAllergies(allAllergies, selectedIntolerances);

      // Mark onboarding as completed in Firestore
      if (user?.uid) {
        await markOnboardingCompleted(user.uid);
        // Reload user data so the route guard sees onboardingCompleted = true
        await loadUserData(user.uid);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (error) {
      console.error('Onboarding save error:', error);
      Alert.alert(t('errors.error'), t('onboarding.saveFailed'));
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
      case 5: return true; // allergies — optional
      case 6: return true; // health integration
      case 7: return true; // summary
      default: return false;
    }
  };

  // ============================================
  // STEP RENDERERS
  // ============================================

  const renderStep0 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>{t('onboarding.basicData')}</Text>
      <Text style={s.stepDesc}>{t('onboarding.basicDataDesc')}</Text>

      <Text style={s.label}>{t('onboarding.gender')}</Text>
      <View style={s.optionRow}>
        {GENDERS.map(g => (
          <TouchableOpacity key={g.id} style={[s.optionCard, gender === g.id && s.optionActive]}
            onPress={() => setGender(g.id)}>
            <Ionicons name={g.icon as any} size={24} color={gender === g.id ? C.primary : C.textSecondary} />
            <Text style={[s.optionLabel, gender === g.id && s.optionLabelActive]}>{t(g.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>{t('onboarding.age')}</Text>
      <TextInput style={s.input} placeholder={t('onboarding.age')} placeholderTextColor={C.textSecondary}
        value={age} onChangeText={setAge} keyboardType="number-pad" />

      <View style={s.inputRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{t('onboarding.weight')}</Text>
          <TextInput style={s.input} placeholder={t('onboarding.weight')} placeholderTextColor={C.textSecondary}
            value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{t('onboarding.height')}</Text>
          <TextInput style={s.input} placeholder={t('onboarding.height')} placeholderTextColor={C.textSecondary}
            value={height} onChangeText={setHeight} keyboardType="number-pad" />
        </View>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>{t('onboarding.bodyComposition')}</Text>
      <Text style={s.stepDesc}>{t('onboarding.bodyCompositionDesc')}</Text>

      <Text style={s.label}>{t('onboarding.trainingExperience')}</Text>
      {EXPERIENCE.map(e => (
        <TouchableOpacity key={e.id} style={[s.listOption, experience === e.id && s.listOptionActive]}
          onPress={() => setExperience(e.id)}>
          <View>
            <Text style={[s.listOptionTitle, experience === e.id && { color: C.primary }]}>{t(e.labelKey)}</Text>
            <Text style={s.listOptionDesc}>{t(e.descKey)}</Text>
          </View>
          {experience === e.id && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
        </TouchableOpacity>
      ))}

      <Text style={s.label}>{t('onboarding.trainingDays')}</Text>
      <View style={s.optionRow}>
        {['2','3','4','5','6'].map(d => (
          <TouchableOpacity key={d} style={[s.dayBtn, trainingDays === d && s.dayBtnActive]}
            onPress={() => setTrainingDays(d)}>
            <Text style={[s.dayTxt, trainingDays === d && { color: C.primary }]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>{t('onboarding.bodyFatOptional')}</Text>
      <TextInput style={s.input} placeholder={t('onboarding.bodyFatOptional')} placeholderTextColor={C.textSecondary}
        value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" />
    </View>
  );

  const renderStep2 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>{t('onboarding.yourGoal')}</Text>
      <Text style={s.stepDesc}>{t('onboarding.goalDesc')}</Text>

      {GOALS.map(g => (
        <TouchableOpacity key={g.id} style={[s.goalCard, goal === g.id && s.goalCardActive]}
          onPress={() => setGoal(g.id)}>
          <View style={[s.goalIcon, goal === g.id && { backgroundColor: C.primary + '30' }]}>
            <Ionicons name={g.icon as any} size={24} color={goal === g.id ? C.primary : C.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.goalTitle, goal === g.id && { color: C.primary }]}>{t(g.labelKey)}</Text>
            <Text style={s.goalDesc}>{t(g.descKey)}</Text>
          </View>
          {goal === g.id && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
        </TouchableOpacity>
      ))}

      {(goal === 'lose_weight' || goal === 'gain_muscle') && (
        <>
          <Text style={[s.label, { marginTop: 16 }]}>{t('onboarding.rate')}</Text>
          <View style={s.optionRow}>
            {RATES.map(r => (
              <TouchableOpacity key={r.id} style={[s.rateCard, rate === r.id && s.rateCardActive]}
                onPress={() => setRate(r.id)}>
                <Text style={[s.rateName, rate === r.id && { color: C.primary }]}>{t(r.labelKey)}</Text>
                <Text style={s.rateDesc}>{r.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>{t('onboarding.targetWeight')}</Text>
          <TextInput style={s.input} placeholder={t('onboarding.exTargetWeight')} placeholderTextColor={C.textSecondary}
            value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" />
        </>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>{t('onboarding.activityLevel')}</Text>
      <Text style={s.stepDesc}>{t('onboarding.activityExcluding')}</Text>
      {ACTIVITIES.map(a => (
        <TouchableOpacity key={a.id} style={[s.listOption, activity === a.id && s.listOptionActive]}
          onPress={() => setActivity(a.id)}>
          <View style={{ flex: 1 }}>
            <Text style={[s.listOptionTitle, activity === a.id && { color: C.primary }]}>{t(a.labelKey)}</Text>
            <Text style={s.listOptionDesc}>{t(a.descKey)}</Text>
          </View>
          <Text style={s.multText}>x{a.mult}</Text>
          {activity === a.id && <Ionicons name="checkmark-circle" size={22} color={C.primary} style={{ marginLeft: 8 }} />}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep4 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>{t('onboarding.macroDistribution')}</Text>
      <Text style={s.stepDesc}>{t('onboarding.macroDistributionDesc')}</Text>
      {MACRO_PRESETS.filter(p => p.id !== 'custom').map(p => {
        const isSel = preset === p.id;
        return (
          <TouchableOpacity key={p.id} style={[s.presetCard, isSel && s.presetCardActive]}
            onPress={() => setPreset(p.id)}>
            <View style={{ flex: 1 }}>
              <Text style={[s.presetName, isSel && { color: C.primary }]}>{i18n.language === 'es' ? p.nameEs : p.nameEn}</Text>
              <Text style={s.presetDesc}>{i18n.language === 'es' ? p.descriptionEs : p.descriptionEn}</Text>
              <View style={s.presetBar}>
                <View style={[s.presetSeg, { flex: p.proteinPct, backgroundColor: C.accent }]} />
                <View style={[s.presetSeg, { flex: p.carbsPct, backgroundColor: C.primary }]} />
                <View style={[s.presetSeg, { flex: p.fatPct, backgroundColor: C.text + '40' }]} />
              </View>
              <Text style={s.presetPcts}>P {Math.round(p.proteinPct * 100)}% · C {Math.round(p.carbsPct * 100)}% · G {Math.round(p.fatPct * 100)}%</Text>
            </View>
            {isSel && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderStep5 = () => {
    const toggleAllergy = (id: string) => {
      setSelectedAllergies(prev =>
        prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
      );
      Haptics.selectionAsync();
    };
    const toggleIntolerance = (id: string) => {
      setSelectedIntolerances(prev =>
        prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
      );
      Haptics.selectionAsync();
    };

    return (
      <View style={s.stepContent}>
        <Text style={s.stepTitle}>{t('allergies.title')}</Text>
        <Text style={s.stepDesc}>{t('allergies.subtitle')}</Text>

        <Text style={s.label}>{t('allergies.allergiesSection')}</Text>
        <Text style={[s.stepDesc, { fontSize: 13, marginBottom: 8 }]}>{t('allergies.allergiesDesc')}</Text>
        <View style={s.chipsContainer}>
          {ALLERGENS.map(a => {
            const active = selectedAllergies.includes(a.id);
            return (
              <TouchableOpacity key={a.id} style={[s.chip, active && s.chipActive]} onPress={() => toggleAllergy(a.id)}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{t(a.key)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.label, { marginTop: 20 }]}>{t('allergies.intolerancesSection')}</Text>
        <Text style={[s.stepDesc, { fontSize: 13, marginBottom: 8 }]}>{t('allergies.intolerancesDesc')}</Text>
        <View style={s.chipsContainer}>
          {INTOLERANCES.map(a => {
            const active = selectedIntolerances.includes(a.id);
            return (
              <TouchableOpacity key={a.id} style={[s.chip, active && s.chipActive]} onPress={() => toggleIntolerance(a.id)}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{t(a.key)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.label, { marginTop: 20 }]}>{t('allergies.other')}</Text>
        <TextInput
          style={s.input}
          placeholder={t('allergies.otherPlaceholder')}
          placeholderTextColor={C.textSecondary}
          value={otherAllergy}
          onChangeText={setOtherAllergy}
        />

        <View style={s.disclaimerBox}>
          <Text style={s.disclaimerText}>⚕️ {t('allergies.disclaimer')}</Text>
        </View>
      </View>
    );
  };

  const renderStep6 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>{t('onboarding.healthIntegrations')}</Text>
      <Text style={s.stepDesc}>{t('onboarding.healthIntegrationsDesc')}</Text>

      <TouchableOpacity
        style={[s.integrationCard, healthConnected && s.integrationCardActive]}
        disabled={healthLoading || healthConnected}
        onPress={async () => {
          setHealthLoading(true);
          try {
            const granted = await healthService.requestAuthorization();
            if (granted) {
              setHealthConnected(true);
              await setHealthEnabled(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert(
                t('health.permissionDeniedTitle'),
                t('health.permissionDeniedDesc')
              );
            }
          } catch {
            Alert.alert(t('errors.generic'));
          } finally {
            setHealthLoading(false);
          }
        }}
      >
        <Ionicons
          name={Platform.OS === 'ios' ? 'heart' : 'fitness'}
          size={28}
          color={healthConnected ? C.success : C.textSecondary}
        />
        <View style={{ flex: 1 }}>
          <Text style={s.integrationName}>
            {Platform.OS === 'ios' ? 'Apple Health' : 'Google Health Connect'}
          </Text>
          <Text style={s.integrationDesc}>
            {t('onboarding.exerciseMovement')}
          </Text>
        </View>
        <View style={[s.connectBadge, healthConnected && { backgroundColor: C.success + '20' }]}>
          <Text style={[s.connectText, healthConnected && { color: C.success }]}>
            {healthLoading
              ? '...'
              : healthConnected
              ? t('onboarding.connected')
              : t('health.connect')}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={s.integrationCard} onPress={() => {
        Alert.alert('InBody', t('onboarding.comingSoon'));
      }}>
        <Ionicons name="body-outline" size={28} color={C.textSecondary} />
        <View style={{ flex: 1 }}>
          <Text style={s.integrationName}>InBody</Text>
          <Text style={s.integrationDesc}>{t('onboarding.bodyCompositionDesc')}</Text>
        </View>
        <View style={s.connectBadge}>
          <Text style={s.connectText}>{t('onboarding.comingSoon')}</Text>
        </View>
      </TouchableOpacity>

      <Text style={[s.stepDesc, { marginTop: 16 }]}>
        {t('onboarding.connectLater')}
      </Text>
    </View>
  );

  const renderStep7 = () => {
    const bmrRounded = Math.round(bmr);
    const activityBonus = tdee - bmrRounded;
    const calorieAdjustment = Math.max(1200, goalCalories) - tdee;
    const adjustmentLabel = calorieAdjustment < 0 ? t('onboarding.deficitApplied') : calorieAdjustment > 0 ? t('onboarding.surplusApplied') : t('onboarding.noAdjustment');
    const adjustmentColor = calorieAdjustment < 0 ? C.accent : calorieAdjustment > 0 ? C.success : C.textSecondary;
    const activityItem = ACTIVITIES.find(a => a.id === activity);
    const activityLabel = activityItem ? t(activityItem.labelKey) : t('onboarding.moderate');

    return (
      <View style={s.stepContent}>
        <Text style={s.stepTitle}>{t('onboarding.goalSummary')}</Text>
        <Text style={s.stepDesc}>{t('onboarding.goalSummaryDesc')}</Text>

        {/* TDEE Breakdown */}
        <View style={s.summaryCard}>
          <Text style={[s.summaryLabel, { fontWeight: '700', fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }]}>{t('onboarding.calorieBreakdown')}</Text>

          {/* BMR */}
          <View style={s.summaryRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>🔋</Text>
              <View>
                <Text style={[s.summaryLabel, { fontSize: 13 }]}>{t('onboarding.bmrLabel')}</Text>
                <Text style={[s.summaryNote, { fontSize: 11 }]}>{t('onboarding.restExpenditure')}</Text>
              </View>
            </View>
            <Text style={[s.summaryValue, { fontSize: 16 }]}>{bmrRounded} kcal</Text>
          </View>

          {/* Activity */}
          <View style={s.summaryRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>🏃</Text>
              <View>
                <Text style={[s.summaryLabel, { fontSize: 13 }]}>{t('onboarding.activityLabel', { level: activityLabel.toLowerCase() })}</Text>
                <Text style={[s.summaryNote, { fontSize: 11 }]}>{t('onboarding.exerciseMovement')}</Text>
              </View>
            </View>
            <Text style={[s.summaryValue, { fontSize: 16 }]}>+{activityBonus} kcal</Text>
          </View>

          <View style={[s.summaryDivider, { marginVertical: 4 }]} />

          {/* TDEE Total */}
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { fontWeight: '700' }]}>{t('onboarding.tdeeTotal')}</Text>
            <Text style={[s.summaryValue, { fontSize: 18 }]}>{tdee} kcal</Text>
          </View>

          {/* Adjustment */}
          {calorieAdjustment !== 0 && (
            <View style={s.summaryRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>{calorieAdjustment < 0 ? '📉' : '📈'}</Text>
                <Text style={[s.summaryLabel, { fontSize: 13 }]}>{adjustmentLabel}</Text>
              </View>
              <Text style={[s.summaryValue, { fontSize: 16, color: adjustmentColor }]}>
                {calorieAdjustment > 0 ? '+' : ''}{calorieAdjustment} kcal
              </Text>
            </View>
          )}

          <View style={[s.summaryDivider, { marginVertical: 4 }]} />

          {/* Final Goal */}
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { fontWeight: '700' }]}>{t('onboarding.calorieGoal')}</Text>
            <Text style={[s.summaryValue, { color: C.primary, fontSize: 22 }]}>
              {Math.max(1200, goalCalories)} kcal
            </Text>
          </View>
        </View>

        {/* Macros Card */}
        <View style={[s.summaryCard, { marginTop: 12 }]}>
          <Text style={[s.summaryLabel, { fontWeight: '700', fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }]}>{t('onboarding.macroDistTitle')}</Text>
          <View style={s.macroSummary}>
            <View style={s.macroItem}>
              <Text style={[s.macroValue, { color: C.accent }]}>{adjustedProtein}g</Text>
              <Text style={s.macroLabel}>{t('nutrition.protein')}</Text>
            </View>
            <View style={s.macroItem}>
              <Text style={[s.macroValue, { color: C.primary }]}>{macros.carbs}g</Text>
              <Text style={s.macroLabel}>{t('nutrition.carbs')}</Text>
            </View>
            <View style={s.macroItem}>
              <Text style={[s.macroValue, { color: '#FFD700' }]}>{macros.fat}g</Text>
              <Text style={s.macroLabel}>{t('nutrition.fat')}</Text>
            </View>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>{t('onboarding.proteinMin')}</Text>
            <Text style={s.summaryNote}>{proteinMin}g/kg ({Math.round(numWeight * proteinMin)}g)</Text>
          </View>
          {bodyFat && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>{t('onboarding.bodyFat')}</Text>
              <Text style={s.summaryNote}>{bodyFat}%</Text>
            </View>
          )}
        </View>

        <Text style={[s.stepDesc, { marginTop: 12, fontSize: 13 }]}>
          {t('onboarding.adjustWeekly')}
        </Text>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
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
          <Ionicons name="arrow-back" size={22} color={C.white} />
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
            <Text style={s.nextBtnText}>{t('onboarding.continue')}</Text>
            <Ionicons name="arrow-forward" size={20} color={C.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.finishBtn} onPress={handleFinish} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={20} color={C.white} />
                <Text style={s.finishBtnText}>{t('onboarding.startJourney')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

