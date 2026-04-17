// ============================================
// Cals2Gains - Voice Food Logging Screen
// ============================================
// Records audio → Whisper transcription → GPT-4o-mini nutrition estimation → save meal

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';
import { useColors } from '../store/themeStore';
import { useMealStore } from '../store/mealStore';
import { useUserStore } from '../store/userStore';
import { voiceToNutrition } from '../services/voiceLog';
import { FoodItem, MealType } from '../types';
import { formatMacro } from '../utils/nutrition';
import { getAppLanguage } from '../utils/language';

type ScreenState = 'idle' | 'recording' | 'processing' | 'results' | 'error';

const MAX_DURATION_MS = 30000;

function getCurrentMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'breakfast';
  if (hour >= 12 && hour < 17) return 'lunch';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'snack';
}

export default function VoiceLogScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);

  const { user } = useUserStore();
  const { addMeal } = useMealStore();

  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [transcription, setTranscription] = useState('');
  const [foodItem, setFoodItem] = useState<FoodItem | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [mealType, setMealType] = useState<MealType>(getCurrentMealType());
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Pulse animation for recording state
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // expo-audio recorder
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  // Auto-stop at 30 seconds
  useEffect(() => {
    if (
      screenState === 'recording' &&
      recorderState.isRecording &&
      recorderState.durationMillis >= MAX_DURATION_MS
    ) {
      stopAndProcess();
    }
  }, [recorderState.durationMillis, screenState]);

  // Start/stop pulse animation
  useEffect(() => {
    if (screenState === 'recording') {
      pulseLoop.current = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseScale, {
              toValue: 1.25,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulseScale, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.6,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseScale.setValue(1);
      pulseOpacity.setValue(0.6);
    }
    return () => {
      pulseLoop.current?.stop();
    };
  }, [screenState]);

  const handleStartRecording = async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert(t('voiceLog.permissionDenied'), t('voiceLog.permissionMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('voiceLog.openSettings'),
          onPress: () => Linking.openSettings(),
        },
      ]);
      return;
    }
    // iOS requires explicit audio session configuration for recording.
    // Without allowsRecording the session stays in playback mode and
    // captures silent audio even when the mic permission is granted.
    if (Platform.OS === 'ios') {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
    }
    setScreenState('recording');
    recorder.record();
  };

  const stopAndProcess = async () => {
    if (!recorderState.isRecording) return;
    setScreenState('processing');
    await recorder.stop();

    // Restore audio session to playback mode so the rest of the app works normally
    if (Platform.OS === 'ios') {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
      }).catch(() => {});
    }

    const uri = recorder.uri;
    if (!uri) {
      setErrorMsg(t('voiceLog.errorFailed'));
      setScreenState('error');
      return;
    }

    try {
      const lang = getAppLanguage();
      const result = await voiceToNutrition(uri, lang);
      setTranscription(result.transcription);
      setFoodItem(result.food);
      if (result.food) {
        setEditWeight(String(result.food.servingSize));
      }
      setScreenState('results');
    } catch (err: any) {
      setErrorMsg(err?.message || t('voiceLog.errorFailed'));
      setScreenState('error');
    }
  };

  const handleReset = () => {
    setTranscription('');
    setFoodItem(null);
    setEditWeight('');
    setErrorMsg('');
    setScreenState('idle');
  };

  const handleSave = async () => {
    if (!foodItem || !user) return;
    setIsSaving(true);

    const weight = parseFloat(editWeight) || foodItem.servingSize || 100;
    const ratio = weight / (foodItem.servingSize || 100);
    const n = foodItem.nutritionPerServing;

    const mealData: any = {
      userId: user.uid,
      timestamp: new Date(),
      photoUri: '',
      dishName: foodItem.name,
      dishNameEs: foodItem.nameEs || foodItem.name,
      dishNameEn: foodItem.nameEn || foodItem.name,
      ingredients: [],
      portionDescription: `${weight}g`,
      estimatedWeight: weight,
      nutrition: {
        calories: Math.round((n.calories || 0) * ratio),
        protein: Math.round((n.protein || 0) * ratio * 10) / 10,
        carbs: Math.round((n.carbs || 0) * ratio * 10) / 10,
        fat: Math.round((n.fat || 0) * ratio * 10) / 10,
        fiber: Math.round((n.fiber || 0) * ratio * 10) / 10,
      },
      mealType,
      aiConfidence: 0.7,
    };

    // Only add notes if there is a transcription (Firestore rejects undefined)
    if (transcription.trim()) {
      mealData.notes = `🎙️ "${transcription.trim()}"`;
    }

    try {
      await addMeal(mealData);
      router.back();
      router.push('/(tabs)');
    } catch (err: any) {
      Alert.alert(t('errors.saveFailed'), err?.message || t('errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const durationSec = Math.round((recorderState.durationMillis || 0) / 1000);
  const remaining = 30 - durationSec;

  const adjustedNutrition = useMemo(() => {
    if (!foodItem) return null;
    const weight = parseFloat(editWeight) || foodItem.servingSize || 100;
    const ratio = weight / (foodItem.servingSize || 100);
    const n = foodItem.nutritionPerServing;
    return {
      calories: Math.round((n.calories || 0) * ratio),
      protein: Math.round((n.protein || 0) * ratio * 10) / 10,
      carbs: Math.round((n.carbs || 0) * ratio * 10) / 10,
      fat: Math.round((n.fat || 0) * ratio * 10) / 10,
    };
  }, [foodItem, editWeight]);

  const lang = getAppLanguage();
  const foodDisplayName = foodItem
    ? (lang === 'es' ? foodItem.nameEs || foodItem.name : foodItem.nameEn || foodItem.name)
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('voiceLog.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── IDLE ── */}
        {screenState === 'idle' && (
          <View style={styles.centerBlock}>
            <Text style={styles.hintTitle}>{t('voiceLog.tapToRecord')}</Text>
            <Text style={styles.exampleText}>{t('voiceLog.example')}</Text>

            <TouchableOpacity
              style={styles.micButton}
              onPress={handleStartRecording}
              activeOpacity={0.85}
            >
              <Ionicons name="mic" size={52} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.maxDurationText}>{t('voiceLog.maxDuration')}</Text>
          </View>
        )}

        {/* ── RECORDING ── */}
        {screenState === 'recording' && (
          <View style={styles.centerBlock}>
            <Text style={styles.recordingLabel}>{t('voiceLog.recording')}</Text>
            <Text style={styles.timerText}>
              {durationSec}s / 30s
            </Text>

            <TouchableOpacity onPress={stopAndProcess} activeOpacity={0.85}>
              <Animated.View
                style={[
                  styles.micButtonRecording,
                  { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                ]}
              >
                <Ionicons name="stop" size={52} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>

            <Text style={styles.tapToStopText}>{t('voiceLog.tapToStop')}</Text>

            {remaining <= 10 && (
              <Text style={styles.remainingText}>
                {t('voiceLog.timeRemaining', { seconds: remaining })}
              </Text>
            )}
          </View>
        )}

        {/* ── PROCESSING ── */}
        {screenState === 'processing' && (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.processingText}>{t('voiceLog.processing')}</Text>
            <Text style={styles.processingSubtext}>{t('voiceLog.transcribing')}</Text>
          </View>
        )}

        {/* ── ERROR ── */}
        {screenState === 'error' && (
          <View style={styles.centerBlock}>
            <Ionicons name="alert-circle" size={56} color={C.error} />
            <Text style={styles.errorTitle}>{t('voiceLog.errorFailed')}</Text>
            {errorMsg ? <Text style={styles.errorMsg}>{errorMsg}</Text> : null}
            <TouchableOpacity style={styles.retryButton} onPress={handleReset}>
              <Ionicons name="mic-outline" size={18} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>{t('voiceLog.retryRecording')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── RESULTS ── */}
        {screenState === 'results' && (
          <>
            {/* Transcription card */}
            {transcription ? (
              <View style={styles.transcriptionCard}>
                <View style={styles.transcriptionHeader}>
                  <Ionicons name="mic" size={15} color={C.primary} />
                  <Text style={styles.transcriptionLabel}>{t('voiceLog.transcription')}</Text>
                </View>
                <Text style={styles.transcriptionText}>"{transcription}"</Text>
              </View>
            ) : null}

            {!foodItem ? (
              /* No food detected */
              <View style={styles.noFoodCard}>
                <Ionicons name="help-circle-outline" size={52} color={C.textMuted} />
                <Text style={styles.noFoodTitle}>{t('voiceLog.noFoodDetected')}</Text>
                <Text style={styles.noFoodHint}>{t('voiceLog.noFoodDetectedHint')}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleReset}>
                  <Ionicons name="mic-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>{t('voiceLog.retryRecording')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Food name */}
                <View style={styles.foodNameCard}>
                  <Text style={styles.foodName}>{foodDisplayName}</Text>
                  <View style={styles.aiBadge}>
                    <Ionicons name="sparkles" size={12} color={C.accent} />
                    <Text style={styles.aiBadgeText}>IA</Text>
                  </View>
                </View>

                {/* Weight editor */}
                <View style={styles.weightCard}>
                  <Ionicons name="scale-outline" size={18} color={C.textSecondary} />
                  <Text style={styles.weightLabel}>{t('analysis.estimatedPortion')}</Text>
                  <TextInput
                    style={styles.weightInput}
                    value={editWeight}
                    onChangeText={setEditWeight}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.weightUnit}>g</Text>
                </View>

                {/* Nutrition */}
                {adjustedNutrition && (
                  <View style={styles.nutritionCard}>
                    <Text style={styles.sectionTitle}>{t('analysis.nutritionInfo')}</Text>
                    <View style={styles.calorieRow}>
                      <Text style={styles.calorieValue}>{adjustedNutrition.calories}</Text>
                      <Text style={styles.calorieUnit}>kcal</Text>
                    </View>
                    <View style={styles.macroRow}>
                      <MacroBox
                        label={t('analysis.protein')}
                        value={formatMacro(adjustedNutrition.protein)}
                        color={C.protein}
                      />
                      <MacroBox
                        label={t('analysis.carbs')}
                        value={formatMacro(adjustedNutrition.carbs)}
                        color={C.carbs}
                      />
                      <MacroBox
                        label={t('analysis.fat')}
                        value={formatMacro(adjustedNutrition.fat)}
                        color={C.fat}
                      />
                    </View>
                  </View>
                )}

                {/* Meal type selector */}
                <View style={styles.mealTypeSection}>
                  <Text style={styles.sectionTitle}>{t('analysis.mealType')}</Text>
                  <View style={styles.mealTypeRow}>
                    {(
                      [
                        { type: 'breakfast', icon: '🌅', label: t('home.breakfast') },
                        { type: 'lunch', icon: '☀️', label: t('home.lunch') },
                        { type: 'dinner', icon: '🌙', label: t('home.dinner') },
                        { type: 'snack', icon: '🍎', label: t('home.snack') },
                      ] as { type: MealType; icon: string; label: string }[]
                    ).map((item) => (
                      <TouchableOpacity
                        key={item.type}
                        style={[
                          styles.mealTypeChip,
                          mealType === item.type && styles.mealTypeChipSelected,
                        ]}
                        onPress={() => setMealType(item.type)}
                      >
                        <Text style={styles.mealTypeEmoji}>{item.icon}</Text>
                        <Text
                          style={[
                            styles.mealTypeLabel,
                            mealType === item.type && styles.mealTypeLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Save button */}
                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>{t('analysis.saveMeal')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Record again */}
                <TouchableOpacity style={styles.tryAgainButton} onPress={handleReset}>
                  <Ionicons name="mic-outline" size={18} color={C.primary} />
                  <Text style={styles.tryAgainText}>{t('voiceLog.retryRecording')}</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────

const MacroBox: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={[styles.macroBox, { borderTopColor: color }]}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroUnit}>g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: C.text,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 24,
    },

    // ── Center block (idle / recording / processing / error) ──
    centerBlock: {
      alignItems: 'center',
      paddingTop: 32,
      gap: 20,
    },
    hintTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: C.text,
      textAlign: 'center',
    },
    exampleText: {
      fontSize: 14,
      color: C.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 300,
    },
    micButton: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: C.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
      marginVertical: 8,
    },
    maxDurationText: {
      fontSize: 13,
      color: C.textMuted,
    },

    // Recording state
    recordingLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: C.accent,
    },
    timerText: {
      fontSize: 32,
      fontWeight: '800',
      color: C.text,
      letterSpacing: -1,
    },
    micButtonRecording: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: C.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: C.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 14,
      elevation: 10,
      marginVertical: 8,
    },
    tapToStopText: {
      fontSize: 14,
      color: C.textSecondary,
    },
    remainingText: {
      fontSize: 14,
      fontWeight: '600',
      color: C.accent,
    },

    // Processing state
    processingText: {
      fontSize: 18,
      fontWeight: '600',
      color: C.text,
    },
    processingSubtext: {
      fontSize: 14,
      color: C.textSecondary,
    },

    // Error state
    errorTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: C.text,
    },
    errorMsg: {
      fontSize: 13,
      color: C.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginTop: 4,
    },
    retryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    // ── Results ──
    transcriptionCard: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: C.primary + '40',
      marginBottom: 12,
    },
    transcriptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    transcriptionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: C.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    transcriptionText: {
      fontSize: 15,
      color: C.text,
      lineHeight: 22,
      fontStyle: 'italic',
    },

    // No food detected
    noFoodCard: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 16,
    },
    noFoodTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: C.text,
    },
    noFoodHint: {
      fontSize: 14,
      color: C.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },

    // Food name
    foodNameCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    foodName: {
      flex: 1,
      fontSize: 24,
      fontWeight: '700',
      color: C.text,
    },
    aiBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: C.accent + '20',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    aiBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: C.accent,
    },

    // Weight
    weightCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 12,
    },
    weightLabel: {
      flex: 1,
      fontSize: 14,
      color: C.textSecondary,
    },
    weightInput: {
      fontSize: 20,
      fontWeight: '700',
      color: C.primary,
      borderBottomWidth: 2,
      borderBottomColor: C.primary,
      minWidth: 60,
      textAlign: 'right',
      padding: 0,
    },
    weightUnit: {
      fontSize: 16,
      color: C.textSecondary,
    },

    // Nutrition
    nutritionCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: C.text,
      marginBottom: 14,
    },
    calorieRow: {
      alignItems: 'center',
      marginBottom: 14,
    },
    calorieValue: {
      fontSize: 52,
      fontWeight: '800',
      color: C.text,
      lineHeight: 58,
    },
    calorieUnit: {
      fontSize: 14,
      color: C.textSecondary,
    },
    macroRow: {
      flexDirection: 'row',
      gap: 10,
    },
    macroBox: {
      flex: 1,
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      borderTopWidth: 3,
    },
    macroValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    macroUnit: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 1,
    },
    macroLabel: {
      fontSize: 11,
      color: C.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },

    // Meal type
    mealTypeSection: {
      marginBottom: 12,
    },
    mealTypeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    mealTypeChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      backgroundColor: C.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: C.border,
      gap: 4,
    },
    mealTypeChipSelected: {
      borderColor: C.primary,
      backgroundColor: C.primary + '15',
    },
    mealTypeEmoji: {
      fontSize: 18,
    },
    mealTypeLabel: {
      fontSize: 11,
      color: C.textSecondary,
      fontWeight: '500',
    },
    mealTypeLabelSelected: {
      color: C.primary,
      fontWeight: '600',
    },

    // Save / Try again
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.primary,
      borderRadius: 16,
      paddingVertical: 18,
      gap: 10,
      marginBottom: 12,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    tryAgainButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
    },
    tryAgainText: {
      fontSize: 15,
      color: C.primary,
      fontWeight: '500',
    },
  });
}
