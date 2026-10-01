import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Entry } from './storage';
import { getChartPoints, type Period } from './chartData';

const teal = '#166B65';
const chartHeight = 150;
const periods: { id: Period; label: string }[] = [
  { id: 'daily', label: 'Günlük' },
  { id: 'weekly', label: 'Haftalık' },
  { id: 'monthly', label: 'Aylık' },
];

export function ProgressChart({ entries }: { entries: Entry[] }) {
  const [period, setPeriod] = useState<Period>('daily');
  const [width, setWidth] = useState(0);
  const points = getChartPoints(entries, period);
  const total = points.reduce((sum, point) => sum + point.xp, 0);
  const max = Math.max(1, ...points.map(point => point.xp));
  const coordinates = points.map((point, index) => ({
    x: 8 + index * Math.max(0, width - 16) / (points.length - 1),
    y: chartHeight - 18 - point.xp / max * (chartHeight - 36),
  }));

  return <View style={s.card}>
    <Text style={s.title}>Gelişim grafiği</Text>
    <View style={s.tabs}>
      {periods.map(option => (
        <Pressable
          key={option.id}
          accessibilityRole="button"
          accessibilityState={{ selected: period === option.id }}
          onPress={() => setPeriod(option.id)}
          style={[s.tab, period === option.id && s.selectedTab]}
        >
          <Text style={[s.tabText, period === option.id && s.selectedTabText]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
    <Text style={s.summary}>Bu dönemde {total} XP</Text>
    <View style={s.chart} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      <View style={[s.grid, { top: 18 }]} />
      <View style={[s.grid, { top: chartHeight / 2 }]} />
      <View style={[s.grid, { top: chartHeight - 18 }]} />
      {width > 0 && coordinates.slice(0, -1).map((start, index) => {
        const end = coordinates[index + 1];
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        return <View key={index} style={[s.segment, {
          width: length,
          left: (start.x + end.x - length) / 2,
          top: (start.y + end.y - 3) / 2,
          transform: [{ rotate: `${angle}rad` }],
        }]} />;
      })}
      {width > 0 && coordinates.map((point, index) => (
        <View key={index} style={[s.dot, { left: point.x - 5, top: point.y - 5 }]} />
      ))}
    </View>
    <View style={s.labels}>
      {points.map(point => <Text key={point.key} style={s.axisLabel}>{point.label}</Text>)}
    </View>
    {total === 0 ? <Text style={s.empty}>Bu dönemde henüz XP kazanılmadı.</Text> : null}
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 21, padding: 18, marginBottom: 26 },
  title: { color: '#182637', fontSize: 20, fontWeight: '800', marginBottom: 14 },
  tabs: { flexDirection: 'row', backgroundColor: '#EFF4F0', borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  selectedTab: { backgroundColor: teal },
  tabText: { color: '#657482', fontSize: 12, fontWeight: '700' },
  selectedTabText: { color: 'white' },
  summary: { color: teal, fontSize: 13, fontWeight: '800', marginTop: 18 },
  chart: { height: chartHeight, position: 'relative', marginTop: 8 },
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#E8EFEB' },
  segment: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: teal },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: teal, borderWidth: 2, borderColor: 'white' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: 2 },
  axisLabel: { flex: 1, color: '#657482', fontSize: 10, textAlign: 'center' },
  empty: { color: '#657482', fontSize: 11, textAlign: 'center', marginTop: 12 },
});
