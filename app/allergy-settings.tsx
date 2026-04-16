// ============================================
// Cals2Gains - Allergy & Intolerance Settings
// ============================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';

const ALLERGENS = [
  { id: 'gluten', key: 'allergies.gluten' },
  { id: 'lactose', key: 'allergies.lactose' },
  { id: 'nuts', key: 'allergies.nuts' },
  { id: 'peanuts', key: 'allergies.peanuts' },
  { id: 'shellfish', key: 'allergies.shellfish' },
  { id: 'fish', key: 'allergies.fish' },
  { id: 'egg', key: 'allergies.egg' },
  { id: 'soy', key: 'allergies.soy' },
  { id: 'sesame', key: 'allergies.sesame' },
  { id: 'mustard', key: 'allergies.mustard' },
  { id: 'celery', key: 'allergies.celery' },
  { id: 'molluscs', key: 'allergies.molluscs' },
  { id: 'lupin', key: 'allergies.lupin' },
  { id: 'sulphites', key: 'allergies.sulphites' },
];

const INTOLERANCES = [
  { id: 'fructose', key: 'allergies.fructose' },
  { id: 'sorbitol', key: 'allergies.sorbitol' },
  { id: 'histamine', key: 'allergies.histamine' },
  { id: 'fodmap', key: 'allergies.fodmap' },
];

const KNOWN_IDS = new Set([
  ...ALLERGENS.map(a => a.id),
  ...INTOLERANCES.map(a => a.id),
]);

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingTop: 60, paddingBottom: 16, gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: C.text, flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
    sectionLabel: {
      fontSize: 13, fontWeight: '700', color: C.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 20,
    },
    sectionDesc: { fontSize: 13, color: C.textTertiary, marginBottom: 10, lineHeight: 18 },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    },
    chipActive: { backgroundColor: C.error + '20', borderColor: C.error },
    chipText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
    chipTextActive: { color: C.error },
    input: {
      backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 16,
      paddingVertical: 14, fontSize: 15, color: C.text,
      borderWidth: 1, borderColor: C.border, marginTop: 4,
    },
    disclaimerBox: {
      backgroundColor: C.warning + '15', borderRadius: 10, padding: 14,
      marginTop: 20, borderWidth: 1, borderColor: C.warning + '40',
    },
    disclaimerText: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },
    saveBtn: {
      position: 'absolute', bottom: 34, left: 16, right: 16,
      backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    saveBtnText: { fontSize: 17, fontWeight: '700', color: C.white },
  });
}

export default function AllergySettingsScreen() {
  const C = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const s = useMemo(() => createStyles(C), [C]);

  const user = useUserStore(state => state.user);
  const updateAllergies = useUserStore(state => state.updateAllergies);

  // Separate known-id allergies from free-text others
  const initialAllergies = (user?.allergies || []).filter(a => KNOWN_IDS.has(a));
  const initialIntolerances = (user?.intolerances || []).filter(a => KNOWN_IDS.has(a));
  const initialOther = (user?.allergies || []).filter(a => !KNOWN_IDS.has(a)).join(', ');

  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(initialAllergies);
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>(initialIntolerances);
  const [otherAllergy, setOtherAllergy] = useState(initialOther);
  const [saving, setSaving] = useState(false);

  const toggleAllergy = (id: string) => {
    setSelectedAllergies(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
    Haptics.selectionAsync();
  };

  const toggleIntolerance = (id: string) => {
    setSelectedIntolerances(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
    Haptics.selectionAsync();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allAllergies = [
        ...selectedAllergies,
        ...otherAllergy.split(',').map(s => s.trim()).filter(Boolean),
      ];
      await updateAllergies(allAllergies, selectedIntolerances);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('', t('allergies.saved'));
      router.back();
    } catch {
      Alert.alert(t('errors.error') || 'Error', t('errors.generic') || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('allergies.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>{t('allergies.allergiesSection')}</Text>
        <Text style={s.sectionDesc}>{t('allergies.allergiesDesc')}</Text>
        <View style={s.chipsContainer}>
          {ALLERGENS.map(a => {
            const active = selectedAllergies.includes(a.id);
            return (
              <TouchableOpacity key={a.id} style={[s.chip, active && s.chipActive]} onPress={() => toggleAllergy(a.id)}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{t(a.key)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.sectionLabel, { marginTop: 24 }]}>{t('allergies.intolerancesSection')}</Text>
        <Text style={s.sectionDesc}>{t('allergies.intolerancesDesc')}</Text>
        <View style={s.chipsContainer}>
          {INTOLERANCES.map(a => {
            const active = selectedIntolerances.includes(a.id);
            return (
              <TouchableOpacity key={a.id} style={[s.chip, active && s.chipActive]} onPress={() => toggleIntolerance(a.id)}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{t(a.key)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.sectionLabel, { marginTop: 24 }]}>{t('allergies.other')}</Text>
        <TextInput
          style={s.input}
          placeholder={t('allergies.otherPlaceholder')}
          placeholderTextColor={C.textSecondary}
          value={otherAllergy}
          onChangeText={setOtherAllergy}
        />

        <View style={s.disclaimerBox}>
          <Text style={s.disclaimerText}>⚕️ {t('allergies.disclaimer')}</Text>
        </View>
      </ScrollView>

      <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color={C.white} />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color={C.white} />
            <Text style={s.saveBtnText}>{t('allergies.save')}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
