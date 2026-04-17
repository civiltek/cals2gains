import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import { useMealStore } from '../store/mealStore';
import { useUserStore } from '../store/userStore';
import { useRecipeStore } from '../store/recipeStore';
import { MemoryEngine, Suggestion as MemorySuggestion } from '../services/memoryEngine';
import { PersonalEngine, Suggestion as PersonalSuggestion } from '../services/personalEngine';
import {
  generateAIMealSuggestions,
  AIMealSuggestion,
} from '../services/openai';
import {
  getPendingMessage,
  clearPendingMessage,
  CoachAdjustmentMessage,
} from '../services/adaptiveCoachBridge';
import SafetyDisclaimer from '../components/ui/SafetyDisclaimer';
import AITransparencyBanner from '../components/ui/AITransparencyBanner';

// ============================================================================
// Types
// ============================================================================

type SectionType = 'ai' | 'history' | 'recipes';

interface FrequentMeal {
  name: string;
  count: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ============================================================================
// Helpers
// ============================================================================

function detectCurrentMealType(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 19 && hour < 23) return 'dinner';
  return 'snack';
}

function getMealTypeLabel(
  mealType: string,
  t: (key: string) => string
): string {
  const map: Record<string, string> = {
    breakfast: t('whatToEat.mealTypeBreakfast'),
    lunch: t('whatToEat.mealTypeLunch'),
    dinner: t('whatToEat.mealTypeDinner'),
    snack: t('whatToEat.mealTypeSnack'),
  };
  return map[mealType] || mealType;
}

// ============================================================================
// Main Screen
// ============================================================================

