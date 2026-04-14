// ============================================
// Cals2Gains - Weight Tracker Screen
// ============================================
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useWeightStore } from '../store/weightStore';
import { useColors } from '../store/themeStore';
import { format, subDays, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');

const CHART_W = SW - 64;
const CHART_H = 180;
const CHART_PAD = { top: 20, right: 10, bottom: 30, left: 40 };
const RANGES = [
  { id: '30d', label: '30d', days: 30 },
  { id: '90d', label: '90d', days: 90 },
  { id: '1y', label: '1a', days: 365 },
];

function WeightChart({ entries, days, C, t }: { entries: any[]; days: number; C: any; t: any }) {
  const cutoff = subDays(new Date(), days);
  const filtered = entries.filter((e: any) => isAfter(new Date(e.date), cutoff)).sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  if (filtered.length < 2) return (
    <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.textMuted, fontSize: 14 }}>{t('weightTracker.needMoreEntries')}</Text>
    </View>
  );

  const weights = filtered.map((e: any) => e.weight);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const rangeW = maxW - minW || 1;
  const plotW = CHART_W - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;

  const points = filtered.map((e: any, i: number) => ({
    x: CHART_PAD.left + (i / (filtered.length - 1)) * plotW,
    y: CHART_PAD.top + (1 - (e.weight - minW) / rangeW) * plotH,
    w: e.weight,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const gridLines = 4;

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = CHART_PAD.top + (i / gridLines) * plotH;
        const val = (maxW - (i / gridLines) * rangeW).toFixed(1);
        return (
          <React.Fragment key={i}>
            <Line x1={CHART_PAD.left} y1={y} x2={CHART_W - CHART_PAD.right} y2={y}
              stroke="rgba(247,242,234,0.08)" strokeWidth={1} />
            <SvgText x={CHART_PAD.left - 6} y={y + 4} fill={C.textMuted}
              fontSize={10} textAnchor="end">{val}</SvgText>
          </React.Fragment>
        );
      })}
      <Path d={pathD} stroke={C.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={4} fill={C.primary} stroke={C.background} strokeWidth={2} />
      ))}
    </Svg>
  );
}

