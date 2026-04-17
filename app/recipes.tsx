import React, { useState, useEffect, useMemo } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { usePremiumGate } from '../hooks/usePremiumGate';
import { useColors } from '../store/themeStore';
import { useShoppingListStore } from '../store/shoppingListStore';
import { useRecipeStore } from '../store/recipeStore';
import { useUserStore } from '../store/userStore';
import { importRecipeFromUrl } from '../services/recipeService';
import { Recipe } from '../types';
import { canDisplayUri } from '../utils/imageUtils';

const { width } = Dimensions.get('window');

interface FilterChip {
  id: string;
  label: string;
}

export default function RecipesScreen() {
  const isPremium = usePremiumGate();
  if (!isPremium) return null;

  const { t } = useTranslation();
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const { recipes, isLoading, loadRecipes, addRecipe, toggleFavorite: toggleFav } = useRecipeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todas');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [adjustedPortions, setAdjustedPortions] = useState<number>(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({
    name: '',
    servings: 1,
    ingredients: [],
    instructions: [],
    tags: [],
  });
  const styles = createStyles(C);

  // Load recipes from Firestore on mount
  useEffect(() => {
    if (user?.uid) {
      loadRecipes(user.uid);
    }
  }, [user?.uid]);

  const filterChips: FilterChip[] = [
    { id: 'todas', label: t('recipes.all') },
    { id: 'favoritas', label: t('recipes.favorites') },
    { id: 'saludable', label: t('recipes.healthy') },
    { id: 'rápido', label: t('recipes.quick') },
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
    try {
      await toggleFav(id);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleImportRecipe = async () => {
    const trimmedUrl = importUrl.trim();
    if (!trimmedUrl) {
      Alert.alert('Error', t('recipes.invalidUrl'));
      return;
    }

    // Basic URL validation
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      Alert.alert('Error', t('recipes.urlScheme'));
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', t('recipes.loginRequired'));
      return;
    }

    setIsImporting(true);
    try {
      // 1. Fetch URL and parse recipe via OpenAI
      const parsedRecipe = await importRecipeFromUrl(trimmedUrl);

      // 2. Validate that we got something meaningful
      if (!parsedRecipe || !parsedRecipe.name || parsedRecipe.name === 'Imported Recipe') {
        Alert.alert(
          t('recipes.parseError'),
          t('recipes.importError')
        );
        return;
      }

      if (!parsedRecipe.ingredients || parsedRecipe.ingredients.length === 0) {
        Alert.alert(
          t('recipes.incompleteRecipe'),
          t('recipes.incompleteRecipeMsg', { name: parsedRecipe.name }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('recipes.import'),
              onPress: async () => {
                try {
                  const { id, userId, ...recipeData } = parsedRecipe;
                  await addRecipe(recipeData, user.uid);
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setImportUrl('');
                  setShowImportModal(false);
                  Alert.alert(t('common.success'), t('recipes.importSuccess', { name: parsedRecipe.name }));
                } catch (saveError) {
                  console.error('Failed to save incomplete recipe:', saveError);
                  Alert.alert('Error', t('recipes.saveError'));
                }
              },
            },
          ]
        );
        return;
      }

      // 3. Save to Firestore via store (adds to list automatically)
      const { id, userId, ...recipeData } = parsedRecipe;
      await addRecipe(recipeData, user.uid);

      // 4. Success
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setImportUrl('');
      setShowImportModal(false);
      Alert.alert(
        t('recipes.imported'),
        `"${parsedRecipe.name}" — ${parsedRecipe.ingredients.length} ${t('recipes.ingredients')}, ${parsedRecipe.nutritionPerServing.calories} kcal/${t('recipes.serving')}`
      );
    } catch (error: any) {
      console.error('Recipe import failed:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      let errorMessage = t('recipes.importFailed');
      if (error.message?.includes('Failed to fetch recipe from URL')) {
        errorMessage = t('recipes.urlError');
      } else if (error.message?.includes('OpenAI API error')) {
        errorMessage = t('recipes.aiServiceError');
      } else if (error.message?.includes('API key')) {
        errorMessage = t('recipes.apiKeyError');
      } else if (error.message?.includes('JSON')) {
        errorMessage = t('recipes.noRecipeFound');
      }

      Alert.alert(t('recipes.importErrorTitle'), errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateRecipe = async () => {
    if (!newRecipe.name?.trim()) {
      Alert.alert('Error', t('recipes.nameRequired'));
      return;
    }
    if (!user?.uid) {
      Alert.alert('Error', t('recipes.loginToCreate'));
      return;
    }
    try {
      const recipeData: Omit<Recipe, 'id' | 'userId'> = {
        name: newRecipe.name,
        nameEs: newRecipe.name,
        nameEn: newRecipe.name,
        servings: newRecipe.servings || 1,
        prepTime: 0,
        cookTime: 0,
        ingredients: newRecipe.ingredients || [],
        instructions: newRecipe.instructions || [],
        totalNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        nutritionPerServing: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        tags: newRecipe.tags || [],
        source: 'manual',
        isFavorite: false,
        timesUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await addRecipe(recipeData, user.uid);
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
      Alert.alert('Error', t('recipes.createFailed'));
    }
  };

  const { logRecipeAsMeal } = useRecipeStore();
  const { addItems: addShoppingItems } = useShoppingListStore();

  const handleLogRecipe = async (recipeId: string) => {
    try {
      await logRecipeAsMeal(recipeId, adjustedPortions, 'lunch');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.success'), t('recipes.logged', { count: adjustedPortions, servings: adjustedPortions > 1 ? t('recipes.servings') : t('recipes.serving') }));
    } catch (error) {
      Alert.alert('Error', t('recipes.logFailed'));
    }
  };

  const handleAddToShoppingList = async (recipe: Recipe) => {
    if (!user?.uid) {
      Alert.alert('Error', t('recipes.loginToAdd'));
      return;
    }
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      Alert.alert(t('recipes.noIngredients'), t('recipes.noIngredientsMsg'));
      return;
    }
    try {
      // Handle both object ingredients ({ name, quantity, unit }) and plain strings
      const items = recipe.ingredients.map((ing: any) => {
        if (typeof ing === 'string') {
          return { name: ing, recipeId: recipe.id, recipeName: recipe.nameEs || recipe.name };
        }
        return {
          name: ing.name || String(ing),
          quantity: ing.quantity,
          unit: ing.unit,
          recipeId: recipe.id,
          recipeName: recipe.nameEs || recipe.name,
        };
      }).filter((item: any) => item.name && item.name.trim().length > 0);

      if (items.length === 0) {
        Alert.alert(t('recipes.noIngredients'), t('recipes.noValidIngredients'));
        return;
      }

      await addShoppingItems(user.uid, items);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('recipes.addedToShoppingList'),
        t('recipes.addedItemsCount', { count: items.length }),
        [
          { text: 'OK' },
          { text: t('recipes.viewShoppingList'), onPress: () => router.push('/shopping-list') },
        ]
      );
    } catch (error) {
      console.error('Shopping list add error:', error);
      Alert.alert('Error', t('recipes.addIngredientsFailed'));
    }
  };

  const RecipeCard = ({ recipe }: { recipe: Recipe }) => {
    const macros = recipe.nutritionPerServing || { protein: 0, carbs: 0, fat: 0 };
    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => { setAdjustedPortions(recipe.servings || 1); setExpandedRecipeId(recipe.id); }}
        activeOpacity={0.7}
      >
        <View style={styles.cardImageContainer}>
          {canDisplayUri(recipe.photoUri) ? (
            <Image source={{ uri: recipe.photoUri }} style={styles.cardImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="restaurant" size={32} color={C.primary} />
            </View>
          )}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(recipe.id)}
          >
            <Ionicons
              name={recipe.isFavorite ? 'star' : 'star-outline'}
              size={20}
              color={recipe.isFavorite ? C.accent : C.text}
            />
          </TouchableOpacity>
          {recipe.source === 'url_import' && (
            <View style={styles.importBadge}>
              <Ionicons name="link" size={12} color={C.text} />
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.recipeName} numberOfLines={2}>
            {recipe.nameEs || recipe.name}
          </Text>
          <View style={styles.timeRow}>
            {totalTime > 0 && (
              <View style={styles.timeItem}>
                <Ionicons name="timer" size={14} color={C.textSecondary} />
                <Text style={styles.timeText}>{totalTime}m</Text>
              </View>
            )}
            <View style={styles.timeItem}>
              <Ionicons name={"bowl" as any} size={14} color={C.textSecondary} />
              <Text style={styles.timeText}>{recipe.servings} {recipe.servings > 1 ? t('recipes.servings') : t('recipes.serving')}</Text>
            </View>
          </View>
          <View style={styles.macroRow}>
            <View style={[styles.macroPill, { backgroundColor: '#FF6A4D' }]}>
              <Text style={styles.macroText}>
                {Math.round(macros.protein)}p
              </Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: '#FFB84D' }]}>
              <Text style={styles.macroText}>
                {Math.round(macros.carbs)}c
              </Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: '#6AB4FF' }]}>
              <Text style={styles.macroText}>
                {Math.round(macros.fat)}g
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ExpandedRecipeView = ({ recipe }: { recipe: Recipe }) => {
    const baseMacros = recipe.nutritionPerServing || (recipe as any).nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    const macros = {
      calories: Math.round((baseMacros.calories || 0) * adjustedPortions),
      protein: Math.round((baseMacros.protein || 0) * adjustedPortions),
      carbs: Math.round((baseMacros.carbs || 0) * adjustedPortions),
      fat: Math.round((baseMacros.fat || 0) * adjustedPortions),
      fiber: Math.round((baseMacros.fiber || 0) * adjustedPortions),
    };

    return (
    <Modal
      visible={expandedRecipeId === recipe.id}
      transparent
      animationType="slide"
      onRequestClose={() => setExpandedRecipeId(null)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => setExpandedRecipeId(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ padding: 4 }}
          >
            <Ionicons name="close" size={28} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('recipes.recipeDetail')}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {canDisplayUri(recipe.photoUri) && (
            <Image source={{ uri: recipe.photoUri }} style={styles.expandedImage} />
          )}

          <Text style={styles.expandedRecipeName}>{recipe.nameEs || recipe.name}</Text>

          {recipe.description && (
            <Text style={{ color: C.textSecondary, fontSize: 14, marginBottom: 16, lineHeight: 20 }}>
              {recipe.description}
            </Text>
          )}

          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="timer" size={24} color={C.primary} />
              <Text style={styles.infoLabel}>{t('recipes.prep')}</Text>
              <Text style={styles.infoValue}>{recipe.prepTime || 0}m</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="flame" size={24} color={C.accent} />
              <Text style={styles.infoLabel}>{t('recipes.cooking')}</Text>
              <Text style={styles.infoValue}>{recipe.cookTime || 0}m</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name={"bowl" as any} size={24} color={C.primary} />
              <Text style={styles.infoLabel}>{t('recipes.servings')}</Text>
              <Text style={styles.infoValue}>{recipe.servings}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('recipes.nutritionPerServing')}</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{Math.round(macros.calories)}</Text>
                <Text style={styles.nutritionLabel}>kcal</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{Math.round(macros.protein)}g</Text>
                <Text style={styles.nutritionLabel}>{t('nutrition.protein')}</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{Math.round(macros.carbs)}g</Text>
                <Text style={styles.nutritionLabel}>{t('nutrition.carbs')}</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{Math.round(macros.fat)}g</Text>
                <Text style={styles.nutritionLabel}>{t('nutrition.fat')}</Text>
              </View>
            </View>
          </View>

          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('recipes.ingredients')} ({recipe.ingredients.length})</Text>
              {recipe.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientRow}>
                  <View style={styles.ingredientDot} />
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ing.name}</Text>
                    <Text style={styles.ingredientQty}>
                      {ing.quantity} {ing.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {recipe.instructions && recipe.instructions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('recipes.instructions')}</Text>
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
            <Text style={styles.sectionTitle}>{t('recipes.adjustServings')}</Text>
            <View style={styles.servingsControl}>
              <TouchableOpacity
                style={styles.servingButton}
                onPress={() => setAdjustedPortions((p) => Math.max(1, p - 1))}
              >
                <Ionicons name="remove" size={20} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.servingsText}>{adjustedPortions} {adjustedPortions === 1 ? t('recipes.serving') : t('recipes.servings')}</Text>
              <TouchableOpacity
                style={styles.servingButton}
                onPress={() => setAdjustedPortions((p) => p + 1)}
              >
                <Ionicons name="add" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: C.textSecondary, textAlign: 'center', marginTop: 6 }}>
              {macros.calories} kcal · P:{macros.protein}g · C:{macros.carbs}g · G:{macros.fat}g
            </Text>
          </View>

          <TouchableOpacity
            style={styles.registrarButton}
            onPress={() => {
              handleLogRecipe(recipe.id);
              setExpandedRecipeId(null);
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color={C.background} />
            <Text style={styles.registrarButtonText}>{t('recipes.logAsMeal')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shoppingButton}
            onPress={() => handleAddToShoppingList(recipe)}
          >
            <Ionicons name="cart-outline" size={20} color={C.primary} />
            <Text style={styles.shoppingButtonText}>{t('recipes.addToShoppingList')}</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('recipes.title')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={28} color={C.background} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={C.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('recipes.searchPlaceholder')}
          placeholderTextColor={C.textMuted}
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

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.emptyStateText}>{t('recipes.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={({ item }) => <RecipeCard recipe={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="restaurant" size={48} color={C.textMuted} />
              <Text style={styles.emptyStateText}>{t('recipes.noRecipesFound')}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
                {t('recipes.createOrImport')}
              </Text>
            </View>
          }
        />
      )}

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
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ padding: 4 }}
            >
              <Ionicons name="close" size={28} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('recipes.createRecipe')}</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={styles.label}>{t('recipes.recipeName')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('recipes.namePlaceholder')}
                placeholderTextColor={C.textMuted}
                value={newRecipe.name || ''}
                onChangeText={(text) =>
                  setNewRecipe({ ...newRecipe, name: text })
                }
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>{t('recipes.servings')}</Text>
              <View style={styles.servingsControl}>
                <TouchableOpacity style={styles.servingButton}>
                  <Ionicons name="remove" size={20} color={C.text} />
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
                  <Ionicons name="add" size={20} color={C.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>{t('recipes.instructions')}</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder={t('recipes.instructionsPlaceholder')}
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateRecipe}
            >
              <Text style={styles.createButtonText}>{t('recipes.createRecipe')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shoppingButton}
              onPress={() => {
                if (!newRecipe.ingredients || newRecipe.ingredients.length === 0) {
                  Alert.alert(t('recipes.noIngredients'), t('recipes.addIngredientsFirst'));
                  return;
                }
                if (!user?.uid) return;
                const items = (newRecipe.ingredients || []).map((ing) => ({
                  name: ing.name,
                  quantity: ing.quantity,
                  unit: ing.unit,
                  recipeName: newRecipe.name || t('recipes.newRecipe'),
                }));
                addShoppingItems(user.uid, items).then(() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert(t('recipes.addedToShoppingList'), t('recipes.addedItemsCount', { count: items.length }));
                });
              }}
            >
              <Ionicons name="cart-outline" size={18} color={C.primary} />
              <Text style={styles.shoppingButtonText}>{t('recipes.addToShoppingList')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showImportModal}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!isImporting) setShowImportModal(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.importDialog}>
            <Text style={styles.importTitle}>{t('recipes.importFromUrl')}</Text>
            <Text style={{ color: C.textSecondary, fontSize: 12, marginBottom: 12 }}>
              {t('recipes.importUrlDescription')}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('recipes.urlPlaceholder')}
              placeholderTextColor={C.textMuted}
              value={importUrl}
              onChangeText={setImportUrl}
              editable={!isImporting}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {isImporting && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 }}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={{ color: C.textSecondary, fontSize: 13 }}>
                  {t('recipes.analyzing')}
                </Text>
              </View>
            )}
            <View style={styles.dialogButtonRow}>
              <TouchableOpacity
                style={[styles.dialogButton, isImporting && { opacity: 0.5 }]}
                onPress={() => setShowImportModal(false)}
                disabled={isImporting}
              >
                <Text style={styles.dialogButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonPrimary, isImporting && { opacity: 0.5 }]}
                onPress={handleImportRecipe}
                disabled={isImporting}
              >
                <Text style={styles.dialogButtonTextPrimary}>
                  {isImporting ? t('recipes.importing') : t('recipes.import')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowImportModal(true)}
      >
        <Ionicons name="download" size={24} color={C.background} />
        <Text style={styles.fabText}>{t('recipes.importRecipe') || 'Importar URL'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (C: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
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
    color: C.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: C.text,
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
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: C.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  recipeCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardImageContainer: {
    position: 'relative',
    height: 160,
    backgroundColor: C.surfaceLight,
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
    backgroundColor: C.surfaceLight,
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
  importBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
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
    color: C.text,
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
    color: C.textSecondary,
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
    color: C.background,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    marginTop: 12,
    color: C.textMuted,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: C.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.text,
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
    color: C.text,
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
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  infoLabel: {
    fontSize: 11,
    color: C.textSecondary,
    marginTop: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
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
    color: C.primary,
  },
  nutritionLabel: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
    marginRight: 12,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    color: C.text,
    fontWeight: '500',
  },
  ingredientQty: {
    fontSize: 12,
    color: C.textSecondary,
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
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.background,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },
  scalingSection: {
    marginBottom: 20,
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 48,
  },
  servingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  servingsInput: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
    flex: 1,
  },
  registrarButton: {
    flexDirection: 'row',
    backgroundColor: C.accent,
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
    color: C.background,
  },
  shoppingButton: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: `${C.primary}10`,
  },
  shoppingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: C.primary,
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
    color: C.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importDialog: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  importTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
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
    backgroundColor: C.surfaceLight,
    borderWidth: 1,
    borderColor: C.border,
  },
  dialogButtonPrimary: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  dialogButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  dialogButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: C.background,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'visible',
  },
  fabText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.background,
  },
});
