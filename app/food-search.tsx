// ============================================
// Cals2Gains - Food Search & Add Screen
// ============================================
// Multi-input food logging: text search, barcode, AI analysis
// Uses Open Food Facts API + GPT-5.4 for text analysis

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMealStore } from '../store/mealStore';
import { useUserStore } from '../store/userStore';
import { useTemplateStore } from '../store/templateStore';
import { useColors } from '../store/themeStore';
import { searchFoods, lookupBarcode, analyzeTextFood } from '../services/foodDatabase';
import { FoodItem, MealTemplate } from '../types';
import { useTranslation } from 'react-i18next';

// ============================================
// CONSTANTS
// ============================================

const MEAL_TYPES = [
  { id: 'breakfast', icon: 'sunny-outline' },
  { id: 'lunch', icon: 'restaurant-outline' },
  { id: 'dinner', icon: 'moon-outline' },
  { id: 'snack', icon: 'cafe-outline' },
] as const;

// ============================================
// COMPONENT
// ============================================

export default function FoodSearchScreen() {
  const C = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: string }>();
  const { addMeal } = useMealStore();
  const user = useUserStore((s) => s.user);
  const { templates, loadTemplates } = useTemplateStore();
  const styles = createStyles(C);

  // State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);
  // Custom weight override (grams). When set, replaces servings × servingSize.
  // Testers asked for fine-grained portion control (not only 0.5 increments).
  const [customGrams, setCustomGrams] = useState<string>('');
  const [mealType, setMealType] = useState(params.mealType || 'lunch');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadTemplates(user?.uid || '');
  }, []);

  // Clear any pending debounced search if the screen is unmounted mid-query —
  // avoids setState on an unmounted component when the user navigates away.
  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  // Debounced search
  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    setSelectedItem(null);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.length < 2) {
      setResults([]);
      return;
    }

    // Check if text looks like a barcode (all digits, 8-13 chars)
    const isBarcode = /^\d{8,13}$/.test(text.trim());

    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (isBarcode) {
          const product = await lookupBarcode(text.trim());
          setResults(product ? [product] : []);
        } else {
          const { items } = await searchFoods(text.trim());
          setResults(items);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  }, []);

  // AI text analysis fallback
  const handleAIAnalysis = async () => {
    if (!query.trim()) return;
    setAnalyzing(true);
    try {
      const result = await analyzeTextFood(query.trim(), 'es');
      if (result) {
        setResults([result]);
        setSelectedItem(result);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Error', t('foodSearch.analyzeError'));
    } finally {
      setAnalyzing(false);
    }
  };

  // Resolve effective weight (grams): custom input overrides servings × servingSize
  const resolveEffectiveGrams = useCallback((): number => {
    if (!selectedItem) return 0;
    const servingSize = selectedItem.servingSize || 100;
    const custom = parseFloat(customGrams);
    if (Number.isFinite(custom) && custom > 0) return Math.max(1, Math.round(custom));
    return Math.max(1, Math.round(servingSize * servings));
  }, [selectedItem, customGrams, servings]);

  // Log selected food
  const handleLogFood = async () => {
    if (!selectedItem || !user?.uid) return;

    // Prefer per-100g nutrition when scaling by custom grams (more accurate);
    // fall back to nutritionPerServing when only servings are used.
    const per100g = selectedItem.nutritionPer100g;
    const nutritionPerServing = selectedItem.nutritionPerServing || per100g;
    if (!nutritionPerServing && !per100g) return;

    const grams = resolveEffectiveGrams();

    // Scale: if we have per-100g values, use grams/100. Otherwise fall back to servings.
    let scaledNutrition;
    if (per100g) {
      const factor = grams / 100;
      scaledNutrition = {
        calories: Math.round((per100g.calories || 0) * factor),
        protein: Math.round((per100g.protein || 0) * factor * 10) / 10,
        carbs: Math.round((per100g.carbs || 0) * factor * 10) / 10,
        fat: Math.round((per100g.fat || 0) * factor * 10) / 10,
        fiber: Math.round((per100g.fiber || 0) * factor * 10) / 10,
      };
    } else {
      const s = grams / (selectedItem.servingSize || 100);
      scaledNutrition = {
        calories: Math.round((nutritionPerServing!.calories || 0) * s),
        protein: Math.round((nutritionPerServing!.protein || 0) * s * 10) / 10,
        carbs: Math.round((nutritionPerServing!.carbs || 0) * s * 10) / 10,
        fat: Math.round((nutritionPerServing!.fat || 0) * s * 10) / 10,
        fiber: Math.round((nutritionPerServing!.fiber || 0) * s * 10) / 10,
      };
    }

    try {
      await addMeal({
        userId: user.uid,
        timestamp: new Date(),
        photoUri: '',
        dishName: selectedItem.name || t('foodSearch.food'),
        dishNameEs: selectedItem.nameEs || selectedItem.name || t('foodSearch.food'),
        dishNameEn: selectedItem.nameEn || selectedItem.name || 'Food',
        ingredients: [],
        portionDescription: selectedItem.brand
          ? `${selectedItem.brand} · ${grams}g`
          : `${grams}g`,
        estimatedWeight: grams,
        nutrition: scaledNutrition,
        mealType: mealType as any,
        aiConfidence: 1.0,
      } as any);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Food search save error:', error);
      Alert.alert('Error', t('foodSearch.logError'));
    }
  };

  // Log from template
  const handleTemplateLog = async (template: MealTemplate) => {
    if (!user?.uid) return;
    try {
      await addMeal({
        userId: user.uid,
        timestamp: new Date(),
        photoUri: template.photoUri || '',
        dishName: template.dishName || template.name || t('foodSearch.template'),
        dishNameEs: template.dishNameEs || template.name || t('foodSearch.template'),
        dishNameEn: template.dishNameEn || template.name || 'Template',
        ingredients: template.ingredients || [],
        portionDescription: template.portionDescription || t('foodSearch.oneServing'),
        estimatedWeight: template.estimatedWeight || 100,
        nutrition: {
          calories: template.nutrition?.calories || 0,
          protein: template.nutrition?.protein || 0,
          carbs: template.nutrition?.carbs || 0,
          fat: template.nutrition?.fat || 0,
          fiber: template.nutrition?.fiber || 0,
        },
        mealType: mealType as any,
        aiConfidence: 1.0,
      } as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Template save error:', error);
      Alert.alert('Error', t('foodSearch.logError'));
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderFoodItem = ({ item }: { item: FoodItem }) => {
    const isSelected = selectedItem?.name === item.name;
    const nutrition = item.nutritionPerServing || item.nutritionPer100g;

    return (
      <TouchableOpacity
        style={[styles.resultCard, isSelected && styles.resultCardSelected]}
        onPress={() => {
          setSelectedItem(item);
          setServings(1);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.resultInfo}>
          <Text style={[styles.resultName, { color: C.text }]} numberOfLines={2}>{item.name}</Text>
          {item.brand && (
            <Text style={[styles.resultBrand, { color: C.textSecondary }]}>{item.brand}</Text>
          )}
          <View style={styles.macroPills}>
            <View style={[styles.pill, { backgroundColor: 'rgba(156,140,255,0.15)' }]}>
              <Text style={[styles.pillText, { color: C.primary }]}>
                {nutrition?.calories || 0} kcal
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: 'rgba(255,106,77,0.15)' }]}>
              <Text style={[styles.pillText, { color: C.accent }]}>
                {t('foodSearch.protAbbr')} {nutrition?.protein || 0}g
              </Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{t('foodSearch.carbAbbr')} {nutrition?.carbs || 0}g</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{t('foodSearch.fatAbbr')} {nutrition?.fat || 0}g</Text>
            </View>
          </View>
        </View>
        {item.verified && (
          <Ionicons name="checkmark-circle" size={20} color={C.violet} />
        )}
      </TouchableOpacity>
    );
  };

  const renderTemplate = ({ item }: { item: MealTemplate }) => (
    <TouchableOpacity
      style={[styles.templateCard, { backgroundColor: C.surface }]}
      onPress={() => handleTemplateLog(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="bookmark" size={18} color={C.primary} />
      <View style={styles.templateInfo}>
        <Text style={[styles.templateName, { color: C.text }]}>{item.name}</Text>
        <Text style={[styles.templateMacros, { color: C.textSecondary }]}>
          {item.nutrition.calories} kcal · {t('foodSearch.protAbbr')} {item.nutrition.protein}g · {t('foodSearch.carbAbbr')} {item.nutrition.carbs}g · {t('foodSearch.fatAbbr')} {item.nutrition.fat}g
        </Text>
      </View>
      <Ionicons name="add-circle-outline" size={22} color={C.accent} />
    </TouchableOpacity>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.text }]}>{t('foodSearch.searchFood')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push('/barcode-scanner')}
            style={styles.scanBtn}
          >
            <Ionicons name="barcode-outline" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/capture-hub')}
            style={[styles.scanBtn, { backgroundColor: `${C.primary}20` }]}
          >
            <Ionicons name="sparkles" size={22} color={C.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Meal Type Selector */}
      <View style={styles.mealTypeRow}>
        {MEAL_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.mealTypeBtn,
              { backgroundColor: C.surface },
              mealType === type.id && { backgroundColor: C.primary },
            ]}
            onPress={() => setMealType(type.id)}
          >
            <Ionicons
              name={type.icon as any}
              size={16}
              color={mealType === type.id ? C.text : C.textSecondary}
            />
            <Text
              style={[
                styles.mealTypeText,
                { color: C.textSecondary },
                mealType === type.id && { color: C.text },
              ]}
            >
              {t(`home.${type.id}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Ionicons name="search" size={20} color={C.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder={t('foodSearch.searchBarPlaceholder')}
          placeholderTextColor={C.textMuted}
          value={query}
          onChangeText={handleSearch}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* AI Analysis Button */}
      {query.length > 3 && results.length === 0 && !loading && (
        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: C.accent }]}
          onPress={handleAIAnalysis}
          disabled={analyzing}
        >
          {analyzing ? (
            <ActivityIndicator color={C.text} size="small" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color={C.text} />
              <Text style={[styles.aiButtonText, { color: C.text }]}>{t('foodSearch.analyzeWithAI')}</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Results / Templates */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : query.length < 2 ? (
        // Show templates when no search
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplate}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            templates.length > 0 ? (
              <Text style={styles.sectionTitle}>{t('foodSearch.savedTemplates')}</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="search-outline" size={48} color={C.textMuted} />
              <Text style={styles.emptyText}>
                {t('foodSearch.emptyHint')}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={renderFoodItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Text style={[styles.emptyText, { color: C.textMuted }]}>{t('foodSearch.noResults')}</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Selected Item Footer */}
      {selectedItem && (
        <View style={[styles.footer, { backgroundColor: C.surface, borderTopColor: C.border }]}>
          {/* Servings stepper */}
          <View style={styles.servingsRow}>
            <Text style={[styles.servingsLabel, { color: C.textSecondary }]}>{t('foodSearch.servingsLabel')}</Text>
            <TouchableOpacity
              onPress={() => { setCustomGrams(''); setServings(Math.max(0.5, servings - 0.5)); }}
              style={styles.servingsBtn}
              accessibilityRole="button"
              accessibilityLabel={t('foodSearch.decreaseServings')}
            >
              <Ionicons name="remove" size={20} color={C.text} />
            </TouchableOpacity>
            <Text style={[styles.servingsValue, { color: C.text }]}>{servings}</Text>
            <TouchableOpacity
              onPress={() => { setCustomGrams(''); setServings(servings + 0.5); }}
              style={styles.servingsBtn}
              accessibilityRole="button"
              accessibilityLabel={t('foodSearch.increaseServings')}
            >
              <Ionicons name="add" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Exact weight input (grams) */}
          <View style={styles.gramsRow}>
            <Text style={[styles.servingsLabel, { color: C.textSecondary }]}>{t('foodSearch.weightLabel')}</Text>
            <TextInput
              style={[styles.gramsInput, { color: C.text, borderColor: C.border, backgroundColor: C.background }]}
              placeholder={String(Math.round((selectedItem.servingSize || 100) * servings))}
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={customGrams}
              onChangeText={setCustomGrams}
              maxLength={5}
              accessibilityLabel={t('foodSearch.weightLabel')}
            />
            <Text style={[styles.gramsUnit, { color: C.textSecondary }]}>g</Text>
          </View>

          <TouchableOpacity style={[styles.logButton, { backgroundColor: C.primary }]} onPress={handleLogFood} accessibilityRole="button" accessibilityLabel={t('foodSearch.logButton')}>
            <Ionicons name="add-circle" size={20} color={C.text} />
            <Text style={[styles.logButtonText, { color: C.text }]}>{t('foodSearch.logButton')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (C: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
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
  },
  scanBtn: {
    padding: 8,
  },
  mealTypeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  mealTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.surface,
  },
  mealTypeBtnActive: {
    backgroundColor: C.primary,
  },
  mealTypeText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '600',
  },
  mealTypeTextActive: {
    color: C.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: C.text,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.accent,
  },
  aiButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  listContent: {
    padding: 16,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  resultCardSelected: {
    borderColor: C.primary,
    backgroundColor: C.surfaceLight,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    marginBottom: 2,
  },
  resultBrand: {
    fontSize: 12,
    color: C.textSecondary,
    marginBottom: 6,
  },
  macroPills: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(247,242,234,0.08)',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSecondary,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  templateMacros: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 34,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  servingsLabel: {
    fontSize: 14,
    color: C.textSecondary,
  },
  servingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(156,140,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    minWidth: 30,
    textAlign: 'center',
  },
  gramsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  gramsInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlign: 'right',
  },
  gramsUnit: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  logButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
});
