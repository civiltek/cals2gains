// ============================================
// Cals2Gains - Quick Add Manual Entry Screen
// ============================================
// Manual nutrition entry without food search
// Users input calories, protein, carbs, fat directly

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMealStore } from '../store/mealStore';
import { COLORS } from '../theme';

// ============================================
// CONSTANTS
// ============================================

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Desayuno', icon: 'sunny-outline' },
  { id: 'lunch', label: 'Almuerzo', icon: 'restaurant-outline' },
  { id: 'dinner', label: 'Cena', icon: 'moon-outline' },
  { id: 'snack', label: 'Snack', icon: 'cafe-outline' },
] as const;

// ============================================
// COMPONENT
// ============================================

export default function QuickAddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: string }>();
  const { addMeal } = useMealStore();

  // State - Main macros
  const [foodName, setFoodName] = useState('Registro rápido');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // State - Optional macros
  const [showOptional, setShowOptional] = useState(false);
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [saturatedFat, setSaturatedFat] = useState('');
  const [sodium, setSodium] = useState('');

  // State - Meal type & UI
  const [mealType, setMealType] = useState(params.mealType || 'lunch');
  const [saving, setSaving] = useState(false);

  // Handlers - Macro adjusters
  const adjustValue = (value: string, delta: number): string => {
    const num = Math.max(0, (parseInt(value) || 0) + delta);
    return num.toString();
  };

  const handleLogMeal = async () => {
    // Validation
    if (!calories.trim() || !protein.trim() || !carbs.trim() || !fat.trim()) {
      Alert.alert('Campos requeridos', 'Por favor completa Calorías, Proteína, Carbohidratos y Grasa');
      return;
    }

    const cal = parseInt(calories);
    const prot = parseInt(protein);
    const carb = parseInt(carbs);
    const fatt = parseInt(fat);

    if (cal < 0 || prot < 0 || carb < 0 || fatt < 0) {
      Alert.alert('Valores inválidos', 'Los valores no pueden ser negativos');
      return;
    }

    setSaving(true);
    try {
      await addMeal({
        userId: '', // Will be set by Firebase
        timestamp: new Date(),
        photoUri: '',
        dishName: foodName.trim() || 'Registro rápido',
        dishNameEs: foodName.trim() || 'Registro rápido',
        dishNameEn: foodName.trim() || 'Quick Add',
        ingredients: [],
        portionDescription: 'Manual',
        estimatedWeight: 0,
        nutrition: {
          calories: cal,
          protein: prot,
          carbs: carb,
          fat: fatt,
          fiber: fiber ? parseInt(fiber) : 0,
          sugar: sugar ? parseInt(sugar) : undefined,
          saturatedFat: saturatedFat ? parseInt(saturatedFat) : undefined,
          sodium: sodium ? parseInt(sodium) : undefined,
        },
        mealType: mealType as any,
        aiConfidence: 1,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la comida');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const MacroInput = ({
    label,
    value,
    onChangeText,
    unit = 'g',
    onMinus,
    onPlus,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    unit?: string;
    onMinus: () => void;
    onPlus: () => void;
  }) => (
    <View style={styles.macroInputContainer}>
      <View style={styles.macroLabel}>
        <Text style={styles.macroLabelText}>{label}</Text>
        <Text style={styles.macroUnit}>{unit}</Text>
      </View>

      <View style={styles.macroInputRow}>
        <TouchableOpacity
          style={styles.macroAdjustBtn}
          onPress={onMinus}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={18} color={COLORS.bone} />
        </TouchableOpacity>

        <TextInput
          style={styles.macroTextInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={COLORS.textTertiary}
          maxLength={4}
        />

        <TouchableOpacity
          style={styles.macroAdjustBtn}
          onPress={onPlus}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={COLORS.bone} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Calculate totals for summary
  const totalCalories = parseInt(calories) || 0;
  const totalProtein = parseInt(protein) || 0;
  const totalCarbs = parseInt(carbs) || 0;
  const totalFat = parseInt(fat) || 0;

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={COLORS.bone} />
          </TouchableOpacity>
          <Text style={styles.title}>Registro Rápido</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Meal Type Selector */}
        <View style={styles.mealTypeRow}>
          {MEAL_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.mealTypeBtn,
                mealType === type.id && styles.mealTypeBtnActive,
              ]}
              onPress={() => setMealType(type.id)}
            >
              <Ionicons
                name={type.icon as any}
                size={16}
                color={mealType === type.id ? COLORS.bone : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.mealTypeText,
                  mealType === type.id && styles.mealTypeTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Food Name Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <View style={styles.foodNameContainer}>
            <Ionicons name="document-text-outline" size={18} color={COLORS.violet} />
            <TextInput
              style={styles.foodNameInput}
              placeholder="Ej: Pollo con arroz"
              placeholderTextColor={COLORS.textTertiary}
              value={foodName}
              onChangeText={setFoodName}
            />
          </View>
        </View>

        {/* Main Macros Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macronutrientes</Text>

          <View style={styles.macroGrid}>
            <View style={styles.macroColumn}>
              <MacroInput
                label="Calorías"
                unit="kcal"
                value={calories}
                onChangeText={setCalories}
                onMinus={() => setCalories(adjustValue(calories, -50))}
                onPlus={() => setCalories(adjustValue(calories, 50))}
              />
            </View>

            <View style={styles.macroColumn}>
              <MacroInput
                label="Proteína"
                unit="g"
                value={protein}
                onChangeText={setProtein}
                onMinus={() => setProtein(adjustValue(protein, -5))}
                onPlus={() => setProtein(adjustValue(protein, 5))}
              />
            </View>

            <View style={styles.macroColumn}>
              <MacroInput
                label="Carbohidratos"
                unit="g"
                value={carbs}
                onChangeText={setCarbs}
                onMinus={() => setCarbs(adjustValue(carbs, -5))}
                onPlus={() => setCarbs(adjustValue(carbs, 5))}
              />
            </View>

            <View style={styles.macroColumn}>
              <MacroInput
                label="Grasa"
                unit="g"
                value={fat}
                onChangeText={setFat}
                onMinus={() => setFat(adjustValue(fat, -5))}
                onPlus={() => setFat(adjustValue(fat, 5))}
              />
            </View>
          </View>
        </View>

        {/* Optional Macros Expander */}
        <TouchableOpacity
          style={styles.expanderBtn}
          onPress={() => setShowOptional(!showOptional)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showOptional ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.violet}
          />
          <Text style={styles.expanderText}>Macros opcionales</Text>
        </TouchableOpacity>

        {/* Optional Macros Section */}
        {showOptional && (
          <View style={styles.section}>
            <View style={styles.macroGrid}>
              <View style={styles.macroColumn}>
                <MacroInput
                  label="Fibra"
                  unit="g"
                  value={fiber}
                  onChangeText={setFiber}
                  onMinus={() => setFiber(adjustValue(fiber, -5))}
                  onPlus={() => setFiber(adjustValue(fiber, 5))}
                />
              </View>

              <View style={styles.macroColumn}>
                <MacroInput
                  label="Azúcar"
                  unit="g"
                  value={sugar}
                  onChangeText={setSugar}
                  onMinus={() => setSugar(adjustValue(sugar, -5))}
                  onPlus={() => setSugar(adjustValue(sugar, 5))}
                />
              </View>

              <View style={styles.macroColumn}>
                <MacroInput
                  label="Grasa Sat."
                  unit="g"
                  value={saturatedFat}
                  onChangeText={setSaturatedFat}
                  onMinus={() => setSaturatedFat(adjustValue(saturatedFat, -5))}
                  onPlus={() => setSaturatedFat(adjustValue(saturatedFat, 5))}
                />
              </View>

              <View style={styles.macroColumn}>
                <MacroInput
                  label="Sodio"
                  unit="mg"
                  value={sodium}
                  onChangeText={setSodium}
                  onMinus={() => setSodium(adjustValue(sodium, -100))}
                  onPlus={() => setSodium(adjustValue(sodium, 100))}
                />
              </View>
            </View>
          </View>
        )}

        {/* Summary Card */}
        {(totalCalories > 0 || totalProtein > 0 || totalCarbs > 0 || totalFat > 0) && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen</Text>
            <View style={styles.summaryPills}>
              <View style={[styles.summaryPill, { backgroundColor: 'rgba(156,140,255,0.15)' }]}>
                <Text style={[styles.summaryPillText, { color: COLORS.violet }]}>
                  {totalCalories}
                </Text>
                <Text style={styles.summaryPillLabel}>kcal</Text>
              </View>

              <View style={[styles.summaryPill, { backgroundColor: 'rgba(255,106,77,0.15)' }]}>
                <Text style={[styles.summaryPillText, { color: COLORS.coral }]}>
                  {totalProtein}
                </Text>
                <Text style={styles.summaryPillLabel}>P</Text>
              </View>

              <View style={[styles.summaryPill, { backgroundColor: 'rgba(156,140,255,0.08)' }]}>
                <Text style={styles.summaryPillText}>{totalCarbs}</Text>
                <Text style={styles.summaryPillLabel}>C</Text>
              </View>

              <View style={[styles.summaryPill, { backgroundColor: 'rgba(156,140,255,0.08)' }]}>
                <Text style={styles.summaryPillText}>{totalFat}</Text>
                <Text style={styles.summaryPillLabel}>G</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer - Register Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.registerBtn, saving && styles.registerBtnDisabled]}
          onPress={handleLogMeal}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-done" size={20} color={COLORS.bone} />
          <Text style={styles.registerBtnText}>
            {saving ? 'Registrando...' : 'Registrar'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.bone,
  },
  mealTypeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  mealTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },
  mealTypeBtnActive: {
    backgroundColor: COLORS.violet,
  },
  mealTypeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  mealTypeTextActive: {
    color: COLORS.bone,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  foodNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  foodNameInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.bone,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroColumn: {
    flex: 1,
  },
  macroInputContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  macroLabel: {
    marginBottom: 10,
  },
  macroLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  macroUnit: {
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  macroInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroAdjustBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(156,140,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroTextInput: {
    flex: 1,
    backgroundColor: 'rgba(247,242,234,0.05)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.bone,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(156,140,255,0.1)',
  },
  expanderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(156,140,255,0.08)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expanderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.violet,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  summaryPills: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  summaryPillText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.bone,
  },
  summaryPillLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 34,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.violet,
    paddingVertical: 14,
    borderRadius: 12,
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  registerBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.bone,
  },
});
