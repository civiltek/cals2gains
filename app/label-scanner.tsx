// ============================================
// Cals2Gains - Nutrition Label Scanner Screen
// ============================================
// Captures nutrition labels with camera, extracts via GPT-4o Vision OCR
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions, ScrollView, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMealStore } from '../store/mealStore';
import { MealType } from '../types';

const { width: SW } = Dimensions.get('window');
const LABEL_SIZE = SW * 0.75;
const C = {
  bg: '#17121D', card: '#1E1829', violet: '#9C8CFF', coral: '#FF6A4D',
  bone: '#F7F2EA', sec: 'rgba(247,242,234,0.6)', ter: 'rgba(247,242,234,0.35)',
  overlay: 'rgba(23,18,29,0.7)',
};

interface ExtractedNutrition {
  servingSize: number;
  servingsPerContainer: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    saturatedFat: number;
    sodium: number;
  };
  productName: string;
}

export default function LabelScannerScreen() {
  const router = useRouter();
  const [perm, requestPerm] = useCameraPermissions();
  const { addMeal } = useMealStore();
  const cameraRef = useRef<any>(null);

  // Phases: scanning, processing, confirming
  const [phase, setPhase] = useState<'scanning' | 'processing' | 'confirming'>('scanning');
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedNutrition | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [servings, setServings] = useState(1);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  // Edited nutrition values
  const [editedNutrition, setEditedNutrition] = useState<ExtractedNutrition['nutrition'] | null>(null);

  const MEAL_OPTIONS: { id: MealType; label: string; icon: string }[] = [
    { id: 'breakfast', label: 'Desayuno', icon: 'sunny-outline' },
    { id: 'lunch', label: 'Almuerzo', icon: 'restaurant-outline' },
    { id: 'dinner', label: 'Cena', icon: 'moon-outline' },
    { id: 'snack', label: 'Snack', icon: 'cafe-outline' },
  ];

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || loading) return;
    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      if (photo?.base64) {
        setPhotoBase64(photo.base64);
        setPhase('processing');
        await extractLabelOCR(photo.base64);
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo capturar la foto');
      setLoading(false);
    }
  }, [loading]);

  const extractLabelOCR = async (base64: string) => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'You are a nutrition label OCR specialist. Extract ALL nutritional information from this nutrition label photo. Return ONLY valid JSON with this structure: { servingSize: number (grams), servingsPerContainer: number, nutrition: { calories, protein, carbs, fat, fiber, sugar, saturatedFat, sodium }, productName: string }',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed: ExtractedNutrition = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.nutrition || typeof parsed.nutrition.calories !== 'number') {
        throw new Error('Invalid nutrition data');
      }

      setExtracted(parsed);
      setEditedNutrition({ ...parsed.nutrition });
      setPhase('confirming');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('OCR error:', err);
      Alert.alert(
        'Error de OCR',
        'No se pudo extraer los datos de la etiqueta. Intenta de nuevo.',
        [
          { text: 'Volver', onPress: () => { setPhase('scanning'); setLoading(false); } },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndLog = async () => {
    if (!extracted || !editedNutrition) return;

    setLoading(true);
    try {
      const mealName = extracted.productName || 'Alimento escaneado';
      const baseCalories = editedNutrition.calories || 0;
      const caloriesWithServings = Math.round(baseCalories * servings);

      await addMeal({
        name: mealName,
        calories: caloriesWithServings,
        protein: Math.round((editedNutrition.protein || 0) * servings),
        carbs: Math.round((editedNutrition.carbs || 0) * servings),
        fat: Math.round((editedNutrition.fat || 0) * servings),
        fiber: Math.round((editedNutrition.fiber || 0) * servings),
        sugar: Math.round((editedNutrition.sugar || 0) * servings),
        saturatedFat: Math.round((editedNutrition.saturatedFat || 0) * servings),
        sodium: Math.round((editedNutrition.sodium || 0) * servings),
        mealType,
        source: 'label',
        photoUri: undefined,
        timestamp: new Date(),
      } as any);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      Alert.alert('Error', 'No se pudo registrar la comida');
    } finally {
      setLoading(false);
    }
  };

  const handleRetakePhoto = () => {
    setPhase('scanning');
    setExtracted(null);
    setEditedNutrition(null);
    setPhotoBase64(null);
  };

  // ============================================
  // PERMISSION SCREEN
  // ============================================
  if (!perm) {
    return (
      <View style={s.ctr}>
        <ActivityIndicator color={C.violet} size="large" />
      </View>
    );
  }

  if (!perm.granted) {
    return (
      <View style={s.ctr}>
        <View style={s.permCard}>
          <Ionicons name="camera-outline" size={48} color={C.violet} />
          <Text style={s.permTitle}>Acceso a Camara</Text>
          <Text style={s.permText}>Necesitamos la camara para escanear etiquetas nutricionales</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPerm}>
            <Text style={s.permBtnTxt}>Permitir Acceso</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[s.permText, { marginTop: 12 }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================
  // SCANNING PHASE
  // ============================================
  if (phase === 'scanning') {
    return (
      <View style={s.ctr}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" ref={cameraRef} />
        <View style={StyleSheet.absoluteFillObject}>
          <View style={s.ovTop}>
            <View style={s.scanHdr}>
              <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
                <Ionicons name="close" size={28} color={C.bone} />
              </TouchableOpacity>
              <Text style={s.hdrTitle}>Escanear Etiqueta</Text>
              <View style={{ width: 44 }} />
            </View>
          </View>

          <View style={s.ovCenter}>
            <View style={s.ovSide} />
            <View style={s.labelArea}>
              <View style={[s.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 }]} />
              <View style={[s.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 }]} />
              <View style={[s.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 }]} />
              <View style={[s.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 }]} />
            </View>
            <View style={s.ovSide} />
          </View>

          <View style={s.ovBtm}>
            {loading ? (
              <ActivityIndicator color={C.violet} size="large" />
            ) : (
              <>
                <Text style={s.hint}>Apunta a la etiqueta nutricional</Text>
                <TouchableOpacity style={s.captureBtn} onPress={takePhoto}>
                  <View style={s.captureInner} />
                </TouchableOpacity>
                <Text style={s.captureText}>Capturar etiqueta</Text>
              </>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ============================================
  // CONFIRMING PHASE
  // ============================================
  if (phase === 'confirming' && extracted && editedNutrition) {
    return (
      <View style={s.ctr}>
        <View style={s.hdr}>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Ionicons name="close" size={24} color={C.bone} />
          </TouchableOpacity>
          <Text style={s.hdrTitle}>Confirmar Datos</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.prodCard}>
            <Text style={s.prodName}>{extracted.productName}</Text>
            <Text style={s.portionInfo}>
              Porción: {extracted.servingSize}g | {extracted.servingsPerContainer} porciones
            </Text>

            <View style={s.nutGrid}>
              {[
                { key: 'calories', val: editedNutrition.calories, label: 'Calorías', unit: 'kcal', color: C.violet },
                { key: 'protein', val: editedNutrition.protein, label: 'Proteína', unit: 'g', color: C.coral },
                { key: 'carbs', val: editedNutrition.carbs, label: 'Carbos', unit: 'g' },
                { key: 'fat', val: editedNutrition.fat, label: 'Grasa', unit: 'g' },
              ].map((item) => (
                <View key={item.key} style={[s.nutItem, item.color ? { borderColor: item.color } : {}]}>
                  <Text style={[s.nutVal, item.color ? { color: item.color } : {}]}>
                    {Math.round((item.val || 0) * servings)}
                  </Text>
                  <Text style={s.nutLbl}>{item.label}</Text>
                </View>
              ))}
            </View>

            <Text style={s.editLabel}>Editar valores (si es necesario):</Text>

            <View style={s.editGrid}>
              {[
                { key: 'calories', label: 'Calorías' },
                { key: 'protein', label: 'Proteína (g)' },
                { key: 'carbs', label: 'Carbos (g)' },
                { key: 'fat', label: 'Grasa (g)' },
                { key: 'fiber', label: 'Fibra (g)' },
                { key: 'sugar', label: 'Azúcar (g)' },
              ].map((item) => (
                <View key={item.key} style={s.editField}>
                  <Text style={s.editFieldLabel}>{item.label}</Text>
                  <TextInput
                    style={s.editInput}
                    value={String(editedNutrition[item.key as keyof typeof editedNutrition] || 0)}
                    onChangeText={(v) => setEditedNutrition({
                      ...editedNutrition,
                      [item.key]: parseFloat(v) || 0,
                    })}
                    keyboardType="decimal-pad"
                    placeholderTextColor={C.ter}
                  />
                </View>
              ))}
            </View>

            <View style={s.srvRow}>
              <Text style={s.srvLbl}>Porciones registradas:</Text>
              <TouchableOpacity onPress={() => setServings(Math.max(0.5, servings - 0.5))} style={s.srvBtn}>
                <Ionicons name="remove" size={18} color={C.bone} />
              </TouchableOpacity>
              <Text style={s.srvVal}>{servings}</Text>
              <TouchableOpacity onPress={() => setServings(servings + 0.5)} style={s.srvBtn}>
                <Ionicons name="add" size={18} color={C.bone} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.mealTypeSection}>
            <Text style={s.mealTypeLabel}>Tipo de comida:</Text>
            <View style={s.mealTypeGrid}>
              {MEAL_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[s.mealTypeBtn, mealType === opt.id && s.mealTypeBtnActive]}
                  onPress={() => setMealType(opt.id)}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={20}
                    color={mealType === opt.id ? C.bone : C.sec}
                  />
                  <Text style={[s.mealTypeText, mealType === opt.id && s.mealTypeTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={s.btmActs}>
          <TouchableOpacity style={s.retakeBtn} onPress={handleRetakePhoto}>
            <Ionicons name="camera-outline" size={20} color={C.violet} />
            <Text style={s.retakeBtnTxt}>Retomar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.logBtn, loading && s.logBtnDisabled]}
            onPress={handleConfirmAndLog}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.bone} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={C.bone} />
                <Text style={s.logBtnTxt}>Registrar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  ctr: { flex: 1, backgroundColor: C.bg },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 },
  hdrTitle: { fontSize: 18, fontWeight: '700', color: C.bone },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(247,242,234,0.1)', alignItems: 'center', justifyContent: 'center' },
  permCard: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  permTitle: { fontSize: 22, fontWeight: '700', color: C.bone },
  permText: { fontSize: 15, color: C.sec, textAlign: 'center', lineHeight: 22 },
  permBtn: { backgroundColor: C.violet, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  permBtnTxt: { fontSize: 16, fontWeight: '700', color: C.bone },
  ovTop: { flex: 1, backgroundColor: C.overlay },
  ovCenter: { flexDirection: 'row', height: LABEL_SIZE },
  ovSide: { flex: 1, backgroundColor: C.overlay },
  ovBtm: { flex: 1.2, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', gap: 16 },
  scanHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60 },
  labelArea: { width: LABEL_SIZE, height: LABEL_SIZE, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: C.violet },
  hint: { fontSize: 15, color: C.sec, textAlign: 'center' },
  captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(156,140,255,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.violet },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.violet },
  captureText: { fontSize: 14, fontWeight: '600', color: C.bone },
  scrollContent: { flex: 1, paddingHorizontal: 0 },
  prodCard: { backgroundColor: C.card, marginHorizontal: 16, marginTop: 16, marginBottom: 8, borderRadius: 16, padding: 20, gap: 12 },
  prodName: { fontSize: 20, fontWeight: '700', color: C.bone },
  portionInfo: { fontSize: 13, color: C.sec },
  nutGrid: { flexDirection: 'row', gap: 8, marginTop: 16 },
  nutItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: 'rgba(247,242,234,0.05)', borderWidth: 1, borderColor: 'rgba(247,242,234,0.1)' },
  nutVal: { fontSize: 18, fontWeight: '700', color: C.bone },
  nutLbl: { fontSize: 11, color: C.sec, marginTop: 2 },
  editLabel: { fontSize: 14, fontWeight: '600', color: C.bone, marginTop: 16 },
  editGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  editField: { width: '48%' },
  editFieldLabel: { fontSize: 12, color: C.sec, marginBottom: 6 },
  editInput: { backgroundColor: 'rgba(247,242,234,0.08)', borderWidth: 1, borderColor: 'rgba(156,140,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: C.bone, fontSize: 14 },
  srvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(247,242,234,0.1)' },
  srvLbl: { fontSize: 14, color: C.sec },
  srvBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(156,140,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  srvVal: { fontSize: 20, fontWeight: '700', color: C.bone, minWidth: 36, textAlign: 'center' },
  mealTypeSection: { marginHorizontal: 16, marginVertical: 16, gap: 12 },
  mealTypeLabel: { fontSize: 14, fontWeight: '600', color: C.bone },
  mealTypeGrid: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  mealTypeBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, backgroundColor: 'rgba(247,242,234,0.05)', borderWidth: 1, borderColor: 'rgba(247,242,234,0.1)', alignItems: 'center', gap: 6 },
  mealTypeBtnActive: { backgroundColor: 'rgba(156,140,255,0.2)', borderColor: C.violet },
  mealTypeText: { fontSize: 12, color: C.sec },
  mealTypeTextActive: { color: C.bone, fontWeight: '600' },
  btmActs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 34, gap: 12 },
  retakeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: 'rgba(156,140,255,0.3)' },
  retakeBtnTxt: { fontSize: 15, fontWeight: '600', color: C.violet },
  logBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: C.violet },
  logBtnDisabled: { opacity: 0.6 },
  logBtnTxt: { fontSize: 15, fontWeight: '700', color: C.bone },
});
