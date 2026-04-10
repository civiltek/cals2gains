import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme';
import { useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const GRID_COLS = 2;
const CARD_WIDTH = (width - 32 - 8) / GRID_COLS;

interface CaptureMode {
  id: string;
  label: string;
  description: string;
  icon: string;
  route: string;
}

interface RecentMeal {
  id: string;
  name: string;
  calories: number;
  timestamp: number;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface FavoriteMeal {
  id: string;
  name: string;
  calories: number;
  usageCount: number;
}

const CAPTURE_MODES: CaptureMode[] = [
  {
    id: 'photo',
    label: 'Foto',
    description: 'Captura visual',
    icon: 'camera',
    route: '/(tabs)/camera',
  },
  {
    id: 'voice',
    label: 'Voz',
    description: 'Dictado rápido',
    icon: 'mic',
    route: 'voice',
  },
  {
    id: 'search',
    label: 'Buscar',
    description: 'Por nombre',
    icon: 'search',
    route: 'food-search',
  },
  {
    id: 'barcode',
    label: 'Código de barras',
    description: 'Escanea',
    icon: 'barcode',
    route: 'barcode-scanner',
  },
  {
    id: 'label',
    label: 'Etiqueta',
    description: 'Texto en imagen',
    icon: 'text',
    route: 'label-scanner',
  },
  {
    id: 'quick',
    label: 'Rápido',
    description: 'Entrada manual',
    icon: 'flash',
    route: 'quick-add',
  },
];

// Mock data - replace with actual store data
const MOCK_RECENT_MEALS: RecentMeal[] = [
  {
    id: '1',
    name: 'Pollo con Arroz',
    calories: 520,
    timestamp: Date.now() - 86400000,
    type: 'lunch',
  },
  {
    id: '2',
    name: 'Ensalada Verde',
    calories: 180,
    timestamp: Date.now() - 86400000,
    type: 'lunch',
  },
  {
    id: '3',
    name: 'Sándwich Tostado',
    calories: 380,
    timestamp: Date.now() - 86400000,
    type: 'breakfast',
  },
];

const MOCK_FAVORITES: FavoriteMeal[] = [
  {
    id: 'f1',
    name: 'Avena',
    calories: 150,
    usageCount: 45,
  },
  {
    id: 'f2',
    name: 'Pollo Grillado',
    calories: 280,
    usageCount: 32,
  },
  {
    id: 'f3',
    name: 'Plátano',
    calories: 105,
    usageCount: 28,
  },
  {
    id: 'f4',
    name: 'Café con Leche',
    calories: 75,
    usageCount: 87,
  },
];

const getMealType = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'breakfast';
  if (hour >= 12 && hour < 17) return 'lunch';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'snack';
};

const getMealTypeLabel = (
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): string => {
  const labels: Record<typeof type, string> = {
    breakfast: 'Desayuno',
    lunch: 'Almuerzo',
    dinner: 'Cena',
    snack: 'Merienda',
  };
  return labels[type];
};

const getMealTypeIcon = (
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): string => {
  const icons: Record<typeof type, string> = {
    breakfast: 'sunny',
    lunch: 'sunny-outline',
    dinner: 'moon',
    snack: 'star',
  };
  return icons[type];
};

export default function CaptureHubScreen() {
  const router = useRouter();
  const route = useRoute();
  const [currentMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(
    getMealType()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [yesterdayMeals, setYesterdayMeals] = useState<RecentMeal[]>([]);
  const [recentMeals] = useState<RecentMeal[]>(MOCK_RECENT_MEALS);
  const [favorites] = useState<FavoriteMeal[]>(MOCK_FAVORITES);

  useEffect(() => {
    // Simulate loading yesterday's meals from store
    setYesterdayMeals(MOCK_RECENT_MEALS.slice(0, 2));
  }, []);

  const handleCaptureMode = async (mode: CaptureMode) => {
    await Haptics.selectionAsync();
    if (mode.id === 'voice') {
      // Handle voice inline
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 1500);
    } else {
      router.push(mode.route as any);
    }
  };

  const handleRelogMeal = async (meal: RecentMeal) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to review with pre-filled data
    router.push({
      pathname: '/ai-review',
      params: {
        isQuickRelog: true,
        mealData: JSON.stringify(meal),
      },
    } as any);
  };

  const handleQuickFavoriteMeal = async (meal: FavoriteMeal) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to review with favorite data
    router.push({
      pathname: '/ai-review',
      params: {
        isFavoriteMeal: true,
        mealData: JSON.stringify(meal),
      },
    } as any);
  };

  const renderCaptureCard = ({ item }: { item: CaptureMode }) => (
    <TouchableOpacity
      onPress={() => handleCaptureMode(item)}
      activeOpacity={0.7}
      style={styles.cardContainer}
    >
      <View style={styles.captureCard}>
        <View style={styles.iconBackground}>
          <Ionicons
            name={item.icon as any}
            size={40}
            color={COLORS.violet}
          />
        </View>
        <Text style={styles.cardLabel}>{item.label}</Text>
        <Text style={styles.cardDescription}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderYesterdayMeal = ({ item }: { item: RecentMeal }) => (
    <TouchableOpacity
      onPress={() => handleRelogMeal(item)}
      activeOpacity={0.6}
      style={styles.yesterdayMealCard}
    >
      <View style={styles.yesterdayMealContent}>
        <View>
          <Text style={styles.yesterdayMealName}>{item.name}</Text>
          <Text style={styles.yesterdayMealCals}>
            {item.calories} kcal · {getMealTypeLabel(item.type)}
          </Text>
        </View>
        <View style={styles.relogBadge}>
          <Ionicons
            name="arrow-redo"
            size={16}
            color={COLORS.violet}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFavoriteMeal = ({ item }: { item: FavoriteMeal }) => (
    <TouchableOpacity
      onPress={() => handleQuickFavoriteMeal(item)}
      activeOpacity={0.6}
      style={styles.favoriteCard}
    >
      <View style={styles.favoriteIconContainer}>
        <Ionicons
          name="heart"
          size={18}
          color={COLORS.coral}
        />
      </View>
      <Text style={styles.favoriteName}>{item.name}</Text>
      <Text style={styles.favoriteCals}>{item.calories}</Text>
      <Text style={styles.favoriteCalLabel}>kcal</Text>
    </TouchableOpacity>
  );

  const renderRecentMeal = ({ item }: { item: RecentMeal }) => (
    <TouchableOpacity
      onPress={() => handleRelogMeal(item)}
      activeOpacity={0.6}
      style={styles.recentMealItem}
    >
      <View style={styles.recentMealLeft}>
        <View style={styles.recentMealIcon}>
          <Ionicons
            name={getMealTypeIcon(item.type)}
            size={20}
            color={COLORS.violet}
          />
        </View>
        <View>
          <Text style={styles.recentMealName}>{item.name}</Text>
          <Text style={styles.recentMealTime}>
            {getMealTypeLabel(item.type)}
          </Text>
        </View>
      </View>
      <Text style={styles.recentMealCals}>{item.calories} kcal</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Registrar Comida</Text>
        <View style={styles.mealTypePill}>
          <Ionicons
            name={getMealTypeIcon(currentMealType)}
            size={14}
            color={COLORS.white}
          />
          <Text style={styles.mealTypeLabel}>
            {getMealTypeLabel(currentMealType)}
          </Text>
        </View>
      </View>

      {/* Capture Modes Grid */}
      <View style={styles.section}>
        <FlatList
          data={CAPTURE_MODES}
          renderItem={renderCaptureCard}
          keyExtractor={(item) => item.id}
          numColumns={GRID_COLS}
          scrollEnabled={false}
          columnWrapperStyle={styles.gridRow}
        />
      </View>

      {/* Voice Recording Loading State */}
      {isLoading && (
        <View style={styles.voiceLoadingContainer}>
          <ActivityIndicator
            size="large"
            color={COLORS.violet}
          />
          <Text style={styles.voiceLoadingText}>Escuchando...</Text>
        </View>
      )}

      {/* Yesterday Meals Section */}
      {yesterdayMeals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mismo que ayer</Text>
            <Text style={styles.sectionSubtitle}>Un toque para repetir</Text>
          </View>
          {yesterdayMeals.map((meal) => (
            <View key={meal.id}>
              {renderYesterdayMeal({ item: meal })}
            </View>
          ))}
        </View>
      )}

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favoritos</Text>
            <Ionicons
              name="heart"
              size={16}
              color={COLORS.coral}
            />
          </View>
          <FlatList
            data={favorites}
            renderItem={renderFavoriteMeal}
            keyExtractor={(item) => item.id}
            horizontal
            scrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favoritesList}
          />
        </View>
      )}

      {/* Recent Meals Section */}
      {recentMeals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recientes</Text>
            <Text style={styles.sectionSubtitle}>{recentMeals.length} comidas</Text>
          </View>
          {recentMeals.slice(0, 5).map((meal) => (
            <View key={meal.id}>
              {renderRecentMeal({ item: meal })}
            </View>
          ))}
        </View>
      )}

      {/* Bottom Spacing */}
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  mealTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.violet,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  mealTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  section: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  gridRow: {
    gap: 8,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: 8,
  },
  captureCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBackground: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: `${COLORS.violet}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  voiceLoadingContainer: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: `${COLORS.violet}10`,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceLoadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.violet,
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
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  yesterdayMealCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  yesterdayMealContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yesterdayMealName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  yesterdayMealCals: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  relogBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${COLORS.violet}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoritesList: {
    gap: 12,
    paddingRight: 16,
  },
  favoriteCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    width: 90,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.coral}30`,
    shadowColor: COLORS.coral,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  favoriteIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${COLORS.coral}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  favoriteName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  favoriteCals: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.violet,
  },
  favoriteCalLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recentMealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recentMealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  recentMealIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: `${COLORS.violet}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentMealName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  recentMealTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recentMealCals: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.violet,
  },
  bottomSpacing: {
    height: 32,
  },
});