export default function WeightTrackerScreen() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { entries: history = [], loadHistory, addEntry, getLatestWeight, getWeightChange, getTrend } = useWeightStore();
  const [weightInput, setWeightInput] = useState('');
  const [range, setRange] = useState('30d');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  const latest = getLatestWeight();
  const change7d = getWeightChange(7);
  const change30d = getWeightChange(30);
  const trend = getTrend();
  const days = RANGES.find(r => r.id === range)?.days || 30;

  const handleAdd = async () => {
    const w = parseFloat(weightInput.replace(',', '.'));
    if (isNaN(w) || w < 20 || w > 300) {
      Alert.alert('Error', t('weightTracker.invalidWeight'));
      return;
    }
    await addEntry(w);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setWeightInput('');
    setShowAdd(false);
  };

  const trendIcon = trend === 'down' ? 'trending-down' : trend === 'up' ? 'trending-up' : 'remove-outline';
  const trendColor = trend === 'down' ? '#4ADE80' : trend === 'up' ? C.accent : C.textSecondary;

  return (
    <ScrollView style={[s.ctr, { backgroundColor: C.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={[s.hdr, { paddingTop: insets.top + 10, zIndex: 10 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.backBtn, { backgroundColor: C.surface, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }]}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.6}
        >
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: C.text }]}>{t('weightTracker.title')}</Text>
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={[s.addBtn, { backgroundColor: C.primary }]}>
          <Ionicons name={showAdd ? 'close' : 'add'} size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Add Weight Form */}
      {showAdd && (
        <View style={[s.addCard, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]}>
          <Text style={[s.addLabel, { color: C.textSecondary }]}>{t('weightTracker.newEntry')}</Text>
          <View style={s.addRow}>
            <TextInput
              style={[s.addInput, { color: C.text, backgroundColor: C.background, borderColor: C.border }]}
              placeholder={t('weightTracker.placeholder')}
              placeholderTextColor={C.textMuted}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={[s.addUnit, { color: C.textSecondary }]}>{t('weightTracker.unit')}</Text>
            <TouchableOpacity style={[s.addSubmit, { backgroundColor: C.primary }]} onPress={handleAdd}>
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Current Weight Card */}
      {latest !== null && (
        <View style={[s.currentCard, { backgroundColor: C.surface }]}>
          <View style={s.currentMain}>
            <Text style={[s.currentWeight, { color: C.text }]}>{latest.toFixed(1)}</Text>
            <Text style={[s.currentUnit, { color: C.textSecondary }]}>{t('weightTracker.unit')}</Text>
            <View style={[s.trendBadge, { backgroundColor: `${trendColor}20` }]}>
              <Ionicons name={trendIcon as any} size={16} color={trendColor} />
            </View>
          </View>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={[s.statLabel, { color: C.textMuted }]}>{t('weightTracker.last7d')}</Text>
              <Text style={[s.statValue, { color: change7d === null ? C.textMuted : change7d < 0 ? '#4ADE80' : change7d > 0 ? C.accent : C.text }]}>
                {change7d !== null ? `${change7d > 0 ? '+' : ''}${change7d.toFixed(1)} kg` : t('weightTracker.noChange')}
              </Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: C.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statLabel, { color: C.textMuted }]}>{t('weightTracker.last30d')}</Text>
              <Text style={[s.statValue, { color: change30d === null ? C.textMuted : change30d < 0 ? '#4ADE80' : change30d > 0 ? C.accent : C.text }]}>
                {change30d !== null ? `${change30d > 0 ? '+' : ''}${change30d.toFixed(1)} kg` : t('weightTracker.noChange')}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Chart */}
      <View style={[s.chartCard, { backgroundColor: C.surface }]}>
        <View style={s.rangeRow}>
          {RANGES.map(r => (
            <TouchableOpacity key={r.id} style={[s.rangeBtn, range === r.id && { backgroundColor: C.primary }]}
              onPress={() => setRange(r.id)}>
              <Text style={[s.rangeTxt, range === r.id && { color: C.text }]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <WeightChart entries={history} days={days} C={C} t={t} />
      </View>

      {/* History */}
      <View style={s.histSection}>
        <Text style={[s.histTitle, { color: C.textSecondary }]}>{t('weightTracker.history')}</Text>
        {history.slice(0, 20).map((entry, i) => (
          <View key={entry.id || i} style={[s.histItem, { backgroundColor: C.surface }]}>
            <View>
              <Text style={[s.histWeight, { color: C.text }]}>{entry.weight.toFixed(1)} kg</Text>
              <Text style={[s.histDate, { color: C.textMuted }]}>
                {format(new Date(entry.date), "d MMM yyyy, HH:mm", { locale: es })}
              </Text>
            </View>
            {i > 0 && (
              <Text style={[s.histDiff, {
                color: entry.weight < history[i - 1].weight ? '#4ADE80' :
                  entry.weight > history[i - 1].weight ? C.accent : C.textSecondary
              }]}>
                {entry.weight < history[i - 1].weight ? '' : '+'}
                {(entry.weight - history[i - 1].weight).toFixed(1)}
              </Text>
            )}
          </View>
        ))}
        {history.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Ionicons name="scale-outline" size={40} color={C.textMuted} />
            <Text style={{ color: C.textMuted, fontSize: 14, marginTop: 8 }}>
              {t('weightTracker.emptyState')}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 }}
              onPress={() => setShowAdd(true)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>{t('weightTracker.addFirst')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  ctr: { flex: 1 },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  backBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addCard: { marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 12 },
  addLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addInput: { flex: 1, fontSize: 24, fontWeight: '700', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  addUnit: { fontSize: 18, fontWeight: '600' },
  addSubmit: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  currentCard: { marginHorizontal: 16, borderRadius: 16, padding: 20, marginBottom: 12 },
  currentMain: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  currentWeight: { fontSize: 42, fontWeight: '800' },
  currentUnit: { fontSize: 20, fontWeight: '600' },
  trendBadge: { marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 16 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statDivider: { width: 1 },
  chartCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12 },
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  rangeBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(247,242,234,0.05)' },
  rangeBtnActive: { },
  rangeTxt: { fontSize: 13, fontWeight: '600' },
  rangeTxtActive: { },
  histSection: { paddingHorizontal: 16, marginTop: 4 },
  histTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  histItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, padding: 14, marginBottom: 6 },
  histWeight: { fontSize: 16, fontWeight: '700' },
  histDate: { fontSize: 12, marginTop: 2 },
  histDiff: { fontSize: 14, fontWeight: '600' },
});
