import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { usePremiumGate } from '../hooks/usePremiumGate';
import { mealStore } from '../store/mealStore';
import { weightStore } from '../store/weightStore';
import { waterStore } from '../store/waterStore';
import { useColors } from '../store/themeStore';

type FormatType = 'csv' | 'pdf';
type ScopeType = 'week' | 'month' | 'custom';

interface ExportOptions {
  meals: boolean;
  weight: boolean;
  measurements: boolean;
  water: boolean;
  fasting: boolean;
}

interface ExportPreview {
  mealCount: number;
  weightEntries: number;
  waterEntries: number;
  measurementEntries: number;
  fastingEntries: number;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  formatGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formatOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatOptionActive: {
    borderWidth: 2,
  },
  formatOptionText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  formatOptionTextActive: {
    fontWeight: '600',
  },
  scopeGroup: {
    gap: 8,
    marginBottom: 16,
  },
  scopeButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scopeButtonActive: {
    borderWidth: 1,
  },
  scopeButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  scopeButtonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scopeButtonRadioActive: {
    borderWidth: 2,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
  },
  checkboxGroup: {
    gap: 12,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  checkboxItemActive: {
    borderWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    borderWidth: 2,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  previewCard: {
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  previewLabel: {
    fontSize: 12,
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  exportButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
});


export default function ExportDataScreen() {
  const isPremium = usePremiumGate();
  if (!isPremium) return null;

  const C = useColors();
  const { t } = useTranslation();
  const [format, setFormat] = useState<FormatType>('csv');
  const [scope, setScope] = useState<ScopeType>('week');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [options, setOptions] = useState<ExportOptions>({
    meals: true,
    weight: true,
    measurements: false,
    water: true,
    fasting: false,
  });
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setLoading(false);
    }, [])
  );

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (scope) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'custom':
        if (customStartDate) {
          const parsed = new Date(customStartDate);
          if (!isNaN(parsed.getTime())) {
            start.setTime(parsed.getTime());
          }
        }
        if (customEndDate) {
          const parsed = new Date(customEndDate);
          if (!isNaN(parsed.getTime())) {
            end.setTime(parsed.getTime());
          }
        }
        break;
    }

    return { start, end };
  }, [scope, customStartDate, customEndDate]);

  const preview = useMemo((): ExportPreview => {
    const meals = options.meals
      ? mealStore
          .getMeals()
          .filter(
            (m) =>
              new Date(m.timestamp) >= dateRange.start &&
              new Date(m.timestamp) <= dateRange.end
          ).length
      : 0;

    const weights = options.weight
      ? weightStore
          .getWeights()
          .filter(
            (w) =>
              new Date(w.date) >= dateRange.start &&
              new Date(w.date) <= dateRange.end
          ).length
      : 0;

    const water = options.water
      ? waterStore
          .getWater()
          .filter(
            (w) =>
              new Date(w.date) >= dateRange.start &&
              new Date(w.date) <= dateRange.end
          ).length
      : 0;

    return {
      mealCount: meals,
      weightEntries: weights,
      waterEntries: water,
      measurementEntries: options.measurements ? 0 : 0,
      fastingEntries: options.fasting ? 0 : 0,
    };
  }, [options, dateRange]);

  const generateCSV = async (): Promise<string> => {
    const lines: string[] = [];

    if (options.meals) {
      lines.push('=== COMIDAS ===');
      lines.push(`${t('export.csvDate')},${t('export.csvName')},${t('export.csvCalories')},${t('export.csvProtein')},${t('export.csvCarbs')},${t('export.csvFat')}`);

      const meals = mealStore
        .getMeals()
        .filter(
          (m) =>
            new Date(m.timestamp) >= dateRange.start &&
            new Date(m.timestamp) <= dateRange.end
        )
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      meals.forEach((meal) => {
        const date = new Date(meal.timestamp).toLocaleDateString('es-ES');
        lines.push(
          `${date},"${meal.dishName}",${meal.nutrition?.calories || 0},${meal.nutrition?.protein || 0},${meal.nutrition?.carbs || 0},${meal.nutrition?.fat || 0}`
        );
      });

      lines.push('');
    }

    if (options.weight) {
      lines.push('=== PESO ===');
      lines.push(`${t('export.csvDate')},${t('export.csvWeight')}`);

      const weights = weightStore
        .getWeights()
        .filter(
          (w) =>
            new Date(w.date) >= dateRange.start &&
            new Date(w.date) <= dateRange.end
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      weights.forEach((weight) => {
        const date = new Date(weight.date).toLocaleDateString('es-ES');
        lines.push(`${date},${weight.weight}`);
      });

      lines.push('');
    }

    if (options.water) {
      lines.push('=== AGUA ===');
      lines.push(`${t('export.csvDate')},${t('export.csvWater')}`);

      const water = waterStore
        .getWater()
        .filter(
          (w) =>
            new Date(w.date) >= dateRange.start &&
            new Date(w.date) <= dateRange.end
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      water.forEach((entry) => {
        const date = new Date(entry.date).toLocaleDateString('es-ES');
        lines.push(`${date},${entry.amount}`);
      });

      lines.push('');
    }

    if (options.measurements) {
      lines.push('=== MEDIDAS CORPORALES ===');
      lines.push(`${t('export.csvDate')},${t('export.csvChest')},${t('export.csvWaist')},${t('export.csvHips')},${t('export.csvArms')}`);
      lines.push('');
    }

    if (options.fasting) {
      lines.push('=== AYUNO ===');
      lines.push(`${t('export.csvDate')},${t('export.csvStart')},${t('export.csvEnd')},${t('export.csvDuration')}`);
      lines.push('');
    }

    return lines.join('\n');
  };

  const generatePDF = async (): Promise<string> => {
    const sections: string[] = [];

    sections.push(`
      <div style="padding: 20px; font-family: Arial, sans-serif; color: #17121D;">
        <h1 style="color: #9C8CFF; margin-bottom: 10px;">${t('export.title')}</h1>
        <p style="color: #9C8CFF; margin-bottom: 20px;">
          ${t('export.period')}: ${dateRange.start.toLocaleDateString('es-ES')} - ${dateRange.end.toLocaleDateString('es-ES')}
        </p>
    `);

    if (options.meals) {
      const meals = mealStore
        .getMeals()
        .filter(
          (m) =>
            new Date(m.timestamp) >= dateRange.start &&
            new Date(m.timestamp) <= dateRange.end
        )
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      sections.push(`
        <h2 style="color: #9C8CFF; margin-top: 20px; margin-bottom: 10px;">${t('export.meals')} (${meals.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #F7F2EA; color: #17121D;">
              <th style="padding: 8px; text-align: left; border: 1px solid #9C8CFF;">${t('export.csvDate')}</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #9C8CFF;">${t('export.csvName')}</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #9C8CFF;">Cal</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #9C8CFF;">P (g)</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #9C8CFF;">C (g)</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #9C8CFF;">G (g)</th>
            </tr>
          </thead>
          <tbody>
            ${meals
              .map(
                (meal) => `
              <tr style="border: 1px solid #9C8CFF;">
                <td style="padding: 8px;">${new Date(meal.timestamp).toLocaleDateString('es-ES')}</td>
                <td style="padding: 8px;">${meal.dishName}</td>
                <td style="padding: 8px; text-align: right;">${meal.nutrition?.calories || 0}</td>
                <td style="padding: 8px; text-align: right;">${meal.nutrition?.protein || 0}</td>
                <td style="padding: 8px; text-align: right;">${meal.nutrition?.carbs || 0}</td>
                <td style="padding: 8px; text-align: right;">${meal.nutrition?.fat || 0}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `);
    }

    if (options.weight) {
      const weights = weightStore
        .getWeights()
        .filter(
          (w) =>
            new Date(w.date) >= dateRange.start &&
            new Date(w.date) <= dateRange.end
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      sections.push(`
        <h2 style="color: #9C8CFF; margin-top: 20px; margin-bottom: 10px;">${t('export.weight')} (${weights.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #F7F2EA; color: #17121D;">
              <th style="padding: 8px; text-align: left; border: 1px solid #9C8CFF;">${t('export.csvDate')}</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #9C8CFF;">${t('export.csvWeight')}</th>
            </tr>
          </thead>
          <tbody>
            ${weights
              .map(
                (weight) => `
              <tr style="border: 1px solid #9C8CFF;">
                <td style="padding: 8px;">${new Date(weight.date).toLocaleDateString('es-ES')}</td>
                <td style="padding: 8px; text-align: right;">${weight.weight}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `);
    }

    if (options.water) {
      const water = waterStore
        .getWater()
        .filter(
          (w) =>
            new Date(w.date) >= dateRange.start &&
            new Date(w.date) <= dateRange.end
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      sections.push(`
        <h2 style="color: #9C8CFF; margin-top: 20px; margin-bottom: 10px;">${t('export.water')} (${water.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #F7F2EA; color: #17121D;">
              <th style="padding: 8px; text-align: left; border: 1px solid #9C8CFF;">${t('export.csvDate')}</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #9C8CFF;">${t('export.csvWater')}</th>
            </tr>
          </thead>
          <tbody>
            ${water
              .map(
                (entry) => `
              <tr style="border: 1px solid #9C8CFF;">
                <td style="padding: 8px;">${new Date(entry.date).toLocaleDateString('es-ES')}</td>
                <td style="padding: 8px; text-align: right;">${entry.amount}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `);
    }

    sections.push('</div>');

    return sections.join('');
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        content = await generateCSV();
        filename = `cals2gains_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        const html = await generatePDF();
        filename = `cals2gains_${new Date().toISOString().split('T')[0]}.pdf`;

        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });

        if (Platform.OS === 'ios') {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: t('exportData.title'),
          });
        } else {
          const permission = await FileSystem.getInfoAsync(uri);
          if (permission.exists) {
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: t('exportData.title'),
            });
          }
        }

        setLoading(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Alert.alert(t('common.success'), t('exportData.exported'), [
          {
            text: 'OK',
            onPress: () => {},
          },
        ]);
        return;
      }

      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, content);

      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: t('exportData.title'),
      });

      setLoading(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(t('common.success'), t('exportData.exported'), [
        {
          text: 'OK',
          onPress: () => {},
        },
      ]);
    } catch (error) {
      setLoading(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Alert.alert('Error', t('exportData.exportFailed'), [
        {
          text: 'OK',
          onPress: () => {},
        },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.violet} />
        <Text style={styles.loadingText}>
          {format === 'csv' ? t('exportData.generatingCSV') : t('exportData.generatingPDF')}
        </Text>
      </View>
    );
  }

  const hasData =
    preview.mealCount > 0 ||
    preview.weightEntries > 0 ||
    preview.waterEntries > 0 ||
    preview.measurementEntries > 0 ||
    preview.fastingEntries > 0;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.header, { color: C.bone }]}>{t('exportData.title')}</Text>

        {/* Format Selector */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>{t('exportData.format')}</Text>
        <View style={styles.formatGroup}>
          <TouchableOpacity
            style={[styles.formatOption, format === 'csv' && styles.formatOptionActive]}
            onPress={() => setFormat('csv')}
          >
            <Ionicons
              name="document-text"
              size={24}
              color={format === 'csv' ? C.background : C.violet}
            />
            <Text
              style={[
                styles.formatOptionText,
                format === 'csv' && styles.formatOptionTextActive,
              ]}
            >
              CSV
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.formatOption, format === 'pdf' && styles.formatOptionActive]}
            onPress={() => setFormat('pdf')}
          >
            <Ionicons
              name="document"
              size={24}
              color={format === 'pdf' ? C.background : C.violet}
            />
            <Text
              style={[
                styles.formatOptionText,
                format === 'pdf' && styles.formatOptionTextActive,
              ]}
            >
              PDF
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scope Selector */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>{t('exportData.dateRange')}</Text>
        <View style={styles.scopeGroup}>
          <TouchableOpacity
            style={[styles.scopeButton, scope === 'week' && styles.scopeButtonActive]}
            onPress={() => setScope('week')}
          >
            <View style={[styles.scopeButtonRadio, { borderColor: C.violet }]}>
              {scope === 'week' && <View style={[styles.radioInner, { backgroundColor: C.background }]} />}
            </View>
            <Text style={[styles.scopeButtonText, { color: C.bone }]}>{t('exportData.lastWeek')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeButton, scope === 'month' && styles.scopeButtonActive]}
            onPress={() => setScope('month')}
          >
            <View style={[styles.scopeButtonRadio, { borderColor: C.violet }]}>
              {scope === 'month' && <View style={[styles.radioInner, { backgroundColor: C.background }]} />}
            </View>
            <Text style={[styles.scopeButtonText, { color: C.bone }]}>{t('exportData.lastMonth')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeButton, scope === 'custom' && styles.scopeButtonActive]}
            onPress={() => setScope('custom')}
          >
            <View style={[styles.scopeButtonRadio, { borderColor: C.violet }]}>
              {scope === 'custom' && <View style={[styles.radioInner, { backgroundColor: C.background }]} />}
            </View>
            <Text style={[styles.scopeButtonText, { color: C.bone }]}>{t('exportData.custom')}</Text>
          </TouchableOpacity>
        </View>

        {scope === 'custom' && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>{t('exportData.selectDates')}</Text>
            <View style={styles.datePickerRow}>
              <Text
                style={[
                  styles.dateInput,
                  {
                    color: C.textSecondary,
                    paddingVertical: 10,
                    backgroundColor: C.cardHover,
                  },
                ]}
              >
                {customStartDate || t('exportData.startPlaceholder')}
              </Text>
              <Text
                style={[
                  styles.dateInput,
                  {
                    color: C.textSecondary,
                    paddingVertical: 10,
                    backgroundColor: C.cardHover,
                  },
                ]}
              >
                {customEndDate || t('exportData.endPlaceholder')}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 8 }}>
              {t('exportData.dateFormat')}
            </Text>
          </View>
        )}

        {/* Data Checkboxes */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>{t('exportData.dataToExport')}</Text>
        <View style={styles.checkboxGroup}>
          <TouchableOpacity
            style={[styles.checkboxItem, options.meals && styles.checkboxItemActive]}
            onPress={() => setOptions({ ...options, meals: !options.meals })}
          >
            <View style={[styles.checkbox, options.meals && styles.checkboxActive]}>
              {options.meals && (
                <Ionicons name="checkmark" size={14} color={C.background} />
              )}
            </View>
            <Text style={[styles.checkboxLabel, { color: C.bone }]}>{t('exportData.meals')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkboxItem, options.weight && styles.checkboxItemActive]}
            onPress={() => setOptions({ ...options, weight: !options.weight })}
          >
            <View style={[styles.checkbox, options.weight && styles.checkboxActive]}>
              {options.weight && (
                <Ionicons name="checkmark" size={14} color={C.background} />
              )}
            </View>
            <Text style={[styles.checkboxLabel, { color: C.bone }]}>{t('exportData.weight')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.checkboxItem,
              options.measurements && styles.checkboxItemActive,
            ]}
            onPress={() =>
              setOptions({ ...options, measurements: !options.measurements })
            }
          >
            <View style={[styles.checkbox, options.measurements && styles.checkboxActive]}>
              {options.measurements && (
                <Ionicons name="checkmark" size={14} color={C.background} />
              )}
            </View>
            <Text style={[styles.checkboxLabel, { color: C.bone }]}>{t('exportData.bodyMeasurements')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkboxItem, options.water && styles.checkboxItemActive]}
            onPress={() => setOptions({ ...options, water: !options.water })}
          >
            <View style={[styles.checkbox, options.water && styles.checkboxActive]}>
              {options.water && (
                <Ionicons name="checkmark" size={14} color={C.background} />
              )}
            </View>
            <Text style={[styles.checkboxLabel, { color: C.bone }]}>{t('exportData.water')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkboxItem, options.fasting && styles.checkboxItemActive]}
            onPress={() => setOptions({ ...options, fasting: !options.fasting })}
          >
            <View style={[styles.checkbox, options.fasting && styles.checkboxActive]}>
              {options.fasting && (
                <Ionicons name="checkmark" size={14} color={C.background} />
              )}
            </View>
            <Text style={[styles.checkboxLabel, { color: C.bone }]}>{t('exportData.fasting')}</Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.previewTitle, { color: C.textSecondary }]}>{t('exportData.preview')}</Text>
          {hasData ? (
            <>
              {options.meals && preview.mealCount > 0 && (
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: C.textSecondary }]}>{t('exportData.mealsLogged')}</Text>
                  <Text style={[styles.previewValue, { color: C.violet }]}>{preview.mealCount}</Text>
                </View>
              )}
              {options.weight && preview.weightEntries > 0 && (
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: C.textSecondary }]}>{t('exportData.weightEntries')}</Text>
                  <Text style={[styles.previewValue, { color: C.violet }]}>{preview.weightEntries}</Text>
                </View>
              )}
              {options.water && preview.waterEntries > 0 && (
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: C.textSecondary }]}>{t('exportData.waterEntries')}</Text>
                  <Text style={[styles.previewValue, { color: C.violet }]}>{preview.waterEntries}</Text>
                </View>
              )}
              {options.measurements && preview.measurementEntries > 0 && (
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: C.textSecondary }]}>{t('exportData.measurementEntries')}</Text>
                  <Text style={[styles.previewValue, { color: C.violet }]}>{preview.measurementEntries}</Text>
                </View>
              )}
              {options.fasting && preview.fastingEntries > 0 && (
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: C.textSecondary }]}>{t('exportData.fastingEntries')}</Text>
                  <Text style={[styles.previewValue, { color: C.violet }]}>{preview.fastingEntries}</Text>
                </View>
              )}
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: C.textSecondary }]}>{t('exportData.period')}</Text>
                <Text style={[styles.previewValue, { color: C.violet }]}>
                  {dateRange.start.toLocaleDateString('es-ES')} - {dateRange.end.toLocaleDateString('es-ES')}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[styles.previewLabel, { color: C.textSecondary }]}>
              {t('exportData.noData')}
            </Text>
          )}
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportButton, !hasData && styles.exportButtonDisabled]}
          onPress={handleExport}
          disabled={!hasData}
        >
          <Ionicons
            name="download"
            size={18}
            color={C.background}
          />
          <Text style={styles.exportButtonText}>
            {t('exportData.exportBtn', { format: format.toUpperCase() })}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
