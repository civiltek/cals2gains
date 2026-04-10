import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS } from '../theme';

const { width } = Dimensions.get('window');

interface FoodSuggestion {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fitScore: number;
  source: 'Plantilla' | 'Reciente' | 'IA';
  image?: string;
}

interface RemainingMacros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export default function WhatToEatScreen() {
  const router = useRouter();
  const [remainingMacros, setRemainingMacros] = useState<RemainingMacros>({
    calories: 450,
    protein: 25,
    carbs: 45,
    fats: 18,
  });
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [templates, setTemplates] = useState<FoodSuggestion[]>([]);
  const [quickIdeas, setQuickIdeas] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [allMacrosHit, setAllMacrosHit] = useState(false);

  const filters = [
    { id: 'alta-proteina', label: 'Alta proteína', icon: 'barbell' },
    { id: 'bajo-calorias', label: 'Bajo en calorías', icon: 'flame' },
    { id: 'rapido', label: 'Rápido de preparar', icon: 'flash' },
  ];

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setLoading(true);

      // Check if all macros are hit
      const totalRemaining =
        remainingMacros.calories +
        remainingMacros.protein +
        remainingMacros.carbs +
        remainingMacros.fats;

      if (remainingMacros.calories <= 0 && remainingMacros.protein <= 0) {
        setAllMacrosHit(true);
        setLoading(false);
        return;
      }

      // Mock food suggestions from memoryEngine.getWhatToEatNext()
      const mockSuggestions: FoodSuggestion[] = [
        {
          id: '1',
          name: 'Pechuga de pollo + arroz',
          calories: 280,
          protein: 35,
          carbs: 28,
          fats: 4,
          fitScore: 95,
          source: 'IA',
        },
        {
          id: '2',
          name: 'Huevos revueltos + tostada',
          calories: 220,
          protein: 18,
          carbs: 16,
          fats: 12,
          fitScore: 88,
          source: 'Reciente',
        },
        {
          id: '3',
          name: 'Barra proteica',
          calories: 180,
          protein: 20,
          carbs: 14,
          fats: 6,
          fitScore: 82,
          source: 'Plantilla',
        },
        {
          id: '4',
          name: 'Atún con aguacate',
          calories: 240,
          protein: 28,
          carbs: 8,
          fats: 14,
          fitScore: 91,
          source: 'IA',
        },
        {
          id: '5',
          name: 'Yogur griego + granola',
          calories: 200,
          protein: 22,
          carbs: 18,
          fats: 5,
          fitScore: 79,
          source: 'Reciente',
        },
      ];

      // Mock templates
      const mockTemplates: FoodSuggestion[] = [
        {
          id: 't1',
          name: 'Desayuno Proteico',
          calories: 350,
          protein: 30,
          carbs: 35,
          fats: 10,
          fitScore: 85,
          source: 'Plantilla',
        },
        {
          id: 't2',
          name: 'Almuerzo Balanceado',
          calories: 450,
          protein: 40,
          carbs: 45,
          fats: 15,
          fitScore: 88,
          source: 'Plantilla',
        },
      ];

      // Mock quick ideas
      const mockQuickIdeas = [
        '2 huevos + tostada = 280kcal, 18g prot',
        'Atún lata + 1 plátano = 220kcal, 20g prot',
        'Yogur + almendras = 210kcal, 15g prot',
        '100g pechuga + vegetales = 165kcal, 31g prot',
      ];

      setSuggestions(mockSuggestions);
      setTemplates(mockTemplates);
      setQuickIdeas(mockQuickIdeas);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (food: FoodSuggestion) => {
    try {
      await Haptics.selectionAsync();
      // Navigate to meal logging with prefilled food
      router.push({
        pathname: '/log-meal',
        params: {
          foodId: food.id,
          foodName: food.name,
          calories: food.calories.toString(),
          protein: food.protein.toString(),
          carbs: food.carbs.toString(),
          fats: food.fats.toString(),
        },
      });
    } catch (error) {
      console.error('Error registering food:', error);
    }
  };

