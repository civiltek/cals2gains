// ============================================
// Cals2Gains - Analysis Transfer Store
// ============================================
// Holds image data between camera → analysis screens
// (route params can't handle large base64 strings)

import { create } from 'zustand';
import { getAppLanguage } from '../utils/language';

interface AnalysisTransfer {
  imageUri: string | null;
  imageBase64: string | null;
  language: 'es' | 'en';

  setImage: (uri: string, base64: string, language?: 'es' | 'en') => void;
  clear: () => void;
}

export const useAnalysisStore = create<AnalysisTransfer>((set) => ({
  imageUri: null,
  imageBase64: null,
  language: getAppLanguage(),

  setImage: (uri, base64, language) => set({
    imageUri: uri,
    imageBase64: base64,
    language: language || getAppLanguage(),
  }),
  clear: () => set({ imageUri: null, imageBase64: null }),
}));
