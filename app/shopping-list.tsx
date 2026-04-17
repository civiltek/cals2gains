import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import { useShoppingListStore, ShoppingListItem } from '../store/shoppingListStore';
import { useUserStore } from '../store/userStore';
import { usePremiumGate } from '../hooks/usePremiumGate';

const { width } = Dimensions.get('window');

interface GroupedItems {
  recipeName: string;
  items: ShoppingListItem[];
}

export default function ShoppingListScreen() {
  const isPremium = usePremiumGate();
  if (!isPremium) return null;

  const C = useColors();
  const { t } = useTranslation();
  const styles = createStyles(C);
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const {
    items,
    isLoading,
    loadItems,
    addItems,
    toggleItem,
    removeItem,
    clearChecked,
    clearAll,
  } = useShoppingListStore();

  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    if (user?.uid) {
      loadItems(user.uid);
    }
  }, [user?.uid]);

  // Group items by recipe
  const grouped = useMemo(() => {
    const groups = new Map<string, ShoppingListItem[]>();

    for (const item of items) {
      const key = item.recipeName || t('shopping.noRecipe');
      const existing = groups.get(key) || [];
      existing.push(item);
      groups.set(key, existing);
    }

    const result: GroupedItems[] = [];
    groups.forEach((groupItems, recipeName) => {
      result.push({ recipeName, items: groupItems });
    });

    return result;
  }, [items]);

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  const handleAddManual = useCallback(async () => {
    const name = manualInput.trim();
    if (!name || !user?.uid) return;

    await Haptics.selectionAsync();
    await addItems(user.uid, [{ name }]);
    setManualInput('');
  }, [manualInput, user?.uid]);

  const handleToggle = useCallback(async (itemId: string) => {
    if (!user?.uid) return;
    await Haptics.selectionAsync();
    await toggleItem(user.uid, itemId);
  }, [user?.uid]);

  const handleRemove = useCallback(async (itemId: string) => {
    if (!user?.uid) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await removeItem(user.uid, itemId);
  }, [user?.uid]);

  const handleClearChecked = () => {
    if (!user?.uid || checkedCount === 0) return;
    Alert.alert(
      t('shoppingList.clearTitle'),
      t('shoppingList.clearMessage', { count: checkedCount }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('shoppingList.clearAll'),
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await clearChecked(user!.uid);
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (!user?.uid || totalCount === 0) return;
    Alert.alert(
      t('shoppingList.emptyListTitle'),
      t('shoppingList.emptyListMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('shoppingList.emptyAll'),
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAll(user!.uid);
          },
        },
      ]
    );
  };

  // ── Loading ──
  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>{t('shoppingList.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {checkedCount}/{totalCount} comprados
        </Text>
        <View style={styles.statsActions}>
          {checkedCount > 0 && (
            <TouchableOpacity onPress={handleClearChecked} style={styles.statsButton}>
              <Ionicons name="checkmark-done" size={18} color={C.success} />
              <Text style={styles.statsButtonText}>{t('shoppingList.clearChecked')}</Text>
            </TouchableOpacity>
          )}
          {totalCount > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.statsButton}>
              <Ionicons name="trash-outline" size={18} color={C.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Manual Add */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder={t('shoppingList.addPlaceholder')}
          placeholderTextColor={C.textTertiary}
          value={manualInput}
          onChangeText={setManualInput}
          onSubmitEditing={handleAddManual}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, !manualInput.trim() && styles.addButtonDisabled]}
          onPress={handleAddManual}
          disabled={!manualInput.trim()}
        >
          <Ionicons name="add" size={24} color={manualInput.trim() ? C.background : C.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Empty state */}
      {totalCount === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={64} color={C.textSecondary} />
          <Text style={styles.emptyTitle}>{t('shoppingList.emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>
            Añade ingredientes desde una receta o escribe artículos manualmente arriba.
          </Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.recipeName}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: group }) => (
            <View style={styles.groupSection}>
              {/* Group Header */}
              <View style={styles.groupHeader}>
                <Ionicons
                  name={group.recipeName === t('shopping.noRecipe') ? 'list' : 'restaurant'}
                  size={16}
                  color={C.primary}
                />
                <Text style={styles.groupTitle}>{group.recipeName}</Text>
                <Text style={styles.groupCount}>{group.items.length}</Text>
              </View>

              {/* Items */}
              {group.items.map((item) => (
                <View key={item.id} style={[styles.itemRow, item.checked && styles.itemRowChecked]}>
                  <TouchableOpacity
                    onPress={() => handleToggle(item.id)}
                    style={styles.checkbox}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={item.checked ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={item.checked ? C.success : C.textSecondary}
                    />
                  </TouchableOpacity>

                  <View style={styles.itemContent}>
                    <Text
                      style={[styles.itemName, item.checked && styles.itemNameChecked]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {(item.quantity != null || item.unit) && (
                      <Text style={[styles.itemQty, item.checked && styles.itemQtyChecked]}>
                        {item.quantity ?? ''} {item.unit ?? ''}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemove(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close" size={18} color={C.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: C.textSecondary,
    },
    statsBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    statsText: {
      fontSize: 14,
      fontWeight: '600',
      color: C.textSecondary,
    },
    statsActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    statsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    statsButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: C.success,
    },
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    addInput: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: C.bone,
      borderWidth: 1,
      borderColor: C.border,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: C.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButtonDisabled: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: C.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: C.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
    listContainer: {
      paddingBottom: 32,
    },
    groupSection: {
      marginBottom: 8,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: `${C.primary}08`,
    },
    groupTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: C.primary,
      flex: 1,
    },
    groupCount: {
      fontSize: 12,
      color: C.textSecondary,
      backgroundColor: `${C.primary}15`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      overflow: 'hidden',
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      gap: 10,
    },
    itemRowChecked: {
      opacity: 0.5,
    },
    checkbox: {
      padding: 2,
    },
    itemContent: {
      flex: 1,
    },
    itemName: {
      fontSize: 15,
      fontWeight: '500',
      color: C.text,
    },
    itemNameChecked: {
      textDecorationLine: 'line-through',
      color: C.textSecondary,
    },
    itemQty: {
      fontSize: 12,
      color: C.textSecondary,
      marginTop: 2,
    },
    itemQtyChecked: {
      textDecorationLine: 'line-through',
    },
    removeButton: {
      padding: 4,
    },
  });
}
