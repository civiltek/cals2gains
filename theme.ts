// ============================================
// Cals2Gains — Centralized Brand Theme
// ============================================
// Extracted from Canva Brand Kit (kAHGZdocW3k)
// All UI components MUST use these values.
// Never hardcode colors or font names — import from here.

// ============================================
// COLOR PALETTE
// ============================================

export const BRAND_COLORS = {
  // === Primary ===
  plum: '#17121D',          // Carbon Plum — backgrounds, dark surfaces
  violet: '#9C8CFF',        // Soft Violet — primary accent, CTAs, active states
  coral: '#FF6A4D',         // Signal Coral — secondary accent, highlights, alerts
  bone: '#F7F2EA',          // Bone — text on dark, light surfaces

  // === Derived / UI-specific ===
  card: '#1E1829',          // Card background (plum lightened)
  cardHover: '#2A2235',     // Card hover / pressed state
  cardElevated: '#241E30',  // Elevated card (modals, sheets)

  // === Text ===
  textPrimary: '#F7F2EA',   // Bone — headings, primary text on dark
  textSecondary: 'rgba(247, 242, 234, 0.6)',   // Muted body text
  textTertiary: 'rgba(247, 242, 234, 0.35)',    // Placeholders, disabled
  textOnViolet: '#F7F2EA',  // Text on violet backgrounds
  textOnCoral: '#F7F2EA',   // Text on coral backgrounds

  // === Borders & Dividers ===
  border: 'rgba(156, 140, 255, 0.15)',          // Subtle violet border
  borderActive: 'rgba(156, 140, 255, 0.4)',     // Active/focused border
  divider: 'rgba(247, 242, 234, 0.08)',         // Section dividers

  // === Status ===
  success: '#4ADE80',       // Green — success, positive change
  warning: '#FBBF24',       // Amber — warning, caution
  error: '#F87171',         // Red — error, destructive
  info: '#9C8CFF',          // Violet — informational (same as brand violet)

  // === Macro Colors (for charts and pills) ===
  macroProtein: '#9C8CFF',  // Violet — protein
  macroCarbs: '#F7F2EA',    // Bone — carbs
  macroFat: '#FF6A4D',      // Coral — fat
  macroCalories: '#9C8CFF', // Violet — calories highlight
  macroFiber: 'rgba(156, 140, 255, 0.5)', // Muted violet — fiber

  // === Pill/Badge Backgrounds ===
  pillViolet: 'rgba(156, 140, 255, 0.15)',
  pillCoral: 'rgba(255, 106, 77, 0.15)',
  pillBone: 'rgba(247, 242, 234, 0.08)',
  pillSuccess: 'rgba(74, 222, 128, 0.15)',

  // === Overlays ===
  overlay: 'rgba(23, 18, 29, 0.7)',            // Modal backdrop
  overlayLight: 'rgba(23, 18, 29, 0.4)',       // Light overlay

  // === Tab Bar ===
  tabBarBackground: '#17121D',
  tabBarActive: '#9C8CFF',
  tabBarInactive: 'rgba(247, 242, 234, 0.4)',

  // === Gradients (CSS string values) ===
  gradientVioletCoral: 'linear-gradient(135deg, #9C8CFF 0%, #FF6A4D 100%)',
  gradientPlumCard: 'linear-gradient(180deg, #1E1829 0%, #17121D 100%)',
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const BRAND_FONTS = {
  // Display / Headings — Outfit Bold (Google Fonts)
  display: {
    family: 'Outfit',
    weight: '700' as const,
    // Google Fonts URL: https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap
  },

  // Body / UI Text — Instrument Sans (Google Fonts)
  body: {
    family: 'Instrument Sans',
    weight: '400' as const,
    weightMedium: '500' as const,
    weightSemiBold: '600' as const,
    // Google Fonts URL: https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap
  },

  // Data / Numbers / Code — Geist Mono
  data: {
    family: 'Geist Mono',
    weight: '400' as const,
    weightMedium: '500' as const,
    // Google Fonts URL: https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&display=swap
  },
} as const;

// Font slot mapping (matches Canva Brand Kit slots):
// Título         → Outfit Bold 700
// Subtítulo      → Instrument Sans 600
// Encabezado     → Outfit Bold 700
// Texto          → Instrument Sans 400
// Cita           → Instrument Sans 400 italic
// Pie de foto    → Instrument Sans 400

// ============================================
// SPACING
// ============================================

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 9999,
} as const;

// ============================================
// SHADOWS (React Native compatible)
// ============================================

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  subtle: {
    shadowColor: '#9C8CFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
} as const;

// ============================================
// WORDMARK STYLING
// ============================================
// Cals2Gains wordmark: "Cals" in violet, "2" in coral, "Gains" in violet
// Font: Outfit Bold 700

export const WORDMARK = {
  font: BRAND_FONTS.display.family,
  weight: BRAND_FONTS.display.weight,
  calsColor: BRAND_COLORS.violet,     // "Cals" in Soft Violet
  toColor: BRAND_COLORS.coral,        // "2" in Signal Coral
  gainsColor: BRAND_COLORS.violet,    // "Gains" in Soft Violet
} as const;

// ============================================
// LEGACY COMPAT — COLORS object
// ============================================
// For backward compatibility with existing screens that use COLORS.xxx
// New screens should import BRAND_COLORS directly.

export const COLORS = {
  background: BRAND_COLORS.plum,
  card: BRAND_COLORS.card,
  cardHover: BRAND_COLORS.cardHover,
  violet: BRAND_COLORS.violet,
  coral: BRAND_COLORS.coral,
  bone: BRAND_COLORS.bone,
  textSecondary: BRAND_COLORS.textSecondary,
  textTertiary: BRAND_COLORS.textTertiary,
  border: BRAND_COLORS.border,
  success: BRAND_COLORS.success,
  warning: BRAND_COLORS.warning,
  error: BRAND_COLORS.error,
} as const;

// ============================================
// GOOGLE FONTS IMPORT (for landing page / web)
// ============================================

export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Outfit:wght@400;500;600;700;800&display=swap';
