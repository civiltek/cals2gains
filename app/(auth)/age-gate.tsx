// ============================================
// Cals2Gains - Age Gate (Fase B)
// ============================================
// PRIMER paso del onboarding. Pide fecha de nacimiento y determina:
//   - edad < 16  → pantalla de bloqueo (no persiste nada)
//   - 16 ≤ edad < 18 → continúa, pero `goal-modes` bloqueará lose_fat/mini_cut
//   - edad ≥ 18 → onboarding normal
//
// Referencia legal:
//   - INFORME_LEGAL_v1.md §7 Acción 12 (edad mínima)
//   - LOPD-GDD Art. 7 + Apple Review Guideline 1.4.1 + Google Play Families Policy
//   - DPIA §4 medidas O4 (política de edad)

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../store/themeStore';
import { useUserStore } from '../../store/userStore';
import {
  calculateAgeFromDateOfBirth,
  isUnder16,
} from '../../types';
import { BRAND_COLORS, BRAND_FONTS } from '../../theme';

// ============================================================================
// Helpers
// ============================================================================

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ============================================================================
// Inline picker (no external dep — cross-platform)
// ============================================================================

interface WheelPickerProps {
  label: string;
  value: number;
  options: Array<{ label: string; value: number }>;
  onChange: (v: number) => void;
  width?: number;
  C: any;
}

function WheelPicker({ label, value, options, onChange, width = 90, C }: WheelPickerProps) {
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.value === value);
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.pickerLabel, { color: C.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.pickerField, { borderColor: C.border, backgroundColor: C.card }]}
        onPress={() => {
          setOpen(true);
          Haptics.selectionAsync();
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerValue, { color: C.text }]} numberOfLines={1}>
          {active?.label ?? '—'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOpen(false)}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: C.cardElevated || C.surface }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{label}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {options.map((opt) => {
                const isActive = opt.value === value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.modalRow,
                      isActive && { backgroundColor: `${BRAND_COLORS.violet}18` },
                    ]}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                      Haptics.selectionAsync();
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? BRAND_COLORS.violet : C.text,
                        fontWeight: isActive ? '700' : '500',
                        fontSize: 16,
                      }}
                    >
                      {opt.label}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark" size={18} color={BRAND_COLORS.violet} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

