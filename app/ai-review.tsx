import React, { useState, useCallback } from 'react';
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
import { COLORS } from '../theme';

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

interface AnalysisResult {
  dishName: string;
  confidence: number;
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
  { id: 'breakfast', label: 'Desayuno', icon: 'sunny' },
  { id: 'lunch', label: 'Almuerzo', icon: 'sunny-outline' },
  { id: 'dinner', label: 'Cena', icon: 'moon' },
  { id: 'snack', label: 'Merienda', icon: 'star' },
];

const DATA_SOURCES = [
  { id: 'openai', label: 'OpenAI Vision', source: 'OpenAI' },
  { id: 'openfoodfacts', label: 'Open Food Facts', source: 'OpenFoodFacts' },
  { id: 'usda', label: 'USDA Database', source: 'USDA' },
];

// Mock analysis result
const MOCK_ANALYSIS: AnalysisResult = {
  dishName: 'Pollo a la Parrilla con Brócoli',
  confidence: 85,
  ingredients: [
    { id: '1', name: 'Pechuga de Pollo', quantity: 150, unit: 'g' },
    { id: '2', name: 'Brócoli', quantity: 100, unit: 'g' },
    { id: '3', name: 'Aceite de Oliva', quantity: 10, unit: 'ml' },
  ],
  nutrition: {
    calories: 380,
    protein: 45,
    carbs: 12,
    fat: 18,
    fiber: 3,
  },
  portion: 260,
  dataSource: 'OpenAI Vision + USDA',
  mealType: 'lunch',
};

