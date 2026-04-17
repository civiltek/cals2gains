// ============================================
// Cals2Gains - Medical Screening (Fase B)
// ============================================
// Paso previo a la selección de goal mode. Permite al usuario declarar
// condiciones que activan adaptaciones y salvaguardas.
//
// Base legal: RGPD Art. 9.2.a — consentimiento explícito para datos de salud.
// Copy canónico: INFORME_LEGAL_v1.md §7 Acción 7.
//
// Reglas de UI (NO cambiar sin revisar legal):
//   - Opciones no obligatorias (el usuario puede no declarar nada).
//   - "Ninguna de las anteriores" excluye las otras (checkbox final).
//   - Consentimiento Art. 9.2.a SOLO si el usuario marca al menos una opción
//     positiva; si marca "Ninguna", el consentimiento no aplica.
//   - Nunca usar términos clínicos ("TCA", "anorexia", "bulimia") en UI.

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../store/themeStore';
import { useUserStore } from '../../store/userStore';
import { MedicalFlag } from '../../types';
import { BRAND_COLORS, BRAND_FONTS } from '../../theme';

// ============================================================================
// Config
// ============================================================================

const OPTIONS: Array<{ id: MedicalFlag; labelKey: string }> = [
  { id: 'pregnancy_lactation', labelKey: 'screening.optionPregnancy' },
  { id: 'eating_sensitive',    labelKey: 'screening.optionEatingSensitive' },
  { id: 'diabetes',            labelKey: 'screening.optionDiabetes' },
  { id: 'kidney_disease',      labelKey: 'screening.optionKidney' },
];

// ============================================================================
// Screen
// ============================================================================

