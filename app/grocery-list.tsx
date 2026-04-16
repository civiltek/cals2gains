import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SectionList,
  Pressable,
  Share,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useMealPlanStore } from '../store/mealPlanStore';
import { GroceryItem } from '../types';
import { useColors } from '../store/themeStore';

// Category keys are used internally; translations happen via CATEGORIES object
const CATEGORY_KEYS = {
  FRUITS_VEGGIES: 'Frutas y Verduras',
  PROTEINS: 'Proteínas',
  DAIRY: 'Lácteos',
  GRAINS: 'Cereales',
  BEVERAGES: 'Bebidas',
  CONDIMENTS: 'Condimentos',
  OTHERS: 'Otros',
};

const CATEGORY_ICONS: Record<string, string> = {
  'Frutas y Verduras': 'leaf',
  'Proteínas': 'egg',
  'Lácteos': 'water',
  'Cereales': 'bread',
  'Bebidas': 'water',
  'Condimentos': 'flask',
  'Otros': 'cube',
};

interface GrocerySection {
  title: string;
  data: GroceryItem[];
}

export default function GroceryListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { groceryList, toggleGroceryItem, clearCheckedItems } =
    useMealPlanStore();

  const CATEGORIES = {
    'Frutas y Verduras': t('shoppingList.fruitsVeggies'),
    'Proteínas': t('shoppingList.proteins'),
    'Lácteos': t('shoppingList.dairy'),
    'Cereales': t('shoppingList.grains'),
    'Bebidas': t('shoppingList.beverages'),
    'Condimentos': t('shoppingList.condiments'),
    'Otros': t('shoppingList.others'),
  };

  const [manualInput, setManualInput] = useState('');
  const [localItems, setLocalItems] = useState<GroceryItem[]>(
    groceryList?.items || []
  );

  const items = localItems || [];

  // Auto-detect category for manual items
  const detectCategory = (itemName: string): string => {
    const name = itemName.toLowerCase();

    if (
      ['manzana', 'plátano', 'naranja', 'fresa', 'tomate', 'lechuga', 'brócoli', 'zanahoria', 'papa', 'cebolla'].some(
        (fruit) => name.includes(fruit)
      )
    ) {
      return 'Frutas y Verduras';
    }
    if (
      ['pollo', 'carne', 'pescado', 'huevo', 'salmón', 'pechuga'].some(
        (protein) => name.includes(protein)
      )
    ) {
      return 'Proteínas';
    }
    if (
      ['leche', 'queso', 'yogur', 'mantequilla', 'crema'].some((dairy) =>
        name.includes(dairy)
      )
    ) {
      return 'Lácteos';
    }
    if (
      ['arroz', 'pasta', 'pan', 'avena', 'harina'].some((grain) =>
        name.includes(grain)
      )
    ) {
      return 'Cereales';
    }
    if (
      ['agua', 'jugo', 'té', 'café'].some((drink) =>
        name.includes(drink)
      )
    ) {
      return 'Bebidas';
    }

    return 'Otros';
  };

  const handleAddManualItem = () => {
    if (!manualInput.trim()) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newItem: GroceryItem = {
      id: `item-${Date.now()}`,
      name: manualInput.trim(),
      quantity: 1,
      unit: 'unidad',
      category: detectCategory(manualInput) as GroceryItem['category'],
      checked: false,
    };

    setLocalItems([...localItems, newItem]);
    setManualInput('');
    Keyboard.dismiss();
  };

  const handleToggleItem = (itemId: string) => {
    Haptics.selectionAsync();
    toggleGroceryItem(itemId);
    setLocalItems(
      localItems.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleClearChecked = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    clearCheckedItems();
    setLocalItems(localItems.filter((item) => !item.checked));
  };

  const handleShareList = async () => {
    const uncheckedItems = items.filter((item) => !item.checked);
    const checkedItems = items.filter((item) => item.checked);

    let shareText = '📋 Lista de Compras\n\n';

    // Group by category in share text
    const categories = [
      ...new Set([...uncheckedItems, ...checkedItems].map((i) => i.category)),
    ];

    categories.forEach((category) => {
      const categoryItems = [
        ...uncheckedItems,
        ...checkedItems,
      ].filter((i) => i.category === category);

      if (categoryItems.length > 0) {
        shareText += `${category}\n`;
        categoryItems.forEach((item) => {
          const checked = item.checked ? '✓' : '○';
          shareText += `  ${checked} ${item.name} - ${item.quantity} ${item.unit}\n`;
        });
        shareText += '\n';
      }
    });

    try {
      await Share.share({
        message: shareText,
        title: t('groceryList.title'),
      });
    } catch (error) {
      console.error('Error sharing list:', error);
    }
  };

  // Organize items by category
  const sections: GrocerySection[] = useMemo(() => {
    const categoryMap = new Map<string, GroceryItem[]>();

    // First add unchecked items
    items
      .filter((item) => !item.checked)
      .forEach((item) => {
        const cat = item.category || 'Otros';
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, []);
        }
        categoryMap.get(cat)!.push(item);
      });

    // Then add checked items
    items
      .filter((item) => item.checked)
      .forEach((item) => {
        const cat = item.category || 'Otros';
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, []);
        }
        categoryMap.get(cat)!.push(item);
      });

    return Array.from(categoryMap.entries())
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => {
        const order = Object.keys(CATEGORY_KEYS);
        return (order.indexOf(a.title) || order.length) - (order.indexOf(b.title) || order.length);
      });
  }, [items]);

  const checkedCount = items.filter((item) => item.checked).length;
  const hasChecked = checkedCount > 0;

  const renderItem = ({ item }: { item: GroceryItem }) => (
    <Pressable
      onPress={() => handleToggleItem(item.id)}
      style={({ pressed }) => [
        styles.itemRow,
        pressed && styles.itemRowPressed,
        item.checked && styles.itemRowChecked,
      ]}
    >
      <View style={styles.itemCheckbox}>
        <View
          style={[
            styles.checkbox,
            item.checked && styles.checkboxChecked,
          ]}
        >
          {item.checked && (
            <Ionicons name="checkmark" size={16} color={C.background} />
          )}
        </View>
      </View>

      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemName,
            item.checked && styles.itemNameStrikethrough,
          ]}
        >
          {item.name}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={styles.itemQuantity}>
            {item.quantity} {item.unit}
          </Text>
          {(item as any).linkedRecipes && (item as any).linkedRecipes.length > 0 && (
            <View style={styles.recipeLink}>
              <Ionicons
                name="bookmark"
                size={12}
                color={C.textMuted}
              />
              <Text style={styles.recipeLinkText}>
                {(item as any).linkedRecipes.length}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  const renderSectionHeader = ({ section }: { section: GrocerySection }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderContent}>
        <Ionicons
          name={(CATEGORY_ICONS[section.title] || 'cube') as any}
          size={16}
          color="#9C8CFF"
        />
        <Text style={styles.sectionTitle}>{CATEGORIES[section.title as keyof typeof CATEGORIES] || section.title}</Text>
      </View>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('groceryList.title')}</Text>
          {items.length > 0 && (
            <Text style={styles.subtitle}>
              {t('groceryList.itemsRemaining', {
                remaining: items.filter((i) => !i.checked).length,
                total: items.length,
              })}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleShareList}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="share-social" size={24} color="#9C8CFF" />
        </TouchableOpacity>
      </View>

      {/* Manual Add Item */}
      <View style={styles.addItemSection}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={t('groceryList.addItemPlaceholder')}
            placeholderTextColor={C.textMuted}
            value={manualInput}
            onChangeText={setManualInput}
            onSubmitEditing={handleAddManualItem}
          />
          <TouchableOpacity
            onPress={handleAddManualItem}
            disabled={!manualInput.trim()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name="add-circle"
              size={24}
              color={
                manualInput.trim() ? '#9C8CFF' : C.textMuted
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Items List */}
      {items.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={48} color={C.textMuted} />
          <Text style={styles.emptyStateText}>
            {t('groceryList.noItems')}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {t('groceryList.addItemsManually')}
          </Text>
        </View>
      )}

      {/* Footer Actions */}
      {items.length > 0 && (
        <View style={styles.footer}>
          {hasChecked && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearChecked}
            >
              <Ionicons name="trash-outline" size={18} color="#FF6A4D" />
              <Text style={styles.clearButtonText}>
                {t('groceryList.clearCompletedLabel')} ({checkedCount})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: C.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: C.textSecondary,
    },
    addItemSection: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: C.card,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.card || C.background,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    input: {
      flex: 1,
      color: C.text,
      fontSize: 14,
      fontWeight: '500',
      padding: 0,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      marginTop: 8,
    },
    sectionHeaderContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      color: '#9C8CFF',
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionCount: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      marginBottom: 6,
      backgroundColor: C.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    itemRowPressed: {
      backgroundColor: C.card || C.background,
    },
    itemRowChecked: {
      opacity: 0.6,
    },
    itemCheckbox: {
      marginRight: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: '#9C8CFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#9C8CFF',
      borderColor: '#9C8CFF',
    },
    itemContent: {
      flex: 1,
    },
    itemName: {
      color: C.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    itemNameStrikethrough: {
      textDecorationLine: 'line-through',
      color: C.textSecondary,
    },
    itemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    itemQuantity: {
      color: C.textMuted,
      fontSize: 12,
    },
    recipeLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: C.card || C.background,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    recipeLinkText: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: '500',
    },
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: C.border,
      backgroundColor: C.card,
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: C.card || C.background,
      borderRadius: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    clearButtonText: {
      color: '#FF6A4D',
      fontSize: 14,
      fontWeight: '600',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '600',
      color: C.text,
      marginTop: 16,
      textAlign: 'center',
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: C.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
  });
}
