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
import { COLORS } from '../theme';

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
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
      name: 'Pollo Pechuga',
      brand: 'Fresco',
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
      name: 'Arroz Blanco Cocido',
      brand: 'Genérico',
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
      name: 'Avena Integral',
      brand: 'Marca A',
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
      name: 'Batata Dulce',
      brand: 'Fresco',
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
      name: 'Mi Smoothie Proteico',
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
      Alert.alert('Error', 'Por favor describe el problema');
      return;
    }
    setLoading(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Éxito', 'Tu reporte ha sido enviado. Gracias por ayudar a la comunidad.');
      setShowReportModal(false);
      setShowDetailModal(false);
      setReportData({ foodId: '', issueType: 'calories', description: '' });
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomFood = async () => {
    if (!customFood.name.trim()) {
      Alert.alert('Error', 'El nombre del alimento es requerido');
      return;
    }
    setLoading(true);
    try {
      const newFood: FoodItem = {
        id: `custom-${Date.now()}`,
        name: customFood.name,
        brand: customFood.brand || 'Personalizado',
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
      Alert.alert('Éxito', 'Alimento personalizado creado');
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
      Alert.alert('Error', 'No se pudo crear el alimento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomFood = (foodId: string) => {
    Alert.alert(
      'Eliminar',
      '¿Estás seguro de que deseas eliminar este alimento?',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Eliminar',
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
        return { icon: 'checkmark-circle', color: COLORS.success, label: 'Verificado' };
      case 'unverified':
        return { icon: 'alert-circle', color: COLORS.warning, label: 'Sin verificar' };
      case 'reported':
        return { icon: 'close-circle', color: COLORS.error, label: 'Reportado' };
      default:
        return { icon: 'help-circle', color: COLORS.text, label: 'Desconocido' };
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'OpenFoodFacts':
        return COLORS.primary;
      case 'USDA':
        return COLORS.secondary;
      case 'IA':
        return COLORS.accent;
      case 'Custom':
        return COLORS.success;
      default:
        return COLORS.textSecondary;
    }
  };

  const renderFoodCard = (food: FoodItem) => {
    const badge = getVerificationBadge(food.verified);
    return (
      <TouchableOpacity
        key={food.id}
        style={[styles.foodCard, { backgroundColor: COLORS.background }]}
        onPress={() => handleFoodPress(food)}
        activeOpacity={0.7}
      >
        <View style={styles.foodCardHeader}>
          <View style={styles.foodInfo}>
            <Text style={[styles.foodName, { color: COLORS.text }]}>{food.name}</Text>
            <Text style={[styles.foodBrand, { color: COLORS.textSecondary }]}>
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
            <Text style={[styles.nutritionValue, { color: COLORS.text }]}>
              {food.nutrition.calories}
            </Text>
            <Text style={[styles.nutritionLabel, { color: COLORS.textSecondary }]}>cal</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionValue, { color: COLORS.text }]}>
              {food.nutrition.protein}g
            </Text>
            <Text style={[styles.nutritionLabel, { color: COLORS.textSecondary }]}>Protein</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionValue, { color: COLORS.text }]}>
              {food.nutrition.carbs}g
            </Text>
            <Text style={[styles.nutritionLabel, { color: COLORS.textSecondary }]}>Carbs</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionValue, { color: COLORS.text }]}>
              {food.nutrition.fat}g
            </Text>
            <Text style={[styles.nutritionLabel, { color: COLORS.textSecondary }]}>Fat</Text>
          </View>
        </View>
        <Text
          style={[styles.servingSize, { color: COLORS.textSecondary }]}
        >
          Por {food.nutrition.servingSize}{food.nutrition.unit}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: COLORS.surface }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: COLORS.text }]}>Base de Datos</Text>
          <Text style={[styles.headerSubtitle, { color: COLORS.textSecondary }]}>
            Busca y verifica alimentos
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { borderColor: COLORS.border }]}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: COLORS.text }]}
            placeholder="Buscar alimento..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'database' && {
                backgroundColor: COLORS.primary,
                borderBottomColor: COLORS.primary,
              },
              { borderBottomColor: COLORS.border },
            ]}
            onPress={() => setActiveTab('database')}
          >
            <Ionicons
              name="cube"
              size={20}
              color={activeTab === 'database' ? COLORS.surface : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'database' ? COLORS.surface : COLORS.textSecondary,
                },
              ]}
            >
              Base de Datos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'myFoods' && {
                backgroundColor: COLORS.primary,
                borderBottomColor: COLORS.primary,
              },
              { borderBottomColor: COLORS.border },
            ]}
            onPress={() => setActiveTab('myFoods')}
          >
            <Ionicons
              name="star"
              size={20}
              color={activeTab === 'myFoods' ? COLORS.surface : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'myFoods' ? COLORS.surface : COLORS.textSecondary,
                },
              ]}
            >
              Mis Alimentos
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
                <Ionicons name="search" size={48} color={COLORS.textSecondary} />
                <Text style={[styles.emptyStateText, { color: COLORS.textSecondary }]}>
                  {searchQuery.length > 0
                    ? 'No se encontraron alimentos'
                    : 'Comienza a buscar'}
                </Text>
              </View>
            )}

            {/* Recently Verified Section */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
                Verificados Recientemente
              </Text>
              {mockFoods
                .filter((f) => f.verified === 'verified')
                .slice(0, 3)
                .map((food) => (
                  <TouchableOpacity
                    key={food.id}
                    style={[styles.listItem, { borderBottomColor: COLORS.border }]}
                    onPress={() => handleFoodPress(food)}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={[styles.listItemName, { color: COLORS.text }]}>
                        {food.name}
                      </Text>
                      <Text style={[styles.listItemMeta, { color: COLORS.textSecondary }]}>
                        {food.nutrition.calories} cal • {food.brand}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                ))}
            </View>

            {/* Community Stats */}
            <View style={[styles.statsContainer, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="people" size={24} color={COLORS.surface} />
              <Text style={[styles.statsText, { color: COLORS.surface }]}>
                152 alimentos verificados por la comunidad
              </Text>
            </View>
          </>
        )}

        {/* My Foods Tab */}
        {activeTab === 'myFoods' && (
          <>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: COLORS.primary }]}
              onPress={() => setShowCustomFoodModal(true)}
            >
              <Ionicons name="add-circle" size={24} color={COLORS.surface} />
              <Text style={[styles.createButtonText, { color: COLORS.surface }]}>
                Crear Alimento
              </Text>
            </TouchableOpacity>

            {myFoods.length > 0 ? (
              myFoods.map((food) => (
                <View
                  key={food.id}
                  style={[
                    styles.myFoodCard,
                    { backgroundColor: COLORS.background, borderColor: COLORS.border },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.myFoodContent}
                    onPress={() => handleFoodPress(food)}
                  >
                    <View>
                      <Text style={[styles.foodName, { color: COLORS.text }]}>
                        {food.name}
                      </Text>
                      <Text style={[styles.foodBrand, { color: COLORS.textSecondary }]}>
                        {food.nutrition.calories} cal • {food.nutrition.protein}g protein
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.myFoodActions}>
                    <TouchableOpacity onPress={() => handleFoodPress(food)}>
                      <Ionicons name="create" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCustomFood(food.id)}
                      style={{ marginLeft: 12 }}
                    >
                      <Ionicons name="trash" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="star" size={48} color={COLORS.textSecondary} />
                <Text style={[styles.emptyStateText, { color: COLORS.textSecondary }]}>
                  No tienes alimentos personalizados
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
          style={[styles.modalContainer, { backgroundColor: COLORS.surface }]}
        >
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>Detalles</Text>
              <View style={{ width: 28 }} />
            </View>

            {selectedFood && (
              <>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailName, { color: COLORS.text }]}>
                    {selectedFood.name}
                  </Text>
                  <Text style={[styles.detailBrand, { color: COLORS.textSecondary }]}>
                    {selectedFood.brand}
                  </Text>
                </View>

                <View style={[styles.nutritionGrid, { backgroundColor: COLORS.background }]}>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: COLORS.textSecondary }]}>
                      Calorías
                    </Text>
                    <Text style={[styles.gridValue, { color: COLORS.primary }]}>
                      {selectedFood.nutrition.calories}
                    </Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: COLORS.textSecondary }]}>
                      Proteína
                    </Text>
                    <Text style={[styles.gridValue, { color: COLORS.primary }]}>
                      {selectedFood.nutrition.protein}g
                    </Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: COLORS.textSecondary }]}>
                      Carbos
                    </Text>
                    <Text style={[styles.gridValue, { color: COLORS.primary }]}>
                      {selectedFood.nutrition.carbs}g
                    </Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: COLORS.textSecondary }]}>
                      Grasas
                    </Text>
                    <Text style={[styles.gridValue, { color: COLORS.primary }]}>
                      {selectedFood.nutrition.fat}g
                    </Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: COLORS.textSecondary }]}>
                      Fibra
                    </Text>
                    <Text style={[styles.gridValue, { color: COLORS.primary }]}>
                      {selectedFood.nutrition.fiber}g
                    </Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: COLORS.textSecondary }]}>
                      Porción
                    </Text>
                    <Text style={[styles.gridValue, { color: COLORS.primary }]}>
                      {selectedFood.nutrition.servingSize}
                      {selectedFood.nutrition.unit}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.reportButton, { backgroundColor: COLORS.warning }]}
                  onPress={handleReportPress}
                >
                  <Ionicons name="alert-circle" size={20} color={COLORS.surface} />
                  <Text style={[styles.reportButtonText, { color: COLORS.surface }]}>
                    ¿Datos incorrectos?
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
          style={[styles.modalContainer, { backgroundColor: COLORS.surface }]}
        >
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>Reportar Problema</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: COLORS.text }]}>Tipo de Problema</Text>
              {(['calories', 'macros', 'serving', 'photo', 'other'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.radioItem,
                    {
                      backgroundColor: COLORS.background,
                      borderColor:
                        reportData.issueType === type ? COLORS.primary : COLORS.border,
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
                          reportData.issueType === type ? COLORS.primary : 'transparent',
                        borderColor:
                          reportData.issueType === type ? COLORS.primary : COLORS.border,
                      },
                    ]}
                  />
                  <Text style={[styles.radioLabel, { color: COLORS.text }]}>
                    {type === 'calories'
                      ? 'Calorías incorrectas'
                      : type === 'macros'
                        ? 'Macros incorrectos'
                        : type === 'serving'
                          ? 'Tamaño de porción incorrecto'
                          : type === 'photo'
                            ? 'Foto incorrecta'
                            : 'Otro'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: COLORS.text }]}>Descripción</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    color: COLORS.text,
                    borderColor: COLORS.border,
                    backgroundColor: COLORS.background,
                  },
                ]}
                placeholder="Cuéntanos qué está mal..."
                placeholderTextColor={COLORS.textSecondary}
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
                { backgroundColor: COLORS.primary, opacity: loading ? 0.6 : 1 },
              ]}
              onPress={handleSubmitReport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={COLORS.surface} />
                  <Text style={[styles.submitButtonText, { color: COLORS.surface }]}>
                    Enviar Reporte
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
          style={[styles.modalContainer, { backgroundColor: COLORS.surface }]}
        >
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCustomFoodModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>Crear Alimento</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: COLORS.text }]}>Nombre *</Text>
              <TextInput
                style={[
                  styles.input,
                  { color: COLORS.text, borderColor: COLORS.border },
                ]}
                placeholder="Ej: Mi Smoothie"
                placeholderTextColor={COLORS.textSecondary}
                value={customFood.name}
                onChangeText={(text) => setCustomFood({ ...customFood, name: text })}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: COLORS.text }]}>Marca</Text>
              <TextInput
                style={[
                  styles.input,
                  { color: COLORS.text, borderColor: COLORS.border },
                ]}
                placeholder="Ej: Personalizado"
                placeholderTextColor={COLORS.textSecondary}
                value={customFood.brand}
                onChangeText={(text) => setCustomFood({ ...customFood, brand: text })}
              />
            </View>

            <Text style={[styles.formLabel, { color: COLORS.text, marginTop: 16 }]}>
              Valores Nutricionales
            </Text>
            <View style={styles.gridInputs}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
                  Calorías
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: COLORS.text, borderColor: COLORS.border },
                  ]}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="number-pad"
                  value={customFood.calories}
                  onChangeText={(text) => setCustomFood({ ...customFood, calories: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
                  Proteína (g)
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: COLORS.text, borderColor: COLORS.border },
                  ]}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="decimal-pad"
                  value={customFood.protein}
                  onChangeText={(text) => setCustomFood({ ...customFood, protein: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
                  Carbos (g)
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: COLORS.text, borderColor: COLORS.border },
                  ]}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="decimal-pad"
                  value={customFood.carbs}
                  onChangeText={(text) => setCustomFood({ ...customFood, carbs: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
                  Grasas (g)
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: COLORS.text, borderColor: COLORS.border },
                  ]}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="decimal-pad"
                  value={customFood.fat}
                  onChangeText={(text) => setCustomFood({ ...customFood, fat: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
                  Fibra (g)
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: COLORS.text, borderColor: COLORS.border },
                  ]}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="decimal-pad"
                  value={customFood.fiber}
                  onChangeText={(text) => setCustomFood({ ...customFood, fiber: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
                  Porción (g)
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: COLORS.text, borderColor: COLORS.border },
                  ]}
                  placeholder="100"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="number-pad"
                  value={customFood.servingSize}
                  onChangeText={(text) => setCustomFood({ ...customFood, servingSize: text })}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: COLORS.primary, marginTop: 24, opacity: loading ? 0.6 : 1 },
              ]}
              onPress={handleAddCustomFood}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <>
                  <Ionicons name="save" size={20} color={COLORS.surface} />
                  <Text style={[styles.submitButtonText, { color: COLORS.surface }]}>
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

const styles = StyleSheet.create({
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
    borderColor: '#E5E5EA',
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
    borderColor: '#E5E5EA',
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

export default FoodVerificationScreen;