export default function ScreeningScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const C = useColors();
  const setMedicalFlags = useUserStore((s) => s.setMedicalFlags);
  const recordConsentEvent = useUserStore((s) => s.recordConsentEvent);
  const setNumericDisplayMode = useUserStore((s) => s.setNumericDisplayMode);

  const [selected, setSelected] = useState<Set<MedicalFlag>>(new Set());
  const [none, setNone] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleFlag = (flag: MedicalFlag) => {
    Haptics.selectionAsync();
    setNone(false); // desmarca "ninguna" al elegir una opción
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(flag)) next.delete(flag);
      else next.add(flag);
      return next;
    });
  };

  const toggleNone = () => {
    Haptics.selectionAsync();
    setNone((n) => {
      const nextVal = !n;
      if (nextVal) {
        setSelected(new Set());
        setConsentAccepted(false);
      }
      return nextVal;
    });
  };

  const hasPositiveFlag = selected.size > 0;

  // Botón Continuar habilitado si:
  //  (a) "Ninguna de las anteriores" marcado; O
  //  (b) al menos una opción marcada Y consentimiento aceptado.
  const canContinue = useMemo(
    () => (none && !hasPositiveFlag) || (hasPositiveFlag && consentAccepted),
    [none, hasPositiveFlag, consentAccepted],
  );

  const openPrivacy = () => {
    Linking.openURL('https://cals2gains.com/privacy').catch(() => {});
  };

  const handleContinue = async () => {
    if (!canContinue || loading) return;
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const flags = hasPositiveFlag ? Array.from(selected) : [];

      // Persistir flags (si es "Ninguna" → array vacío, marca screening como
      // completado sin declarar nada)
      await setMedicalFlags(flags);

      // Si declara flags, registrar consentimiento Art. 9.2.a
      if (hasPositiveFlag) {
        await recordConsentEvent({
          timestamp: new Date().toISOString(),
          action: 'granted',
          scope: 'medical_flags_art_9_2_a',
          flagsSnapshot: flags,
        });

        // Si declara "eating_sensitive" → activar numericDisplayMode 'hidden'
        // (también se aplica en setMedicalFlags, pero por si acaso lo dejamos
        // explícito aquí por si la auto-lógica cambia).
        if (flags.includes('eating_sensitive')) {
          await setNumericDisplayMode('hidden');
        }
      }

      router.replace('/(auth)/onboarding');
    } catch {
      // Conservador: no exponer detalles; reintentable
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: C.text }]}>{t('screening.title')}</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          {t('screening.subtitle')}
        </Text>

        <View style={styles.optionsBlock}>
          {OPTIONS.map((opt) => {
            const active = selected.has(opt.id);
            const disabled = none;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.row,
                  {
                    borderColor: active ? BRAND_COLORS.violet : C.border,
                    backgroundColor: active ? `${BRAND_COLORS.violet}15` : C.card,
                    opacity: disabled ? 0.45 : 1,
                  },
                ]}
                disabled={disabled}
                onPress={() => toggleFlag(opt.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: active ? BRAND_COLORS.violet : C.border,
                      backgroundColor: active ? BRAND_COLORS.violet : 'transparent',
                    },
                  ]}
                >
                  {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={[styles.rowText, { color: C.text }]}>{t(opt.labelKey)}</Text>
              </TouchableOpacity>
            );
          })}

          {/* "Ninguna de las anteriores" */}
          <TouchableOpacity
            style={[
              styles.row,
              {
                borderColor: none ? BRAND_COLORS.violet : C.border,
                backgroundColor: none ? `${BRAND_COLORS.violet}15` : C.card,
                marginTop: 8,
              },
            ]}
            onPress={toggleNone}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: none ? BRAND_COLORS.violet : C.border,
                  backgroundColor: none ? BRAND_COLORS.violet : 'transparent',
                },
              ]}
            >
              {none && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={[styles.rowText, { color: C.text, fontWeight: '600' }]}>
              {t('screening.optionNone')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.footerNote, { color: C.textSecondary }]}>
          {t('screening.footerNote')}
        </Text>

        {/* Consentimiento Art. 9.2.a — solo aparece si declara al menos una */}
        {hasPositiveFlag && (
          <TouchableOpacity
            style={[
              styles.consentBox,
              {
                borderColor: consentAccepted ? BRAND_COLORS.violet : C.border,
                backgroundColor: consentAccepted
                  ? `${BRAND_COLORS.violet}10`
                  : C.card,
              },
            ]}
            onPress={() => {
              setConsentAccepted((v) => !v);
              Haptics.selectionAsync();
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: consentAccepted ? BRAND_COLORS.violet : C.border,
                  backgroundColor: consentAccepted
                    ? BRAND_COLORS.violet
                    : 'transparent',
                  marginTop: 2,
                },
              ]}
            >
              {consentAccepted && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.consentText, { color: C.text }]}>
                {t('screening.consentIntro')}{' '}
                <Text
                  style={{ color: BRAND_COLORS.violet, textDecorationLine: 'underline' }}
                  onPress={openPrivacy}
                >
                  {t('screening.privacyLink')}
                </Text>
                {t('screening.consentBody')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.bottomBar, { backgroundColor: C.background, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[
            styles.cta,
            {
              backgroundColor: canContinue ? BRAND_COLORS.violet : C.border,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          onPress={handleContinue}
          disabled={!canContinue || loading}
          activeOpacity={0.8}
        >
          <Text style={[styles.ctaText, { color: canContinue ? '#fff' : C.textSecondary }]}>
            {t('common.continue')}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={canContinue ? '#fff' : C.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 72 : 48,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 24, fontWeight: '700', marginBottom: 8,
    fontFamily: BRAND_FONTS.display.family,
  },
  subtitle: {
    fontSize: 14, lineHeight: 21, marginBottom: 22,
    fontFamily: BRAND_FONTS.body.family,
  },
  optionsBlock: { gap: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5,
  },
  rowText: {
    fontSize: 14, flex: 1, lineHeight: 20,
    fontFamily: BRAND_FONTS.body.family,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  footerNote: {
    fontSize: 12, lineHeight: 18, marginTop: 16,
    fontFamily: BRAND_FONTS.body.family,
  },
  consentBox: {
    marginTop: 20, padding: 14,
    borderRadius: 12, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  consentText: {
    fontSize: 12, lineHeight: 19,
    fontFamily: BRAND_FONTS.body.family,
  },
  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 16,
  },
  ctaText: { fontWeight: '700', fontSize: 16 },
});
