import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import AITransparencyBanner from '../components/ui/AITransparencyBanner';

// Type definitions
interface FoodItem {
  id: string;
  name: string;
  brand: string;
  source: 'OpenFoodFacts' | 'USDA' | 'IA' | 'Custom';
  verified: 'verified' | 'unverified' | 'reported';
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    servingSize: number;
    unit: 'g' | 'ml' | 'piece';
  };
  reportCount?: number;
  createdBy?: string;
}

interface FoodReport {
  foodId: string;
  issueType: 'calories' | 'macros' | 'serving' | 'photo' | 'other';
  description: string;
  suggestedValues?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
}

const FoodVerificationScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const [activeTab, setActiveTab] = useState<'database' | 'myFoods'>('database');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Report form state
  const [reportData, setReportData] = useState<FoodReport>({
    foodId: '',
    issueType: 'calories',
    description: '',
  });

  // Custom food form state
  const [customFood, setCustomFood] = useState({
    name: '',
    brand: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    servingSize: '100',
  });

  // Mock data - Replace with API call
  const mockFoods: FoodItem[] = [
    {
      id: '1',
      name: t('foodVerification.chickenBreast'),
      brand: t('foodVerification.fresh'),
      source: 'OpenFoodFacts',
      verified: 'verified',
      nutrition: {
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        fiber: 0,
        servingSize: 100,
        unit: 'g',
      },
      reportCount: 2,
    },
    {
      id: '2',
      name: t('foodVerification.cookedWhiteRice'),
      brand: t('foodVerification.generic'),
      source: 'USDA',
      verified: 'verified',
      nutrition: {
        calories: 130,
        protein: 2.7,
        carbs: 28,
        fat: 0.3,
        fiber: 0.4,
        servingSize: 100,
        unit: 'g',
      },
    },
    {
      id: '3',
      name: t('foodVerification.wholeOats'),
      brand: t('foodVerification.brandA'),
      source: 'OpenFoodFacts',
      verified: 'unverified',
      nutrition: {
        calories: 389,
        protein: 17,
        carbs: 66,
        fat: 6.9,
        fiber: 10.6,
        servingSize: 100,
        unit: 'g',
      },
    },
    {
      id: '4',
      name: t('foodVerification.sweetPotato'),
      brand: t('foodVerification.fresh'),
      source: 'IA',
      verified: 'reported',
      nutrition: {
        calories: 86,
        protein: 1.6,
        carbs: 20,
        fat: 0.1,
        fiber: 3,
        servingSize: 100,
        unit: 'g',
      },
      reportCount: 5,
    },
  ];

  const [myFoods, setMyFoods] = useState<FoodItem[]>([
    {
      id: 'custom-1',
      name: t('foodVerification.myProteinSmoothie'),
      brand: 'Custom',
      source: 'Custom',
      verified: 'verified',
      nutrition: {
        calories: 320,
        protein: 35,
        carbs: 28,
        fat: 8,
        fiber: 4,
        servingSize: 300,
        unit: 'ml',
      },
      createdBy: 'user123',
    },
  ]);

  const filteredFoods = useMemo(() => {
    return mockFoods.filter(
      (food) =>
        food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        food.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleFoodPress = (food: FoodItem) => {
    setSelectedFood(food);
    setShowDetailModal(true);
  };

  const handleReportPress = () => {
    if (selectedFood) {
      setReportData({
        foodId: selectedFood.id,
        issueType: 'calories',
        description: '',
      });
      setShowReportModal(true);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportData.description.trim()) {
      Alert.alert('Error', t('foodVerification.describeProblem'));
      return;
    }
    setLoading(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.success'), t('foodVerification.reportSent'));
      setShowReportModal(false);
      setShowDetailModal(false);
      setReportData({ foodId: '', issueType: 'calories', description: '' });
    } catch (error) {
      Alert.alert('Error', t('foodVerification.reportFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomFood = async () => {
    if (!customFood.name.trim()) {
      Alert.alert('Error', t('foodVerification.foodNameRequired'));
      return;
    }
    setLoading(true);
    try {
      const newFood: FoodItem = {
        id: `custom-${Date.now()}`,
        name: customFood.name,
        brand: customFood.brand || t('foodVerification.brandPlaceholder'),
        source: 'Custom',
        verified: 'verified',
        nutrition: {
          calories: parseInt(customFood.calories) || 0,
          protein: parseFloat(customFood.protein) || 0,
          carbs: parseFloat(customFood.carbs) || 0,
          fat: parseFloat(customFood.fat) || 0,
          fiber: parseFloat(customFood.fiber) || 0,
          servingSize: parseInt(customFood.servingSize) || 100,
          unit: 'g',
        },
        createdBy: 'user123',
      };
      setMyFoods([...myFoods, newFood]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.success'), t('foodVerification.customCreated'));
      setShowCustomFoodModal(false);
      setCustomFood({
        name: '',
        brand: '',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        fiber: '',
        servingSize: '100',
      });
    } catch (error) {
      Alert.alert('Error', t('foodVerification.customFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomFood = (foodId: string) => {
    Alert.alert(
      t('common.delete'),
      t('foodVerification.deleteConfirm'),
      [
        { text: t('common.cancel'), onPress: () => {}, style: 'cancel' },
        {
          text: t('common.delete'),
          onPress: () => {
            setMyFoods(myFoods.filter((f) => f.id !== foodId));
          },
          style: 'destructive',
        },
      ]
    );
  };

  const getVerificationBadge = (verified: string) => {
    switch (verified) {
      case 'verified':
        return { icon: 'checkmark-circle', color: C.success, label: t('foodVerification.verified') };
      case 'unverified':
        return { icon: 'alert-circle', color: C.warning, label: t('foodVerification.unverified') };
      case 'reported':
        return { icon: 'close-circle', color: C.error, label: t('foodVerification.reported') };
      default:
        return { icon: 'help-circle', color: C.text, label: t('foodVerification.unknown') };
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'OpenFoodFacts':
        return C.primary;
      case 'USDA':
        return C.info;
      case 'IA':
        return C.accent;
      case 'Custom':
        return C.success;
      default:
        return C.textSecondary;
    }
  };

  const renderFoodCard = (food: FoodItem) => {
    const badge = getVerificationBadge(food.verified);
    return (
      <TouchableOpacity
        key={food.id}
        style={[styles.foodCard, { backgroundColor: C.background }]}
        onPress={() => handleFoodPress(food)}
        activeOpacity={0.7}
      >
        <View style={styles.foodCardHeader}>
          <View style={styles.foodInfo}>
            <Text style={[styles.foodName, { color: C.text }]}>{food.name}</Text>
            <Text style={[styles.foodBrand, { color: C.textSecondary }]}>
              {food.brand}
            </Text>
          </View>
          <View style={styles.badges}>
            <View
              style={[
                styles.badge,
                { backgroundColor: `${badge.color}20`, borderColor: badge.color },
              ]}
            >
              <Ionicons name={badge.icon as any} size={16} color={badge.color} />
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            <View
              style={[
                styles.sourceBadge,
                { backgroundColor: `${getSourceColor(food.source)}20` },
              ]}
            >
              <Text
                style={[styles.sourceText, { color: getSourceColor(food.source) }]}
              >
                {food.source}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.nutritionRow}>
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionValue, { color: C.text }]}>
              {food.nutrition.calories}
            </Text>
            <Text style={[styles.nutritionLabel, { color: C.textSecondary }]}>{t('foodVerification.cal')}</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionValue, { color: C.text }]}>
              {food.nutrition.protein}g
            </Text>
            <Text style={[styles.nutritionLabel, { color: C.textSecondary }]}>{t('trainingDay.protein')}</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionValue, { color: C.text }]}>
              {food.nutrition.carbs}g
            </Text>
            <Text style={[styles.nutritionLabel, { color: C.textSecondary }]}>{t('trainingDay.carbohydrates')}</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionValue, { color: C.text }]}>
              {food.nutrition.fat}g
            </Text>
            <Text style={[styles.nutritionLabel, { color: C.textSecondary }]}>{t('trainingDay.fats')}</Text>
          </View>
        </View>
        <Text
          style={[styles.servingSize, { color: C.textSecondary }]}
        >
          {t('foodVerification.perServing', { size: food.nutrition.servingSize, unit: food.nutrition.unit })}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: C.surface }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: C.text }]}>{t('foodVerification.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>
            {t('foodVerification.subtitle')}
          </Text>
        </View>

        {/* AI Act Art. 50 — Transparency banner (Fase B) */}
        <AITransparencyBanner
          screenKey="food-verification"
          style={{ marginHorizontal: 16, marginBottom: 8 }}
        />

        {/* Search Bar */}
        <View style={[styles.searchContainer, { borderColor: C.border }]}>
          <Ionicons name="search" size={20} color={C.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder={t('foodVerification.searchPlaceholder')}
            placeholderTextColor={C.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'database' && {
                backgroundColor: C.primary,
                borderBottomColor: C.primary,
              },
              { borderBottomColor: C.border },
            ]}
            onPress={() => setActiveTab('database')}
          >
            <Ionicons
              name="cube"
              size={20}
              color={activeTab === 'database' ? C.surface : C.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'database' ? C.surface : C.textSecondary,
                },
              ]}
            >
              {t('foodVerification.title')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'myFoods' && {
                backgroundColor: C.primary,
                borderBottomColor: C.primary,
              },
              { borderBottomColor: C.border },
            ]}
            onPress={() => setActiveTab('myFoods')}
          >
            <Ionicons
              name="star"
              size={20}
              color={activeTab === 'myFoods' ? C.surface : C.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'myFoods' ? C.surface : C.textSecondary,
                },
              ]}
            >
              {t('foodVerification.myFoods')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Database Tab */}
        {activeTab === 'database' && (
          <>
            {filteredFoods.length > 0 ? (
              filteredFoods.map((food) => renderFoodCard(food))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color={C.textSecondary} />
                <Text style={[styles.emptyStateText, { color: C.textSecondary }]}>
                  {searchQuery.length > 0
                    ? t('foodVerification.noResults')
                    : t('foodVerification.startSearch')}
                </Text>
              </View>
            )}

            {/* Recently Verified Section */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>
                {t('foodVerification.recentlyVerified')}
              </Text>
              {mockFoods
                .filter((f) => f.verified === 'verified')
                .slice(0, 3)
                .map((food) => (
                  <TouchableOpacity
                    key={food.id}
                    style={[styles.listItem, { borderBottomColor: C.border }]}
                    onPress={() => handleFoodPress(food)}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={[styles.listItemName, { color: C.text }]}>
                        {food.name}
                      </Text>
                      <Text style={[styles.listItemMeta, { color: C.textSecondary }]}>
                        {food.nutrition.calories} cal • {food.brand}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={C.textSecondary} />
                  </TouchableOpacity>
                ))}
            </View>

            {/* Community Stats */}
            <View style={[styles.statsContainer, { backgroundColor: C.primary }]}>
              <Ionicons name="people" size={24} color={C.surface} />
              <Text style={[styles.statsText, { color: C.surface }]}>
                {t('foodVerification.communityVerified', { count: 152 })}
              </Text>
            </View>
          </>
        )}

        {/* My Foods Tab */}
        {activeTab === 'myFoods' && (
          <>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: C.primary }]}
              onPress={() => setShowCustomFoodModal(true)}
            >
              <Ionicons name="add-circle" size={24} color={C.surface} />
              <Text style={[styles.createButtonText, { color: C.surface }]}>
                {t('foodVerification.createFood')}
              </Text>
            </TouchableOpacity>

            {myFoods.length > 0 ? (
              myFoods.map((food) => (
                <View
                  key={food.id}
                  style={[
                    styles.myFoodCard,
                    { backgroundColor: C.background, borderColor: C.border },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.myFoodContent}
                    onPress={() => handleFoodPress(food)}
                  >
                    <View>
                      <Text style={[styles.foodName, { color: C.text }]}>
                        {food.name}
                      </Text>
                      <Text style={[styles.foodBrand, { color: C.textSecondary }]}>
                        {food.nutrition.calories} cal • {food.nutrition.protein}g protein
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.myFoodActions}>
                    <TouchableOpacity onPress={() => handleFoodPress(food)}>
                      <Ionicons name="create" size={20} color={C.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCustomFood(food.id)}
                      style={{ marginLeft: 12 }}
                    >
                      <Ionicons name="trash" size={20} color={C.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="star" size={48} color={C.textSecondary} />
                <Text style={[styles.emptyStateText, { color: C.textSecondary }]}>
                  {t('foodVerification.noCustomFoods')}
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { backgroundColor: C.surface }]}
        >
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={28} color={C.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('foodVerification.details')}</Text>
              <View style={{ width: 28 }} />
            </View>

            {selectedFood && (
              <>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailName, { color: C.text }]}>
                    {selectedFood.name}
                  </Text>
                  <Text style={[styles.detailBrand, { color: C.textSecondary }]}>
                    {selectedFood.brand}
                  </Text>
                </View>

                <View style={[styles.nutritionGrid, { backgroundColor: C.background }]}>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: C.textSecondary }]}>
                      {t('onboarding.calories')}
                    </Text>
                    <Text style={[styles.gridValue, { color: C.primary }]}>
                      {selectedFood.nutrition.calories}
                    </Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: C.textSecondary }]}>
                      {t('onboarding.protein')}
                    </Text>
                    <Text style={[styles.gridValue, { color: C.primary }]}>
                      {selectedFood.nutrition.protein}g
                    </Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: C.textSecondary }]}>
                      {t('onboarding.carbs')}
                    </Text>
                    <Text style={[styles.gridValue, { color: C.primary }]}>
                      {selectedFood.nutrition.carbs}g
                    </Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: C.textSecondary }]}>
                      {t('onboarding.fat')}
                    </Text>
                    <Text style={[styles.gridValue, { color: C.primary }]}>
                      {selectedFood.nutrition.fat}g
                    </Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: C.textSecondary }]}>
                      {t('onboarding.fiber')}
                    </Text>
                    <Text style={[styles.gridValue, { color: C.primary }]}>
                      {selectedFood.nutrition.fiber}g
                    </Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: C.textSecondary }]}>
                      {t('foodVerification.portion')}
                    </Text>
                    <Text style={[styles.gridValue, { color: C.primary }]}>
                      {selectedFood.nutrition.servingSize}
                      {selectedFood.nutrition.unit}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.reportButton, { backgroundColor: C.warning }]}
                  onPress={handleReportPress}
                >
                  <Ionicons name="alert-circle" size={20} color={C.surface} />
                  <Text style={[styles.reportButtonText, { color: C.surface }]}>
                    {t('foodVerification.incorrectData')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { backgroundColor: C.surface }]}
        >
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={28} color={C.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('foodVerification.reportProblem')}</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: C.text }]}>{t('foodVerification.problemType')}</Text>
              {(['calories', 'macros', 'serving', 'photo', 'other'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.radioItem,
                    {
                      backgroundColor: C.background,
                      borderColor:
                        reportData.issueType === type ? C.primary : C.border,
                      borderWidth: reportData.issueType === type ? 2 : 1,
                    },
                  ]}
                  onPress={() =>
                    setReportData({ ...reportData, issueType: type })
                  }
                >
                  <View
                    style={[
                      styles.radioButton,
                      {
                        backgroundColor:
                          reportData.issueType === type ? C.primary : 'transparent',
                        borderColor:
                          reportData.issueType === type ? C.primary : C.border,
                      },
                    ]}
                  />
                  <Text style={[styles.radioLabel, { color: C.text }]}>
                    {type === 'calories'
                      ? t('foodVerification.incorrectCalories')
                      : type === 'macros'
                        ? t('foodVerification.incorrectMacros')
                        : type === 'serving'
                          ? t('foodVerification.incorrectServing')
                          : type === 'photo'
                            ? t('foodVerification.incorrectPhoto')
                            : t('foodVerification.other')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: C.text }]}>{t('foodVerification.description')}</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    color: C.text,
                    borderColor: C.border,
                    backgroundColor: C.background,
                  },
                ]}
                placeholder={t('foodVerification.descriptionPlaceholder')}
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={4}
                value={reportData.description}
                onChangeText={(text) =>
                  setReportData({ ...reportData, description: text })
                }
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: C.primary, opacity: loading ? 0.6 : 1 },
              ]}
              onPress={handleSubmitReport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={C.surface} />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={C.surface} />
                  <Text style={[styles.submitButtonText, { color: C.surface }]}>
                    {t('foodVerification.sendReport')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Food Modal */}
      <Modal visible={showCustomFoodModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { backgroundColor: C.surface }]}
        >
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCustomFoodModal(false)}>
                <Ionicons name="close" size={28} color={C.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('foodVerification.createFood')}</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: C.text }]}>{t('foodVerification.nameRequired')}</Text>
              <TextInput
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border },
                ]}
                placeholder={t('foodVerification.namePlaceholder')}
                placeholderTextColor={C.textSecondary}
                value={customFood.name}
                onChangeText={(text) => setCustomFood({ ...customFood, name: text })}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: C.text }]}>{t('foodVerification.brand')}</Text>
              <TextInput
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border },
                ]}
                placeholder={t('foodVerification.brandPlaceholder')}
                placeholderTextColor={C.textSecondary}
                value={customFood.brand}
                onChangeText={(text) => setCustomFood({ ...customFood, brand: text })}
              />
            </View>

            <Text style={[styles.formLabel, { color: C.text, marginTop: 16 }]}>
              {t('foodVerification.nutritionValues')}
            </Text>
            <View style={styles.gridInputs}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  {t('onboarding.calories')}
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: C.text, borderColor: C.border },
                  ]}
                  placeholder="0"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="number-pad"
                  value={customFood.calories}
                  onChangeText={(text) => setCustomFood({ ...customFood, calories: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  {t('onboarding.protein')} (g)
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: C.text, borderColor: C.border },
                  ]}
                  placeholder="0"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="decimal-pad"
                  value={customFood.protein}
                  onChangeText={(text) => setCustomFood({ ...customFood, protein: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  {t('onboarding.carbs')} (g)
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: C.text, borderColor: C.border },
                  ]}
                  placeholder="0"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="decimal-pad"
                  value={customFood.carbs}
                  onChangeText={(text) => setCustomFood({ ...customFood, carbs: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  {t('onboarding.fat')} (g)
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: C.text, borderColor: C.border },
                  ]}
                  placeholder="0"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="decimal-pad"
                  value={customFood.fat}
                  onChangeText={(text) => setCustomFood({ ...customFood, fat: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Fibra (g)
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: C.text, borderColor: C.border },
                  ]}
                  placeholder="0"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="decimal-pad"
                  value={customFood.fiber}
                  onChangeText={(text) => setCustomFood({ ...customFood, fiber: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Porción (g)
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: C.text, borderColor: C.border },
                  ]}
                  placeholder="100"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="number-pad"
                  value={customFood.servingSize}
                  onChangeText={(text) => setCustomFood({ ...customFood, servingSize: text })}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: C.primary, marginTop: 24, opacity: loading ? 0.6 : 1 },
              ]}
              onPress={handleAddCustomFood}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={C.surface} />
              ) : (
                <>
                  <Ionicons name="save" size={20} color={C.surface} />
                  <Text style={[styles.submitButtonText, { color: C.surface }]}>
                    Crear Alimento
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    marginTop: 8,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  foodCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  foodCardHeader: {
    marginBottom: 12,
  },
  foodInfo: {
    marginBottom: 8,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  foodBrand: {
    fontSize: 13,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '500',
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  nutritionLabel: {
    fontSize: 11,
  },
  servingSize: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
  },
  sectionContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  listItemMeta: {
    fontSize: 12,
  },
  statsContainer: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  myFoodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  myFoodContent: {
    flex: 1,
  },
  myFoodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailCard: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  detailName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailBrand: {
    fontSize: 14,
  },
  nutritionGrid: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  gridItem: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  gridLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 24,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 2,
  },
  radioLabel: {
    fontSize: 14,
    flex: 1,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  gridInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  inputGroup: {
    width: '48%',
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  smallInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 24,
  },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
}

export default FoodVerificationScreen;
