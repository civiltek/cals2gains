// ============================================
// Cals2Gains - Food Analysis Screen
// ============================================
// This is the heart of the app: shows AI analysis results,
// asks clarifying questions, and saves the meal

import React, { useState, useEffect, useMemo } from 'react';
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import ClarificationModal from '../components/modals/ClarificationModal';
import InfoButton from '../components/ui/InfoButton';
import { analyzeFoodPhoto, refineAnalysis } from '../services/openai';
import { useUserStore } from '../store/userStore';
import { useMealStore } from '../store/mealStore';
import { useAnalysisStore } from '../store/analysisStore';
import { FoodAnalysisResult, AnalysisAnswers, MealType } from '../types';
import { formatMacro } from '../utils/nutrition';

type AnalysisState = 'loading' | 'clarifying' | 'ready' | 'error';

export default function AnalysisScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{
    imageUri: string;
    imageBase64: string;
    language: string;
  }>();

  // Read image from shared store (preferred) or fall back to route params
  const analysisStore = useAnalysisStore();
  const imageUri = analysisStore.imageUri || params.imageUri;
  const imageBase64 = analysisStore.imageBase64 || params.imageBase64;
  const lang = (analysisStore.language || params.language as 'es' | 'en') || 'es';

  // On web, file:// URIs don't work — use base64 data URI instead
  const displayImageUri = Platform.OS === 'web' && imageBase64
    ? `data:image/jpeg;base64,${imageBase64}`
    : imageUri;

  const { user } = useUserStore();
  const nutritionMode = useUserStore((s) => s.user?.nutritionMode || 'simple');
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
  const [userContext, setUserContext] = useState('');

  useEffect(() => {
    if (imageBase64) {
      runAnalysis();
    }
  }, []);

  const runAnalysis = async (context?: string) => {
    setState('loading');
    try {
      const result = await analyzeFoodPhoto(
        imageBase64,
        lang,
        context || userContext || undefined,
        user?.allergies || [],
        user?.intolerances || []
      );
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
        imageBase64,
        analysis,
        answers,
        lang,
        userContext || undefined
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

    const weight = parseFloat(customWeight) || analysis.estimatedWeight || 200;
    const estWeight = analysis.estimatedWeight || weight;
    const weightRatio = estWeight > 0 ? weight / estWeight : 1;

    try {
      // Build meal object — Firestore rejects undefined/NaN values
      const mealData: any = {
        userId: user.uid,
        timestamp: new Date(),
        photoUri: Platform.OS === 'web' && imageBase64
          ? `data:image/jpeg;base64,${imageBase64}`
          : (imageUri || ''),
        dishName: analysis.dishName || 'Unknown',
        dishNameEs: analysis.dishNameEs || analysis.dishName || 'Alimento',
        dishNameEn: analysis.dishNameEn || analysis.dishName || 'Food',
        ingredients: analysis.ingredients || [],
        portionDescription: analysis.portionDescription || `${weight}g`,
        estimatedWeight: weight,
        nutrition: {
          calories: Math.round((analysis.totalNutrition.calories || 0) * weightRatio) || 0,
          protein: Math.round((analysis.totalNutrition.protein || 0) * weightRatio * 10) / 10 || 0,
          carbs: Math.round((analysis.totalNutrition.carbs || 0) * weightRatio * 10) / 10 || 0,
          fat: Math.round((analysis.totalNutrition.fat || 0) * weightRatio * 10) / 10 || 0,
          fiber: Math.round((analysis.totalNutrition.fiber || 0) * weightRatio * 10) / 10 || 0,
        },
        mealType: mealType || 'snack',
        aiConfidence: analysis.confidence || 0.7,
      };

      // Only add notes if non-empty (Firestore rejects undefined)
      if (notes.trim()) {
        mealData.notes = notes.trim();
      }
      // Save user context as part of notes if provided
      if (userContext.trim() && !notes.trim()) {
        mealData.notes = `📌 ${userContext.trim()}`;
      } else if (userContext.trim() && notes.trim()) {
        mealData.notes = `📌 ${userContext.trim()} | ${notes.trim()}`;
      }

      await addMeal(mealData);

      router.back();
      router.push('/(tabs)');
    } catch (error: any) {
      console.error('[Analysis] Save error:', error);
      Alert.alert(
        t('errors.saveFailed'),
        error?.message || t('errors.saveFailed')
      );
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
          <Ionicons name="close" size={22} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('analysis.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Loading state */}
        {state === 'loading' && (
          <View style={styles.loadingContainer}>
            {displayImageUri && (
              <Image source={{ uri: displayImageUri }} style={styles.loadingImage} />
            )}
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={C.primary} size="large" />
              <Text style={styles.loadingText}>{t('camera.analyzing')}</Text>
              <Text style={styles.loadingSubtext}>
                {t('camera.analyzing')}
              </Text>
            </View>

            {/* Context input while loading */}
            <View style={styles.contextSection}>
              <Text style={styles.contextLabel}>
                {t('analysis.clarifyTitle')}
              </Text>
              <TextInput
                style={styles.contextInput}
                value={userContext}
                onChangeText={setUserContext}
                placeholder={t('analysis.notesPlaceholder')}
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={2}
                maxLength={300}
              />
              <Text style={styles.contextHint}>
                {t('analysis.clarifySubtitle')}
              </Text>
            </View>
          </View>
        )}

        {/* Refining state */}
        {state === 'clarifying' && isRefining && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={C.primary} size="large" />
            <Text style={styles.loadingText}>
              {t('camera.analyzing')}
            </Text>
          </View>
        )}

        {/* Error state */}
        {state === 'error' && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={56} color={C.error} />
            <Text style={styles.errorTitle}>{t('errors.analysisFailedTitle')}</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => runAnalysis()}>
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {(state === 'ready' || (state === 'clarifying' && !isRefining)) && analysis && (
          <>
            {/* Food image */}
            {displayImageUri && (
              <Image source={{ uri: displayImageUri }} style={styles.foodImage} />
            )}

            {/* Allergen Warning Banner */}
            {analysis.allergenWarnings && analysis.allergenWarnings.length > 0 && (
              <View style={styles.allergenBanner}>
                <Ionicons name="warning" size={20} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.allergenBannerTitle}>{t('allergies.allergenWarningTitle')}</Text>
                  <Text style={styles.allergenBannerText}>
                    {t('allergies.allergenWarning', {
                      allergens: analysis.allergenWarnings
                        .map(a => t(`allergies.${a}` as any, { defaultValue: a }))
                        .join(', '),
                    })}
                  </Text>
                </View>
              </View>
            )}

            {/* Dish name and confidence */}
            <View style={styles.dishSection}>
              <View style={styles.dishHeader}>
                <Text style={styles.dishName}>{dishName}</Text>
                <View style={styles.confidenceBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={C.accent} />
                  <Text style={styles.confidenceText}>
                    {Math.round(analysis.confidence * 100)}%
                  </Text>
                </View>
              </View>

              <Text style={styles.portionDesc}>
                📏 {analysis.portionDescription}
                {analysis.estimatedWeightRange ? ` (${analysis.estimatedWeightRange})` : ''}
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
                <Ionicons name="scale-outline" size={18} color={C.textSecondary} />
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
                    <Ionicons name="pencil-outline" size={14} color={C.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Nutrition info */}
            {adjustedNutrition && (
              <View style={styles.nutritionSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.sectionTitle}>{t('analysis.nutritionInfo')}</Text>
                  <InfoButton
                    emoji="🔢"
                    title={t('infoTooltips.calories_title')}
                    body={t('infoTooltips.calories_body')}
                  />
                </View>

                <View style={styles.calorieHighlight}>
                  <Text style={styles.calorieValue}>{adjustedNutrition.calories}</Text>
                  <Text style={styles.calorieLabel}>kcal</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <InfoButton
                    emoji="🍽️"
                    title={t('infoTooltips.macros_title')}
                    body={t('infoTooltips.macros_body')}
                    size={15}
                  />
                </View>

                <View style={styles.macroGrid}>
                  <NutritionBox
                    label={t('analysis.protein')}
                    value={formatMacro(adjustedNutrition.protein)}
                    unit="g"
                    color={C.protein}
                  />
                  <NutritionBox
                    label={t('analysis.carbs')}
                    value={formatMacro(adjustedNutrition.carbs)}
                    unit="g"
                    color={C.carbs}
                  />
                  <NutritionBox
                    label={t('analysis.fat')}
                    value={formatMacro(adjustedNutrition.fat)}
                    unit="g"
                    color={C.fat}
                  />
                  {nutritionMode === 'advanced' && (
                    <NutritionBox
                      label={t('analysis.fiber')}
                      value={formatMacro(adjustedNutrition.fiber)}
                      unit="g"
                      color={C.fiber}
                    />
                  )}
                </View>

                {/* Per 100g comparison — Advanced mode only */}
                {nutritionMode === 'advanced' && (
                  <View style={styles.per100gSection}>
                    <Text style={styles.per100gTitle}>{t('analysis.per100g')}</Text>
                    <Text style={styles.per100gText}>
                      {Math.round(analysis.nutritionPer100g.calories)} kcal ·{' '}
                      {formatMacro(analysis.nutritionPer100g.protein)}g P ·{' '}
                      {formatMacro(analysis.nutritionPer100g.carbs)}g C ·{' '}
                      {formatMacro(analysis.nutritionPer100g.fat)}g G
                    </Text>
                  </View>
                )}
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

            {/* AI Context — re-analyze */}
            <View style={styles.contextResultSection}>
              <Text style={styles.sectionTitle}>
                {t('analysis.clarifyTitle')}
              </Text>
              <Text style={styles.contextResultHint}>
                {t('analysis.clarifySubtitle')}
              </Text>
              <TextInput
                style={styles.contextInput}
                value={userContext}
                onChangeText={setUserContext}
                placeholder={t('analysis.notesPlaceholder')}
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={2}
                maxLength={300}
              />
              {userContext.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.reanalyzeButton}
                  onPress={() => runAnalysis(userContext)}
                >
                  <Ionicons name="refresh" size={18} color={'#FFFFFF'} />
                  <Text style={styles.reanalyzeButtonText}>
                    {t('analysis.fineTuneMacros')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>{t('analysis.addNotes')}</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('analysis.notesPlaceholder')}
                placeholderTextColor={C.textMuted}
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
                <ActivityIndicator color={'#FFFFFF'} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color={'#FFFFFF'} />
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
}> = ({ label, value, unit, color }) => {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={[styles.nutritionBox, { borderTopColor: color }]}>
      <Text style={[styles.nutritionValue, { color }]}>{value}</Text>
      <Text style={styles.nutritionUnit}>{unit}</Text>
      <Text style={styles.nutritionLabel}>{label}</Text>
    </View>
  );
};

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
    closeButton: {
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
      color: C.text,
    },
    loadingSubtext: {
      fontSize: 14,
      color: C.textSecondary,
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
      color: C.text,
    },
    errorMessage: {
      fontSize: 14,
      color: C.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    retryButton: {
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 28,
      marginTop: 8,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    foodImage: {
      width: '100%',
      height: 240,
      resizeMode: 'cover',
    },
    allergenBanner: {
      marginHorizontal: 16,
      marginBottom: 4,
      backgroundColor: '#CC0000',
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    allergenBannerTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 2,
    },
    allergenBannerText: {
      fontSize: 13,
      color: '#FFFFFF',
      lineHeight: 18,
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
      color: C.text,
      lineHeight: 28,
    },
    confidenceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.accent + '20',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      gap: 4,
    },
    confidenceText: {
      fontSize: 13,
      color: C.accent,
      fontWeight: '600',
    },
    portionDesc: {
      fontSize: 14,
      color: C.textSecondary,
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
      backgroundColor: C.surface,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: C.border,
    },
    ingredientText: {
      fontSize: 13,
      color: C.textSecondary,
    },
    weightSection: {
      marginHorizontal: 16,
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
    },
    weightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    weightLabel: {
      flex: 1,
      fontSize: 14,
      color: C.textSecondary,
    },
    weightInput: {
      fontSize: 18,
      fontWeight: '700',
      color: C.primary,
      borderBottomWidth: 2,
      borderBottomColor: C.primary,
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
      color: C.text,
    },
    nutritionSection: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: C.text,
      marginBottom: 14,
    },
    calorieHighlight: {
      alignItems: 'center',
      marginBottom: 16,
    },
    calorieValue: {
      fontSize: 48,
      fontWeight: '800',
      color: C.text,
      lineHeight: 54,
    },
    calorieLabel: {
      fontSize: 14,
      color: C.textSecondary,
    },
    macroGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    nutritionBox: {
      flex: 1,
      backgroundColor: C.background,
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
      color: C.textMuted,
      marginTop: 1,
    },
    nutritionLabel: {
      fontSize: 11,
      color: C.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    per100gSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    per100gTitle: {
      fontSize: 12,
      color: C.textMuted,
      marginBottom: 4,
    },
    per100gText: {
      fontSize: 13,
      color: C.textSecondary,
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
    contextSection: {
      width: '100%',
      marginTop: 24,
      paddingHorizontal: 4,
    },
    contextLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
      marginBottom: 8,
    },
    contextInput: {
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 14,
      color: C.text,
      borderWidth: 1,
      borderColor: C.primary + '40',
      minHeight: 56,
      textAlignVertical: 'top',
    },
    contextHint: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 6,
      fontStyle: 'italic',
    },
    contextResultSection: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.primary + '30',
    },
    contextResultHint: {
      fontSize: 12,
      color: C.textSecondary,
      marginBottom: 10,
      lineHeight: 18,
    },
    reanalyzeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.accent,
      borderRadius: 12,
      paddingVertical: 12,
      marginTop: 10,
      gap: 8,
    },
    reanalyzeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    notesSection: {
      marginHorizontal: 16,
      marginTop: 12,
    },
    notesInput: {
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 14,
      color: C.text,
      borderWidth: 1,
      borderColor: C.border,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 16,
      marginTop: 20,
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
  });
}
