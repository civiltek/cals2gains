// ============================================
// Cals2Gains — AITransparencyBanner (Fase B)
// ============================================
// Transparencia requerida por Reg. UE 2024/1689 (AI Act) Art. 50.
// Se muestra UNA vez por pantalla (persistido en AsyncStorage).
// Pantallas: ai-review / food-verification, weekly-coach, what-to-eat.
//
// Texto canónico (i18n): `aiTransparency.banner`.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../store/themeStore';
import { BRAND_COLORS, BRAND_FONTS } from '../../theme';

export type AITransparencyScreenKey =
  | 'ai-review'
  | 'food-verification'
  | 'weekly-coach'
  | 'what-to-eat';

export interface AITransparencyBannerProps {
  screenKey: AITransparencyScreenKey;
  style?: ViewStyle | ViewStyle[];
  /**
   * Si es true, ignora la persistencia y muestra siempre (para testing o
   * pantallas donde queramos reforzar la señal).
   */
  force?: boolean;
}

const STORAGE_PREFIX = 'cals2gains_ai_transparency_seen_v1_';

export default function AITransparencyBanner({
  screenKey,
  style,
  force,
}: AITransparencyBannerProps) {
  const { t } = useTranslation();
  const C = useColors();
  const [visible, setVisible] = useState<boolean>(force ?? false);
  const [checked, setChecked] = useState<boolean>(force ?? false);

  useEffect(() => {
    if (force) return;
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(`${STORAGE_PREFIX}${screenKey}`);
        if (cancelled) return;
        if (!v) setVisible(true);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [screenKey, force]);

  const handleDismiss = useCallback(async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(`${STORAGE_PREFIX}${screenKey}`, '1');
    } catch {
      // silent — en el peor caso se vuelve a mostrar la próxima vez
    }
  }, [screenKey]);

  if (!checked) return null;
  if (!visible) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.wrap,
        {
          backgroundColor: `${BRAND_COLORS.violet}15`,
          borderColor: `${BRAND_COLORS.violet}40`,
        },
        style as any,
      ]}
    >
      <Ionicons
        name="sparkles-outline"
        size={16}
        color={BRAND_COLORS.violet}
        style={{ marginTop: 2 }}
      />
      <Text
        style={[
          styles.text,
          { color: C.text, fontFamily: BRAND_FONTS.body.family },
        ]}
      >
        {t('aiTransparency.banner')}
      </Text>
      <TouchableOpacity
        onPress={handleDismiss}
        accessibilityLabel={t('aiTransparency.gotIt')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={18} color={C.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