  const handleFilterPress = (filterId: string) => {
    setSelectedFilter(selectedFilter === filterId ? null : filterId);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (allMacrosHit) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateEmoji}>🎉</Text>
          <Text style={styles.emptyStateTitle}>¡Objetivo cumplido!</Text>
          <Text style={styles.emptyStateText}>
            Has alcanzado tus macros del día. ¡Buen trabajo!
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => router.push('/nutrition-overview')}
          >
            <Text style={styles.emptyStateButtonText}>Ver resumen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>¿Qué como ahora?</Text>
      </View>

      {/* Remaining Macros Card */}
      <View style={styles.macrosCard}>
        <Text style={styles.macrosTitle}>Macros Restantes</Text>

        <View style={styles.macrosBarContainer}>
          <View style={styles.macroRow}>
            <View style={styles.macroInfo}>
              <Ionicons name="flame" size={16} color={COLORS.error} />
              <Text style={styles.macroLabel}>Calorías</Text>
            </View>
            <View style={[styles.macroBar, { backgroundColor: COLORS.error }]}>
              <View
                style={[
                  styles.macroFill,
                  {
                    width: `${Math.min((remainingMacros.calories / 500) * 100, 100)}%`,
                    backgroundColor: COLORS.error,
                  },
                ]}
              />
            </View>
            <Text style={styles.macroValue}>{remainingMacros.calories}kcal</Text>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroInfo}>
              <Ionicons name="barbell" size={16} color={COLORS.success} />
              <Text style={styles.macroLabel}>Proteína</Text>
            </View>
            <View style={[styles.macroBar, { backgroundColor: COLORS.success }]}>
              <View
                style={[
                  styles.macroFill,
                  {
                    width: `${Math.min((remainingMacros.protein / 50) * 100, 100)}%`,
                    backgroundColor: COLORS.success,
                  },
                ]}
              />
            </View>
            <Text style={styles.macroValue}>{remainingMacros.protein}g</Text>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroInfo}>
              <Ionicons name="grid" size={16} color={COLORS.info} />
              <Text style={styles.macroLabel}>Carbos</Text>
            </View>
            <View style={[styles.macroBar, { backgroundColor: COLORS.info }]}>
              <View
                style={[
                  styles.macroFill,
                  {
                    width: `${Math.min((remainingMacros.carbs / 100) * 100, 100)}%`,
                    backgroundColor: COLORS.info,
                  },
                ]}
              />
            </View>
            <Text style={styles.macroValue}>{remainingMacros.carbs}g</Text>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroInfo}>
              <Ionicons name="water" size={16} color={COLORS.warning} />
              <Text style={styles.macroLabel}>Grasas</Text>
            </View>
            <View style={[styles.macroBar, { backgroundColor: COLORS.warning }]}>
              <View
                style={[
                  styles.macroFill,
                  {
                    width: `${Math.min((remainingMacros.fats / 80) * 100, 100)}%`,
                    backgroundColor: COLORS.warning,
                  },
                ]}
              />
            </View>
            <Text style={styles.macroValue}>{remainingMacros.fats}g</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              selectedFilter === filter.id && styles.filterChipActive,
            ]}
            onPress={() => handleFilterPress(filter.id)}
          >
            <Ionicons
              name={filter.icon as any}
              size={14}
              color={selectedFilter === filter.id ? COLORS.background : COLORS.primary}
            />
            <Text
              style={[
                styles.filterLabel,
                selectedFilter === filter.id && styles.filterLabelActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Perfecto para ti Section */}
      {suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perfecto para ti</Text>
          {suggestions.map((food) => (
            <FoodSuggestionCard
              key={food.id}
              food={food}
              onRegister={() => handleRegister(food)}
            />
          ))}
        </View>
      )}

      {/* Desde tus favoritos Section */}
      {templates.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desde tus favoritos</Text>
          {templates.map((template) => (
            <FoodSuggestionCard
              key={template.id}
              food={template}
              onRegister={() => handleRegister(template)}
              isTemplate
            />
          ))}
        </View>
      )}

      {/* Ideas Rápidas Section */}
      {quickIdeas.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ideas rápidas</Text>
          {quickIdeas.map((idea, index) => (
            <View key={index} style={styles.quickIdeaCard}>
              <Ionicons name="lightning" size={18} color={COLORS.warning} />
              <Text style={styles.quickIdeaText}>{idea}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer spacing */}
      <View style={styles.footerSpacing} />
    </ScrollView>
  );
}

interface FoodSuggestionCardProps {
  food: FoodSuggestion;
  onRegister: () => void;
  isTemplate?: boolean;
}

function FoodSuggestionCard({ food, onRegister, isTemplate }: FoodSuggestionCardProps) {
  const sourceColors: { [key: string]: string } = {
    Plantilla: COLORS.info,
    Reciente: COLORS.warning,
    IA: COLORS.primary,
  };

  return (
    <View style={styles.foodCard}>
      <View style={styles.foodCardContent}>
        <View style={styles.foodNameSection}>
          <Text style={styles.foodName}>{food.name}</Text>
          <View style={styles.badgesRow}>
            <View style={[styles.sourceBadge, { backgroundColor: sourceColors[food.source] }]}>
              <Text style={styles.sourceBadgeText}>{food.source}</Text>
            </View>
            {!isTemplate && (
              <View style={[styles.fitBadge, { backgroundColor: COLORS.success }]}>
                <Text style={styles.fitBadgeText}>{food.fitScore}% fit</Text>
              </View>
            )}
          </View>
        </View>

        {!isTemplate && (
          <View style={styles.macrosRow}>
            <MacroPill label="Calorías" value={food.calories} unit="kcal" color={COLORS.error} />
            <MacroPill label="Proteína" value={food.protein} unit="g" color={COLORS.success} />
            <MacroPill label="Carbos" value={food.carbs} unit="g" color={COLORS.info} />
            <MacroPill label="Grasas" value={food.fats} unit="g" color={COLORS.warning} />
          </View>
        )}

        {isTemplate && (
          <View style={styles.macrosRow}>
            <MacroPill label="Calorías" value={food.calories} unit="kcal" color={COLORS.error} />
            <MacroPill label="Proteína" value={food.protein} unit="g" color={COLORS.success} />
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.registerButton} onPress={onRegister}>
        <Ionicons name="add" size={20} color={COLORS.background} />
        <Text style={styles.registerButtonText}>Registrar</Text>
      </TouchableOpacity>
    </View>
  );
}

interface MacroPillProps {
  label: string;
  value: number;
  unit: string;
  color: string;
}

function MacroPill({ label, value, unit, color }: MacroPillProps) {
  return (
    <View style={[styles.macroPill, { backgroundColor: color }]}>
      <Text style={styles.macroPillValue}>{value}</Text>
      <Text style={styles.macroPillUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  macrosCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
  },
  macrosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  macrosBarContainer: {
    gap: 12,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  macroInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
    gap: 6,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  macroBar: {
    flex: 1,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 10,
  },
  macroValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    width: 50,
    textAlign: 'right',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterLabelActive: {
    color: COLORS.background,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  foodCardContent: {
    flex: 1,
  },
  foodNameSection: {
    marginBottom: 8,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.background,
  },
  fitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fitBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.background,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 6,
  },
  macroPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  macroPillValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.background,
  },
  macroPillUnit: {
    fontSize: 9,
    color: COLORS.background,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  registerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.background,
  },
  quickIdeaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  quickIdeaText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  emptyStateContainer: {
    flex: 1,
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
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
    textAlign: 'center',
  },
  footerSpacing: {
    height: 40,
  },
});