export default function WhatToEatScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);

  // ---- Stores ----
  const { todayNutrition, todayMeals, recentMeals, loadTodayMeals, loadRecentMeals } =
    useMealStore();
  const user = useUserStore((s) => s.user);
  const nutritionMode = useUserStore((s) => s.user?.nutritionMode || 'simple');
  const getActiveGoals = useUserStore((s) => s.getActiveGoals);
  const recipes = useRecipeStore((s) => s.recipes);
  const getFavorites = useRecipeStore((s) => s.getFavorites);

  // ---- State ----
  const [aiSuggestions, setAiSuggestions] = useState<AIMealSuggestion[]>([]);
  const [frequentMeals, setFrequentMeals] = useState<FrequentMeal[]>([]);
  const [contextSuggestions, setContextSuggestions] = useState<MemorySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [coachMessage, setCoachMessage] = useState<CoachAdjustmentMessage | null>(null);

  // ---- Computed ----
  const goals = getActiveGoals?.() || user?.goals;
  const targetCalories = goals?.calories || 2000;
  const targetProtein = goals?.protein || 120;
  const targetCarbs = goals?.carbs || 250;
  const targetFat = goals?.fat || 65;

  const consumed = {
    calories: todayNutrition?.calories || 0,
    protein: todayNutrition?.protein || 0,
    carbs: todayNutrition?.carbs || 0,
    fat: todayNutrition?.fat || 0,
  };

  const remaining = {
    calories: Math.max(0, targetCalories - consumed.calories),
    protein: Math.max(0, targetProtein - consumed.protein),
    carbs: Math.max(0, targetCarbs - consumed.carbs),
    fat: Math.max(0, targetFat - consumed.fat),
  };

  const overBudget =
    consumed.calories > targetCalories && consumed.protein > targetProtein;

  const allMacrosHit =
    remaining.calories <= 50 && remaining.protein <= 5;

  const currentMealType = detectCurrentMealType();
  const mealTypeLabel = getMealTypeLabel(currentMealType, t);

  // ---- Urgency detection ----
  // "high_calories": después de las 14:00 y menos de 300 kcal registradas
  // "high_protein": hora de cenar (≥19h) y quedan ≥50g de proteína
  const hour = new Date().getHours();
  const urgencyMode: 'high_calories' | 'high_protein' | undefined =
    hour >= 19 && remaining.protein >= 50
      ? 'high_protein'
      : hour >= 14 && consumed.calories < 300
      ? 'high_calories'
      : undefined;

  const favoriteRecipes = useMemo(() => {
    try {
      const favs = getFavorites?.();
      return favs || recipes?.filter((r: any) => r.isFavorite) || [];
    } catch {
      return [];
    }
  }, [recipes, getFavorites]);

  // ---- Data Loading ----
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Cargar mensaje pendiente del coach adaptativo
      const pending = await getPendingMessage();
      setCoachMessage(pending);

      // Load meals if needed
      if (user?.uid) {
        await Promise.all([
          loadTodayMeals?.(user.uid),
          loadRecentMeals?.(user.uid),
        ].filter(Boolean));
      }

      // Analyze frequent foods from history
      if (recentMeals && recentMeals.length > 0) {
        const memoryMeals = recentMeals.map((m: any) => ({
          id: m.id,
          name: m.dishName || m.dishNameEs || m.name || 'Unknown',
          calories: m.nutrition?.calories || m.calories || 0,
          protein: m.nutrition?.protein || m.protein || 0,
          carbs: m.nutrition?.carbs || m.carbs || 0,
          fat: m.nutrition?.fat || m.fat || 0,
          mealType: m.mealType || 'lunch',
          timestamp: m.timestamp || new Date(),
        }));

        const patterns = MemoryEngine.analyzeEatingPatterns(memoryMeals);

        // Build frequent meals with nutrition from history
        const frequent: FrequentMeal[] = patterns.frequentFoods
          .slice(0, 6)
          .map((f) => {
            const matchingMeal = memoryMeals.find((m) => m.name === f.name);
            return {
              name: f.name,
              count: f.count,
              calories: matchingMeal?.calories || 0,
              protein: matchingMeal?.protein || 0,
              carbs: matchingMeal?.carbs || 0,
              fat: matchingMeal?.fat || 0,
            };
          });

        setFrequentMeals(frequent);

        // Run MemoryEngine contextual suggestions (time + history + macro based)
        try {
          const memGoals = {
            targetCalories: targetCalories,
            targetProtein: targetProtein,
            targetCarbs: targetCarbs,
            targetFat: targetFat,
            goalType: user?.goalMode || 'maintain',
          };

          const todayMemoryMeals = (todayMeals || []).map((m: any) => ({
            id: m.id,
            name: m.dishName || m.name || 'Unknown',
            calories: m.nutrition?.calories || 0,
            protein: m.nutrition?.protein || 0,
            carbs: m.nutrition?.carbs || 0,
            fat: m.nutrition?.fat || 0,
            mealType: (m.mealType || 'lunch') as any,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }));

          const suggestions = MemoryEngine.getSuggestions(
            new Date(),
            todayMemoryMeals,
            memGoals,
            patterns
          );
          setContextSuggestions(suggestions);
        } catch (err) {
          console.warn('MemoryEngine suggestions error:', err);
        }
      }
    } catch (error) {
      console.error('Error loading what-to-eat data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, recentMeals]);

  const loadAISuggestions = useCallback(async () => {
    if (allMacrosHit || overBudget) return;

    try {
      setAiLoading(true);
      setAiError(false);

      const recentNames = (todayMeals || []).map(
        (m: any) => m.dishName || m.dishNameEs || m.name || ''
      ).filter(Boolean);

      const frequentNames = frequentMeals.map((f) => f.name);

      const suggestions = await generateAIMealSuggestions({
        remainingCalories: remaining.calories,
        remainingProtein: remaining.protein,
        remainingCarbs: remaining.carbs,
        remainingFat: remaining.fat,
        mealType: currentMealType,
        frequentFoods: frequentNames,
        recentMeals: recentNames,
        language: (user?.language as 'es' | 'en') || 'es',
        goalMode: user?.goalMode,
        allergies: user?.allergies || [],
        intolerances: user?.intolerances || [],
        urgencyMode,
      });

      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  }, [remaining, currentMealType, frequentMeals, todayMeals, user, allMacrosHit, overBudget]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && !allMacrosHit && !overBudget) {
      loadAISuggestions();
    }
  }, [loading, allMacrosHit, overBudget]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await loadAISuggestions();
    setRefreshing(false);
  }, [loadData, loadAISuggestions]);

  // ---- Actions ----
  const handleRegisterAI = async (suggestion: AIMealSuggestion) => {
    await Haptics.selectionAsync();
    const lang = user?.language || 'es';
    router.push({
      pathname: '/quick-add',
      params: {
        foodName: lang === 'es' ? suggestion.nameEs : suggestion.nameEn,
        calories: suggestion.calories.toString(),
        protein: suggestion.protein.toString(),
        carbs: suggestion.carbs.toString(),
        fat: suggestion.fat.toString(),
      },
    });
  };

  const handleRegisterFrequent = async (meal: FrequentMeal) => {
    await Haptics.selectionAsync();
    router.push({
      pathname: '/quick-add',
      params: {
        foodName: meal.name,
        calories: meal.calories.toString(),
        protein: meal.protein.toString(),
        carbs: meal.carbs.toString(),
        fat: meal.fat.toString(),
      },
    });
  };

  const handleRegisterRecipe = async (recipe: any) => {
    await Haptics.selectionAsync();
    const nutr = recipe.nutritionPerServing || recipe.totalNutrition || {};
    const lang = user?.language || 'es';
    router.push({
      pathname: '/quick-add',
      params: {
        foodName:
          lang === 'es'
            ? recipe.nameEs || recipe.name
            : recipe.nameEn || recipe.name,
        calories: (nutr.calories || 0).toString(),
        protein: (nutr.protein || 0).toString(),
        carbs: (nutr.carbs || 0).toString(),
        fat: (nutr.fat || 0).toString(),
      },
    });
  };

  // ---- Render: Loading ----
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>{t('whatToEat.loading')}</Text>
      </View>
    );
  }

  // ---- Render: Over budget ----
  if (overBudget) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateEmoji}>😅</Text>
          <Text style={styles.emptyStateTitle}>{t('whatToEat.overBudget')}</Text>
          <Text style={styles.emptyStateText}>{t('whatToEat.overBudgetMsg')}</Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.emptyStateButtonText}>
              {t('whatToEat.viewSummary')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---- Render: All macros hit ----
  if (allMacrosHit) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateEmoji}>🎉</Text>
          <Text style={styles.emptyStateTitle}>{t('whatToEat.goalMetTitle')}</Text>
          <Text style={styles.emptyStateText}>{t('whatToEat.goalMetMsg')}</Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.emptyStateButtonText}>
              {t('whatToEat.viewSummary')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---- Render: Main ----
  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
      }
    >
      {/* Header with meal type context */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('whatToEat.title')}</Text>
        <View style={styles.mealTypeBadge}>
          <Ionicons
            name={
              currentMealType === 'breakfast'
                ? 'sunny'
                : currentMealType === 'lunch'
                ? 'restaurant'
                : currentMealType === 'dinner'
                ? 'moon'
                : 'cafe'
            }
            size={14}
            color={C.primary}
          />
          <Text style={styles.mealTypeText}>{mealTypeLabel}</Text>
        </View>
      </View>

      {/* Remaining Macros Card */}
      <View style={styles.macrosCard}>
        <Text style={styles.macrosTitle}>{t('whatToEat.remainingMacros')}</Text>
        <View style={styles.macrosGrid}>
          <MacroCircle
            label={t('whatToEat.calories')}
            value={remaining.calories}
            total={targetCalories}
            unit="kcal"
            color={C.error}
            icon="flame"
          />
          <MacroCircle
            label={t('whatToEat.protein')}
            value={remaining.protein}
            total={targetProtein}
            unit="g"
            color={C.success}
            icon="barbell"
          />
          <MacroCircle
            label={t('whatToEat.carbs')}
            value={remaining.carbs}
            total={targetCarbs}
            unit="g"
            color={C.info}
            icon="grid"
          />
          <MacroCircle
            label={t('whatToEat.fats')}
            value={remaining.fat}
            total={targetFat}
            unit="g"
            color={C.warning}
            icon="water"
          />
        </View>
      </View>

      {/* Coach Adaptive Adjustment Banner */}
      {coachMessage && (
        <CoachAdjustmentBanner
          message={coachMessage}
          language={(user?.language as 'es' | 'en') || 'es'}
          onDismiss={async () => {
            await clearPendingMessage();
            setCoachMessage(null);
          }}
          C={C}
          t={t}
        />
      )}

      {/* Urgency Banner */}
      {urgencyMode && !coachMessage && (
        <UrgencyBanner
          urgencyMode={urgencyMode}
          consumed={consumed.calories}
          remainingProtein={remaining.protein}
          language={(user?.language as 'es' | 'en') || 'es'}
          C={C}
          t={t}
        />
      )}

      {/* Context Suggestions (MemoryEngine) */}
      {contextSuggestions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="bulb" size={18} color={C.warning} />
            <Text style={styles.sectionTitle}>{t('whatToEat.smartTips')}</Text>
          </View>
          {contextSuggestions.map((suggestion, index) => (
            <View key={`ctx-${index}`} style={styles.contextCard}>
              <View style={[styles.contextIcon, {
                backgroundColor:
                  suggestion.type === 'time' ? C.info + '20'
                  : suggestion.type === 'food' ? C.success + '20'
                  : C.warning + '20',
              }]}>
                <Ionicons
                  name={
                    suggestion.type === 'time' ? 'time'
                    : suggestion.type === 'food' ? 'restaurant'
                    : 'nutrition'
                  }
                  size={16}
                  color={
                    suggestion.type === 'time' ? C.info
                    : suggestion.type === 'food' ? C.success
                    : C.warning
                  }
                />
              </View>
              <Text style={styles.contextText}>
                {(user?.language || 'es') === 'es' ? suggestion.messageEs : suggestion.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* AI Suggestions Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="sparkles" size={18} color={C.primary} />
            <Text style={styles.sectionTitle}>{t('whatToEat.aiSuggestions')}</Text>
          </View>
          {!aiLoading && aiSuggestions.length > 0 && (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => {
                Haptics.selectionAsync();
                loadAISuggestions();
              }}
            >
              <Ionicons name="refresh" size={16} color={C.primary} />
              <Text style={styles.refreshText}>{t('whatToEat.refreshAI')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.sectionSubtitle}>
          {t('whatToEat.aiSuggestionsDesc')}
        </Text>

        {aiLoading ? (
          <View style={styles.aiLoadingContainer}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.aiLoadingText}>{t('whatToEat.loadingAI')}</Text>
          </View>
        ) : aiError ? (
          <TouchableOpacity
            style={styles.errorCard}
            onPress={loadAISuggestions}
          >
            <Ionicons name="warning" size={20} color={C.error} />
            <Text style={styles.errorText}>{t('whatToEat.aiError')}</Text>
          </TouchableOpacity>
        ) : (
          aiSuggestions.map((suggestion, index) => (
            <AISuggestionCard
              key={`ai-${index}`}
              suggestion={suggestion}
              onRegister={() => handleRegisterAI(suggestion)}
              C={C}
              styles={styles}
              t={t}
              lang={(user?.language as 'es' | 'en') || 'es'}
              nutritionMode={nutritionMode}
            />
          ))
        )}
      </View>

      {/* Frequent Meals Section */}
      {frequentMeals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="time" size={18} color={C.warning} />
            <Text style={styles.sectionTitle}>{t('whatToEat.fromHistory')}</Text>
          </View>
          {frequentMeals.map((meal, index) => (
            <FrequentMealCard
              key={`freq-${index}`}
              meal={meal}
              onRegister={() => handleRegisterFrequent(meal)}
              C={C}
              styles={styles}
              t={t}
              nutritionMode={nutritionMode}
            />
          ))}
        </View>
      )}

      {/* Favorite Recipes Section */}
      {favoriteRecipes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="heart" size={18} color={C.error} />
            <Text style={styles.sectionTitle}>{t('whatToEat.fromRecipes')}</Text>
          </View>
          {favoriteRecipes.slice(0, 5).map((recipe: any) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onRegister={() => handleRegisterRecipe(recipe)}
              C={C}
              styles={styles}
              t={t}
              lang={(user?.language as 'es' | 'en') || 'es'}
              nutritionMode={nutritionMode}
            />
          ))}
        </View>
      )}

      {/* AI Act Art. 50 — Transparency banner (Fase B) */}
      <AITransparencyBanner screenKey="what-to-eat" style={{ marginHorizontal: 16, marginTop: 8 }} />

      {/* Safety disclaimer (Fase B) */}
      <SafetyDisclaimer variant="short" style={{ marginHorizontal: 16, marginTop: 12 }} />

      <View style={styles.footerSpacing} />
    </ScrollView>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

// ============================================================================
// Coach Adjustment Banner
// ============================================================================

function CoachAdjustmentBanner({
  message,
  language,
  onDismiss,
  C,
  t,
}: {
  message: CoachAdjustmentMessage;
  language: 'es' | 'en';
  onDismiss: () => void;
  C: any;
  t: any;
}) {
  const explanation =
    language === 'es' ? message.explanationEs : message.explanationEn;

  const changeSign = message.calorieChange > 0 ? '+' : '';
  const calChangeLabel =
    message.calorieChange !== 0
      ? ` (${changeSign}${message.calorieChange} kcal)`
      : '';

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 14,
        backgroundColor: '#9C8CFF18',
        borderWidth: 1,
        borderColor: '#9C8CFF40',
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#9C8CFF25',
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <Ionicons name="fitness" size={18} color="#9C8CFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 13, fontWeight: '700', color: '#9C8CFF', marginBottom: 4 }}
          >
            {t('whatToEat.coachAdjustedTitle')}
            {calChangeLabel}
          </Text>
          <Text
            style={{ fontSize: 13, color: C.text, lineHeight: 18 }}
          >
            {explanation}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color={C.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// Urgency Banner
// ============================================================================

function UrgencyBanner({
  urgencyMode,
  consumed,
  remainingProtein,
  language,
  C,
  t,
}: {
  urgencyMode: 'high_calories' | 'high_protein';
  consumed: number;
  remainingProtein: number;
  language: 'es' | 'en';
  C: any;
  t: any;
}) {
  const isHighCalories = urgencyMode === 'high_calories';
  const color = isHighCalories ? '#FF9800' : '#FF6A4D';

  const titleKey = isHighCalories
    ? 'whatToEat.urgencyCaloriesTitle'
    : 'whatToEat.urgencyProteinTitle';
  const bodyKey = isHighCalories
    ? 'whatToEat.urgencyCaloriesBody'
    : 'whatToEat.urgencyProteinBody';

  const bodyParams = isHighCalories
    ? { calories: Math.round(consumed) }
    : { protein: Math.round(remainingProtein) };

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 14,
        backgroundColor: color + '18',
        borderWidth: 1,
        borderColor: color + '40',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: color + '25',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons
          name={isHighCalories ? 'alert-circle' : 'barbell'}
          size={18}
          color={color}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color, marginBottom: 3 }}>
          {t(titleKey)}
        </Text>
        <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 17 }}>
          {t(bodyKey, bodyParams)}
        </Text>
      </View>
    </View>
  );
}

