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
import { useMealPlanStore } from '../store/mealPlanStore';
import { GroceryItem } from '../types';
import { COLORS } from '../theme';

const CATEGORIES_ES = {
  'Frutas y Verduras': 'Frutas y Verduras',
  'Proteínas': 'Proteínas',
  'Lácteos': 'Lácteos',
  'Cereales': 'Cereales',
  'Bebidas': 'Bebidas',
  'Condimentos': 'Condimentos',
  'Otros': 'Otros',
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
  const insets = useSafeAreaInsets();
  const { groceryList, toggleGroceryItem, clearCheckedItems } =
    useMealPlanStore();

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
      category: detectCategory(manualInput),
      checked: false,
      linkedRecipes: [],
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
        title: 'Lista de Compras',
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
        const order = Object.keys(CATEGORIES_ES);
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
            <Ionicons name="checkmark" size={16} color={COLORS.background} />
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
          {item.linkedRecipes && item.linkedRecipes.length > 0 && (
            <View style={styles.recipeLink}>
              <Ionicons
                name="bookmark"
                size={12}
                color={COLORS.textTertiary}
              />
              <Text style={styles.recipeLinkText}>
                {item.linkedRecipes.length}
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
          name={CATEGORY_ICONS[section.title] || 'cube'}
          size={16}
          color={COLORS.violet}
        />
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Lista de Compras</Text>
          {items.length > 0 && (
            <Text style={styles.subtitle}>
              {items.filter((i) => !i.checked).length} de {items.length} items
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleShareList}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="share-social" size={24} color={COLORS.violet} />
        </TouchableOpacity>
      </View>

      {/* Manual Add Item */}
      <View style={styles.addItemSection}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Agregar item manualmente..."
            placeholderTextColor={COLORS.textTertiary}
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
                manualInput.trim() ? COLORS.violet : COLORS.textTertiary
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
          <Ionicons name="list-outline" size={48} color={COLORS.textTertiary} />
          <Text style={styles.emptyStateText}>
            No hay items en la lista
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Agrega items manualmente o genera una lista desde el plan semanal
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
              <Ionicons name="trash-outline" size={18} color={COLORS.coral} />
              <Text style={styles.clearButtonText}>
                Limpiar completados ({checkedCount})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.bone,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  addItemSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.cardHover,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    color: COLORS.bone,
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
    color: COLORS.violet,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 6,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemRowPressed: {
    backgroundColor: COLORS.cardHover,
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
    borderColor: COLORS.violet,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    color: COLORS.bone,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemNameStrikethrough: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemQuantity: {
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  recipeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.cardHover,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recipeLinkText: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.cardHover,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearButtonText: {
    color: COLORS.coral,
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
    color: COLORS.bone,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