export default function AgeGateScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const C = useColors();
  const setDateOfBirth = useUserStore((s) => s.setDateOfBirth);

  const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
  const months = lang === 'es' ? MONTHS_ES : MONTHS_EN;

  const currentYear = new Date().getFullYear();
  // Default: 25 años atrás (mayoría de usuarios objetivo)
  const [year, setYear] = useState<number>(currentYear - 25);
  const [month, setMonth] = useState<number>(1); // 1-12
  const [day, setDay] = useState<number>(1);

  const [showBlock, setShowBlock] = useState(false);
  const [loading, setLoading] = useState(false);

  const dayOptions = useMemo(() => {
    const max = daysInMonth(year, month);
    return Array.from({ length: max }, (_, i) => ({ label: String(i + 1), value: i + 1 }));
  }, [year, month]);

  const monthOptions = useMemo(
    () => months.map((m, i) => ({ label: m, value: i + 1 })),
    [months],
  );

  const yearOptions = useMemo(() => {
    // Edad mín razonable a listar: 10, máx: 100.
    const max = currentYear - 10;
    const min = currentYear - 100;
    const out: Array<{ label: string; value: number }> = [];
    for (let y = max; y >= min; y--) out.push({ label: String(y), value: y });
    return out;
  }, [currentYear]);

  const isoDate = toIso(year, month, day);
  const age = calculateAgeFromDateOfBirth(isoDate);

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (age == null) return;

    if (isUnder16(isoDate)) {
      // NO persistir nada. Mostrar bloqueo en pantalla.
      setShowBlock(true);
      return;
    }

    setLoading(true);
    try {
      await setDateOfBirth(isoDate);
      // Continuar al screening médico (paso B.3)
      router.replace('/(auth)/screening');
    } catch (err) {
      // No exponer detalles del usuario en la UI; reintentable
      setLoading(false);
    }
  };

  // ------------------- Block screen (edad < 16) -------------------
  if (showBlock) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={styles.blockInner}>
          <View style={[styles.blockIconWrap, { backgroundColor: `${C.warning}20` }]}>
            <Ionicons name="shield-outline" size={52} color={C.warning} />
          </View>
          <Text style={[styles.blockTitle, { color: C.text }]}>
            {t('onboarding.ageGate.blockTitle')}
          </Text>
          <Text style={[styles.blockBody, { color: C.textSecondary }]}>
            {t('onboarding.ageGate.blockBody')}
          </Text>
        </View>
      </View>
    );
  }

  // ------------------- Age entry -------------------
  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconWrap, { backgroundColor: `${BRAND_COLORS.violet}18` }]}>
          <Ionicons name="calendar-outline" size={42} color={BRAND_COLORS.violet} />
        </View>

        <Text style={[styles.title, { color: C.text }]}>{t('onboarding.ageGate.title')}</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          {t('onboarding.ageGate.subtitle')}
        </Text>

        <View style={styles.pickerRow}>
          <WheelPicker
            label={t('onboarding.ageGate.day')}
            value={day}
            options={dayOptions}
            onChange={(v) => {
              // Clamp if month changes to shorter month
              const max = daysInMonth(year, month);
              setDay(Math.min(v, max));
            }}
            C={C}
          />
          <View style={{ width: 8 }} />
          <WheelPicker
            label={t('onboarding.ageGate.month')}
            value={month}
            options={monthOptions}
            onChange={(v) => {
              setMonth(v);
              const max = daysInMonth(year, v);
              if (day > max) setDay(max);
            }}
            C={C}
          />
          <View style={{ width: 8 }} />
          <WheelPicker
            label={t('onboarding.ageGate.year')}
            value={year}
            options={yearOptions}
            onChange={(v) => {
              setYear(v);
              const max = daysInMonth(v, month);
              if (day > max) setDay(max);
            }}
            C={C}
          />
        </View>

        {age != null && (
          <Text style={[styles.agePreview, { color: C.textSecondary }]}>
            {t('onboarding.ageGate.previewLine', { age })}
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.cta,
            { backgroundColor: BRAND_COLORS.violet, opacity: loading ? 0.6 : 1 },
          ]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>{t('common.continue')}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 80 : 56,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  iconWrap: {
    width: 84, height: 84, borderRadius: 42,
    alignSelf: 'center', justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24, fontWeight: '700', textAlign: 'center',
    fontFamily: BRAND_FONTS.display.family, marginBottom: 10,
  },
  subtitle: {
    fontSize: 14, textAlign: 'center', lineHeight: 21,
    marginBottom: 28, paddingHorizontal: 8,
    fontFamily: BRAND_FONTS.body.family,
  },
  pickerRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 11, fontWeight: '600', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  pickerValue: {
    fontSize: 15, fontWeight: '600', flex: 1,
  },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 360, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 8,
  },
  modalTitle: {
    fontSize: 16, fontWeight: '700',
    paddingHorizontal: 14, paddingBottom: 10,
  },
  modalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 8,
  },
  agePreview: {
    fontSize: 13, textAlign: 'center', marginBottom: 24, marginTop: 4,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    borderRadius: 14, paddingVertical: 16,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // ---- Block screen ----
  blockInner: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  blockIconWrap: {
    width: 110, height: 110, borderRadius: 55,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  blockTitle: {
    fontSize: 22, fontWeight: '700', textAlign: 'center',
    marginBottom: 12,
    fontFamily: BRAND_FONTS.display.family,
  },
  blockBody: {
    fontSize: 15, textAlign: 'center', lineHeight: 22,
    fontFamily: BRAND_FONTS.body.family,
  },
});