function MacroCircle({
  label,
  value,
  total,
  unit,
  color,
  icon,
}: {
  label: string;
  value: number;
  total: number;
  unit: string;
  color: string;
  icon: string;
}) {
  const pct = total > 0 ? Math.min(((total - value) / total) * 100, 100) : 0;
  const C = useColors();

  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          borderWidth: 4,
          borderColor: color + '30',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 4,
            borderColor: color,
            borderTopColor: pct > 75 ? color : 'transparent',
            borderRightColor: pct > 50 ? color : 'transparent',
            borderBottomColor: pct > 25 ? color : 'transparent',
            borderLeftColor: pct > 0 ? color : 'transparent',
            transform: [{ rotate: '-90deg' }],
          }}
        />
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: C.text,
        }}
      >
        {Math.round(value)}
      </Text>
      <Text
        style={{
          fontSize: 10,
          color: C.textSecondary,
          fontWeight: '500',
        }}
      >
        {unit} {label.toLowerCase()}
      </Text>
    </View>
  );
}

function AISuggestionCard({
  suggestion,
  onRegister,
  C,
  styles,
  t,
  lang,
  nutritionMode = 'simple',
}: {
  suggestion: AIMealSuggestion;
  onRegister: () => void;
  C: any;
  styles: any;
  t: any;
  lang: 'es' | 'en';
  nutritionMode?: 'simple' | 'advanced';
}) {
  const displayName = lang === 'es' ? suggestion.nameEs : suggestion.nameEn;
  const diffLabel =
    suggestion.difficulty === 'easy'
      ? t('whatToEat.easy')
      : suggestion.difficulty === 'medium'
      ? t('whatToEat.medium')
      : t('whatToEat.hard');

  return (
    <View style={styles.foodCard}>
      <View style={styles.foodCardContent}>
        <View style={styles.foodNameSection}>
          <Text style={styles.foodName}>{displayName}</Text>
          <View style={styles.badgesRow}>
            <View style={[styles.sourceBadge, { backgroundColor: C.primary }]}>
              <Ionicons name="sparkles" size={10} color="#FFF" />
              <Text style={styles.sourceBadgeText}> IA</Text>
            </View>
            <View style={[styles.sourceBadge, { backgroundColor: C.textSecondary + '40' }]}>
              <Ionicons name="time-outline" size={10} color={C.text} />
              <Text style={[styles.sourceBadgeText, { color: C.text }]}>
                {' '}
                {suggestion.prepTime}min
              </Text>
            </View>
            <View
              style={[
                styles.sourceBadge,
                {
                  backgroundColor:
                    suggestion.difficulty === 'easy'
                      ? C.success + '30'
                      : suggestion.difficulty === 'medium'
                      ? C.warning + '30'
                      : C.error + '30',
                },
              ]}
            >
              <Text
                style={[
                  styles.sourceBadgeText,
                  {
                    color:
                      suggestion.difficulty === 'easy'
                        ? C.success
                        : suggestion.difficulty === 'medium'
                        ? C.warning
                        : C.error,
                  },
                ]}
              >
                {diffLabel}
              </Text>
            </View>
          </View>
        </View>

        {suggestion.reason ? (
          <Text style={styles.reasonText}>{suggestion.reason}</Text>
        ) : null}

        <View style={styles.macrosRow}>
          <MacroPill label="kcal" value={suggestion.calories} color={C.error} />
          <MacroPill label="P" value={suggestion.protein} color={C.success} />
          <MacroPill label="C" value={suggestion.carbs} color={C.info} />
          <MacroPill label="G" value={suggestion.fat} color={C.warning} />
        </View>
      </View>

      <TouchableOpacity style={styles.registerButton} onPress={onRegister}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

function FrequentMealCard({
  meal,
  onRegister,
  C,
  styles,
  t,
  nutritionMode = 'simple',
}: {
  meal: FrequentMeal;
  onRegister: () => void;
  C: any;
  styles: any;
  t: any;
  nutritionMode?: 'simple' | 'advanced';
}) {
  return (
    <View style={styles.foodCard}>
      <View style={styles.foodCardContent}>
        <View style={styles.foodNameSection}>
          <Text style={styles.foodName}>{meal.name}</Text>
          <View style={styles.badgesRow}>
            <View style={[styles.sourceBadge, { backgroundColor: C.warning }]}>
              <Text style={styles.sourceBadgeText}>×{meal.count}</Text>
            </View>
          </View>
        </View>
        {meal.calories > 0 && (
          <View style={styles.macrosRow}>
            <MacroPill label="kcal" value={meal.calories} color={C.error} />
            <MacroPill label="P" value={meal.protein} color={C.success} />
            <MacroPill label="C" value={meal.carbs} color={C.info} />
            <MacroPill label="G" value={meal.fat} color={C.warning} />
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.registerButton} onPress={onRegister}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

function RecipeCard({
  recipe,
  onRegister,
  C,
  styles,
  t,
  lang,
  nutritionMode = 'simple',
}: {
  recipe: any;
  onRegister: () => void;
  C: any;
  styles: any;
  t: any;
  lang: 'es' | 'en';
  nutritionMode?: 'simple' | 'advanced';
}) {
  const nutr = recipe.nutritionPerServing || recipe.totalNutrition || {};
  const displayName =
    lang === 'es'
      ? recipe.nameEs || recipe.name
      : recipe.nameEn || recipe.name;

  return (
    <View style={styles.foodCard}>
      <View style={styles.foodCardContent}>
        <View style={styles.foodNameSection}>
          <Text style={styles.foodName}>{displayName}</Text>
          <View style={styles.badgesRow}>
            <View style={[styles.sourceBadge, { backgroundColor: C.error + '30' }]}>
              <Ionicons name="heart" size={10} color={C.error} />
              <Text style={[styles.sourceBadgeText, { color: C.error }]}>
                {' '}
                {t('whatToEat.template')}
              </Text>
            </View>
            {recipe.prepTime && (
              <View style={[styles.sourceBadge, { backgroundColor: C.textSecondary + '40' }]}>
                <Text style={[styles.sourceBadgeText, { color: C.text }]}>
                  {recipe.prepTime + (recipe.cookTime || 0)}min
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.macrosRow}>
          <MacroPill label="kcal" value={nutr.calories || 0} color={C.error} />
          <MacroPill label="P" value={nutr.protein || 0} color={C.success} />
          <MacroPill label="C" value={nutr.carbs || 0} color={C.info} />
          <MacroPill label="G" value={nutr.fat || 0} color={C.warning} />
        </View>
      </View>
      <TouchableOpacity style={styles.registerButton} onPress={onRegister}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

function MacroPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignItems: 'center' as const,
        backgroundColor: color + '18',
        flexDirection: 'row',
        gap: 3,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color }}>
        {Math.round(value)}
      </Text>
      <Text style={{ fontSize: 10, color, fontWeight: '500', opacity: 0.8 }}>
        {label}
      </Text>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    centerContainer: {
      flex: 1,
      backgroundColor: C.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: C.text,
    },
    mealTypeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.primary + '18',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    mealTypeText: {
      fontSize: 13,
      fontWeight: '600',
      color: C.primary,
    },
    macrosCard: {
      marginHorizontal: 16,
      marginVertical: 12,
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
    },
    macrosTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: C.textSecondary,
      marginBottom: 16,
      textAlign: 'center',
    },
    macrosGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    section: {
      marginHorizontal: 16,
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: C.text,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: C.textSecondary,
      marginBottom: 12,
      marginLeft: 26,
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: C.primary + '15',
    },
    refreshText: {
      fontSize: 12,
      fontWeight: '600',
      color: C.primary,
    },
    aiLoadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      gap: 10,
      backgroundColor: C.card,
      borderRadius: 12,
    },
    aiLoadingText: {
      fontSize: 14,
      color: C.textSecondary,
    },
    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: C.error + '15',
      borderRadius: 12,
      padding: 16,
    },
    errorText: {
      fontSize: 14,
      color: C.error,
      flex: 1,
    },
    foodCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      justifyContent: 'space-between',
    },
    foodCardContent: {
      flex: 1,
      marginRight: 10,
    },
    foodNameSection: {
      marginBottom: 8,
    },
    foodName: {
      fontSize: 15,
      fontWeight: '700',
      color: C.text,
      marginBottom: 6,
    },
    badgesRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    sourceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    sourceBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    reasonText: {
      fontSize: 12,
      color: C.textSecondary,
      fontStyle: 'italic',
      marginBottom: 8,
    },
    macrosRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    registerButton: {
      backgroundColor: C.primary,
      borderRadius: 12,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      color: C.textSecondary,
      marginTop: 12,
    },
    emptyStateContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyStateEmoji: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: C.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyStateText: {
      fontSize: 16,
      color: C.textSecondary,
      marginBottom: 24,
      textAlign: 'center',
    },
    emptyStateButton: {
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    emptyStateButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    contextCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      gap: 10,
    },
    contextIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contextText: {
      flex: 1,
      fontSize: 13,
      color: C.text,
      lineHeight: 18,
    },
    footerSpacing: {
      height: 40,
    },
  });
}
