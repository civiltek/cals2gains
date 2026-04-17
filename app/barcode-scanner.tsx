// ============================================
// Cals2Gains - Barcode Scanner Screen
// ============================================
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import { useMealStore } from '../store/mealStore';
import { useUserStore } from '../store/userStore';
import { useQuotaStore } from '../store/quotaStore';
import { lookupBarcode } from '../services/foodDatabase';
import { FoodItem } from '../types';

const { width: SW } = Dimensions.get('window');
const SCAN_SIZE = SW * 0.7;

function createStyles(C: any) {
  return StyleSheet.create({
    ctr: { flex: 1, backgroundColor: C.background },
    hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 },
    hdrTitle: { fontSize: 18, fontWeight: '700', color: C.text },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.text + '10', alignItems: 'center', justifyContent: 'center' },
    permCard: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
    permTitle: { fontSize: 22, fontWeight: '700', color: C.text },
    permText: { fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 22 },
    permBtn: { backgroundColor: C.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
    permBtnTxt: { fontSize: 16, fontWeight: '700', color: C.text },
    ovTop: { flex: 1, backgroundColor: C.background + 'B3' },
    ovCenter: { flexDirection: 'row', height: SCAN_SIZE },
    ovSide: { flex: 1, backgroundColor: C.background + 'B3' },
    ovBtm: { flex: 1, backgroundColor: C.background + 'B3', alignItems: 'center', justifyContent: 'center', gap: 16 },
    scanHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60 },
    scanArea: { width: SCAN_SIZE, height: SCAN_SIZE, position: 'relative' },
    corner: { position: 'absolute', width: 30, height: 30, borderColor: C.primary },
    hint: { fontSize: 15, color: C.textSecondary, textAlign: 'center' },
    rescan: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary + '20', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    rescanTxt: { fontSize: 14, fontWeight: '600', color: C.text },
    prodCard: { backgroundColor: C.card, marginHorizontal: 16, borderRadius: 16, padding: 20, gap: 8 },
    prodName: { fontSize: 20, fontWeight: '700', color: C.text },
    prodBrand: { fontSize: 14, color: C.textSecondary },
    prodBarcode: { fontSize: 12, color: C.textTertiary, marginTop: 4 },
    nutGrid: { flexDirection: 'row', gap: 8, marginTop: 16 },
    nutItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: C.text + '05', borderWidth: 1, borderColor: C.text + '10' },
    nutVal: { fontSize: 18, fontWeight: '700', color: C.text },
    nutLbl: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
    srvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 },
    srvLbl: { fontSize: 14, color: C.textSecondary },
    srvBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary + '20', alignItems: 'center', justifyContent: 'center' },
    srvVal: { fontSize: 20, fontWeight: '700', color: C.text, minWidth: 36, textAlign: 'center' },
    btmActs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, marginTop: 'auto', paddingBottom: 34, gap: 12 },
    scanAgain: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.primary + '30' },
    scanAgainTxt: { fontSize: 15, fontWeight: '600', color: C.primary },
    logBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: C.primary },
    logBtnTxt: { fontSize: 15, fontWeight: '700', color: C.text },
  });
}

