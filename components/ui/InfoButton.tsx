/**
 * InfoButton — botón ℹ️ con modal educativo
 * Abre una explicación breve con tono cercano y motivador (brand voice).
 * Compatible con i18n (EN + ES) y tema oscuro/claro.
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '../../store/themeStore';
import { BRAND_COLORS, BRAND_FONTS } from '../../theme';

// ============================================================================
// Types
// ============================================================================

export interface InfoButtonProps {
  /** Texto del título del modal */
  title: string;
  /** Contenido explicativo del modal (puede incluir párrafos separados con \n\n) */
  body: string;
  /** Tamaño del icono (default: 18) */
  size?: number;
  /** Color del icono (default: violeta de brand) */
  color?: string;
  /** Estilo extra para el TouchableOpacity */
  style?: object;
  /** Emoji opcional mostrado antes del título */
  emoji?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function InfoButton({
  title,
  body,
  size = 18,
  color,
  style,
  emoji,
}: InfoButtonProps) {
  const C = useColors();
  const [visible, setVisible] = useState(false);
  const iconColor = color ?? BRAND_COLORS.violet;

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisible(true);
  };

  const paragraphs = body.split('\n\n').filter(Boolean);

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={style}
      >
        <Ionicons name="information-circle-outline" size={size} color={iconColor} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
            {/* Accent bar */}
            <View style={[styles.accentBar, { backgroundColor: BRAND_COLORS.violet }]} />

            {/* Title */}
            <View style={styles.titleRow}>
              {emoji && <Text style={styles.emoji}>{emoji}</Text>}
              <Text style={[styles.title, { color: C.text, fontFamily: BRAND_FONTS.display }]}>
                {title}
              </Text>
            </View>

            {/* Body */}
            <ScrollView
              style={styles.bodyScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {paragraphs.map((para, i) => (
                <Text key={i} style={[styles.body, { color: C.textMuted }]}>
                  {para}
                </Text>
              ))}
            </ScrollView>

            {/* Close */}
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: BRAND_COLORS.violet }]}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.closeBtnText}>Entendido</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000070',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 380,
    maxHeight: '75%',
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  emoji: {
    fontSize: 22,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  bodyScroll: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    maxHeight: 260,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  closeBtn: {
    margin: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
