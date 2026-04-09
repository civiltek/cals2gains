// ============================================
// Cals2Gains - Food Analysis Screen
// ============================================
// This is the heart of the app: shows AI analysis results,
// asks clarifying questions, and saves the meal

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors from '../constants/colors';
import ClarificationModal from '../components/modals/ClarificationModal';
import { analyzeFoodPhoto, refineAnalysis } from '../services/openai';
import { useUserStore } from '../store/userStore';
import { useMealStore } from '../store/mealStore';
import { FoodAnalysisResult, AnalysisAnswers, MealType } from '../types';
import { formatMacro } from '../utils/nutrition';

type AnalysisState = 'loading' | 'clarifying' | 'ready' | 'error';

export default function AnalysisScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{
    imageUri: string;
    imageBase64: string;
    language: string;
  }>();

  const { user } = useUserStore();
  const { addMeal } = useMealStore();

  const [state, setState] = useState<AnalysisState>('loading');
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);
  const [showClarification, setShowClarification] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [notes, setNotes] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingWeight, setEditingWeight] = useState(false);
  const [customWeight, setCustomWeight] = useState('');

  const lang = (params.language as 'es' | 'en') || 'es';

  useEffect(() => {
    if (params.imageBase64) {
      runAnalysis();
    }
  }, []);

  const runAnalysis = async () => {
    setState('loading');
    try {
      const result = await analyzeFoodPhoto(params.imageBase64, lang);
      setAnalysis(result);
      setMealType(result.mealType);
      setCustomWeight(String(result.estimatedWeight));

      // If there are clarifying questions, show modal
      if (result.clarifyingQuestions.length > 0) {
        setState('clarifying');
        setShowClarification(true);
      } else {
        setState('ready');
      }
    } catch (error: any) {
      setState('error');
      setErrorMessage(error.message || t('errors.analysisFailed'));
    }
  };

  const handleClarificationConfirm = async (answers: AnalysisAnswers) => {
    if (!analysis) return;
    setShowClarification(false);
    setIsRefining(true);

    try {
      const refined = await refineAnalysis(
        params.imageBase64,
        analysis,
        answers,
        lang
      );
      setAnalysis(refined);
      setState('ready');
    } catch (error) {
      // Use original analysis if refinement fails
      setState('ready');
    } finally {
      setIsRefining(false);
    }
  };

  const handleClarificationSkip = () => {
    setShowClarification(false);
    setState('ready');
  };

  const handleSaveMeal = async () => {
    if (!analysis || !user) return;
    setIsSaving(true);

    const weight = parseFloat(customWeight) || analysis.estimatedWeight;
    const weightRatio = weight / analysis.estimatedWeight;

    try {
      await addMeal({
        userId: user.uid,
        timestamp: new Date(),
        photoUri: params.imageUri,
        dishName: analysis.dishName,
        dishNameEs: analysis.dishNameEs,
        dishNameEn: analysis.dishNameEn,
        ingredients: analysis.ingredients,
        portionDescription: analysis.portionDescription,
        estimatedWeight: weight,
        nutrition: {
          calories: Math.round(analysis.totalNutrition.calories * weightRatio),
          protein: Math.round(analysis.totalNutrition.protein * weightRatio * 10) / 10,
          carbs: Math.round(analysis.totalNutrition.carbs * weightRatio * 10) / 10,
          fat: Math.round(analysis.totalNutrition.fat * weightRatio * 10) / 10,
          fiber: Math.round((analysis.totalNutrition.fiber || 0) * weightRatio * 10) / 10,
        },
        notes: notes.trim() || undefined,
        mealType,
        aiConfidence: analysis.confidence,
      });

      router.back();
      router.push('/(tabs)');
    } catch (error) {
      Alert.alert(t('errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const dishName = analysis
    ? (lang === 'es' ? analysis.dishNameEs : analysis.dishNameEn) || analysis.dishName
    : '';

  const weight = parseFloat(customWeight) || analysis?.estimatedWeight || 0;
  const weightRatio = analysis ? weight / analysis.estimatedWeight : 1;

  const adjustedNutrition = analysis
    ? {
        calories: Math.round(analysis.totalNutrition.calories * weightRatio),
        protein: Math.round(analysis.totalNutrition.protein * weightRatio * 10) / 10,
        carbs: Math.round(analysis.totalNutrition.carbs * weightRatio * 10) / 10,
        fat: Math.round(analysis.totalNutrition.fat * weightRatio * 10) / 10,
        fiber: Math.round((analysis.totalNutrition.fiber || 0) * weightRatio * 10) / 10,
      }
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('analysis.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Loading state */}
        {state === 'loading' && (
          <View style={styles.loadingContainer}>
            {params.imageUri && (
              <Image source={{ uri: params.imageUri }} style={styles.loadingImage} />
            )}
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.loadingText}>{t('camera.analyzing')}</Text>
              <Text style={styles.loadingSubtext}>
                {lang === 'es'
                  ? 'La IA está analizando los ingredientes y calculando los macros...'
                  : 'AI is analyzing ingredients and calculating macros...'}
              </Text>
            </View>
          </View>
        )}

        {/* Refining state */}
        {state === 'clarifying' && isRefining && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>
              {lang === 'es' ? 'Recalculando...' : 'Recalculating...'}
            </Text>
          </View>
        )}

        {/* Error state */}
        {state === 'error' && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={56} color={Colors.error} />
            <Text style={styles.errorTitle}>{t('errors.analysisFailedTitle')}</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={runAnalysis}>
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {(state === 'ready' || (state === 'clarifying' && !isRefining)) && analysis && (
          <>
            {/* Food image */}
            {params.imageUri && (
              <Image source={{ uri: params.imageUri }} style={styles.foodImage} />
            )}

            {/* Dish name and confidence */}
            <View style={styles.dishSection}>
              <View style={styles.dishHeader}>
                <Text style={styles.dishName}>{dishName}</Text>
                <View style={styles.confidenceBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
                  <Text style={styles.confidenceText}>
                    {Math.round(analysis.confidence * 100)}%
                  </Text>
                </View>
              </View>

              <Text style={styles.portionDesc}>
                📏 {analysis.portionDescription}
              </Text>

              {/* Ingredients */}
              {analysis.ingredients.length > 0 && (
                <View style={styles.ingredientsList}>
                  {analysis.ingredients.slice(0, 6).map((ing, i) => (
                    <View key={i} style={styles.ingredientChip}>
                      <Text style={styles.ingredientText}>{ing}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Weight editor */}
            <View style={styles.weightSection}>
              <View style={styles.weightRow}>
                <Ionicons name="scale-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.weightLabel}>{t('analysis.estimatedPortion')}</Text>
                {editingWeight ? (
                  <TextInput
                    style={styles.weightInput}
                    value={customWeight}
                    onChangeText={setCustomWeight}
                    keyboardType="decimal-pad"
                    autoFocus
                    onBlur={() => setEditingWeight(false)}
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => setEditingWeight(true)}
                    style={styles.weightValueButton}
                  >
                    <Text style={styles.weightValue}>{customWeight}g</Text>
                    <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Nutrition info */}
            {adjustedNutrition && (
              <View style={styles.nutritionSection}>
                <Text style={styles.sectionTitle}>{t('analysis.nutritionInfo')}</Text>

                <View style={styles.calorieHighlight}>
                  <Text style={styles.calorieValue}>{adjustedNutrition.calories}</Text>
                  <Text style={styles.calorieLabel}>kcal</Text>
                </View>

                <View style={styles.macroGrid}>
                  <NutritionBox
                    label={t('analysis.protein')}
                    value={formatMacro(adjustedNutrition.protein)}
                    unit="g"
                    color={Colors.protein}
                  />
                  <NutritionBox
                    label={t('analysis.carbs')}
                    value={formatMacro(adjustedNutrition.carbs)}
                    unit="g"
                    color={Colors.carbs}
                  />
                  <NutritionBox
                    label={t('analysis.fat')}
                    value={formatMacro(adjustedNutrition.fat)}
                    unit="g"
                    color={Colors.fat}
                  />
                  <NutritionBox
                    label={t('analysis.fiber')}
                    value={formatMacro(adjustedNutrition.fiber)}
                    unit="g"
                    color={Colors.fiber}
                  />
                </View>

                {/* Per 100g comparison */}
                <View style={styles.per100gSection}>
                  <Text style={styles.per100gTitle}>{t('analysis.per100g')}</Text>
                  <Text style={styles.per100gText}>
                    {Math.round(analysis.nutritionPer100g.calories)} kcal ·{' '}
                    {formatMacro(analysis.nutritionPer100g.protein)}g P ·{' '}
                    {formatMacro(analysis.nutritionPer100g.carbs)}g C ·{' '}
                    {formatMacro(analysis.nutritionPer100g.fat)}g G
                  </Text>
                </View>
              </View>
            )}

            {/* Meal type */}
            <View style={styles.mealTypeSection}>
              <Text style={styles.sectionTitle}>{t('analysis.mealType')}</Text>
              <View style={styles.mealTypeRow}>
                {([
                  { type: 'breakfast', icon: '🌅', label: t('home.breakfast') },
                  { type: 'lunch', icon: '☀️', label: t('home.lunch') },
                  { type: 'dinner', icon: '🌙', label: t('home.dinner') },
                  { type: 'snack', icon: '🍎', label: t('home.snack') },
                ] as { type: MealType; icon: string; label: string }[]).map((item) => (
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

            {/* Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>{t('analysis.addNotes')}</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('analysis.notesPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveMeal}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
                  <Text style={styles.saveButtonText}>{t('analysis.saveMeal')}</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* Clarification Modal */}
      {analysis && (
        <ClarificationModal
          visible={showClarification}
          questions={analysis.clarifyingQuestions}
          dishName={dishName}
          onConfirm={handleClarificationConfirm}
          onSkip={handleClarificationSkip}
          isRefining={isRefining}
        />
      )}
    </SafeAreaView>
  );
}

const NutritionBox: React.FC<{
  label: string;
  value: string;
  unit: string;
  color: string;
}> = ({ label, value, unit, color }) => (
  <View style={[styles.nutritionBox, { borderTopColor: color }]}>
    <Text style={[styles.nutritionValue, { color }]}>{value}</Text>
    <Text style={styles.nutritionUnit}>{unit}</Text>
    <Text style={styles.nutritionLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
    gap: 20,
  },
  loadingImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    opacity: 0.4,
  },
  loadingOverlay: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  foodImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  dishSection: {
    padding: 20,
    paddingBottom: 12,
  },
  dishHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  dishName: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 28,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '20',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  confidenceText: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '600',
  },
  portionDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  ingredientChip: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ingredientText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  weightSection: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weightLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  weightInput: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    minWidth: 60,
    textAlign: 'right',
    padding: 0,
  },
  weightValueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  nutritionSection: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  calorieHighlight: {
    alignItems: 'center',
    marginBottom: 16,
  },
  calorieValue: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 54,
  },
  calorieLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  nutritionBox: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  nutritionUnit: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  nutritionLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  per100gSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  per100gTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  per100gText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  mealTypeSection: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
  },
  mealTypeChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  mealTypeEmoji: {
    fontSize: 18,
  },
  mealTypeLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  mealTypeLabelSelected: {
    color: Colors.primary,
  },
  notesSection: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: Colors.primary,
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
    color: Colors.white,
  },
});
