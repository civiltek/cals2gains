import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  FlatList,
  Alert,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS } from '../theme';

// Mock store - replace with actual recipeStore
const recipeStore = {
  recipes: [
    {
      id: '1',
      name: 'Ensalada de Pollo',
      image: null,
      servings: 2,
      prepTime: 15,
      cookTime: 20,
      macros: { protein: 35, carbs: 12, fat: 8 },
      isFavorite: false,
      tags: ['saludable', 'rápido'],
    },
  ],
  logRecipeAsMeal: async (recipeId: string) => true,
};

// Mock recipe service
const recipeService = {
  importRecipeFromUrl: async (url: string) => {
    return { success: true, recipe: {} };
  },
};

const { width } = Dimensions.get('window');

interface Recipe {
  id: string;
  name: string;
  image?: string | null;
  servings: number;
  prepTime: number;
  cookTime: number;
  macros: { protein: number; carbs: number; fat: number };
  isFavorite: boolean;
  tags: string[];
  ingredients?: Array<{ name: string; qty: number; unit: string }>;
  instructions?: string[];
}

interface FilterChip {
  id: string;
  label: string;
}

export default function RecipesScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>(recipeStore.recipes);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todas');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({
    name: '',
    servings: 1,
    ingredients: [],
    instructions: [],
    tags: [],
  });

  const filterChips: FilterChip[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'favoritas', label: 'Favoritas' },
    { id: 'saludable', label: 'Saludable' },
    { id: 'rápido', label: 'Rápido' },
  ];

  const filteredRecipes = useMemo(() => {
    let filtered = recipes;

    if (selectedFilter === 'favoritas') {
      filtered = filtered.filter((r) => r.isFavorite);
    } else if (selectedFilter !== 'todas') {
      filtered = filtered.filter((r) => r.tags.includes(selectedFilter));
    }

    if (searchQuery) {
      filtered = filtered.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [recipes, selectedFilter, searchQuery]);

  const toggleFavorite = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  };

  const handleImportRecipe = async () => {
    if (!importUrl.trim()) {
      Alert.alert('Error', 'Por favor ingresa una URL válida');
      return;
    }
    try {
      const result = await recipeService.importRecipeFromUrl(importUrl);
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setImportUrl('');
        setShowImportModal(false);
        Alert.alert('Éxito', 'Receta importada correctamente');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo importar la receta');
    }
  };

  const handleCreateRecipe = async () => {
    if (!newRecipe.name?.trim()) {
      Alert.alert('Error', 'El nombre de la receta es requerido');
      return;
    }
    try {
      const recipe: Recipe = {
        id: Date.now().toString(),
        name: newRecipe.name,
        servings: newRecipe.servings || 1,
        prepTime: 0,
        cookTime: 0,
        macros: { protein: 0, carbs: 0, fat: 0 },
        isFavorite: false,
        tags: newRecipe.tags || [],
        ingredients: newRecipe.ingredients || [],
        instructions: newRecipe.instructions || [],
      };
      setRecipes((prev) => [recipe, ...prev]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateModal(false);
      setNewRecipe({
        name: '',
        servings: 1,
        ingredients: [],
        instructions: [],
        tags: [],
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la receta');
    }
  };

  const handleLogRecipe = async (recipeId: string) => {
    try {
      await recipeStore.logRecipeAsMeal(recipeId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Éxito', 'Receta registrada como comida');
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la receta');
    }
  };

  const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => setExpandedRecipeId(recipe.id)}
      activeOpacity={0.7}
    >
      <View style={styles.cardImageContainer}>
        {recipe.image ? (
          <Image source={{ uri: recipe.image }} style={styles.cardImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant" size={32} color={COLORS.violet} />
          </View>
        )}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(recipe.id)}
        >
          <Ionicons
            name={recipe.isFavorite ? 'star' : 'star-outline'}
            size={20}
            color={recipe.isFavorite ? COLORS.coral : COLORS.bone}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.recipeName} numberOfLines={2}>
          {recipe.name}
        </Text>
        <View style={styles.timeRow}>
          <View style={styles.timeItem}>
            <Ionicons name="timer" size={14} color={COLORS.textSecondary} />
            <Text style={styles.timeText}>
              {recipe.prepTime + recipe.cookTime}m
            </Text>
          </View>
          <View style={styles.timeItem}>
            <Ionicons name="bowl" size={14} color={COLORS.textSecondary} />
            <Text style={styles.timeText}>{recipe.servings} porciones</Text>
          </View>
        </View>
        <View style={styles.macroRow}>
          <View style={[styles.macroPill, { backgroundColor: '#FF6A4D' }]}>
            <Text style={styles.macroText}>
              {recipe.macros.protein}p
            </Text>
          </View>
          <View style={[styles.macroPill, { backgroundColor: '#FFB84D' }]}>
            <Text style={styles.macroText}>
              {recipe.macros.carbs}c
            </Text>
          </View>
          <View style={[styles.macroPill, { backgroundColor: '#6AB4FF' }]}>
            <Text style={styles.macroText}>
              {recipe.macros.fat}g
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const ExpandedRecipeView = ({ recipe }: { recipe: Recipe }) => (
    <Modal
      visible={expandedRecipeId === recipe.id}
      transparent
      animationType="slide"
      onRequestClose={() => setExpandedRecipeId(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setExpandedRecipeId(null)}>
            <Ionicons name="close" size={28} color={COLORS.bone} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Detalle de Receta</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {recipe.image && (
            <Image source={{ uri: recipe.image }} style={styles.expandedImage} />
          )}

          <Text style={styles.expandedRecipeName}>{recipe.name}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="timer" size={24} color={COLORS.violet} />
              <Text style={styles.infoLabel}>Prep</Text>
              <Text style={styles.infoValue}>{recipe.prepTime}m</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="flame" size={24} color={COLORS.coral} />
              <Text style={styles.infoLabel}>Cocción</Text>
              <Text style={styles.infoValue}>{recipe.cookTime}m</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="bowl" size={24} color={COLORS.violet} />
              <Text style={styles.infoLabel}>Porciones</Text>
              <Text style={styles.infoValue}>{recipe.servings}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrición por Porción</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{recipe.macros.protein}g</Text>
                <Text style={styles.nutritionLabel}>Proteína</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{recipe.macros.carbs}g</Text>
                <Text style={styles.nutritionLabel}>Carbohidratos</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{recipe.macros.fat}g</Text>
                <Text style={styles.nutritionLabel}>Grasas</Text>
              </View>
            </View>
          </View>

          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredientes</Text>
              {recipe.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientRow}>
                  <View style={styles.ingredientDot} />
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ing.name}</Text>
                    <Text style={styles.ingredientQty}>
                      {ing.qty} {ing.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {recipe.instructions && recipe.instructions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instrucciones</Text>
              {recipe.instructions.map((inst, idx) => (
                <View key={idx} style={styles.instructionRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{inst}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.scalingSection}>
            <Text style={styles.sectionTitle}>Ajustar Porciones</Text>
            <View style={styles.servingsControl}>
              <TouchableOpacity style={styles.servingButton}>
                <Ionicons name="remove" size={20} color={COLORS.bone} />
              </TouchableOpacity>
              <Text style={styles.servingsText}>{recipe.servings} porciones</Text>
              <TouchableOpacity style={styles.servingButton}>
                <Ionicons name="add" size={20} color={COLORS.bone} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.registrarButton}
            onPress={() => {
              handleLogRecipe(recipe.id);
              setExpandedRecipeId(null);
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color={COLORS.background} />
            <Text style={styles.registrarButtonText}>Registrar como Comida</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Recetas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={28} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar recetas..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {filterChips.map((chip) => (
          <TouchableOpacity
            key={chip.id}
            style={[
              styles.filterChip,
              selectedFilter === chip.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(chip.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === chip.id && styles.filterChipTextActive,
              ]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredRecipes}
        renderItem={({ item }) => <RecipeCard recipe={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
        ListEmptyState={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyStateText}>No se encontraron recetas</Text>
          </View>
        }
      />

      {expandedRecipeId &&
        recipes
          .filter((r) => r.id === expandedRecipeId)
          .map((recipe) => (
            <ExpandedRecipeView key={recipe.id} recipe={recipe} />
          ))}

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.bone} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Crear Receta</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={styles.label}>Nombre de la Receta</Text>
              <TextInput
                style={styles.textInput}
                placeholder="p.ej., Ensalada de Pollo"
                placeholderTextColor={COLORS.textTertiary}
                value={newRecipe.name || ''}
                onChangeText={(text) =>
                  setNewRecipe({ ...newRecipe, name: text })
                }
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Porciones</Text>
              <View style={styles.servingsControl}>
                <TouchableOpacity style={styles.servingButton}>
                  <Ionicons name="remove" size={20} color={COLORS.bone} />
                </TouchableOpacity>
                <TextInput
                  style={styles.servingsInput}
                  keyboardType="numeric"
                  value={String(newRecipe.servings || 1)}
                  onChangeText={(text) =>
                    setNewRecipe({
                      ...newRecipe,
                      servings: parseInt(text) || 1,
                    })
                  }
                />
                <TouchableOpacity style={styles.servingButton}>
                  <Ionicons name="add" size={20} color={COLORS.bone} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Instrucciones</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Describe los pasos de preparación..."
                placeholderTextColor={COLORS.textTertiary}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateRecipe}
            >
              <Text style={styles.createButtonText}>Crear Receta</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showImportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.importDialog}>
            <Text style={styles.importTitle}>Importar Receta desde URL</Text>
            <TextInput
              style={styles.textInput}
              placeholder="https://ejemplo.com/receta"
              placeholderTextColor={COLORS.textTertiary}
              value={importUrl}
              onChangeText={setImportUrl}
            />
            <View style={styles.dialogButtonRow}>
              <TouchableOpacity
                style={styles.dialogButton}
                onPress={() => setShowImportModal(false)}
              >
                <Text style={styles.dialogButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={handleImportRecipe}
              >
                <Text style={styles.dialogButtonTextPrimary}>Importar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowImportModal(true)}
      >
        <Ionicons name="download" size={24} color={COLORS.background} />
        <Text style={styles.fabText}>Importar URL</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.bone,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.violet,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.bone,
    fontSize: 16,
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  recipeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardImageContainer: {
    position: 'relative',
    height: 160,
    backgroundColor: COLORS.cardHover,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cardHover,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 12,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bone,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  macroText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.background,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    marginTop: 12,
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.bone,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  expandedImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 16,
  },
  expandedRecipeName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.bone,
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bone,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bone,
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.violet,
  },
  nutritionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.violet,
    marginRight: 12,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    color: COLORS.bone,
    fontWeight: '500',
  },
  ingredientQty: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.violet,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.background,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.bone,
    lineHeight: 20,
  },
  scalingSection: {
    marginBottom: 20,
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 48,
  },
  servingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.violet,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bone,
  },
  servingsInput: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bone,
    textAlign: 'center',
    flex: 1,
  },
  registrarButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.coral,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
  },
  registrarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.bone,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.bone,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: COLORS.violet,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 24,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importDialog: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  importTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bone,
    marginBottom: 16,
  },
  dialogButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.cardHover,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dialogButtonPrimary: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  dialogButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.bone,
  },
  dialogButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.coral,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
});
