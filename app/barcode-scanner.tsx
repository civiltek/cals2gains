// ============================================
// Cals2Gains - Barcode Scanner Screen
// ============================================
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMealStore } from '../store/mealStore';
import { lookupBarcode } from '../services/foodDatabase';
import { FoodItem } from '../types';

const { width: SW } = Dimensions.get('window');
const SCAN_SIZE = SW * 0.7;
const C = {
  bg: '#17121D', card: '#1E1829', violet: '#9C8CFF', coral: '#FF6A4D',
  bone: '#F7F2EA', sec: 'rgba(247,242,234,0.6)', ter: 'rgba(247,242,234,0.35)',
  overlay: 'rgba(23,18,29,0.7)',
};

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const [perm, requestPerm] = useCameraPermissions();
  const { addMeal } = useMealStore();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);

  const onBarcode = useCallback(async (r: BarcodeScanningResult) => {
    if (scanned || loading) return;
    setScanned(true); setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const found = await lookupBarcode(r.data);
      if (found) { setProduct(found); }
      else {
        Alert.alert('Producto no encontrado',
          `No se encontro ${r.data}. ¿Buscar manualmente?`,
          [{ text: 'Cancelar', onPress: () => setScanned(false) },
           { text: 'Buscar', onPress: () => router.replace('/food-search') }]);
      }
    } catch { Alert.alert('Error', 'No se pudo buscar'); setScanned(false); }
    finally { setLoading(false); }
  }, [scanned, loading]);

  const logProduct = async () => {
    if (!product) return;
    const n = product.nutritionPerServing || product.nutritionPer100g;
    if (!n) return;
    try {
      await addMeal({
        name: product.name, calories: Math.round(n.calories * servings),
        protein: Math.round(n.protein * servings), carbs: Math.round(n.carbs * servings),
        fat: Math.round(n.fat * servings), mealType: 'snack', source: 'manual', photoUri: undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch { Alert.alert('Error', 'No se pudo registrar'); }
  };

  if (!perm) return <View style={s.ctr}><ActivityIndicator color={C.violet} size="large" /></View>;
  if (!perm.granted) return (
    <View style={s.ctr}>
      <View style={s.permCard}>
        <Ionicons name="camera-outline" size={48} color={C.violet} />
        <Text style={s.permTitle}>Acceso a Camara</Text>
        <Text style={s.permText}>Necesitamos la camara para escanear codigos de barras</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPerm}>
          <Text style={s.permBtnTxt}>Permitir Acceso</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[s.permText, { marginTop: 12 }]}>Volver</Text>
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
            <Ionicons name="close" size={24} color={C.bone} />
          </TouchableOpacity>
          <Text style={s.hdrTitle}>Producto Encontrado</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.prodCard}>
          <Text style={s.prodName}>{product.name}</Text>
          {product.brand && <Text style={s.prodBrand}>{product.brand}</Text>}
          {product.barcode && <Text style={s.prodBarcode}>{product.barcode}</Text>}
          <View style={s.nutGrid}>
            {[
              { v: n?.calories || 0, l: 'kcal', c: C.violet },
              { v: n?.protein || 0, l: 'Proteina', c: C.coral, u: 'g' },
              { v: n?.carbs || 0, l: 'Carbos', u: 'g' },
              { v: n?.fat || 0, l: 'Grasa', u: 'g' },
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
            <Text style={s.srvLbl}>Porciones:</Text>
            <TouchableOpacity onPress={() => setServings(Math.max(0.5, servings - 0.5))} style={s.srvBtn}>
              <Ionicons name="remove" size={18} color={C.bone} />
            </TouchableOpacity>
            <Text style={s.srvVal}>{servings}</Text>
            <TouchableOpacity onPress={() => setServings(servings + 0.5)} style={s.srvBtn}>
              <Ionicons name="add" size={18} color={C.bone} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.btmActs}>
          <TouchableOpacity style={s.scanAgain} onPress={() => { setProduct(null); setScanned(false); setServings(1); }}>
            <Ionicons name="scan-outline" size={20} color={C.violet} />
            <Text style={s.scanAgainTxt}>Escanear otro</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.logBtn} onPress={logProduct}>
            <Ionicons name="add-circle" size={20} color={C.bone} />
            <Text style={s.logBtnTxt}>Registrar</Text>
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
              <Ionicons name="close" size={28} color={C.bone} />
            </TouchableOpacity>
            <Text style={s.hdrTitle}>Escanear Codigo</Text>
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
          {loading ? <ActivityIndicator color={C.violet} size="large" /> :
            <Text style={s.hint}>Apunta al codigo de barras del producto</Text>}
          {scanned && !loading && (
            <TouchableOpacity style={s.rescan} onPress={() => setScanned(false)}>
              <Ionicons name="refresh" size={20} color={C.bone} />
              <Text style={s.rescanTxt}>Escanear de nuevo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
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
  ovCenter: { flexDirection: 'row', height: SCAN_SIZE },
  ovSide: { flex: 1, backgroundColor: C.overlay },
  ovBtm: { flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', gap: 16 },
  scanHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60 },
  scanArea: { width: SCAN_SIZE, height: SCAN_SIZE, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: C.violet },
  hint: { fontSize: 15, color: C.sec, textAlign: 'center' },
  rescan: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(156,140,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  rescanTxt: { fontSize: 14, fontWeight: '600', color: C.bone },
  prodCard: { backgroundColor: C.card, marginHorizontal: 16, borderRadius: 16, padding: 20, gap: 8 },
  prodName: { fontSize: 20, fontWeight: '700', color: C.bone },
  prodBrand: { fontSize: 14, color: C.sec },
  prodBarcode: { fontSize: 12, color: C.ter, marginTop: 4 },
  nutGrid: { flexDirection: 'row', gap: 8, marginTop: 16 },
  nutItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: 'rgba(247,242,234,0.05)', borderWidth: 1, borderColor: 'rgba(247,242,234,0.1)' },
  nutVal: { fontSize: 18, fontWeight: '700', color: C.bone },
  nutLbl: { fontSize: 11, color: C.sec, marginTop: 2 },
  srvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 },
  srvLbl: { fontSize: 14, color: C.sec },
  srvBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(156,140,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  srvVal: { fontSize: 20, fontWeight: '700', color: C.bone, minWidth: 36, textAlign: 'center' },
  btmActs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, marginTop: 'auto', paddingBottom: 34, gap: 12 },
  scanAgain: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: 'rgba(156,140,255,0.3)' },
  scanAgainTxt: { fontSize: 15, fontWeight: '600', color: C.violet },
  logBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: C.violet },
  logBtnTxt: { fontSize: 15, fontWeight: '700', color: C.bone },
});
