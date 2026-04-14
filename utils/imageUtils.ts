// ============================================
// Cals2Gains - Image Utilities
// ============================================

import { Platform } from 'react-native';

/**
 * Check if a photo URI can be displayed on the current platform.
 * On web, only data: and http(s) URIs work.
 * On native, any URI (including file://) works.
 */
export function canDisplayUri(uri: string | undefined | null): boolean {
  if (!uri) return false;
  if (Platform.OS !== 'web') return true;
  return uri.startsWith('data:') || uri.startsWith('http');
}
