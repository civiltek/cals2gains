// ============================================
// Cals2Gains — Performance Intelligence Palette (THEME-AWARE)
// Brand: Carbon Plum / Soft Violet / Signal Coral / Bone
// ============================================
// This file re-exports the mutable COLORS from theme.ts,
// mapped to the Colors property names used by tab screens.
// When the theme changes, these values update in-place.

import { COLORS } from '../theme';

// Re-export as a proxy that always reads from the mutable COLORS object
const Colors: Record<string, any> = new Proxy(COLORS, {
  get(target, prop: string) {
    // Map Colors-specific names to COLORS equivalents
    const aliases: Record<string, string> = {
      primaryDark: 'primary',
      accentLight: 'accent',
      surfaceLight: 'surfaceLight',
      borderLight: 'border',
      carbon: 'background',
      gradientStart: 'violet',
      gradientEnd: 'coral',
    };
    const key = aliases[prop] || prop;
    return (target as any)[key];
  },
});

export { Colors };
export default Colors;