export default function AIReviewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const params = route.params as RouteParams;

  const [analysis, setAnalysis] = useState<AnalysisResult>(MOCK_ANALYSIS);
  const [dishName, setDishName] = useState(MOCK_ANALYSIS.dishName);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    MOCK_ANALYSIS.ingredients
  );
  const [portion, setPortion] = useState(MOCK_ANALYSIS.portion.toString());
  const [nutrition, setNutrition] = useState<NutritionData>(
    MOCK_ANALYSIS.nutrition
  );
  const [selectedMealType, setSelectedMealType] = useState<string>(
    MOCK_ANALYSIS.mealType || 'lunch'
  );
  const [showPerTotal, setShowPerTotal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [imageBase64] = useState<string>(params?.imageBase64 || '');

  const getConfidenceBadge = () => {
    const confidence = analysis.confidence;
    if (confidence >= 80) {
      return {
        color: COLORS.success,
        bgColor: `${COLORS.success}20`,
        label: 'Alta confianza',
        icon: 'checkmark-circle',
        subtext: '✓ Análisis muy preciso',
      };
    } else if (confidence >= 60) {
      return {
        color: COLORS.warning,
        bgColor: `${COLORS.warning}20`,
        label: 'Media confianza',
        icon: 'alert-circle',
        subtext: '⚠ Revisa los datos',
      };
    } else {
      return {
        color: COLORS.error,
        bgColor: `${COLORS.error}20`,
        label: 'Baja confianza',
        icon: 'close-circle',
        subtext: 'Revisa los datos con cuidado',
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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      // Navigate back with success
      navigation.goBack();
    }, 1500);
  };

  const handleDiscard = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const renderIngredient = ({ item }: { item: Ingredient }) => (
    <View style={styles.ingredientChip}>
      <View style={styles.ingredientContent}>
        <Text style={styles.ingredientName}>{item.name}</Text>
        {item.quantity && (
          <Text style={styles.ingredientQuantity}>
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
          color={COLORS.textSecondary}
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
      ]}
    >
      <Ionicons
        name={mealType.icon as any}
        size={20}
        color={
          selectedMealType === mealType.id
            ? COLORS.violet
            : COLORS.textSecondary
        }
      />
      <Text
        style={[
          styles.mealTypeButtonLabel,
          selectedMealType === mealType.id &&
            styles.mealTypeButtonLabelActive,
        ]}
      >
        {mealType.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Revisión IA</Text>
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

      {/* Image Thumbnail */}
      {imageBase64 && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
            style={styles.imageThumbnail}
          />
        </View>
      )}

      {/* Confidence Meter */}
      <View style={styles.section}>
        <View style={styles.confidenceMeterContainer}>
          <View style={styles.meterLabel}>
            <Text style={styles.meterLabelText}>Confianza</Text>
            <Text style={[styles.meterValue, { color: confidenceBadge.color }]}>
              {analysis.confidence}%
            </Text>
          </View>
          <View style={styles.meterBar}>
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
        <Text style={styles.sectionLabel}>Nombre del Plato</Text>
        <TextInput
          style={styles.textInput}
          value={dishName}
          onChangeText={setDishName}
          placeholder="Nombre de la comida"
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>

      {/* Ingredients */}
      <View style={styles.section}>
        <View style={styles.ingredientsHeader}>
          <Text style={styles.sectionLabel}>Ingredientes</Text>
          <Text style={styles.ingredientCount}>{ingredients.length}</Text>
        </View>

        <FlatList
          data={ingredients}
          renderItem={renderIngredient}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.ingredientsList}
        />

        <View style={styles.addIngredientContainer}>
          <TextInput
            style={styles.ingredientInput}
            value={newIngredientName}
            onChangeText={setNewIngredientName}
            placeholder="Nuevo ingrediente"
            placeholderTextColor={COLORS.textSecondary}
          />
          <TouchableOpacity
            onPress={handleAddIngredient}
            style={styles.addIngredientButton}
          >
            <Ionicons
              name="add-circle"
              size={24}
              color={COLORS.violet}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Portion */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Porción (g)</Text>
        <View style={styles.portionControl}>
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
              color={COLORS.violet}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.portionInput}
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
              color={COLORS.violet}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Per 100g vs Total Toggle */}
      <View style={styles.section}>
        <View style={styles.toggleContainer}>
          <Text style={styles.sectionLabel}>Valores</Text>
          <View style={styles.toggleButtons}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setShowPerTotal(false);
              }}
              style={[
                styles.toggleButton,
                !showPerTotal && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  !showPerTotal && styles.toggleButtonTextActive,
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
              ]}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  showPerTotal && styles.toggleButtonTextActive,
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
        <Text style={styles.sectionLabel}>Macros</Text>
        <View style={styles.macroGrid}>
          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Calorías</Text>
            <TextInput
              style={styles.macroInput}
              value={nutrition.calories.toString()}
              onChangeText={(value) =>
                handleUpdateNutrition('calories', value)
              }
              keyboardType="numeric"
              textAlign="center"
            />
            <Text style={styles.macroUnit}>kcal</Text>
          </View>

          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Proteína</Text>
            <TextInput
              style={styles.macroInput}
              value={nutrition.protein.toString()}
              onChangeText={(value) =>
                handleUpdateNutrition('protein', value)
              }
              keyboardType="numeric"
              textAlign="center"
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>

          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <TextInput
              style={styles.macroInput}
              value={nutrition.carbs.toString()}
              onChangeText={(value) => handleUpdateNutrition('carbs', value)}
              keyboardType="numeric"
              textAlign="center"
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>

          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Grasas</Text>
            <TextInput
              style={styles.macroInput}
              value={nutrition.fat.toString()}
              onChangeText={(value) => handleUpdateNutrition('fat', value)}
              keyboardType="numeric"
              textAlign="center"
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>

          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Fibra</Text>
            <TextInput
              style={styles.macroInput}
              value={nutrition.fiber.toString()}
              onChangeText={(value) => handleUpdateNutrition('fiber', value)}
              keyboardType="numeric"
              textAlign="center"
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>
        </View>
      </View>

      {/* Meal Type Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tipo de Comida</Text>
        <View style={styles.mealTypesContainer}>
          {MEAL_TYPES.map(renderMealTypeButton)}
        </View>
      </View>

      {/* Data Sources */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Fuentes de Datos</Text>
        <View style={styles.dataSourceCard}>
          <Ionicons
            name="information-circle"
            size={16}
            color={COLORS.violet}
          />
          <View style={styles.dataSourceContent}>
            <Text style={styles.dataSourceTitle}>Análisis Multi-Fuente</Text>
            <Text style={styles.dataSourceText}>
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
            style={styles.discardButton}
            disabled={isSaving}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={COLORS.violet}
            />
            <Text style={styles.discardButtonText}>Descartar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirmAndSave}
            style={styles.confirmButton}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <>
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.confirmButtonText}>
                  Confirmar y Registrar
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
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
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
  imageContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  imageThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: COLORS.border,
  },
  section: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  confidenceMeterContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.text,
  },
  meterValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  meterBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.border,
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
    color: COLORS.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: `${COLORS.violet}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ingredientsList: {
    gap: 8,
    marginBottom: 12,
  },
  ingredientChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ingredientContent: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  ingredientQuantity: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  addIngredientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  addIngredientButton: {
    padding: 6,
  },
  portionControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.violet,
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  toggleButtonTextActive: {
    color: COLORS.white,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  macroCard: {
    width: (width - 32 - 16) / 2.5,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  macroInput: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.violet,
    paddingHorizontal: 4,
  },
  macroUnit: {
    fontSize: 10,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  mealTypeButtonActive: {
    backgroundColor: `${COLORS.violet}15`,
    borderColor: COLORS.violet,
  },
  mealTypeButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  mealTypeButtonLabelActive: {
    color: COLORS.violet,
  },
  dataSourceCard: {
    backgroundColor: `${COLORS.violet}10`,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: `${COLORS.violet}20`,
  },
  dataSourceContent: {
    flex: 1,
  },
  dataSourceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  dataSourceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.violet,
    gap: 6,
  },
  discardButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.violet,
  },
  confirmButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.violet,
    gap: 6,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  bottomSpacing: {
    height: 32,
  },
});
