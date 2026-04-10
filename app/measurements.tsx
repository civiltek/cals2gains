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
  SvgProps,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMeasurementStore } from '../store/measurementStore';
import { useWeightStore } from '../store/weightStore';
import { COLORS } from '../theme';

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

const BodySilhouette: React.FC<{ width: number }> = ({ width: silhouetteWidth }) => (
  <View style={[styles.silhouetteContainer, { width: silhouetteWidth }]}>
    <View style={styles.silhouetteHead} />
    <View style={styles.silhouetteTorso}>
      <Text style={styles.silhouetteLabel}>Pecho</Text>
      <Text style={styles.silhouetteLabel}>Cintura</Text>
      <Text style={styles.silhouetteLabel}>Cadera</Text>
    </View>
    <View style={styles.silhouetteLeg} />
    <View style={styles.silhouetteLeg} />
  </View>
);

export default function MeasurementsScreen() {
  const router = useRouter();
  const { measurements, addMeasurement, getMeasurementHistory } = useMeasurementStore();
  const { weights } = useWeightStore();

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
      setHistory(hist.slice(0, 10));
      calculateComparisons(hist);
    }
  };

  const calculateComparisons = (hist: HistoryItem[]) => {
    if (hist.length < 2) return;

    const actual = hist[0];
    const anterior = hist[1];
    const comps: Comparison[] = [];

    const campos = [
      { key: 'cintura', label: 'Cintura' },
      { key: 'cadera', label: 'Cadera' },
      { key: 'grasaCorporal', label: 'Grasa Corporal' },
      { key: 'masaMuscular', label: 'Masa Muscular' },
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
      Alert.alert('Error', 'Por favor ingresa valores numéricos válidos');
      return;
    }

    if (Object.values(inputs).every((v) => !v)) {
      Alert.alert('Error', 'Por favor ingresa al menos una medida');
      return;
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const measurement = {
        id: Date.now().toString(),
        fecha: new Date().toISOString().split('T')[0],
        cuello: inputs.cuello ? parseFloat(inputs.cuello) : undefined,
        pecho: inputs.pecho ? parseFloat(inputs.pecho) : undefined,
        cintura: inputs.cintura ? parseFloat(inputs.cintura) : undefined,
        cadera: inputs.cadera ? parseFloat(inputs.cadera) : undefined,
        bicepsI: inputs.bicepsI ? parseFloat(inputs.bicepsI) : undefined,
        biceipsD: inputs.biceipsD ? parseFloat(inputs.biceipsD) : undefined,
        musloI: inputs.musloI ? parseFloat(inputs.musloI) : undefined,
        musloD: inputs.musloD ? parseFloat(inputs.musloD) : undefined,
        gemeloI: inputs.gemeloI ? parseFloat(inputs.gemeloI) : undefined,
        gemeloD: inputs.gemeloD ? parseFloat(inputs.gemeloD) : undefined,
        grasaCorporal: inputs.grasaCorporal ? parseFloat(inputs.grasaCorporal) : undefined,
        masaMuscular: inputs.masaMuscular ? parseFloat(inputs.masaMuscular) : undefined,
        notas: inputs.notas,
      };

      addMeasurement(measurement);
      setInputs({});
      Alert.alert('Éxito', 'Medidas guardadas correctamente');
      loadHistory();
    } catch (error) {
      Alert.alert('Error', 'No se pudieron guardar las medidas');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.violet} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Medidas Corporales</Text>
            <Text style={styles.headerDate}>{new Date().toLocaleDateString('es-ES')}</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        {/* Body Silhouette */}
        <View style={styles.silhouetteSection}>
          <BodySilhouette width={width * 0.5} />
        </View>

        {/* Input Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Ingresa tus medidas</Text>

          {/* Row 1: Cuello, Pecho */}
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Cuello</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.cuello || ''}
                  onChangeText={(value) => handleInputChange('cuello', value)}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Pecho</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.pecho || ''}
                  onChangeText={(value) => handleInputChange('pecho', value)}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
          </View>

          {/* Row 2: Cintura, Cadera */}
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Cintura</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.cintura || ''}
                  onChangeText={(value) => handleInputChange('cintura', value)}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Cadera</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.cadera || ''}
                  onChangeText={(value) => handleInputChange('cadera', value)}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
          </View>

          {/* Row 3: Bíceps I/D */}
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bíceps I</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.bicepsI || ''}
                  onChangeText={(value) => handleInputChange('bicepsI', value)}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bíceps D</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.biceipsD || ''}
                  onChangeText={(value) => handleInputChange('biceipsD', value)}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
          </View>

          {/* Row 4: Muslo I/D */}
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Muslo I</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.musloI || ''}
                  onChangeText={(value) => handleInputChange('musloI', value)}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Muslo D</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.musloD || ''}
                  onChangeText={(value) => handleInputChange('musloD', value)}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
          </View>

          {/* Row 5: Gemelo I/D */}
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Gemelo I</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.gemeloI || ''}
                  onChangeText={(value) => handleInputChange('gemeloI', value)}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Gemelo D</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.gemeloD || ''}
                  onChangeText={(value) => handleInputChange('gemeloD', value)}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
          </View>

          {/* Row 6: Grasa Corporal, Masa Muscular */}
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Grasa Corporal</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="%"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.grasaCorporal || ''}
                  onChangeText={(value) => handleInputChange('grasaCorporal', value)}
                />
                <Text style={styles.inputUnit}>%</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Masa Muscular</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="kg"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  value={inputs.masaMuscular || ''}
                  onChangeText={(value) => handleInputChange('masaMuscular', value)}
                />
                <Text style={styles.inputUnit}>kg</Text>
              </View>
            </View>
          </View>

          {/* Notes Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Notas (opcional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Añade observaciones..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
              value={inputs.notas || ''}
              onChangeText={(value) => handleInputChange('notas', value)}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.bone} />
            <Text style={styles.saveButtonText}>Guardar Medidas</Text>
          </TouchableOpacity>
        </View>

        {/* History Section */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <TouchableOpacity
              style={styles.historyHeader}
              onPress={() => setShowHistory(!showHistory)}
            >
              <Text style={styles.sectionTitle}>Historial</Text>
              <Ionicons
                name={showHistory ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.violet}
              />
            </TouchableOpacity>

            {showHistory && (
              <FlatList
                scrollEnabled={false}
                data={history}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.historyCard}>
                    <Text style={styles.historyDate}>{item.fecha}</Text>
                    <View style={styles.historyContent}>
                      {item.cintura && (
                        <Text style={styles.historyValue}>Cintura: {item.cintura}cm</Text>
                      )}
                      {item.cadera && (
                        <Text style={styles.historyValue}>Cadera: {item.cadera}cm</Text>
                      )}
                      {item.grasaCorporal !== undefined && (
                        <Text style={styles.historyValue}>
                          Grasa: {item.grasaCorporal.toFixed(1)}%
                        </Text>
                      )}
                      {item.masaMuscular && (
                        <Text style={styles.historyValue}>
                          Masa Muscular: {item.masaMuscular.toFixed(1)}kg
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
              style={styles.comparisonHeader}
              onPress={() => setShowComparison(!showComparison)}
            >
              <Text style={styles.sectionTitle}>Cambios Recientes</Text>
              <Ionicons
                name={showComparison ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.violet}
              />
            </TouchableOpacity>

            {showComparison && (
              <View>
                {comparisons.map((comp, idx) => (
                  <View key={idx} style={styles.comparisonCard}>
                    <View style={styles.comparisonTop}>
                      <Text style={styles.comparisonField}>{comp.campo}</Text>
                      <View
                        style={[
                          styles.comparisonBadge,
                          { backgroundColor: comp.mejora ? '#4CAF50' : '#FF9800' },
                        ]}
                      >
                        <Ionicons
                          name={comp.mejora ? 'arrow-down' : 'arrow-up'}
                          size={14}
                          color={COLORS.bone}
                        />
                        <Text style={styles.comparisonPercent}>
                          {comp.porciento.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.comparisonValues}>
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
    backgroundColor: COLORS.background,
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
    color: COLORS.bone,
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  silhouetteSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 24,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  silhouetteContainer: {
    alignItems: 'center',
  },
  silhouetteHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.violet,
    marginBottom: 8,
  },
  silhouetteTorso: {
    width: 60,
    height: 80,
    backgroundColor: COLORS.violet,
    borderRadius: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 8,
  },
  silhouetteLeg: {
    width: 20,
    height: 60,
    backgroundColor: COLORS.violet,
    borderRadius: 10,
    marginVertical: 4,
  },
  silhouetteLabel: {
    fontSize: 9,
    color: COLORS.bone,
    fontWeight: '600',
  },
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bone,
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
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    color: COLORS.bone,
    fontSize: 14,
    fontWeight: '500',
  },
  inputUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textTertiary,
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
    backgroundColor: COLORS.coral,
    borderRadius: 12,
    height: 48,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bone,
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
    borderBottomColor: COLORS.border,
  },
  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.violet,
    marginBottom: 8,
  },
  historyContent: {
    gap: 6,
  },
  historyValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    borderBottomColor: COLORS.border,
  },
  comparisonCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.bone,
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
    color: COLORS.bone,
  },
  comparisonValues: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
});
