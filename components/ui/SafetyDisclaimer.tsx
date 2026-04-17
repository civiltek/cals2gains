// ============================================
// Cals2Gains — SafetyDisclaimer (Fase B)
// ============================================
// Disclaimer ubicuo "no es dispositivo médico / no sustituye consejo profesional".
// Texto canónico validado: INFORME_LEGAL_v1.md §7 Acción 6.
// Debe aparecer en:
//   - Resultado del onboarding (variant='full')
//   - Dashboard (variant='short')
//   - what-to-eat (variant='short')
//   - weekly-coach (variant='full')
//   - Notificaciones de ajuste del coach (variant='short')
//
// Brand-styled + dark/light + i18n ES/EN.

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../store/themeStore';
import { BRAND_FONTS } from '../../theme';

export type SafetyDisclaimerVariant = 'short' | 'full';

export interface SafetyDisclaimerProps {
  variant?: SafetyDisclaimerVariant;
  style?: ViewStyle | ViewStyle[];
}

export default function SafetyDisclaimer({
  variant = 'short',
  style,
}: SafetyDisclaimerProps) {
  const { t } = useTranslation();
  const C = useColors();

  const text = variant === 'full' ? t('disclaimer.full') : t('disclaimer.short');

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[
        styles.wrap,
        {
          backgroundColor: C.card || 'transparent',
          borderColor: C.border,
        },
        variant === 'full' && styles.wrapFull,
        style as any,
      ]}
    >
      <Ionicons
        name="information-circle-outline"
        size={variant === 'full' ? 18 : 14}
        color={C.textSecondary}
        style={styles.icon}
      />
      <Text
        style={[
          variant === 'full' ? styles.textFull : styles.textShort,
          { color: C.textSecondary, fontFamily: BRAND_FONTS.body.family },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 0,
  },
  wrapFull: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  icon: {
    marginTop: 1,
  },
  textShort: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  textFull: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
