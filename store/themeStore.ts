// ============================================
// Cals2Gains - Theme Store (Zustand + AsyncStorage)
// ============================================
// Persists user's theme preference: 'dark' | 'light' | 'system'

import { create } from 'zustand';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { _syncThemeColors } from '../theme';

const THEME_STORAGE_KEY = '@cals2gains_theme';

export type ThemeMode = 'dark' | 'light' | 'system';

// ── Dark palette (current default) ──
export const DARK_COLORS = {
  // Brand
  primary: '#9C8CFF',
  primaryLight: '#B8ADFF',
  primaryDark: '#7B6FE0',
  accent: '#FF6A4D',
  accentLight: '#FF8A73',

  // Backgrounds
  background: '#17121D',
  surface: '#1F1A28',
  surfaceLight: '#2A2335',
  card: '#1F1A28',
  cardHover: '#2A2335',
  cardElevated: '#241E30',

  // Text
  text: '#F7F2EA',
  textSecondary: '#A09AAE',
  textTertiary: '#6B6478',
  textMuted: '#6B6478',

  // Macro colors
  protein: '#F59E0B',
  carbs: '#9C8CFF',
  fat: '#FF6A4D',
  fiber: '#34D399',
  calories: '#9C8CFF',

  // Status
  success: '#34D399',
  warning: '#F59E0B',
  error: '#FF6A4D',
  info: '#9C8CFF',

  // Borders
  border: '#2A2335',
  borderLight: '#3D3549',

  // Utility
  overlay: 'rgba(23,18,29,0.85)',
  white: '#FFFFFF',
  black: '#000000',
  bone: '#F7F2EA',
  coral: '#FF6A4D',
  violet: '#9C8CFF',
  carbon: '#17121D',
  gradientStart: '#9C8CFF',
  gradientEnd: '#FF6A4D',
  transparent: 'transparent',

  // Status bar
  statusBarStyle: 'light' as const,
} as const;

// ── Light palette ──
export const LIGHT_COLORS = {
  // Brand (same accents)
  primary: '#7B6FE0',
  primaryLight: '#9C8CFF',
  primaryDark: '#6358C7',
  accent: '#E5553A',
  accentLight: '#FF6A4D',

  // Backgrounds
  background: '#F5F2ED',
  surface: '#FFFFFF',
  surfaceLight: '#F0ECE6',
  card: '#FFFFFF',
  cardHover: '#F0ECE6',
  cardElevated: '#FFFFFF',

  // Text — all pass WCAG AA 4.5:1 on #FFFFFF and #F5F2ED
  text: '#1A1525',
  textSecondary: '#3D3547',     // ~11:1 on white — readable labels & body
  textTertiary: '#6B6478',      // ~6:1 on white — captions, timestamps
  textMuted: '#6B6478',         // ~6:1 on white — placeholders, hints

  // Macro colors
  protein: '#D97706',
  carbs: '#7B6FE0',
  fat: '#E5553A',
  fiber: '#059669',
  calories: '#7B6FE0',

  // Status
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#7B6FE0',

  // Borders
  border: '#E5E0D8',
  borderLight: '#D6D1C9',

  // Utility
  overlay: 'rgba(26,21,37,0.5)',
  white: '#FFFFFF',
  black: '#000000',
  bone: '#1A1525',              // Inverted for light mode — used as primary text
  coral: '#E5553A',             // Slightly darker coral for light backgrounds
  violet: '#7B6FE0',            // Slightly darker violet for light backgrounds
  carbon: '#17121D',
  gradientStart: '#9C8CFF',
  gradientEnd: '#FF6A4D',
  transparent: 'transparent',

  // Status bar
  statusBarStyle: 'dark' as const,
} as const;

export type ThemeColors = typeof DARK_COLORS;

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;

  // Actions
  setMode: (mode: ThemeMode) => void;
  loadSavedTheme: () => Promise<void>;
}

function resolveColors(mode: ThemeMode): { colors: ThemeColors; isDark: boolean } {
  if (mode === 'light') return { colors: LIGHT_COLORS, isDark: false };
  if (mode === 'dark') return { colors: DARK_COLORS, isDark: true };
  // 'system'
  const systemScheme: ColorSchemeName = Appearance.getColorScheme();
  const isDark = systemScheme !== 'light';
  return { colors: isDark ? DARK_COLORS : LIGHT_COLORS, isDark };
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  colors: DARK_COLORS,
  isDark: true,

  setMode: async (mode: ThemeMode) => {
    const { colors, isDark } = resolveColors(mode);
    set({ mode, colors, isDark });
    _syncThemeColors(isDark); // Update mutable COLORS object for all screens
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('[ThemeStore] Failed to save theme preference:', e);
    }
  },

  loadSavedTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        const { colors, isDark } = resolveColors(saved);
        set({ mode: saved, colors, isDark });
        _syncThemeColors(isDark); // Sync on load too
      }
    } catch (e) {
      console.warn('[ThemeStore] Failed to load theme preference:', e);
    }
  },
}));

/**
 * Hook shortcut: returns the reactive color palette.
 * Usage: const C = useColors();
 */
export function useColors() {
  return useThemeStore((s) => s.colors);
}
