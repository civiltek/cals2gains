// ============================================
// Cals2Gains - Edit Meal Screen
// ============================================
// Allows users to adjust nutrition, weight, name, and meal type
// after a meal has been logged

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import { useMealStore } from '../store/mealStore';
import { analyzeFoodPhoto } from '../services/openai';
import { MealType } from '../types';
import { canDisplayUri } from '../utils/imageUtils';

export default function EditMealScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const fieldStyles = useMemo(() => createFieldStyles(C), [C]);
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const params = useLocalSearchParams<{ mealJson: string }>();
  const { updateMeal } = useMealStore();

  // Parse meal from params
  const meal = React.useMemo(() => {
    try {
      return JSON.parse(params.mealJson || '{}');
    } catch {
      return null;
    }
  }, [params.mealJson]);

  if (!meal || !meal.id) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={C.error} />
          <Text style={styles.errorText}>
            {t('errors.analysisFailed')}
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Editable fields
  const [dishName, setDishName] = useState(
    lang === 'es' ? (meal.dishNameEs || meal.dishName) : (meal.dishNameEn || meal.dishName)
  );
  const [calories, setCalories] = useState(String(Math.round(meal.nutrition?.calories || 0)));
  const [protein, setProtein] = useState(String(Math.round((meal.nutrition?.protein || 0) * 10) / 10));
  const [carbs, setCarbs] = useState(String(Math.round((meal.nutrition?.carbs || 0) * 10) / 10));
  const [fat, setFat] = useState(String(Math.round((meal.nutrition?.fat || 0) * 10) / 10));
  const [fiber, setFiber] = useState(String(Math.round((meal.nutrition?.fiber || 0) * 10) / 10));
  const [weight, setWeight] = useState(String(meal.estimatedWeight || 0));
  const [mealType, setMealType] = useState<MealType>(meal.mealType || 'snack');
  const [notes, setNotes] = useState(meal.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Original values for proportional weight scaling
  const originalWeight = meal.estimatedWeight || 0;
  const originalNutrition = meal.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

  /**
   * When user finishes editing the weight field, scale all macros proportionally.
   * Only applies if there was a valid original weight to base the ratio on.
   */
  const handleWeightEndEditing = () => {
    const newWeight = parseFloat(weight);
    if (!newWeight || !originalWeight || newWeight === originalWeight) return;

    // Clamp ratio to sane bounds so a fat-finger weight (e.g. 0 or 9999) can't
    // wipe the macros or inflate them to nonsense.
    const rawRatio = newWeight / originalWeight;
    if (!Number.isFinite(rawRatio)) return;
    const ratio = Math.min(20, Math.max(0.1, rawRatio));

    setCalories(String(Math.round((originalNutrition.calories || 0) * ratio)));
    setProtein(String(Math.round(((originalNutrition.protein || 0) * ratio) * 10) / 10));
    setCarbs(String(Math.round(((originalNutrition.carbs || 0) * ratio) * 10) / 10));
    setFat(String(Math.round(((originalNutrition.fat || 0) * ratio) * 10) / 10));
    setFiber(String(Math.round(((originalNutrition.fiber || 0) * ratio) * 10) / 10));
  };

  const handleAiReanalyze = async () => {
    if (!aiContext.trim()) return;
    setIsAiLoading(true);
    try {
      // Build a text-only prompt describing what the user ate + their correction
      // If there's a photo, use it; otherwise do a text-based re-estimation
      const currentDesc = `${dishName}, approximately ${weight}g. Ingredients: ${meal.ingredients?.join(', ') || 'unknown'}.`;
      const fullContext = `${currentDesc}\n\nUSER CORRECTION: ${aiContext.trim()}`;

      if (meal.photoUri) {
        // Re-analyze with original photo + user context
        // We need the base64 — try to fetch it from the URI
        try {
          const response = await fetch(meal.photoUri);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1] || '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          if (base64) {
            const result = await analyzeFoodPhoto(base64, lang as 'es' | 'en', aiContext.trim());
            // Apply AI results to fields
            setCalories(String(Math.round(result.totalNutrition.calories || 0)));
            setProtein(String(Math.round((result.totalNutrition.protein || 0) * 10) / 10));
            setCarbs(String(Math.round((result.totalNutrition.carbs || 0) * 10) / 10));
            setFat(String(Math.round((result.totalNutrition.fat || 0) * 10) / 10));
            setFiber(String(Math.round((result.totalNutrition.fiber || 0) * 10) / 10));
            setWeight(String(result.estimatedWeight || weight));
            if (result.dishNameEs && lang === 'es') setDishName(result.dishNameEs);
            if (result.dishNameEn && lang !== 'es') setDishName(result.dishNameEn);
            setAiContext('');
            Alert.alert(
              t('errors.success'),
              t('common.ok')
            );
            return;
          }
        } catch (photoErr) {
          console.warn('[EditMeal] Could not reload photo for AI, falling back to text-only');
        }
      }

      // Fallback: text-only re-estimation via OpenAI
      const textPrompt = `Re-estimate the nutrition for: ${fullContext}`;
      const result = await analyzeFoodPhoto('', lang as 'es' | 'en', textPrompt);
      setCalories(String(Math.round(result.totalNutrition.calories || 0)));
      setProtein(String(Math.round((result.totalNutrition.protein || 0) * 10) / 10));
      setCarbs(String(Math.round((result.totalNutrition.carbs || 0) * 10) / 10));
      setFat(String(Math.round((result.totalNutrition.fat || 0) * 10) / 10));
      setFiber(String(Math.round((result.totalNutrition.fiber || 0) * 10) / 10));
      setAiContext('');
    } catch (error: any) {
      console.error('[EditMeal] AI re-analyze error:', error);
      Alert.alert(
        t('errors.error'),
        t('errors.analysisFailed')
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const nonNegative = (s: string) => Math.max(0, parseFloat(s) || 0);

      const updates: any = {
        dishName: dishName,
        estimatedWeight: nonNegative(weight) || meal.estimatedWeight || 0,
        mealType,
        notes: notes.trim(),
        nutrition: {
          calories: nonNegative(calories),
          protein: nonNegative(protein),
          carbs: nonNegative(carbs),
          fat: nonNegative(fat),
          fiber: nonNegative(fiber),
        },
      };

      // Update the localized name too
      if (lang === 'es') {
        updates.dishNameEs = dishName;
      } else {
        updates.dishNameEn = dishName;
      }

      await updateMeal(meal.id, updates);
      router.back();
    } catch (error: any) {
      console.error('[EditMeal] Save error:', error);
      Alert.alert(
        t('errors.error'),
        t('errors.saveFailed')
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('analysis.title')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Photo preview */}
          {canDisplayUri(meal.photoUri) ? (
            <Image source={{ uri: meal.photoUri }} style={styles.photo} />
          ) : null}

          {/* Dish name */}
          <View style={styles.section}>
            <Text style={styles.label}>
              {t('analysis.detected')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={dishName}
              onChangeText={setDishName}
              placeholderTextColor={C.textMuted}
            />
          </View>

          {/* Weight */}
          <View style={styles.section}>
            <Text style={styles.label}>
              {t('analysis.editWeight')}
            </Text>
            <TextInput
              style={styles.numberInput}
              value={weight}
              onChangeText={setWeight}
              onEndEditing={handleWeightEndEditing}
              keyboardType="decimal-pad"
              placeholderTextColor={C.textMuted}
            />
            {originalWeight > 0 && (
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>
                {t('analysis.estimatedPortion')}
              </Text>
            )}
          </View>

          {/* Nutrition grid */}
          <View style={styles.section}>
            <Text style={styles.label}>
              {t('analysis.nutritionInfo')}
            </Text>
            <View style={styles.nutritionGrid}>
              <NutritionField
                label="kcal"
                value={calories}
                onChange={setCalories}
                color={C.calories}
              />
              <NutritionField
                label={t('home.protein')}
                value={protein}
                onChange={setProtein}
                color={C.protein}
              />
              <NutritionField
                label={t('home.carbs')}
                value={carbs}
                onChange={setCarbs}
                color={C.carbs}
              />
              <NutritionField
                label={t('home.fat')}
                value={fat}
                onChange={setFat}
                color={C.fat}
              />
              <NutritionField
                label={t('home.fiber')}
                value={fiber}
                onChange={setFiber}
                color={C.fiber}
              />
            </View>
          </View>

          {/* Meal type */}
          <View style={styles.section}>
            <Text style={styles.label}>
              {t('analysis.mealType')}
            </Text>
            <View style={styles.mealTypeRow}>
              {([
                { type: 'breakfast' as MealType, icon: '🌅', label: t('home.breakfast') },
                { type: 'lunch' as MealType, icon: '☀️', label: t('home.lunch') },
                { type: 'dinner' as MealType, icon: '🌙', label: t('home.dinner') },
                { type: 'snack' as MealType, icon: '🍎', label: t('home.snack') },
              ]).map((item) => (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.mealTypeChip,
                    mealType === item.type && styles.mealTypeChipSelected,
                  ]}
                  onPress={() => setMealType(item.type)}
                >
                  <Text style={styles.mealTypeEmoji}>{item.icon}</Text>
                  <Text style={[
                    styles.mealTypeLabel,
                    mealType === item.type && styles.mealTypeLabelSelected,
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* AI re-analysis */}
          <View style={styles.aiSection}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={18} color={C.accent} />
              <Text style={styles.aiTitle}>
                {t('analysis.clarifyTitle')}
              </Text>
            </View>
            <Text style={styles.aiHint}>
              {t('analysis.clarifySubtitle')}
            </Text>
            <TextInput
              style={styles.aiInput}
              value={aiContext}
              onChangeText={setAiContext}
              placeholder={t('analysis.notesPlaceholder')}
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={2}
              maxLength={300}
              editable={!isAiLoading}
            />
            {aiContext.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.aiButton, isAiLoading && styles.aiButtonDisabled]}
                onPress={handleAiReanalyze}
                disabled={isAiLoading}
              >
                {isAiLoading ? (
                  <>
                    <ActivityIndicator color={'#FFFFFF'} size="small" />
                    <Text style={styles.aiButtonText}>
                      {t('camera.analyzing')}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color={'#FFFFFF'} />
                    <Text style={styles.aiButtonText}>
                      {t('analysis.saveMeal')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('analysis.addNotes')}</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 70, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('analysis.notesPlaceholder')}
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={'#FFFFFF'} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color={'#FFFFFF'} />
                <Text style={styles.saveButtonText}>
                  {t('common.save')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Small sub-component for editable nutrition fields ──
const NutritionField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  color: string;
}> = ({ label, value, onChange, color }) => {
  const C = useColors();
  const fieldStyles = useMemo(() => createFieldStyles(C), [C]);
  return (
    <View style={[fieldStyles.box, { borderTopColor: color }]}>
      <TextInput
        style={[fieldStyles.input, { color }]}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        selectTextOnFocus
      />
      <Text style={fieldStyles.label}>{label}</Text>
    </View>
  );
};

function createFieldStyles(C: any) {
  return StyleSheet.create({
    box: {
      flex: 1,
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
      borderTopWidth: 3,
      minWidth: 58,
    },
    input: {
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
      padding: 0,
      minWidth: 40,
    },
    label: {
      fontSize: 11,
      color: C.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
  });
}

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: C.text,
    },
    scrollContent: {
      paddingHorizontal: 16,
    },
    photo: {
      width: '100%',
      height: 180,
      borderRadius: 16,
      marginTop: 16,
    },
    section: {
      marginTop: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: C.textSecondary,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: C.text,
      borderWidth: 1,
      borderColor: C.border,
    },
    numberInput: {
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 18,
      fontWeight: '700',
      color: C.primary,
      borderWidth: 1,
      borderColor: C.border,
      textAlign: 'center',
      width: 120,
    },
    nutritionGrid: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    mealTypeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    mealTypeChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      backgroundColor: C.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: C.border,
      gap: 4,
    },
    mealTypeChipSelected: {
      borderColor: C.primary,
      backgroundColor: C.primary + '15',
    },
    mealTypeEmoji: {
      fontSize: 18,
    },
    mealTypeLabel: {
      fontSize: 11,
      color: C.textSecondary,
      fontWeight: '500',
    },
    mealTypeLabelSelected: {
      color: C.primary,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      backgroundColor: C.primary,
      borderRadius: 16,
      paddingVertical: 18,
      gap: 10,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    aiSection: {
      marginTop: 20,
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.accent + '30',
    },
    aiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    aiTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: C.text,
    },
    aiHint: {
      fontSize: 12,
      color: C.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    aiInput: {
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 14,
      fontSize: 14,
      color: C.text,
      borderWidth: 1,
      borderColor: C.accent + '40',
      minHeight: 56,
      textAlignVertical: 'top',
    },
    aiButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.accent,
      borderRadius: 12,
      paddingVertical: 13,
      marginTop: 10,
      gap: 8,
    },
    aiButtonDisabled: {
      opacity: 0.6,
    },
    aiButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    errorText: {
      fontSize: 16,
      color: C.textSecondary,
    },
    backButton: {
      backgroundColor: C.surface,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    backButtonText: {
      color: C.text,
      fontWeight: '600',
    },
  });
}
