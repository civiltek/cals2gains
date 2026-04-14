import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import { useMealStore } from '../store/mealStore';
import { useUserStore } from '../store/userStore';
import { Meal } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { canDisplayUri } from '../utils/imageUtils';

const { width } = Dimensions.get('window');

interface Ingredient {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
}

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

// Normalize confidence: accepts 0.0–1.0 (decimal) or 0–100 (percent), always returns 0–100
const normalizeConfidence = (val: number): number => {
  if (val <= 1 && val > 0) return Math.round(val * 100);
  return Math.round(val);
};

interface AnalysisResult {
  dishName: string;
  confidence: number; // Always stored as 0–100 after normalization
  ingredients: Ingredient[];
  nutrition: NutritionData;
  portion: number;
  dataSource?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface RouteParams {
  imageBase64?: string;
  analysisResult?: string;
  isQuickRelog?: boolean;
  isFavoriteMeal?: boolean;
  mealData?: string;
}

const MEAL_TYPES = [
  { id: 'breakfast', icon: 'sunny' },
  { id: 'lunch', icon: 'sunny-outline' },
  { id: 'dinner', icon: 'moon' },
  { id: 'snack', icon: 'star' },
];

const DATA_SOURCES = [
  { id: 'openai', label: 'OpenAI Vision', source: 'OpenAI' },
  { id: 'openfoodfacts', label: 'Open Food Facts', source: 'OpenFoodFacts' },
  { id: 'usda', label: 'USDA Database', source: 'USDA' },
];

/**
 * Parse an AnalysisResult from route params.
 * Handles both `analysisResult` (JSON string of FoodAnalysisResult)
 * and `mealData` (JSON string of a previous meal for relog/favorite).
 */
function parseAnalysisFromParams(params: RouteParams): AnalysisResult {
  // Try analysisResult first (from camera → analysis flow)
  if (params.analysisResult) {
    try {
      const raw = JSON.parse(params.analysisResult);
      return {
        dishName: raw.dishNameEs || raw.dishName || '',
        confidence: normalizeConfidence(raw.confidence ?? 75),
        ingredients: (raw.ingredients || []).map((name: string, i: number) => ({
          id: String(i),
          name,
        })),
        nutrition: raw.totalNutrition || raw.nutritionPer100g || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        portion: raw.estimatedWeight || 200,
        dataSource: 'OpenAI Vision',
        mealType: raw.mealType || 'lunch',
      };
    } catch (e) {
      console.warn('Failed to parse analysisResult:', e);
    }
  }

  // Try mealData (relog / favorite)
  if (params.mealData) {
    try {
      const meal = JSON.parse(params.mealData);
      return {
        dishName: meal.dishNameEs || meal.dishName || '',
        confidence: normalizeConfidence(meal.aiConfidence ?? 90),
        ingredients: (meal.ingredients || []).map((name: string, i: number) => ({
          id: String(i),
          name,
          quantity: undefined,
          unit: 'g',
        })),
        nutrition: meal.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        portion: meal.estimatedWeight || 200,
        dataSource: t('aiReview.previousRecord'),
        mealType: meal.mealType || 'lunch',
      };
    } catch (e) {
      console.warn('Failed to parse mealData:', e);
    }
  }

  // Fallback: empty state
  return {
    dishName: '',
    confidence: 0,
    ingredients: [],
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    portion: 200,
    dataSource: '',
    mealType: 'lunch',
  };
}

export default function AIReviewScreen() {
  const C = useColors();
  const { t } = useTranslation();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const params = (route.params || {}) as RouteParams;

  // Determine if we have direct analysis data or need to show meal picker
  const hasDirectData = !!(params.analysisResult || params.mealData || params.imageBase64);

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [pickerMode, setPickerMode] = useState(!hasDirectData);

  // Meal picker state
  const user = useUserStore((s) => s.user);
  const { todayMeals, recentMeals, loadRecentMeals } = useMealStore();

  useEffect(() => {
    if (pickerMode && user?.uid) {
      loadRecentMeals(user.uid);
    }
  }, [pickerMode, user?.uid]);

  // Get meals with photos for the picker
  const mealsWithPhotos = React.useMemo(() => {
    const allMeals = [...todayMeals, ...recentMeals];
    const seen = new Set<string>();
    return allMeals
      .filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return m.photoUri && m.photoUri.length > 0;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [todayMeals, recentMeals]);

  // Build analysis from selected meal or direct params
  const getAnalysisSource = (): AnalysisResult => {
    if (selectedMeal) {
      return {
        dishName: selectedMeal.dishNameEs || selectedMeal.dishName || '',
        confidence: normalizeConfidence(selectedMeal.aiConfidence ?? 75),
        ingredients: (selectedMeal.ingredients || []).map((name, i) => ({
          id: String(i),
          name,
        })),
        nutrition: selectedMeal.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        portion: selectedMeal.estimatedWeight || 200,
        dataSource: t('aiReview.previousRecord'),
        mealType: selectedMeal.mealType || 'lunch',
      };
    }
    return parseAnalysisFromParams(params);
  };

  const initialAnalysis = hasDirectData ? parseAnalysisFromParams(params) : getAnalysisSource();
  const [analysis, setAnalysis] = useState<AnalysisResult>(initialAnalysis);
  const [dishName, setDishName] = useState(initialAnalysis.dishName);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialAnalysis.ingredients
  );
  const [portion, setPortion] = useState(initialAnalysis.portion.toString());
  const [nutrition, setNutrition] = useState<NutritionData>(
    initialAnalysis.nutrition
  );
  const [selectedMealType, setSelectedMealType] = useState<string>(
    initialAnalysis.mealType || 'lunch'
  );
  const [showPerTotal, setShowPerTotal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [imageBase64] = useState<string>(params?.imageBase64 || '');

  // Handle meal selection from picker
  const handleSelectMeal = (meal: Meal) => {
    Haptics.selectionAsync();
    setSelectedMeal(meal);

    const parsed: AnalysisResult = {
      dishName: meal.dishNameEs || meal.dishName || '',
      confidence: normalizeConfidence(meal.aiConfidence ?? 75),
      ingredients: (meal.ingredients || []).map((name, i) => ({
        id: String(i),
        name,
      })),
      nutrition: meal.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      portion: meal.estimatedWeight || 200,
      dataSource: t('aiReview.previousRecord'),
      mealType: meal.mealType || 'lunch',
    };

    setAnalysis(parsed);
    setDishName(parsed.dishName);
    setIngredients(parsed.ingredients);
    setPortion(parsed.portion.toString());
    setNutrition(parsed.nutrition);
    setSelectedMealType(parsed.mealType || 'lunch');
    setPickerMode(false);
  };

  const getConfidenceBadge = () => {
    const confidence = analysis.confidence; // Already normalized to 0–100
    if (confidence >= 80) {
      return {
        color: C.success,
        bgColor: `${C.success}20`,
        label: t('aiReview.highConfidence'),
        icon: 'checkmark-circle',
        subtext: t('aiReview.highConfidenceSubtext'),
      };
    } else if (confidence >= 50) {
      return {
        color: C.warning,
        bgColor: `${C.warning}20`,
        label: t('aiReview.mediumConfidence'),
        icon: 'alert-circle',
        subtext: t('aiReview.mediumConfidenceSubtext'),
      };
    } else {
      return {
        color: C.error,
        bgColor: `${C.error}20`,
        label: t('aiReview.lowConfidence'),
        icon: 'close-circle',
        subtext: t('aiReview.lowConfidenceSubtext'),
      };
    }
  };

  const confidenceBadge = getConfidenceBadge();

  const handleRemoveIngredient = useCallback((id: string) => {
    Haptics.selectionAsync();
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleAddIngredient = useCallback(() => {
    if (newIngredientName.trim()) {
      Haptics.selectionAsync();
      const newId = Math.random().toString(36).substring(7);
      setIngredients((prev) => [
        ...prev,
        {
          id: newId,
          name: newIngredientName,
          quantity: undefined,
          unit: 'g',
        },
      ]);
      setNewIngredientName('');
    }
  }, [newIngredientName]);

  const handlePortionChange = useCallback((value: string) => {
    setPortion(value);
  }, []);

  const handleUpdateNutrition = useCallback(
    (key: keyof NutritionData, value: string) => {
      const numValue = parseInt(value) || 0;
      setNutrition((prev) => ({
        ...prev,
        [key]: numValue,
      }));
    },
    []
  );

  const handleConfirmAndSave = async () => {
    if (!user?.uid) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      // Sanitize nutrition values — no undefined, NaN, or negative
      const safeNum = (v: any, fallback = 0): number => {
        const n = Number(v);
        return isNaN(n) || n < 0 ? fallback : Math.round(n * 10) / 10;
      };

      const safePortion = safeNum(portion, 200);

      const mealData = {
        userId: user.uid,
        timestamp: new Date(),
        photoUri: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : (selectedMeal?.photoUri || ''),
        dishName: dishName || t('aiReview.mealFallback'),
        dishNameEs: dishName || t('aiReview.mealFallback'),
        dishNameEn: dishName || 'Food',
        ingredients: ingredients.map((i) => i.name).filter(Boolean),
        portionDescription: `${safePortion}g`,
        estimatedWeight: safePortion,
        nutrition: {
          calories: safeNum(nutrition.calories),
          protein: safeNum(nutrition.protein),
          carbs: safeNum(nutrition.carbs),
          fat: safeNum(nutrition.fat),
          fiber: safeNum(nutrition.fiber),
        },
        mealType: selectedMealType as any,
        aiConfidence: (analysis.confidence || 75) / 100, // Store as 0-1
      } as any;

      const { addMeal } = useMealStore.getState();
      await addMeal(mealData);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error('Error saving reviewed meal:', error);
      setIsSaving(false);
      const { Alert } = require('react-native');
      Alert.alert(t('errors.error'), t('errors.saveFailed'));
    }
  };

  const handleDiscard = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const isLowConfidence = analysis.confidence < 80;

  const renderIngredient = ({ item }: { item: Ingredient }) => (
    <View style={[
      styles.ingredientChip,
      isLowConfidence && styles.ingredientChipLowConf,
      { backgroundColor: C.surface, borderColor: isLowConfidence ? `${C.warning}50` : C.border, backgroundColor: isLowConfidence ? `${C.warning}08` : C.surface },
    ]}>
      <View style={styles.ingredientContent}>
        <View style={styles.ingredientNameRow}>
          <Text style={[styles.ingredientName, { color: C.text }]}>{item.name}</Text>
          {isLowConfidence && (
            <Text style={[styles.aiSuggestedTag, { color: C.textSecondary, backgroundColor: `${C.warning}15` }]}>{t('aiReview.suggestedByAI')}</Text>
          )}
        </View>
        {item.quantity && (
          <Text style={[styles.ingredientQuantity, { color: C.textSecondary }]}>
            {item.quantity} {item.unit}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => handleRemoveIngredient(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name="close-circle"
          size={18}
          color={C.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );

  const renderMealTypeButton = (mealType: (typeof MEAL_TYPES)[0]) => (
    <TouchableOpacity
      key={mealType.id}
      onPress={() => {
        Haptics.selectionAsync();
        setSelectedMealType(mealType.id);
      }}
      activeOpacity={0.7}
      style={[
        styles.mealTypeButton,
        selectedMealType === mealType.id && styles.mealTypeButtonActive,
        { backgroundColor: selectedMealType === mealType.id ? `${C.violet}15` : C.surface, borderColor: selectedMealType === mealType.id ? C.violet : C.border },
      ]}
    >
      <Ionicons
        name={mealType.icon as any}
        size={20}
        color={
          selectedMealType === mealType.id
            ? C.violet
            : C.textSecondary
        }
      />
      <Text
        style={[
          styles.mealTypeButtonLabel,
          selectedMealType === mealType.id &&
            styles.mealTypeButtonLabelActive,
          { color: selectedMealType === mealType.id ? C.violet : C.textSecondary },
        ]}
      >
        {t(`home.${mealType.id}`)}
      </Text>
    </TouchableOpacity>
  );

  // ── Meal Picker Mode ──
  if (pickerMode) {
    const MEAL_TYPE_LABELS: Record<string, string> = {
      breakfast: t('home.breakfast'),
      lunch: t('home.lunch'),
      dinner: t('home.dinner'),
      snack: t('home.snack'),
    };

    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: C.text }]}>{t('aiReview.title')}</Text>
        </View>

        <View style={[styles.pickerIntro, { backgroundColor: `${C.primary}12`, borderColor: `${C.primary}25` }]}>
          <Ionicons name="camera-outline" size={20} color={C.primary} />
          <Text style={[styles.pickerIntroText, { color: C.text }]}>
            {t('aiReview.pickerIntro')}
          </Text>
        </View>

        {mealsWithPhotos.length === 0 ? (
          <View style={styles.pickerEmpty}>
            <Ionicons name="images-outline" size={56} color={C.textSecondary} />
            <Text style={[styles.pickerEmptyTitle, { color: C.text }]}>{t('aiReview.pickerEmptyTitle')}</Text>
            <Text style={[styles.pickerEmptySubtitle, { color: C.textSecondary }]}>
              {t('aiReview.pickerEmptySubtitle')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={mealsWithPhotos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.pickerList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerCard, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => handleSelectMeal(item)}
                activeOpacity={0.7}
              >
                {canDisplayUri(item.photoUri) ? (
                  <Image source={{ uri: item.photoUri }} style={styles.pickerThumb} />
                ) : (
                  <View style={[styles.pickerThumb, styles.pickerThumbPlaceholder, { backgroundColor: C.border }]}>
                    <Ionicons name="image-outline" size={24} color={C.textSecondary} />
                  </View>
                )}
                <View style={styles.pickerCardContent}>
                  <Text style={[styles.pickerCardName, { color: C.text }]} numberOfLines={1}>
                    {item.dishNameEs || item.dishName}
                  </Text>
                  <Text style={[styles.pickerCardMeta, { color: C.textSecondary }]}>
                    {MEAL_TYPE_LABELS[item.mealType] || item.mealType} · {Math.round(item.nutrition?.calories || 0)} kcal
                  </Text>
                  <Text style={[styles.pickerCardDate, { color: C.textSecondary }]}>
                    {format(item.timestamp, "d MMM · HH:mm", { locale: es })}
                  </Text>
                </View>
                <View style={styles.pickerCardRight}>
                  {(() => {
                    const conf = normalizeConfidence(item.aiConfidence ?? 0);
                    const confColor = conf >= 80 ? C.success : conf >= 50 ? C.warning : C.error;
                    return (
                      <View style={[styles.pickerConfBadge, { backgroundColor: `${confColor}20` }]}>
                        <Text style={[styles.pickerConfText, { color: confColor }]}>
                          {conf > 0 ? `${conf}%` : '--'}
                        </Text>
                      </View>
                    );
                  })()}
                  <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  // ── Review Mode ──
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {selectedMeal && (
            <TouchableOpacity
              onPress={() => {
                setPickerMode(true);
                setSelectedMeal(null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.backToPicker}
            >
              <Ionicons name="arrow-back" size={20} color={C.primary} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: C.text }]}>{t('aiReview.title')}</Text>
        </View>
        <View style={[styles.confidenceBadge, { backgroundColor: confidenceBadge.bgColor }]}>
          <Ionicons
            name={confidenceBadge.icon as any}
            size={16}
            color={confidenceBadge.color}
          />
          <Text style={[styles.confidenceBadgeText, { color: confidenceBadge.color }]}>
            {confidenceBadge.label}
          </Text>
        </View>
      </View>

      {/* AI Explanation Banner */}
      <View style={[styles.aiBanner, { backgroundColor: `${C.primary}12`, borderColor: `${C.primary}25` }]}>
        <Ionicons name="sparkles" size={16} color={C.primary} />
        <Text style={[styles.aiBannerText, { color: C.text }]}>
          {t('aiReview.analysisHint')}
        </Text>
      </View>

      {/* Image Thumbnail */}
      {(imageBase64 || canDisplayUri(selectedMeal?.photoUri)) && (
        <View style={styles.imageContainer}>
          <Image
            source={
              imageBase64
                ? { uri: `data:image/jpeg;base64,${imageBase64}` }
                : { uri: selectedMeal!.photoUri }
            }
            style={styles.imageThumbnail}
          />
        </View>
      )}

      {/* Confidence Meter */}
      <View style={styles.section}>
        <View style={[styles.confidenceMeterContainer, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.meterLabel}>
            <Text style={[styles.meterLabelText, { color: C.text }]}>{t('aiReview.confidence')}</Text>
            <Text style={[styles.meterValue, { color: confidenceBadge.color }]}>
              {analysis.confidence}%
            </Text>
          </View>
          <View style={[styles.meterBar, { backgroundColor: C.border }]}>
            <View
              style={[
                styles.meterFill,
                {
                  width: `${analysis.confidence}%`,
                  backgroundColor: confidenceBadge.color,
                },
              ]}
            />
          </View>
          <Text style={[styles.meterSubtext, { color: confidenceBadge.color }]}>
            {confidenceBadge.subtext}
          </Text>
        </View>
      </View>

      {/* Dish Name */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: C.text }]}>{t('aiReview.dishName')}</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: C.surface, borderColor: C.borderLight, color: C.bone }]}
          value={dishName}
          onChangeText={setDishName}
          placeholder={t('aiReview.dishNamePlaceholder')}
          placeholderTextColor={C.textTertiary}
        />
      </View>

      {/* Ingredients */}
      <View style={styles.section}>
        <View style={styles.ingredientsHeader}>
          <Text style={[styles.sectionLabel, { color: C.text }]}>{t('aiReview.ingredients')}</Text>
          <Text style={[styles.ingredientCount, { color: C.textSecondary, backgroundColor: `${C.violet}15` }]}>{ingredients.length}</Text>
        </View>

        {analysis.confidence < 80 && (
          <View style={styles.lowConfidenceNote}>
            <Ionicons name="alert-circle-outline" size={14} color={C.warning} />
            <Text style={[styles.lowConfidenceNoteText, { color: C.warning }]}>
              {t('aiReview.mediumConfidence')}
            </Text>
          </View>
        )}

        <FlatList
          data={ingredients}
          renderItem={renderIngredient}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.ingredientsList}
        />

        <View style={styles.addIngredientContainer}>
          <TextInput
            style={[styles.ingredientInput, { backgroundColor: C.surface, borderColor: C.borderLight, color: C.bone }]}
            value={newIngredientName}
            onChangeText={setNewIngredientName}
            placeholder={t('aiReview.newIngredientPlaceholder')}
            placeholderTextColor={C.textTertiary}
          />
          <TouchableOpacity
            onPress={handleAddIngredient}
            style={styles.addIngredientButton}
          >
            <Ionicons
              name="add-circle"
              size={24}
              color={C.violet}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Portion */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: C.text }]}>{t('aiReview.portion')}</Text>
        <View style={[styles.portionControl, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <TouchableOpacity
            onPress={() => {
              const newVal = Math.max(10, parseInt(portion) - 50);
              setPortion(newVal.toString());
              Haptics.selectionAsync();
            }}
            style={styles.portionButton}
          >
            <Ionicons
              name="remove"
              size={24}
              color={C.violet}
            />
          </TouchableOpacity>

          <TextInput
            style={[styles.portionInput, { color: C.violet }]}
            value={portion}
            onChangeText={handlePortionChange}
            keyboardType="numeric"
            textAlign="center"
          />

          <TouchableOpacity
            onPress={() => {
              const newVal = parseInt(portion) + 50;
              setPortion(newVal.toString());
              Haptics.selectionAsync();
            }}
            style={styles.portionButton}
          >
            <Ionicons
              name="add"
              size={24}
              color={C.violet}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Per 100g vs Total Toggle */}
      <View style={styles.section}>
        <View style={styles.toggleContainer}>
          <Text style={[styles.sectionLabel, { color: C.text }]}>{t('aiReview.values')}</Text>
          <View style={styles.toggleButtons}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setShowPerTotal(false);
              }}
              style={[
                styles.toggleButton,
                !showPerTotal && styles.toggleButtonActive,
                { backgroundColor: !showPerTotal ? C.violet : C.surface, borderColor: !showPerTotal ? C.violet : C.border },
              ]}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  !showPerTotal && styles.toggleButtonTextActive,
                  { color: !showPerTotal ? C.white : C.textSecondary },
                ]}
              >
                Por 100g
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setShowPerTotal(true);
              }}
              style={[
                styles.toggleButton,
                showPerTotal && styles.toggleButtonActive,
                { backgroundColor: showPerTotal ? C.violet : C.surface, borderColor: showPerTotal ? C.violet : C.border },
              ]}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  showPerTotal && styles.toggleButtonTextActive,
                  { color: showPerTotal ? C.white : C.textSecondary },
                ]}
              >
                Total
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Nutrition Macros */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: C.text }]}>Macros</Text>
        <View style={styles.macroGrid}>
          <View style={[styles.macroCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.macroLabel, { color: C.textSecondary }]}>{t('nutrition.calories')}</Text>
            <TextInput
              style={[styles.macroInput, { color: C.violet }]}
              value={nutrition.calories.toString()}
              onChangeText={(value) =>
                handleUpdateNutrition('calories', value)
              }
              keyboardType="numeric"
              textAlign="center"
            />
            <Text style={[styles.macroUnit, { color: C.textSecondary }]}>kcal</Text>
          </View>

          <View style={[styles.macroCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.macroLabel, { color: C.textSecondary }]}>{t('nutrition.protein')}</Text>
            <TextInput
              style={[styles.macroInput, { color: C.violet }]}
              value={nutrition.protein.toString()}
              onChangeText={(value) =>
                handleUpdateNutrition('protein', value)
              }
              keyboardType="numeric"
              textAlign="center"
            />
            <Text style={[styles.macroUnit, { color: C.textSecondary }]}>g</Text>
          </View>

          <View style={[styles.macroCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.macroLabel, { color: C.textSecondary }]}>{t('nutrition.carbs')}</Text>
            <TextInput
              style={[styles.macroInput, { color: C.violet }]}
              value={nutrition.carbs.toString()}
              onChangeText={(value) => handleUpdateNutrition('carbs', value)}
              keyboardType="numeric"
              textAlign="center"
            />
            <Text style={[styles.macroUnit, { color: C.textSecondary }]}>g</Text>
          </View>

          <View style={[styles.macroCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.macroLabel, { color: C.textSecondary }]}>{t('nutrition.fat')}</Text>
            <TextInput
              style={[styles.macroInput, { color: C.violet }]}
              value={nutrition.fat.toString()}
              onChangeText={(value) => handleUpdateNutrition('fat', value)}
              keyboardType="numeric"
              textAlign="center"
            />
            <Text style={[styles.macroUnit, { color: C.textSecondary }]}>g</Text>
          </View>

          <View style={[styles.macroCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.macroLabel, { color: C.textSecondary }]}>{t('common.fiber')}</Text>
            <TextInput
              style={[styles.macroInput, { color: C.violet }]}
              value={nutrition.fiber.toString()}
              onChangeText={(value) => handleUpdateNutrition('fiber', value)}
              keyboardType="numeric"
              textAlign="center"
            />
            <Text style={[styles.macroUnit, { color: C.textSecondary }]}>g</Text>
          </View>
        </View>
      </View>

      {/* Meal Type Selector */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: C.text }]}>{t('aiReview.mealType')}</Text>
        <View style={styles.mealTypesContainer}>
          {MEAL_TYPES.map(renderMealTypeButton)}
        </View>
      </View>

      {/* Data Sources */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: C.text }]}>{t('aiReview.dataSources')}</Text>
        <View style={[styles.dataSourceCard, { backgroundColor: `${C.violet}10`, borderColor: `${C.violet}20` }]}>
          <Ionicons
            name="information-circle"
            size={16}
            color={C.violet}
          />
          <View style={styles.dataSourceContent}>
            <Text style={[styles.dataSourceTitle, { color: C.text }]}>{t('aiReview.multiSourceAnalysis')}</Text>
            <Text style={[styles.dataSourceText, { color: C.textSecondary }]}>
              OpenAI Vision + {'\n'}OpenFoodFacts + USDA Database
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.section}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleDiscard}
            style={[styles.discardButton, { backgroundColor: C.surface, borderColor: C.violet }]}
            disabled={isSaving}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={C.violet}
            />
            <Text style={[styles.discardButtonText, { color: C.violet }]}>{t('common.discard')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirmAndSave}
            style={[styles.confirmButton, { backgroundColor: C.violet }]}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={C.white}
              />
            ) : (
              <>
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={C.white}
                />
                <Text style={[styles.confirmButtonText, { color: C.white }]}>
                  {t('aiReview.confirmAndRegister')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backToPicker: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  // ── Picker styles ──
  pickerIntro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
  },
  pickerIntroText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  pickerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  pickerEmptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  pickerEmptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  pickerList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
  },
  pickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    gap: 12,
    borderWidth: 1,
  },
  pickerThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  pickerThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCardContent: {
    flex: 1,
  },
  pickerCardName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  pickerCardMeta: {
    fontSize: 12,
    marginBottom: 2,
  },
  pickerCardDate: {
    fontSize: 11,
  },
  pickerCardRight: {
    alignItems: 'center',
    gap: 6,
  },
  pickerConfBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pickerConfText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  confidenceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
  },
  aiBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  imageContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  imageThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  section: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  confidenceMeterContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  meterLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meterLabelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  meterValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  meterBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  meterSubtext: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientCount: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ingredientsList: {
    gap: 8,
    marginBottom: 12,
  },
  lowConfidenceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  lowConfidenceNoteText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ingredientChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  ingredientChipLowConf: {
    borderWidth: 1,
  },
  ingredientContent: {
    flex: 1,
  },
  ingredientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  aiSuggestedTag: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ingredientQuantity: {
    fontSize: 11,
  },
  addIngredientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addIngredientButton: {
    padding: 6,
  },
  portionControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  portionButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portionInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  toggleButtonActive: {
    borderWidth: 1,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    fontWeight: '600',
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  macroCard: {
    width: (width - 32 - 16) / 2.5,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  macroInput: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  macroUnit: {
    fontSize: 10,
    marginTop: 4,
  },
  mealTypesContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  mealTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  mealTypeButtonActive: {
    borderWidth: 1,
  },
  mealTypeButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  mealTypeButtonLabelActive: {
    fontSize: 11,
    fontWeight: '600',
  },
  dataSourceCard: {
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
  },
  dataSourceContent: {
    flex: 1,
  },
  dataSourceTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  dataSourceText: {
    fontSize: 12,
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  discardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  discardButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 32,
  },
});
