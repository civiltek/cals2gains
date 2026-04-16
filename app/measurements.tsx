import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Dimensions,
  Alert,
  FlatList,
} from 'react-native';
import Svg, { Ellipse, Circle, Line, Text as SvgText, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useMeasurementStore } from '../store/measurementStore';
import { useWeightStore } from '../store/weightStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../store/themeStore';

const { width } = Dimensions.get('window');

interface MeasurementInput {
  cuello?: string;
  pecho?: string;
  cintura?: string;
  cadera?: string;
  bicepsI?: string;
  biceipsD?: string;
  musloI?: string;
  musloD?: string;
  gemeloI?: string;
  gemeloD?: string;
  grasaCorporal?: string;
  masaMuscular?: string;
  notas?: string;
}

interface HistoryItem {
  id: string;
  fecha: string;
  cintura: number;
  cadera: number;
  grasaCorporal?: number;
  masaMuscular?: number;
  peso?: number;
}

interface Comparison {
  campo: string;
  anterior: number;
  actual: number;
  cambio: number;
  porciento: number;
  mejora: boolean;
}

const BodySilhouette: React.FC<{ width: number; colors: ReturnType<typeof useColors> }> = ({ width: silhouetteWidth, colors }) => {
  const { t } = useTranslation();
  const svgW = 200;
  const svgH = 320;
  const cx = 100; // center x
  // Measurement points with labels on the right side
  const points = [
    { label: t('measurements.neck'), y: 68, rx: 18 },
    { label: t('measurements.chest'), y: 115, rx: 40 },
    { label: t('measurements.waist'), y: 160, rx: 30 },
    { label: t('measurements.hip'), y: 195, rx: 38 },
    { label: t('measurements.thigh'), y: 240, rx: 18 },
    { label: t('measurements.calf'), y: 290, rx: 12 },
  ];

  return (
    <View style={[styles.silhouetteContainer, { width: silhouetteWidth }]}>
      <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {/* Head */}
        <Circle cx={cx} cy={35} r={22} fill={colors.primary + '20'} stroke={colors.primary} strokeWidth={2} />
        {/* Neck */}
        <Path d={`M${cx - 10} 57 L${cx - 10} 72 L${cx + 10} 72 L${cx + 10} 57`} fill={colors.primary + '15'} stroke={colors.primary} strokeWidth={1.5} />
        {/* Torso */}
        <Path
          d={`M${cx - 40} 72 C${cx - 44} 100, ${cx - 42} 120, ${cx - 30} 155 C${cx - 28} 165, ${cx - 35} 180, ${cx - 38} 200 L${cx + 38} 200 C${cx + 35} 180, ${cx + 28} 165, ${cx + 30} 155 C${cx + 42} 120, ${cx + 44} 100, ${cx + 40} 72 Z`}
          fill={colors.primary + '12'}
          stroke={colors.primary}
          strokeWidth={2}
        />
        {/* Left leg */}
        <Path
          d={`M${cx - 38} 200 C${cx - 36} 210, ${cx - 25} 215, ${cx - 22} 225 L${cx - 18} 270 C${cx - 17} 280, ${cx - 16} 290, ${cx - 14} 310 L${cx - 6} 310 C${cx - 8} 290, ${cx - 9} 275, ${cx - 8} 260 L${cx - 5} 215`}
          fill={colors.primary + '12'}
          stroke={colors.primary}
          strokeWidth={1.5}
        />
        {/* Right leg */}
        <Path
          d={`M${cx + 38} 200 C${cx + 36} 210, ${cx + 25} 215, ${cx + 22} 225 L${cx + 18} 270 C${cx + 17} 280, ${cx + 16} 290, ${cx + 14} 310 L${cx + 6} 310 C${cx + 8} 290, ${cx + 9} 275, ${cx + 8} 260 L${cx + 5} 215`}
          fill={colors.primary + '12'}
          stroke={colors.primary}
          strokeWidth={1.5}
        />
        {/* Measurement indicator dots and labels */}
        {points.map((pt, i) => (
          <React.Fragment key={i}>
            {/* Dashed line from body to label */}
            <Line
              x1={cx + pt.rx + 2}
              y1={pt.y}
              x2={cx + pt.rx + 22}
              y2={pt.y}
              stroke={colors.primary}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            {/* Dot on body */}
            <Circle cx={cx + pt.rx} cy={pt.y} r={4} fill={colors.primary} />
            <Circle cx={cx - pt.rx} cy={pt.y} r={4} fill={colors.primary} />
            {/* Label */}
            <SvgText
              x={cx + pt.rx + 26}
              y={pt.y + 4}
              fill={colors.textSecondary}
              fontSize={11}
              fontWeight="600"
            >
              {pt.label}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

export default function MeasurementsScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { measurements, addMeasurement, getMeasurementHistory } = useMeasurementStore();
  useWeightStore(); // accessed via selector if needed

  const [inputs, setInputs] = useState<MeasurementInput>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const hist = getMeasurementHistory();
    if (hist && hist.length > 0) {
      setHistory(hist.slice(0, 10) as any);
      calculateComparisons(hist as any);
    }
  };

  const calculateComparisons = (hist: HistoryItem[]) => {
    if (hist.length < 2) return;

    const actual = hist[0];
    const anterior = hist[1];
    const comps: Comparison[] = [];

    const campos = [
      { key: 'cintura', label: t('measurements.waist') },
      { key: 'cadera', label: t('measurements.hip') },
      { key: 'grasaCorporal', label: t('measurements.bodyFat') },
      { key: 'masaMuscular', label: t('measurements.muscleMass') },
    ];

    campos.forEach((campo) => {
      const actualVal = actual[campo.key as keyof HistoryItem] as number | undefined;
      const anteriorVal = anterior[campo.key as keyof HistoryItem] as number | undefined;

      if (actualVal !== undefined && anteriorVal !== undefined && anteriorVal > 0) {
        const cambio = actualVal - anteriorVal;
        const porciento = Math.abs((cambio / anteriorVal) * 100);

        let mejora = false;
        if (campo.key === 'grasaCorporal' || campo.key === 'cintura' || campo.key === 'cadera') {
          mejora = cambio < 0;
        } else if (campo.key === 'masaMuscular') {
          mejora = cambio > 0;
        }

        comps.push({
          campo: campo.label,
          anterior: anteriorVal,
          actual: actualVal,
          cambio: Math.abs(cambio),
          porciento: Math.round(porciento * 100) / 100,
          mejora,
        });
      }
    });

    setComparisons(comps);
  };

  const handleInputChange = (field: keyof MeasurementInput, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateInputs = (): boolean => {
    const numericFields = [
      'cuello',
      'pecho',
      'cintura',
      'cadera',
      'bicepsI',
      'biceipsD',
      'musloI',
      'musloD',
      'gemeloI',
      'gemeloD',
      'grasaCorporal',
      'masaMuscular',
    ];

    for (const field of numericFields) {
      const value = inputs[field as keyof MeasurementInput];
      if (value && isNaN(parseFloat(value))) {
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateInputs()) {
      Alert.alert('Error', t('measurements.invalidValues'));
      return;
    }

    if (Object.values(inputs).every((v) => !v)) {
      Alert.alert('Error', t('measurements.atLeastOne'));
      return;
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const measurement: import('../types').BodyMeasurement = {
        id: Date.now().toString(),
        userId: '',
        date: new Date(),
        neck: inputs.cuello ? parseFloat(inputs.cuello) : undefined,
        chest: inputs.pecho ? parseFloat(inputs.pecho) : undefined,
        waist: inputs.cintura ? parseFloat(inputs.cintura) : undefined,
        hips: inputs.cadera ? parseFloat(inputs.cadera) : undefined,
        bicepLeft: inputs.bicepsI ? parseFloat(inputs.bicepsI) : undefined,
        bicepRight: inputs.biceipsD ? parseFloat(inputs.biceipsD) : undefined,
        thighLeft: inputs.musloI ? parseFloat(inputs.musloI) : undefined,
        thighRight: inputs.musloD ? parseFloat(inputs.musloD) : undefined,
        calfLeft: inputs.gemeloI ? parseFloat(inputs.gemeloI) : undefined,
        calfRight: inputs.gemeloD ? parseFloat(inputs.gemeloD) : undefined,
        bodyFat: inputs.grasaCorporal ? parseFloat(inputs.grasaCorporal) : undefined,
        muscleMass: inputs.masaMuscular ? parseFloat(inputs.masaMuscular) : undefined,
        note: inputs.notas,
      };
      const { id: _id, ...measurementWithoutId } = measurement;
      addMeasurement(measurementWithoutId);
      setInputs({});
      Alert.alert(t('common.success'), t('measurements.saved'));
      loadHistory();
    } catch (error) {
      Alert.alert('Error', t('measurements.saveFailed'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8, zIndex: 10 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            activeOpacity={0.6}
            style={{ backgroundColor: C.surface, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: C.text }]}>{t('measurements.title')}</Text>
            <Text style={[styles.headerDate, { color: C.textSecondary }]}>{new Date().toLocaleDateString('es-ES')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Body Silhouette */}
        <View style={[styles.silhouetteSection, { backgroundColor: C.card, borderColor: C.border }]}>
          <BodySilhouette width={width * 0.5} colors={C} />
        </View>

        {/* Input Form */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('measurements.enterMeasurements')}</Text>

          {/* Row 1: Cuello, Pecho */}
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.neck')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
                <TextInput
                  style={[styles.input, { color: C.text, backgroundColor: C.card }]}
                  placeholder="cm"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.cuello || ''}
                  onChangeText={(value) => handleInputChange('cuello', value)}
                />
                <Text style={[styles.inputUnit, { color: C.textTertiary }]}>cm</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.chest')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.pecho || ''}
                  onChangeText={(value) => handleInputChange('pecho', value)}
                />
                <Text style={[styles.inputUnit, { color: C.textTertiary }]}>cm</Text>
              </View>
            </View>
          </View>

          {/* Row 2: Cintura, Cadera */}
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.waist')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.cintura || ''}
                  onChangeText={(value) => handleInputChange('cintura', value)}
                />
                <Text style={[styles.inputUnit, { color: C.textTertiary }]}>cm</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.hip')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.cadera || ''}
                  onChangeText={(value) => handleInputChange('cadera', value)}
                />
                <Text style={[styles.inputUnit, { color: C.textTertiary }]}>cm</Text>
              </View>
            </View>
          </View>

          {/* Row 3: Bíceps I/D */}
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.bicepsL')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.bicepsI || ''}
                  onChangeText={(value) => handleInputChange('bicepsI', value)}
                />
                <Text style={[styles.inputUnit, { color: C.textTertiary }]}>cm</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.bicepsR')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.biceipsD || ''}
                  onChangeText={(value) => handleInputChange('biceipsD', value)}
                />
                <Text style={[styles.inputUnit, { color: C.textTertiary }]}>cm</Text>
              </View>
            </View>
          </View>

          {/* Row 4: Muslo I/D */}
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.thighL')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.musloI || ''}
                  onChangeText={(value) => handleInputChange('musloI', value)}
                />
                <Text style={[styles.inputUnit, { color: C.textTertiary }]}>cm</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.thighR')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.musloD || ''}
                  onChangeText={(value) => handleInputChange('musloD', value)}
                />
                <Text style={[styles.inputUnit, { color: C.textTertiary }]}>cm</Text>
              </View>
            </View>
          </View>

          {/* Row 5: Gemelo I/D */}
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.calfL')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.gemeloI || ''}
                  onChangeText={(value) => handleInputChange('gemeloI', value)}
                />
                <Text style={[styles.inputUnit, { color: C.textTertiary }]}>cm</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.calfR')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.gemeloD || ''}
                  onChangeText={(value) => handleInputChange('gemeloD', value)}
                />
                <Text style={[styles.inputUnit, { color: C.textTertiary }]}>cm</Text>
              </View>
            </View>
          </View>

          {/* Row 6: Grasa Corporal, Masa Muscular */}
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.bodyFat')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
                <TextInput
                  style={styles.input}
                  placeholder="%"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.grasaCorporal || ''}
                  onChangeText={(value) => handleInputChange('grasaCorporal', value)}
                />
                <Text style={[styles.inputUnit, { color: C.textTertiary }]}>%</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.muscleMass')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
                <TextInput
                  style={styles.input}
                  placeholder="kg"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.masaMuscular || ''}
                  onChangeText={(value) => handleInputChange('masaMuscular', value)}
                />
                <Text style={[styles.inputUnit, { color: C.textTertiary }]}>kg</Text>
              </View>
            </View>
          </View>

          {/* Notes Field */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: C.textSecondary }]}>{t('measurements.notes')}</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { color: C.text, backgroundColor: C.card }]}
              placeholder={t('measurements.notesPlaceholder')}
              placeholderTextColor={C.textTertiary}
              multiline
              numberOfLines={3}
              value={inputs.notas || ''}
              onChangeText={(value) => handleInputChange('notas', value)}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: C.accent }]} onPress={handleSave}>
            <Ionicons name="checkmark-circle" size={20} color={C.white} />
            <Text style={[styles.saveButtonText, { color: C.white }]}>{t('measurements.save')}</Text>
          </TouchableOpacity>
        </View>

        {/* History Section */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <TouchableOpacity
              style={[styles.historyHeader, { borderBottomColor: C.border }]}
              onPress={() => setShowHistory(!showHistory)}
            >
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('measurements.history')}</Text>
              <Ionicons
                name={showHistory ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={C.primary}
              />
            </TouchableOpacity>

            {showHistory && (
              <FlatList
                scrollEnabled={false}
                data={history}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.historyCard, { backgroundColor: C.card, borderColor: C.border }]}>
                    <Text style={[styles.historyDate, { color: C.primary }]}>{item.fecha}</Text>
                    <View style={styles.historyContent}>
                      {item.cintura && (
                        <Text style={[styles.historyValue, { color: C.textSecondary }]}>Cintura: {item.cintura}cm</Text>
                      )}
                      {item.cadera && (
                        <Text style={[styles.historyValue, { color: C.textSecondary }]}>Cadera: {item.cadera}cm</Text>
                      )}
                      {item.grasaCorporal !== undefined && (
                        <Text style={[styles.historyValue, { color: C.textSecondary }]}>
                          {t('measurements.bodyFat')}: {item.grasaCorporal.toFixed(1)}%
                        </Text>
                      )}
                      {item.masaMuscular && (
                        <Text style={[styles.historyValue, { color: C.textSecondary }]}>
                          {t('measurements.muscleMass')}: {item.masaMuscular.toFixed(1)}kg
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {/* Comparison Section */}
        {comparisons.length > 0 && (
          <View style={styles.comparisonSection}>
            <TouchableOpacity
              style={[styles.comparisonHeader, { borderBottomColor: C.border }]}
              onPress={() => setShowComparison(!showComparison)}
            >
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('measurements.recentChanges')}</Text>
              <Ionicons
                name={showComparison ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={C.primary}
              />
            </TouchableOpacity>

            {showComparison && (
              <View>
                {comparisons.map((comp, idx) => (
                  <View key={idx} style={[styles.comparisonCard, { backgroundColor: C.card, borderColor: C.border }]}>
                    <View style={styles.comparisonTop}>
                      <Text style={[styles.comparisonField, { color: C.text }]}>{comp.campo}</Text>
                      <View
                        style={[
                          styles.comparisonBadge,
                          { backgroundColor: comp.mejora ? C.success : C.warning },
                        ]}
                      >
                        <Ionicons
                          name={comp.mejora ? 'arrow-down' : 'arrow-up'}
                          size={14}
                          color={C.white}
                        />
                        <Text style={styles.comparisonPercent}>
                          {comp.porciento.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.comparisonValues, { color: C.textTertiary }]}>
                      {comp.anterior.toFixed(1)} → {comp.actual.toFixed(1)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 12,
  },
  silhouetteSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  silhouetteContainer: {
    alignItems: 'center',
  },
  silhouetteHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  silhouetteTorso: {
    width: 60,
    height: 80,
    borderRadius: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 8,
  },
  silhouetteLeg: {
    width: 20,
    height: 60,
    borderRadius: 10,
    marginVertical: 4,
  },
  silhouetteLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  inputUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  notesInput: {
    height: 80,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    height: 48,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  historySection: {
    marginBottom: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyCard: {
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  historyContent: {
    gap: 6,
  },
  historyValue: {
    fontSize: 12,
  },
  comparisonSection: {
    marginBottom: 24,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  comparisonCard: {
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  comparisonTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  comparisonField: {
    fontSize: 13,
    fontWeight: '600',
  },
  comparisonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comparisonPercent: {
    fontSize: 11,
    fontWeight: '600',
  },
  comparisonValues: {
    fontSize: 12,
  },
});
