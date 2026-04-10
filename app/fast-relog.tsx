import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme';

// Mock store imports
import { mealStore } from '../store/mealStore';
import { templateStore } from '../store/templateStore';

const { width } = Dimensions.get('window');

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp?: number;
  usageCount?: number;
  lastUsed?: string;
}

interface MealStack {
  id: string;
  name: string;
  items: Meal[];
  totalCalories: number;
  totalProtein: number;
  category: 'breakfast' | 'postworkout' | 'dinner' | 'snack';
}

interface YesterdayMeal extends Meal {
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
}

export default function FastRelog() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [yesterdayMeals, setYesterdayMeals] = useState<YesterdayMeal[]>([]);
  const [favoriteMeals, setFavoriteMeals] = useState<Meal[]>([]);
  const [frequentMeals, setFrequentMeals] = useState<Meal[]>([]);
  const [mealStacks, setMealStacks] = useState<MealStack[]>([]);
  const [reloggedCount, setReloggedCount] = useState(0);

  useEffect(() => {
    // Simulate loading data from stores
    loadMeals();
  }, []);

  const loadMeals = () => {
    // Yesterday's meals
    setYesterdayMeals([
      {
        id: 'y1',
        name: 'Huevos Revueltos',
        calories: 250,
        protein: 18,
        carbs: 12,
        fat: 16,
        mealType: 'breakfast',
      },
      {
        id: 'y2',
        name: 'Tostadas Integrales',
        calories: 180,
        protein: 6,
        carbs: 32,
        fat: 4,
        mealType: 'breakfast',
      },
      {
        id: 'y3',
        name: 'Pechuga de Pollo',
        calories: 280,
        protein: 52,
        carbs: 0,
        fat: 6,
        mealType: 'lunch',
      },
      {
        id: 'y4',
        name: 'Arroz Blanco',
        calories: 206,
        protein: 4,
        carbs: 45,
        fat: 0,
        mealType: 'lunch',
      },
      {
        id: 'y5',
        name: 'Batido Whey Protein',
        calories: 150,
        protein: 25,
        carbs: 8,
        fat: 2,
        mealType: 'snack',
      },
    ]);

    // Favorite meals
    setFavoriteMeals([
      {
        id: 'f1',
        name: 'Pechuga de Pollo',
        calories: 280,
        protein: 52,
        carbs: 0,
        fat: 6,
        usageCount: 142,
      },
      {
        id: 'f2',
        name: 'Batido Whey Protein',
        calories: 150,
        protein: 25,
        carbs: 8,
        fat: 2,
        usageCount: 118,
      },
      {
        id: 'f3',
        name: 'Huevos Revueltos',
        calories: 250,
        protein: 18,
        carbs: 12,
        fat: 16,
        usageCount: 96,
      },
      {
        id: 'f4',
        name: 'Yogur Griego',
        calories: 120,
        protein: 20,
        carbs: 6,
        fat: 2,
        usageCount: 84,
      },
      {
        id: 'f5',
        name: 'Atún Enlatado',
        calories: 200,
        protein: 42,
        carbs: 0,
        fat: 1,
        usageCount: 72,
      },
      {
        id: 'f6',
        name: 'Arroz Blanco',
        calories: 206,
        protein: 4,
        carbs: 45,
        fat: 0,
        usageCount: 68,
      },
    ]);

    // Most frequent meals
    setFrequentMeals([
      {
        id: 'freq1',
        name: 'Pechuga de Pollo',
        calories: 280,
        protein: 52,
        carbs: 0,
        fat: 6,
        usageCount: 142,
        lastUsed: 'Hoy',
      },
      {
        id: 'freq2',
        name: 'Batido Whey Protein',
        calories: 150,
        protein: 25,
        carbs: 8,
        fat: 2,
        usageCount: 118,
        lastUsed: 'Hoy',
      },
      {
        id: 'freq3',
        name: 'Arroz Blanco',
        calories: 206,
        protein: 4,
        carbs: 45,
        fat: 0,
        usageCount: 112,
        lastUsed: 'Ayer',
      },
      {
        id: 'freq4',
        name: 'Huevos Revueltos',
        calories: 250,
        protein: 18,
        carbs: 12,
        fat: 16,
        usageCount: 96,
        lastUsed: 'Ayer',
      },
      {
        id: 'freq5',
        name: 'Atún Enlatado',
        calories: 200,
        protein: 42,
        carbs: 0,
        fat: 1,
        usageCount: 90,
        lastUsed: 'Hace 2 días',
      },
      {
        id: 'freq6',
        name: 'Queso Cottage',
        calories: 140,
        protein: 28,
        carbs: 4,
        fat: 3,
        usageCount: 78,
        lastUsed: 'Hace 2 días',
      },
      {
        id: 'freq7',
        name: 'Yogur Griego',
        calories: 120,
        protein: 20,
        carbs: 6,
        fat: 2,
        usageCount: 76,
        lastUsed: 'Hace 3 días',
      },
      {
        id: 'freq8',
        name: 'Avena con Leche',
        calories: 280,
        protein: 12,
        carbs: 48,
        fat: 6,
        usageCount: 64,
        lastUsed: 'Hace 3 días',
      },
      {
        id: 'freq9',
        name: 'Almendras',
        calories: 200,
        protein: 7,
        carbs: 7,
        fat: 17,
        usageCount: 58,
        lastUsed: 'Hace 4 días',
      },
      {
        id: 'freq10',
        name: 'Banana',
        calories: 105,
        protein: 1,
        carbs: 27,
        fat: 0,
        usageCount: 54,
        lastUsed: 'Hace 4 días',
      },
    ]);

    // Meal stacks
    setMealStacks([
      {
        id: 'stack1',
        name: 'Desayuno Proteico',
        category: 'breakfast',
        items: [
          {
            id: 'si1',
            name: 'Huevos Revueltos (3)',
            calories: 250,
            protein: 18,
            carbs: 12,
            fat: 16,
          },
          {
            id: 'si2',
            name: 'Tostadas Integrales (2)',
            calories: 180,
            protein: 6,
            carbs: 32,
            fat: 4,
          },
          {
            id: 'si3',
            name: 'Aguacate (½)',
            calories: 120,
            protein: 1,
            carbs: 6,
            fat: 11,
          },
        ],
        totalCalories: 550,
        totalProtein: 25,
      },
      {
        id: 'stack2',
        name: 'Almuerzo Musculación',
        category: 'postworkout',
        items: [
          {
            id: 'si4',
            name: 'Pechuga de Pollo (150g)',
            calories: 280,
            protein: 52,
            carbs: 0,
            fat: 6,
          },
          {
            id: 'si5',
            name: 'Arroz Blanco (1 taza)',
            calories: 206,
            protein: 4,
            carbs: 45,
            fat: 0,
          },
          {
            id: 'si6',
            name: 'Brócoli (150g)',
            calories: 52,
            protein: 5,
            carbs: 10,
            fat: 0,
          },
        ],
        totalCalories: 538,
        totalProtein: 61,
      },
      {
        id: 'stack3',
        name: 'Post-Entreno',
        category: 'postworkout',
        items: [
          {
            id: 'si7',
            name: 'Batido Whey Protein (30g)',
            calories: 150,
            protein: 25,
            carbs: 8,
            fat: 2,
          },
          {
            id: 'si8',
            name: 'Banana',
            calories: 105,
            protein: 1,
            carbs: 27,
            fat: 0,
          },
          {
            id: 'si9',
            name: 'Almendras (30g)',
            calories: 200,
            protein: 7,
            carbs: 7,
            fat: 17,
          },
        ],
        totalCalories: 455,
        totalProtein: 33,
      },
    ]);
  };

  // Filter meals based on search
  const filteredYesterdayMeals = useMemo(() => {
    if (!searchQuery.trim()) return yesterdayMeals;
    const query = searchQuery.toLowerCase();
    return yesterdayMeals.filter((meal) => meal.name.toLowerCase().includes(query));
  }, [searchQuery, yesterdayMeals]);

  const filteredFavoriteMeals = useMemo(() => {
    if (!searchQuery.trim()) return favoriteMeals;
    const query = searchQuery.toLowerCase();
    return favoriteMeals.filter((meal) => meal.name.toLowerCase().includes(query));
  }, [searchQuery, favoriteMeals]);

  const filteredFrequentMeals = useMemo(() => {
    if (!searchQuery.trim()) return frequentMeals;
    const query = searchQuery.toLowerCase();
    return frequentMeals.filter((meal) => meal.name.toLowerCase().includes(query));
  }, [searchQuery, frequentMeals]);

  const filteredStacks = useMemo(() => {
    if (!searchQuery.trim()) return mealStacks;
    const query = searchQuery.toLowerCase();
    return mealStacks.filter((stack) => stack.name.toLowerCase().includes(query));
  }, [searchQuery, mealStacks]);

  const handleQuickLog = (meal: Meal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReloggedCount(reloggedCount + 1);

    Alert.alert(
      'Registrado',
      `${meal.name} (+${meal.calories} kcal)\nProteína: ${meal.protein}g`,
      [{ text: 'OK', onPress: () => {} }],
      { cancelable: true }
    );
  };

  const handleLogStack = (stack: MealStack) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setReloggedCount(reloggedCount + 1);

    Alert.alert(
      'Comida Registrada',
      `${stack.name} (+${stack.totalCalories} kcal)\nProteína: ${stack.totalProtein}g`,
      [{ text: 'OK', onPress: () => {} }],
      { cancelable: true }
    );
  };

  const handleCopyAllYesterday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const totalCalories = yesterdayMeals.reduce((acc, meal) => acc + meal.calories, 0);
    const totalProtein = yesterdayMeals.reduce((acc, meal) => acc + meal.protein, 0);

    Alert.alert(
      'Día Completo Copiado',
      `${yesterdayMeals.length} comidas (${totalCalories} kcal)\nProteína: ${totalProtein}g`,
      [{ text: 'OK', onPress: () => {} }],
      { cancelable: true }
    );
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Listo',
      `Se han registrado ${reloggedCount} comidas hoy`,
      [{ text: 'OK', onPress: () => {} }],
      { cancelable: true }
    );
  };

  const renderYesterdaySection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mismo que Ayer</Text>
        <TouchableOpacity
          style={styles.copyAllButton}
          onPress={handleCopyAllYesterday}
        >
          <Ionicons name="copy" size={14} color={COLORS.primary} />
          <Text style={styles.copyAllText}>Copiar Todo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mealTypeGroup}>
        {['breakfast', 'lunch', 'snack', 'dinner'].map((type) => {
          const typeMeals = filteredYesterdayMeals.filter((m) => m.mealType === type);
          if (typeMeals.length === 0) return null;

          const mealTypeLabels: Record<string, string> = {
            breakfast: 'Desayuno',
            lunch: 'Almuerzo',
            snack: 'Snack',
            dinner: 'Cena',
          };

          return (
            <View key={type} style={styles.mealTypeContainer}>
              <Text style={styles.mealTypeLabel}>{mealTypeLabels[type]}</Text>
              {typeMeals.map((meal) => (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.yesterdayMealCard}
                  onPress={() => handleQuickLog(meal)}
                >
                  <View style={styles.mealCardContent}>
                    <View style={styles.mealCardLeft}>
                      <Text style={styles.mealCardName}>{meal.name}</Text>
                      <Text style={styles.mealCardMacros}>
                        {meal.calories} kcal • {meal.protein}g P
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.repeatButton}
                      onPress={() => handleQuickLog(meal)}
                    >
                      <Text style={styles.repeatButtonText}>Repetir</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderFavoritesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Favoritos</Text>
      <View style={styles.gridContainer}>
        {filteredFavoriteMeals.map((meal) => (
          <TouchableOpacity
            key={meal.id}
            style={styles.favoriteMealCard}
            onPress={() => handleQuickLog(meal)}
          >
            <View style={styles.favoriteCardContent}>
              <Ionicons name="star" size={20} color={COLORS.warning} style={styles.starIcon} />
              <Text style={styles.favoriteMealName}>{meal.name}</Text>
              <Text style={styles.favoriteMealCalories}>{meal.calories} kcal</Text>
              <Text style={styles.favoriteMealProtein}>+{meal.protein}g P</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFrequentSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Comidas Frecuentes</Text>
      <View style={styles.frequentContainer}>
        {filteredFrequentMeals.map((meal, index) => (
          <TouchableOpacity
            key={meal.id}
            style={[
              styles.frequentMealCard,
              index < frequentMeals.length - 1 && styles.frequentMealCardBorder,
            ]}
            onPress={() => handleQuickLog(meal)}
          >
            <View style={styles.frequentCardLeft}>
              <Text style={styles.frequentRank}>{index + 1}</Text>
              <View style={styles.frequentCardInfo}>
                <Text style={styles.frequentMealName}>{meal.name}</Text>
                <Text style={styles.frequentMealMeta}>
                  {meal.usageCount} veces • {meal.lastUsed}
                </Text>
              </View>
            </View>
            <View style={styles.frequentCardRight}>
              <Text style={styles.frequentMealCalories}>{meal.calories}</Text>
              <Text style={styles.frequentMealUnit}>kcal</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStacksSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Combinaciones Comunes</Text>
      <View style={styles.stacksContainer}>
        {filteredStacks.map((stack) => (
          <TouchableOpacity
            key={stack.id}
            style={styles.stackCard}
            onPress={() => handleLogStack(stack)}
          >
            <View style={styles.stackCardHeader}>
              <Text style={styles.stackCardName}>{stack.name}</Text>
              <View style={styles.stackBadge}>
                <Text style={styles.stackBadgeText}>{stack.items.length}</Text>
              </View>
            </View>
            <View style={styles.stackCardItems}>
              {stack.items.map((item, idx) => (
                <Text key={item.id} style={styles.stackItemText}>
                  {idx + 1}. {item.name}
                </Text>
              ))}
            </View>
            <View style={styles.stackCardFooter}>
              <Text style={styles.stackTotalCal}>{stack.totalCalories} kcal</Text>
              <Text style={styles.stackTotalProtein}>{stack.totalProtein}g P</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Registro Rápido</Text>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar comidas..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Relogged count indicator */}
        {reloggedCount > 0 && (
          <View style={[styles.card, { backgroundColor: COLORS.success + '15' }]}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={[styles.reloggedText, { color: COLORS.success }]}>
              {reloggedCount} {reloggedCount === 1 ? 'comida registrada' : 'comidas registradas'}
            </Text>
          </View>
        )}

        {renderYesterdaySection()}
        {renderFavoritesSection()}
        {renderFrequentSection()}
        {renderStacksSection()}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  doneButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reloggedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  copyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary + '10',
  },
  copyAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  mealTypeGroup: {
    gap: 12,
  },
  mealTypeContainer: {
    gap: 8,
  },
  mealTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  yesterdayMealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  mealCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mealCardLeft: {
    flex: 1,
  },
  mealCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  mealCardMacros: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  repeatButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary + '20',
    marginLeft: 12,
  },
  repeatButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  favoriteMealCard: {
    width: (width - 48) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  favoriteCardContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  starIcon: {
    marginBottom: 8,
  },
  favoriteMealName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  favoriteMealCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  favoriteMealProtein: {
    fontSize: 11,
    color: COLORS.success,
    marginTop: 2,
  },
  frequentContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  frequentMealCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  frequentMealCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  frequentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  frequentRank: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    minWidth: 24,
  },
  frequentCardInfo: {
    flex: 1,
  },
  frequentMealName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  frequentMealMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  frequentCardRight: {
    alignItems: 'center',
  },
  frequentMealCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  frequentMealUnit: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stacksContainer: {
    gap: 12,
  },
  stackCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  stackCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stackCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  stackBadge: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stackBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  stackCardItems: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 4,
  },
  stackItemText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  stackCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stackTotalCal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  stackTotalProtein: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  bottomSpacing: {
    height: 20,
  },
});