export default function BarcodeScannerScreen() {
  const C = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const [perm, requestPerm] = useCameraPermissions();
  const { addMeal } = useMealStore();
  const user = useUserStore((s) => s.user);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);
  const s = useMemo(() => createStyles(C), [C]);

  // Use ref to prevent race conditions — React state updates are async,
  // so the CameraView can fire onBarcode multiple times before `scanned` updates
  const scanLock = React.useRef(false);

  const onBarcode = useCallback(async (r: BarcodeScanningResult) => {
    if (scanLock.current) return;
    // Free tier: 3 escaneos/día
    const isSub = useUserStore.getState().isSubscriptionActive();
    if (!isSub) {
      const ok = useQuotaStore.getState().consume('barcode');
      if (!ok) {
        Alert.alert(
          t('quota.barcodeExhaustedTitle', 'L\u00edmite alcanzado'),
          t(
            'quota.barcodeExhaustedMsg',
            'La prueba gratuita incluye 3 escaneos de c\u00f3digo de barras al d\u00eda. Suscr\u00edbete para usos ilimitados.'
          ),
          [
            { text: t('common.cancel'), onPress: () => router.back() },
            { text: t('paywall.subscribe'), onPress: () => router.replace('/paywall') },
          ]
        );
        return;
      }
    }
    scanLock.current = true;
    setScanned(true); setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const found = await lookupBarcode(r.data);
      // Double-check: only show "not found" if product is still null
      if (found) {
        setProduct(found);
      } else {
        Alert.alert(t('barcodeScanner.notFound'),
          t('barcodeScanner.notFoundMsg', { barcode: r.data }),
          [{ text: t('common.cancel'), onPress: () => { setScanned(false); scanLock.current = false; } },
           { text: t('barcodeScanner.search'), onPress: () => router.replace('/food-search') }]);
      }
    } catch {
      Alert.alert('Error', t('barcodeScanner.searchFailed'));
      setScanned(false);
      scanLock.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logProduct = async () => {
    if (!product || !user?.uid) return;
    const n = product.nutritionPerServing || product.nutritionPer100g;
    if (!n) return;
    try {
      // Build a clean Meal object — no undefined values (Firestore rejects them)
      const mealData: any = {
        userId: user.uid,
        timestamp: new Date(),
        photoUri: '',
        dishName: product.name || t('barcode.scannedProduct'),
        dishNameEs: product.nameEs || product.name || t('barcode.scannedProduct'),
        dishNameEn: product.nameEn || product.name || 'Scanned product',
        ingredients: [],
        portionDescription: product.brand
          ? `${product.brand} - ${servings} ${t('barcode.portion')}`
          : `${servings} ${t('barcode.portion')}`,
        estimatedWeight: Math.round((product.servingSize || 100) * servings),
        nutrition: {
          calories: Math.round((n.calories || 0) * servings),
          protein: Math.round((n.protein || 0) * servings * 10) / 10,
          carbs: Math.round((n.carbs || 0) * servings * 10) / 10,
          fat: Math.round((n.fat || 0) * servings * 10) / 10,
          fiber: Math.round((n.fiber || 0) * servings * 10) / 10,
        },
        mealType: 'snack' as const,
        aiConfidence: 1.0, // barcode lookup is exact
      };
      await addMeal(mealData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.error('Barcode save error:', e);
      Alert.alert('Error', t('barcodeScanner.logFailed'));
    }
  };

  if (!perm) return <View style={s.ctr}><ActivityIndicator color={C.primary} size="large" /></View>;
  if (!perm.granted) return (
    <View style={s.ctr}>
      <View style={s.permCard}>
        <Ionicons name="camera-outline" size={48} color={C.primary} />
        <Text style={s.permTitle}>{t('barcodeScanner.cameraAccess')}</Text>
        <Text style={s.permText}>{t('barcodeScanner.cameraNeeded')}</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPerm}>
          <Text style={s.permBtnTxt}>{t('barcodeScanner.allowAccess')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[s.permText, { marginTop: 12 }]}>{t('barcodeScanner.goBack')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (product) {
    const n = product.nutritionPerServing || product.nutritionPer100g;
    return (
      <View style={s.ctr}>
        <View style={s.hdr}>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={s.hdrTitle}>{t('barcodeScanner.productFound')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.prodCard}>
          <Text style={s.prodName}>{product.name}</Text>
          {product.brand && <Text style={s.prodBrand}>{product.brand}</Text>}
          {product.barcode && <Text style={s.prodBarcode}>{product.barcode}</Text>}
          <View style={s.nutGrid}>
            {[
              { v: n?.calories || 0, l: 'kcal', c: C.primary },
              { v: n?.protein || 0, l: t('barcodeScanner.protein'), c: C.accent, u: 'g' },
              { v: n?.carbs || 0, l: t('barcodeScanner.carbs'), u: 'g' },
              { v: n?.fat || 0, l: t('barcodeScanner.fat'), u: 'g' },
            ].map((item, i) => (
              <View key={i} style={[s.nutItem, item.c ? { borderColor: item.c } : {}]}>
                <Text style={[s.nutVal, item.c ? { color: item.c } : {}]}>
                  {Math.round(item.v * servings)}{item.u || ''}
                </Text>
                <Text style={s.nutLbl}>{item.l}</Text>
              </View>
            ))}
          </View>
          <View style={s.srvRow}>
            <Text style={s.srvLbl}>{t('barcodeScanner.servings')}</Text>
            <TouchableOpacity onPress={() => setServings(Math.max(0.5, servings - 0.5))} style={s.srvBtn}>
              <Ionicons name="remove" size={18} color={C.text} />
            </TouchableOpacity>
            <Text style={s.srvVal}>{servings}</Text>
            <TouchableOpacity onPress={() => setServings(servings + 0.5)} style={s.srvBtn}>
              <Ionicons name="add" size={18} color={C.text} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.btmActs}>
          <TouchableOpacity style={s.scanAgain} onPress={() => { setProduct(null); setScanned(false); setServings(1); scanLock.current = false; }}>
            <Ionicons name="scan-outline" size={20} color={C.primary} />
            <Text style={s.scanAgainTxt}>{t('barcodeScanner.scanAnother')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.logBtn} onPress={logProduct}>
            <Ionicons name="add-circle" size={20} color={C.text} />
            <Text style={s.logBtnTxt}>{t('barcodeScanner.log')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.ctr}>
      <CameraView style={StyleSheet.absoluteFill} facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13','ean8','upc_a','upc_e','code128','code39'] as any }}
        onBarcodeScanned={scanned ? undefined : onBarcode} />
      <View style={StyleSheet.absoluteFillObject}>
        <View style={s.ovTop}>
          <View style={s.scanHdr}>
            <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
              <Ionicons name="close" size={28} color={C.text} />
            </TouchableOpacity>
            <Text style={s.hdrTitle}>{t('barcodeScanner.scanCode')}</Text>
            <View style={{ width: 44 }} />
          </View>
        </View>
        <View style={s.ovCenter}>
          <View style={s.ovSide} />
          <View style={s.scanArea}>
            <View style={[s.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 }]} />
            <View style={[s.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 }]} />
            <View style={[s.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 }]} />
            <View style={[s.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 }]} />
          </View>
          <View style={s.ovSide} />
        </View>
        <View style={s.ovBtm}>
          {loading ? <ActivityIndicator color={C.primary} size="large" /> :
            <Text style={s.hint}>{t('barcodeScanner.pointHint')}</Text>}
          {scanned && !loading && (
            <TouchableOpacity style={s.rescan} onPress={() => setScanned(false)}>
              <Ionicons name="refresh" size={20} color={C.text} />
              <Text style={s.rescanTxt}>{t('barcodeScanner.scanAgain')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
