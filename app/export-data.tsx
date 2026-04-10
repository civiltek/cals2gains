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
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { mealStore } from '@/stores/mealStore';
import { weightStore } from '@/stores/weightStore';
import { waterStore } from '@/stores/waterStore';
import { COLORS } from '../theme';

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
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.bone,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.cardHover,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatOptionActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  formatOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  formatOptionTextActive: {
    color: COLORS.background,
  },
  scopeGroup: {
    gap: 8,
    marginBottom: 16,
  },
  scopeButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.cardHover,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scopeButtonActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  scopeButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.bone,
  },
  scopeButtonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.violet,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scopeButtonRadioActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.background,
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardHover,
    fontSize: 13,
    color: COLORS.bone,
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
    backgroundColor: COLORS.cardHover,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkboxItemActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.bone,
  },
  previewCard: {
    backgroundColor: COLORS.cardHover,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
    color: COLORS.textSecondary,
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.violet,
  },
  exportButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.coral,
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
    color: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  successIcon: {
    color: COLORS.coral,
  },
});

export default function ExportDataScreen() {
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
              new Date(m.date) >= dateRange.start &&
              new Date(m.date) <= dateRange.end
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
      lines.push('Fecha,Nombre,Calorías,Proteína (g),Carbos (g),Grasas (g)');

      const meals = mealStore
        .getMeals()
        .filter(
          (m) =>
            new Date(m.date) >= dateRange.start &&
            new Date(m.date) <= dateRange.end
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      meals.forEach((meal) => {
        const date = new Date(meal.date).toLocaleDateString('es-ES');
        lines.push(
          `${date},"${meal.name}",${meal.calories || 0},${meal.protein || 0},${meal.carbs || 0},${meal.fat || 0}`
        );
      });

      lines.push('');
    }

    if (options.weight) {
      lines.push('=== PESO ===');
      lines.push('Fecha,Peso (kg)');

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
      lines.push('Fecha,Cantidad (ml)');

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
      lines.push('Fecha,Pecho (cm),Cintura (cm),Caderas (cm),Brazos (cm)');
      lines.push('');
    }

    if (options.fasting) {
      lines.push('=== AYUNO ===');
      lines.push('Fecha,Inicio,Fin,Duración (horas)');
      lines.push('');
    }

    return lines.join('\n');
  };

  const generatePDF = async (): Promise<string> => {
    const sections: string[] = [];

    sections.push(`
      <div style="padding: 20px; font-family: Arial, sans-serif; color: #17121D;">
        <h1 style="color: #9C8CFF; margin-bottom: 10px;">Exportación Cals2Gains</h1>
        <p style="color: #9C8CFF; margin-bottom: 20px;">
          Período: ${dateRange.start.toLocaleDateString('es-ES')} - ${dateRange.end.toLocaleDateString('es-ES')}
        </p>
    `);

    if (options.meals) {
      const meals = mealStore
        .getMeals()
        .filter(
          (m) =>
            new Date(m.date) >= dateRange.start &&
            new Date(m.date) <= dateRange.end
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      sections.push(`
        <h2 style="color: #9C8CFF; margin-top: 20px; margin-bottom: 10px;">Comidas (${meals.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #F7F2EA; color: #17121D;">
              <th style="padding: 8px; text-align: left; border: 1px solid #9C8CFF;">Fecha</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #9C8CFF;">Nombre</th>
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
                <td style="padding: 8px;">${new Date(meal.date).toLocaleDateString('es-ES')}</td>
                <td style="padding: 8px;">${meal.name}</td>
                <td style="padding: 8px; text-align: right;">${meal.calories || 0}</td>
                <td style="padding: 8px; text-align: right;">${meal.protein || 0}</td>
                <td style="padding: 8px; text-align: right;">${meal.carbs || 0}</td>
                <td style="padding: 8px; text-align: right;">${meal.fat || 0}</td>
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
        <h2 style="color: #9C8CFF; margin-top: 20px; margin-bottom: 10px;">Peso (${weights.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #F7F2EA; color: #17121D;">
              <th style="padding: 8px; text-align: left; border: 1px solid #9C8CFF;">Fecha</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #9C8CFF;">Peso (kg)</th>
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
        <h2 style="color: #9C8CFF; margin-top: 20px; margin-bottom: 10px;">Agua (${water.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #F7F2EA; color: #17121D;">
              <th style="padding: 8px; text-align: left; border: 1px solid #9C8CFF;">Fecha</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #9C8CFF;">Cantidad (ml)</th>
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
            dialogTitle: 'Exportar Datos',
          });
        } else {
          const permission = await FileSystem.getInfoAsync(uri);
          if (permission.exists) {
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Exportar Datos',
            });
          }
        }

        setLoading(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Alert.alert('Éxito', 'Datos exportados correctamente', [
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
        dialogTitle: 'Exportar Datos',
      });

      setLoading(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert('Éxito', 'Datos exportados correctamente', [
        {
          text: 'OK',
          onPress: () => {},
        },
      ]);
    } catch (error) {
      setLoading(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Alert.alert('Error', 'No se pudieron exportar los datos', [
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
        <ActivityIndicator size="large" color={COLORS.violet} />
        <Text style={styles.loadingText}>
          {format === 'csv' ? 'Generando CSV...' : 'Generando PDF...'}
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
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Exportar Datos</Text>

        {/* Format Selector */}
        <Text style={styles.sectionLabel}>Formato</Text>
        <View style={styles.formatGroup}>
          <TouchableOpacity
            style={[styles.formatOption, format === 'csv' && styles.formatOptionActive]}
            onPress={() => setFormat('csv')}
          >
            <Ionicons
              name="document-text"
              size={24}
              color={format === 'csv' ? COLORS.background : COLORS.violet}
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
              color={format === 'pdf' ? COLORS.background : COLORS.violet}
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
        <Text style={styles.sectionLabel}>Rango de Fechas</Text>
        <View style={styles.scopeGroup}>
          <TouchableOpacity
            style={[styles.scopeButton, scope === 'week' && styles.scopeButtonActive]}
            onPress={() => setScope('week')}
          >
            <View style={styles.scopeButtonRadio}>
              {scope === 'week' && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.scopeButtonText}>Última Semana</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeButton, scope === 'month' && styles.scopeButtonActive]}
            onPress={() => setScope('month')}
          >
            <View style={styles.scopeButtonRadio}>
              {scope === 'month' && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.scopeButtonText}>Último Mes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeButton, scope === 'custom' && styles.scopeButtonActive]}
            onPress={() => setScope('custom')}
          >
            <View style={styles.scopeButtonRadio}>
              {scope === 'custom' && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.scopeButtonText}>Personalizado</Text>
          </TouchableOpacity>
        </View>

        {scope === 'custom' && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Seleccionar Fechas</Text>
            <View style={styles.datePickerRow}>
              <Text
                style={[
                  styles.dateInput,
                  {
                    color: COLORS.textSecondary,
                    paddingVertical: 10,
                    backgroundColor: COLORS.cardHover,
                  },
                ]}
              >
                {customStartDate || 'Inicio (YYYY-MM-DD)'}
              </Text>
              <Text
                style={[
                  styles.dateInput,
                  {
                    color: COLORS.textSecondary,
                    paddingVertical: 10,
                    backgroundColor: COLORS.cardHover,
                  },
                ]}
              >
                {customEndDate || 'Fin (YYYY-MM-DD)'}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: COLORS.textTertiary, marginTop: 8 }}>
              Ingresa las fechas en formato YYYY-MM-DD
            </Text>
          </View>
        )}

        {/* Data Checkboxes */}
        <Text style={styles.sectionLabel}>Datos a Exportar</Text>
        <View style={styles.checkboxGroup}>
          <TouchableOpacity
            style={[styles.checkboxItem, options.meals && styles.checkboxItemActive]}
            onPress={() => setOptions({ ...options, meals: !options.meals })}
          >
            <View style={[styles.checkbox, options.meals && styles.checkboxActive]}>
              {options.meals && (
                <Ionicons name="checkmark" size={14} color={COLORS.background} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>Comidas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkboxItem, options.weight && styles.checkboxItemActive]}
            onPress={() => setOptions({ ...options, weight: !options.weight })}
          >
            <View style={[styles.checkbox, options.weight && styles.checkboxActive]}>
              {options.weight && (
                <Ionicons name="checkmark" size={14} color={COLORS.background} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>Peso</Text>
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
                <Ionicons name="checkmark" size={14} color={COLORS.background} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>Medidas Corporales</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkboxItem, options.water && styles.checkboxItemActive]}
            onPress={() => setOptions({ ...options, water: !options.water })}
          >
            <View style={[styles.checkbox, options.water && styles.checkboxActive]}>
              {options.water && (
                <Ionicons name="checkmark" size={14} color={COLORS.background} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>Agua</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkboxItem, options.fasting && styles.checkboxItemActive]}
            onPress={() => setOptions({ ...options, fasting: !options.fasting })}
          >
            <View style={[styles.checkbox, options.fasting && styles.checkboxActive]}>
              {options.fasting && (
                <Ionicons name="checkmark" size={14} color={COLORS.background} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>Ayuno</Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={styles.card}>
          <Text style={styles.previewTitle}>Previsualización</Text>
          {hasData ? (
            <>
              {options.meals && preview.mealCount > 0 && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Comidas registradas</Text>
                  <Text style={styles.previewValue}>{preview.mealCount}</Text>
                </View>
              )}
              {options.weight && preview.weightEntries > 0 && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Registros de peso</Text>
                  <Text style={styles.previewValue}>{preview.weightEntries}</Text>
                </View>
              )}
              {options.water && preview.waterEntries > 0 && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Registros de agua</Text>
                  <Text style={styles.previewValue}>{preview.waterEntries}</Text>
                </View>
              )}
              {options.measurements && preview.measurementEntries > 0 && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Medidas registradas</Text>
                  <Text style={styles.previewValue}>{preview.measurementEntries}</Text>
                </View>
              )}
              {options.fasting && preview.fastingEntries > 0 && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Registros de ayuno</Text>
                  <Text style={styles.previewValue}>{preview.fastingEntries}</Text>
                </View>
              )}
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Período</Text>
                <Text style={styles.previewValue}>
                  {dateRange.start.toLocaleDateString('es-ES')} - {dateRange.end.toLocaleDateString('es-ES')}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.previewLabel}>
              No hay datos disponibles para el período seleccionado
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
            color={COLORS.background}
          />
          <Text style={styles.exportButtonText}>
            Exportar {format.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
