// ============================================
// Cals2Gains - Shopping List Store (Zustand)
// ============================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../services/firebase';

// ── Types ─────────────────────────────────────

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  checked: boolean;
  recipeId?: string;
  recipeName?: string;
  addedAt: Date;
}

interface ShoppingListState {
  items: ShoppingListItem[];
  isLoading: boolean;

  // Actions
  loadItems: (userId: string) => Promise<void>;
  addItems: (userId: string, items: Omit<ShoppingListItem, 'id' | 'checked' | 'addedAt'>[]) => Promise<void>;
  toggleItem: (userId: string, itemId: string) => Promise<void>;
  removeItem: (userId: string, itemId: string) => Promise<void>;
  clearChecked: (userId: string) => Promise<void>;
  clearAll: (userId: string) => Promise<void>;
}

const STORAGE_KEY = 'cals2gains_shopping_list';

function getShoppingRef(userId: string) {
  return collection(db, 'users', userId, 'shoppingList');
}

export const useShoppingListStore = create<ShoppingListState>((set, get) => ({
  items: [],
  isLoading: false,

  // ── Load from Firestore (with AsyncStorage cache) ──
  loadItems: async (userId: string) => {
    if (!userId) return;
    set({ isLoading: true });
    try {
      // Try AsyncStorage cache first for instant render
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed: ShoppingListItem[] = JSON.parse(cached).map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt),
        }));
        set({ items: parsed });
      }

      // Fetch from Firestore for source of truth
      // Note: avoid orderBy on subcollection to prevent missing-index hangs
      const ref = getShoppingRef(userId);
      const snapshot = await getDocs(ref);

      const items: ShoppingListItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || '',
          quantity: data.quantity ?? undefined,
          unit: data.unit ?? undefined,
          checked: data.checked || false,
          recipeId: data.recipeId ?? undefined,
          recipeName: data.recipeName ?? undefined,
          addedAt: data.addedAt?.toDate?.() || new Date(),
        };
      });

      // Sort in memory (most recent first)
      items.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

      set({ items });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to load shopping list:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Add items (from a recipe or manual) ──
  addItems: async (userId, newItems) => {
    if (!userId) return;
    try {
      const ref = getShoppingRef(userId);
      const now = new Date();
      const addedItems: ShoppingListItem[] = [];

      for (const item of newItems) {
        const docData = {
          name: item.name,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          checked: false,
          recipeId: item.recipeId ?? null,
          recipeName: item.recipeName ?? null,
          addedAt: Timestamp.fromDate(now),
        };
        const docRef = await addDoc(ref, docData);
        addedItems.push({
          id: docRef.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          checked: false,
          recipeId: item.recipeId,
          recipeName: item.recipeName,
          addedAt: now,
        });
      }

      const { items } = get();
      const updated = [...addedItems, ...items];
      set({ items: updated });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to add shopping items:', error);
      throw error;
    }
  },

  // ── Toggle checked state ──
  toggleItem: async (userId, itemId) => {
    if (!userId) return;
    const { items } = get();
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newChecked = !item.checked;

    // Optimistic update
    const updated = items.map((i) =>
      i.id === itemId ? { ...i, checked: newChecked } : i
    );
    set({ items: updated });

    try {
      const docRef = doc(db, 'users', userId, 'shoppingList', itemId);
      await updateDoc(docRef, { checked: newChecked });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to toggle shopping item:', error);
      // Revert
      set({ items });
    }
  },

  // ── Remove a single item ──
  removeItem: async (userId, itemId) => {
    if (!userId) return;
    const { items } = get();
    const updated = items.filter((i) => i.id !== itemId);
    set({ items: updated });

    try {
      const docRef = doc(db, 'users', userId, 'shoppingList', itemId);
      await deleteDoc(docRef);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to remove shopping item:', error);
      set({ items });
    }
  },

  // ── Clear all checked items ──
  clearChecked: async (userId) => {
    if (!userId) return;
    const { items } = get();
    const checked = items.filter((i) => i.checked);
    const remaining = items.filter((i) => !i.checked);

    set({ items: remaining });

    try {
      const batch = writeBatch(db);
      for (const item of checked) {
        const docRef = doc(db, 'users', userId, 'shoppingList', item.id);
        batch.delete(docRef);
      }
      await batch.commit();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    } catch (error) {
      console.error('Failed to clear checked items:', error);
      set({ items });
    }
  },

  // ── Clear everything ──
  clearAll: async (userId) => {
    if (!userId) return;
    const { items } = get();
    set({ items: [] });

    try {
      const batch = writeBatch(db);
      for (const item of items) {
        const docRef = doc(db, 'users', userId, 'shoppingList', item.id);
        batch.delete(docRef);
      }
      await batch.commit();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } catch (error) {
      console.error('Failed to clear shopping list:', error);
      set({ items });
    }
  },
}));
