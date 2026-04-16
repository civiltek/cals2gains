import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import { useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const GRID_COLS = 2;
const CARD_WIDTH = (width - 32 - 8) / GRID_COLS;

interface CaptureMode {
  id: string;
  labelKey: string;
  descriptionKey: string;
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
    labelKey: 'captureHub.photo',
    descriptionKey: 'captureHub.photoDesc',
    icon: 'camera',
    route: '/(tabs)/camera',
  },
  {
    id: 'voice',
    labelKey: 'captureHub.voice',
    descriptionKey: 'captureHub.voiceDesc',
    icon: 'mic',
    route: '/voice-log',
  },
  {
    id: 'search',
    labelKey: 'captureHub.search',
    descriptionKey: 'captureHub.searchDesc',
    icon: 'search',
    route: 'food-search',
  },
  {
    id: 'barcode',
    labelKey: 'captureHub.barcode',
    descriptionKey: 'captureHub.barcodeDesc',
    icon: 'barcode',
    route: 'barcode-scanner',
  },
  {
    id: 'label',
    labelKey: 'captureHub.label',
    descriptionKey: 'captureHub.labelDesc',
    icon: 'text',
    route: 'label-scanner',
  },
  {
    id: 'quick',
    labelKey: 'captureHub.quick',
    descriptionKey: 'captureHub.quickDesc',
    icon: 'flash',
    route: 'quick-add',
  },
];

// Mock data - replace with actual store data (will be populated with i18n in component)
const createMockRecentMeals = (t: any): RecentMeal[] => [
  {
    id: '1',
    name: t('captureHub.mockMeal1'),
    calories: 520,
    timestamp: Date.now() - 86400000,
    type: 'lunch',
  },
  {
    id: '2',
    name: t('captureHub.mockMeal2'),
    calories: 180,
    timestamp: Date.now() - 86400000,
    type: 'lunch',
  },
  {
    id: '3',
    name: t('captureHub.mockMeal3'),
    calories: 380,
    timestamp: Date.now() - 86400000,
    type: 'breakfast',
  },
];

const createMockFavorites = (t: any): FavoriteMeal[] => [
  {
    id: 'f1',
    name: t('captureHub.mockMeal4'),
    calories: 150,
    usageCount: 45,
  },
  {
    id: 'f2',
    name: t('captureHub.mockMeal5'),
    calories: 280,
    usageCount: 32,
  },
  {
    id: 'f3',
    name: t('captureHub.mockMeal6'),
    calories: 105,
    usageCount: 28,
  },
  {
    id: 'f4',
    name: t('captureHub.mockMeal7'),
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

// getMealTypeLabel is now handled via i18n t('home.breakfast') etc. inside component

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
  const { t } = useTranslation();
  const router = useRouter();
  const route = useRoute();
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);

  const getMealTypeLabel = (type: string) => t(`home.${type}`);
  const [currentMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(
    getMealType()
  );
  const [yesterdayMeals, setYesterdayMeals] = useState<RecentMeal[]>([]);
  const [recentMeals] = useState<RecentMeal[]>(createMockRecentMeals(t));
  const [favorites] = useState<FavoriteMeal[]>(createMockFavorites(t));

  useEffect(() => {
    // Simulate loading yesterday's meals from store
    setYesterdayMeals(createMockRecentMeals(t).slice(0, 2));
  }, [t]);

  const handleCaptureMode = async (mode: CaptureMode) => {
    await Haptics.selectionAsync();
    router.push(mode.route as any);
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
            color="#9C8CFF"
          />
        </View>
        <Text style={styles.cardLabel}>{t(item.labelKey)}</Text>
        <Text style={styles.cardDescription}>{t(item.descriptionKey)}</Text>
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
            color="#9C8CFF"
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
          color="#FF6A4D"
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
            name={getMealTypeIcon(item.type) as any}
            size={20}
            color="#9C8CFF"
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
        <Text style={styles.title}>{t('captureHub.title')}</Text>
        <View style={styles.mealTypePill}>
          <Ionicons
            name={getMealTypeIcon(currentMealType) as any}
            size={14}
            color="#FFFFFF"
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

      {/* Yesterday Meals Section */}
      {yesterdayMeals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('captureHub.sameAsYesterday')}</Text>
            <Text style={styles.sectionSubtitle}>{t('captureHub.sameAsYesterdayDesc')}</Text>
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
            <Text style={styles.sectionTitle}>{t('captureHub.favorites')}</Text>
            <Ionicons
              name="heart"
              size={16}
              color="#FF6A4D"
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
            <Text style={styles.sectionTitle}>{t('captureHub.recent')}</Text>
            <Text style={styles.sectionSubtitle}>{recentMeals.length} {t('captureHub.meals')}</Text>
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

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
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
      color: C.text,
      letterSpacing: -0.5,
    },
    mealTypePill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#9C8CFF',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 4,
    },
    mealTypeLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
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
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 140,
      borderWidth: 1,
      borderColor: C.border,
      shadowColor: C.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    iconBackground: {
      width: 60,
      height: 60,
      borderRadius: 12,
      backgroundColor: '#9C8CFF10',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    cardDescription: {
      fontSize: 12,
      color: C.textSecondary,
      textAlign: 'center',
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
      color: C.text,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: C.textSecondary,
    },
    yesterdayMealCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    yesterdayMealContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    yesterdayMealName: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
      marginBottom: 2,
    },
    yesterdayMealCals: {
      fontSize: 12,
      color: C.textSecondary,
    },
    relogBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: '#9C8CFF10',
      justifyContent: 'center',
      alignItems: 'center',
    },
    favoritesList: {
      gap: 12,
      paddingRight: 16,
    },
    favoriteCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 12,
      width: 90,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#FF6A4D30',
      shadowColor: '#FF6A4D',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    favoriteIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: '#FF6A4D15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    favoriteName: {
      fontSize: 12,
      fontWeight: '600',
      color: C.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    favoriteCals: {
      fontSize: 14,
      fontWeight: '700',
      color: '#9C8CFF',
    },
    favoriteCalLabel: {
      fontSize: 10,
      color: C.textSecondary,
      marginTop: 2,
    },
    recentMealItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: C.border,
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
      backgroundColor: '#9C8CFF10',
      justifyContent: 'center',
      alignItems: 'center',
    },
    recentMealName: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
      marginBottom: 2,
    },
    recentMealTime: {
      fontSize: 12,
      color: C.textSecondary,
    },
    recentMealCals: {
      fontSize: 13,
      fontWeight: '600',
      color: '#9C8CFF',
    },
    bottomSpacing: {
      height: 32,
    },
  });
}
