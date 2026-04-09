// ============================================
// Cals2Gains - Food Search & Add Screen
// ============================================
// Multi-input food logging: text search, barcode, AI analysis
// Uses Open Food Facts API + GPT-4o-mini for text analysis

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
import { useTemplateStore } from '../store/templateStore';
import { searchFoods, lookupBarcode, analyzeTextFood } from '../services/foodDatabase';
import { FoodItem, MealTemplate } from '../types';

// ============================================
// CONSTANTS
// ============================================

const COLORS = {
  background: '#17121D',
  card: '#1E1829',
  cardHover: '#2A2235',
  violet: '#9C8CFF',
  coral: '#FF6A4D',
  bone: '#F7F2EA',
  textSecondary: 'rgba(247,242,234,0.6)',
  textTertiary: 'rgba(247,242,234,0.35)',
  border: 'rgba(156,140,255,0.15)',
};

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Desayuno', icon: 'sunny-outline' },
  { id: 'lunch', label: 'Almuerzo', icon: 'restaurant-outline' },
  { id: 'dinner', label: 'Cena', icon: 'moon-outline' },
  { id: 'snack', label: 'Snack', icon: 'cafe-outline' },
] as const;

// ============================================
// COMPONENT
// ============================================

export default function FoodSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: string }>();
  const { addMeal } = useMealStore();
  const { templates, loadTemplates } = useTemplateStore();

  // State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);
  const [mealType, setMealType] = useState(params.mealType || 'lunch');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTemplates();
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
          const foods = await searchFoods(text.trim());
          setResults(foods);
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
      Alert.alert('Error', 'No se pudo analizar el alimento');
    } finally {
      setAnalyzing(false);
    }
  };

  // Log selected food
  const handleLogFood = async () => {
    if (!selectedItem) return;

    const nutrition = selectedItem.nutritionPerServing || selectedItem.nutritionPer100g;
    if (!nutrition) return;

    const multiplier = selectedItem.nutritionPerServing ? servings : servings;

    try {
      await addMeal({
        name: selectedItem.name,
        calories: Math.round(nutrition.calories * multiplier),
        protein: Math.round(nutrition.protein * multiplier),
        carbs: Math.round(nutrition.carbs * multiplier),
        fat: Math.round(nutrition.fat * multiplier),
        mealType: mealType as any,
        source: 'manual',
        photoUri: undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la comida');
    }
  };

  // Log from template
  const handleTemplateLog = async (template: MealTemplate) => {
    try {
      await addMeal({
        name: template.name,
        calories: template.calories,
        protein: template.protein,
        carbs: template.carbs,
        fat: template.fat,
        mealType: mealType as any,
        source: 'manual',
        photoUri: undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar');
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
          <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
          {item.brand && (
            <Text style={styles.resultBrand}>{item.brand}</Text>
          )}
          <View style={styles.macroPills}>
            <View style={[styles.pill, { backgroundColor: 'rgba(156,140,255,0.15)' }]}>
              <Text style={[styles.pillText, { color: COLORS.violet }]}>
                {nutrition?.calories || 0} kcal
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: 'rgba(255,106,77,0.15)' }]}>
              <Text style={[styles.pillText, { color: COLORS.coral }]}>
                P {nutrition?.protein || 0}g
              </Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>C {nutrition?.carbs || 0}g</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>G {nutrition?.fat || 0}g</Text>
            </View>
          </View>
        </View>
        {item.verified && (
          <Ionicons name="checkmark-circle" size={20} color={COLORS.violet} />
        )}
      </TouchableOpacity>
    );
  };

  const renderTemplate = ({ item }: { item: MealTemplate }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleTemplateLog(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="bookmark" size={18} color={COLORS.violet} />
      <View style={styles.templateInfo}>
        <Text style={styles.templateName}>{item.name}</Text>
        <Text style={styles.templateMacros}>
          {item.calories} kcal · P{item.protein}g · C{item.carbs}g · G{item.fat}g
        </Text>
      </View>
      <Ionicons name="add-circle-outline" size={22} color={COLORS.coral} />
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
          <Ionicons name="close" size={24} color={COLORS.bone} />
        </TouchableOpacity>
        <Text style={styles.title}>Buscar Alimento</Text>
        <TouchableOpacity
          onPress={() => router.push('/barcode-scanner')}
          style={styles.scanBtn}
        >
          <Ionicons name="barcode-outline" size={24} color={COLORS.violet} />
        </TouchableOpacity>
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

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar alimento o pegar codigo de barras..."
          placeholderTextColor={COLORS.textTertiary}
          value={query}
          onChangeText={handleSearch}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* AI Analysis Button */}
      {query.length > 3 && results.length === 0 && !loading && (
        <TouchableOpacity
          style={styles.aiButton}
          onPress={handleAIAnalysis}
          disabled={analyzing}
        >
          {analyzing ? (
            <ActivityIndicator color={COLORS.bone} size="small" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color={COLORS.bone} />
              <Text style={styles.aiButtonText}>Analizar con IA</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Results / Templates */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.violet} size="large" />
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
              <Text style={styles.sectionTitle}>Plantillas guardadas</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="search-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>
                Busca un alimento o escanea un codigo de barras
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
                <Text style={styles.emptyText}>No se encontraron resultados</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Selected Item Footer */}
      {selectedItem && (
        <View style={styles.footer}>
          <View style={styles.servingsRow}>
            <Text style={styles.servingsLabel}>Porciones:</Text>
            <TouchableOpacity
              onPress={() => setServings(Math.max(0.5, servings - 0.5))}
              style={styles.servingsBtn}
            >
              <Ionicons name="remove" size={20} color={COLORS.bone} />
            </TouchableOpacity>
            <Text style={styles.servingsValue}>{servings}</Text>
            <TouchableOpacity
              onPress={() => setServings(servings + 0.5)}
              style={styles.servingsBtn}
            >
              <Ionicons name="add" size={20} color={COLORS.bone} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.logButton} onPress={handleLogFood}>
            <Ionicons name="add-circle" size={20} color={COLORS.bone} />
            <Text style={styles.logButtonText}>Registrar</Text>
          </TouchableOpacity>
        </View>
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.bone,
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
    backgroundColor: COLORS.coral,
  },
  aiButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.bone,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  resultCardSelected: {
    borderColor: COLORS.violet,
    backgroundColor: COLORS.cardHover,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.bone,
    marginBottom: 2,
  },
  resultBrand: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    color: COLORS.textSecondary,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
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
    color: COLORS.bone,
  },
  templateMacros: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 34,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  servingsLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
    color: COLORS.bone,
    minWidth: 30,
    textAlign: 'center',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.violet,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  logButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.bone,
  },
});
