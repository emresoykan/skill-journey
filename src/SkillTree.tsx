import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { toNumber } from './game';
import { buildSkillTree, nodeEvidence, type DomainKey, type TreeNode } from './skillTree';
import type { Entry } from './storage';
import { useReducedMotion } from './useReducedMotion';

const teal = '#166B65';
const gold = '#F5C45A';
const line = '#C9D9D2';
const EVIDENCE_PREVIEW = 5;
const shortDate = (iso: string) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

// Gelişim › Beceriler › Ağaç: alan seçilir, alanın becerileri üst/alt ilişkisiyle bağlı düğümler olarak çizilir.
// Üst beceri, alt becerilerinin XP'sini de toplar. Keşfedilmemiş beceriler soluk ve kilitli görünür.
// Düğüme dokununca o dalın kanıt kayıtları açılır. Dikey yerleşim telefon genişliğine sığar; yakınlaştırma gerekmez.
export function SkillTree({ entries }: { entries: Entry[] }) {
  const trees = buildSkillTree(entries);
  const busiest = [...trees].sort((a, b) => b.totalXp - a.totalXp)[0];
  const [domain, setDomain] = useState<DomainKey>(busiest?.totalXp ? busiest.key : 'career');
  const [open, setOpen] = useState<string | null>(null);
  const tree = trees.find(item => item.key === domain) ?? trees[0];

  return <View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.domains} accessibilityRole="tablist">
      {trees.map(item => {
        const selected = item.key === tree.key;
        return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected }} aria-selected={selected}
          accessibilityLabel={`${item.name}: ${item.discovered}/${item.total} beceri keşfedildi`}
          onPress={() => { setDomain(item.key); setOpen(null); }} style={[s.domain, selected && s.domainOn]}>
          <Text style={[s.domainName, selected && s.domainNameOn]}>{item.name}</Text>
          <Text style={[s.domainCount, selected && s.domainNameOn]}>{`${item.discovered}/${item.total}`}</Text>
        </Pressable>;
      })}
    </ScrollView>

    <View style={s.card}>
      <Text style={s.title}>{tree.name}</Text>
      <Text style={s.sub}>{`${tree.totalXp} XP · ${tree.discovered}/${tree.total} beceri keşfedildi`}</Text>
      <View style={s.track}><View style={[s.fill, { width: `${tree.total ? tree.discovered / tree.total * 100 : 0}%` }]} /></View>
      <View style={s.nodes}>
        {tree.nodes.map((node, index) => <Branch key={node.id} node={node} depth={0} last={index === tree.nodes.length - 1} entries={entries} open={open} onToggle={id => setOpen(open === id ? null : id)} />)}
      </View>
      <Text style={s.note}>{`Üst beceri, alt becerilerinin XP'sini de içerir. Seviye her 100 XP'de bir artar.`}</Text>
    </View>
  </View>;
}

type BranchProps = { node: TreeNode; depth: number; last: boolean; entries: Entry[]; open: string | null; onToggle: (id: string) => void };

// Bir düğüm ve alt dalı. Sol taraftaki çizgiler üst beceriye bağlar: son kardeşte çizgi dirsekte biter.
function Branch({ node, depth, last, entries, open, onToggle }: BranchProps) {
  const expanded = open === node.id;
  return <View style={depth ? s.child : null}>
    {depth ? <>
      <View style={[s.vline, last ? s.vlineLast : s.vlineFull]} />
      <View style={s.hline} />
    </> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
      accessibilityLabel={node.discovered ? `${node.name}, seviye ${node.level}, ${node.totalXp} XP, ${node.count} kayıt` : `${node.name}, henüz keşfedilmedi`}
      onPress={() => onToggle(node.id)} style={[s.node, !node.discovered && s.nodeLocked, expanded && s.nodeOpen]}>
      <View style={[s.badge, !node.discovered && s.badgeLocked]}>
        <Text style={[s.badgeText, !node.discovered && s.badgeTextLocked]}>{node.discovered ? node.level : '🔒'}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.name, !node.discovered && s.nameLocked]} numberOfLines={2}>{node.name}</Text>
        {node.discovered ? <>
          <Text style={s.meta}>{`${node.totalXp} XP · ${node.count} kayıt${node.children.length && node.ownXp !== node.totalXp ? ` · kendisi ${node.ownXp} XP` : ''}`}</Text>
          <View style={s.nodeTrack}><View style={[s.nodeFill, { width: `${node.progress * 100}%` }]} /></View>
          <Text style={s.next}>{`Seviye ${toNumber(node.level + 1)} ${node.toNext} XP`}</Text>
        </> : <Text style={s.meta}>Henüz keşfedilmedi</Text>}
      </View>
    </Pressable>
    {expanded ? <Evidence node={node} entries={entries} /> : null}
    {node.children.map((child, index) => <Branch key={child.id} node={child} depth={depth + 1} last={index === node.children.length - 1} entries={entries} open={open} onToggle={onToggle} />)}
  </View>;
}

// Dalın kanıt kayıtları: kaydın tarihi, metni ve bu daldan gelen XP. Keşfedilmemiş beceride nasıl açılacağı yazılır.
function Evidence({ node, entries }: { node: TreeNode; entries: Entry[] }) {
  const reduced = useReducedMotion();
  const [all, setAll] = useState(false);
  const [fade] = useState(() => new Animated.Value(reduced ? 1 : 0));
  useEffect(() => {
    if (reduced) { fade.setValue(1); return; }
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  }, [fade, reduced]);
  const items = nodeEvidence(entries, node);
  const shown = all ? items : items.slice(0, EVIDENCE_PREVIEW);
  return <Animated.View style={[s.evidence, { opacity: fade }]}>
    {items.length ? <>
      <Text style={s.evidenceTitle}>{`Bu beceriyi kazandıran kayıtlar (${items.length})`}</Text>
      {shown.map(({ entry, xp }) => <View key={entry.id} style={s.evidenceRow}>
        <Text style={s.evidenceDate}>{shortDate(entry.createdAt)}</Text>
        <Text style={s.evidenceText} numberOfLines={3}>{entry.description}</Text>
        <Text style={s.evidenceXp}>+{xp}</Text>
      </View>)}
      {items.length > EVIDENCE_PREVIEW ? <Pressable accessibilityRole="button" onPress={() => setAll(!all)}>
        <Text style={s.more}>{all ? 'Daha az göster' : `Tümünü göster (${items.length})`}</Text>
      </Pressable> : null}
    </> : <Text style={s.hint}>{'Bu beceriyle ilgili bir şey yaptığında açılır. Bir kaydın becerisini “Neden bu beceriler? · Değiştir” ile buna çevirerek de açabilirsin.'}</Text>}
  </Animated.View>;
}

const s = StyleSheet.create({
  domains: { gap: 6, paddingRight: 8, marginBottom: 12 },
  domain: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, borderWidth: 1, borderColor: '#D5DFDA', backgroundColor: 'white', paddingHorizontal: 11, paddingVertical: 7 },
  domainOn: { backgroundColor: teal, borderColor: teal },
  domainName: { color: '#3D4B58', fontSize: 12, fontWeight: '800' },
  domainNameOn: { color: 'white' },
  domainCount: { color: '#8A969E', fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 21, padding: 16, marginBottom: 16 },
  title: { color: '#182637', fontSize: 18, fontWeight: '800' },
  sub: { color: '#657482', fontSize: 12, marginTop: 3 },
  track: { height: 6, borderRadius: 4, backgroundColor: '#E2E9E4', overflow: 'hidden', marginTop: 8 },
  fill: { height: 6, backgroundColor: gold },
  nodes: { marginTop: 14 },
  child: { paddingLeft: 26, position: 'relative' },
  vline: { position: 'absolute', left: 12, top: 0, width: 2, backgroundColor: line },
  vlineFull: { bottom: 0 },
  vlineLast: { height: 30 },
  hline: { position: 'absolute', left: 12, top: 29, width: 14, height: 2, backgroundColor: line },
  node: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: '#BEDDD1', backgroundColor: '#F4FAF7', paddingHorizontal: 10, paddingVertical: 9, marginTop: 8 },
  nodeLocked: { borderStyle: 'dashed', borderColor: '#D5DFDA', backgroundColor: '#FAFBF9' },
  nodeOpen: { borderColor: teal },
  badge: { width: 34, height: 34, borderRadius: 17, backgroundColor: teal, borderWidth: 2, borderColor: gold, alignItems: 'center', justifyContent: 'center' },
  badgeLocked: { backgroundColor: '#EEF2EE', borderColor: '#D5DFDA' },
  badgeText: { color: 'white', fontSize: 14, fontWeight: '800' },
  badgeTextLocked: { fontSize: 13 },
  name: { color: '#182637', fontSize: 14, fontWeight: '800' },
  nameLocked: { color: '#8A969E', fontWeight: '700' },
  meta: { color: '#657482', fontSize: 11, marginTop: 2 },
  nodeTrack: { height: 5, borderRadius: 3, backgroundColor: '#DDECE5', overflow: 'hidden', marginTop: 5 },
  nodeFill: { height: 5, backgroundColor: teal },
  next: { color: '#8A969E', fontSize: 10, marginTop: 3 },
  evidence: { marginTop: 6, marginLeft: 8, borderLeftWidth: 2, borderLeftColor: gold, paddingLeft: 10, paddingVertical: 4 },
  evidenceTitle: { color: '#182637', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  evidenceRow: { flexDirection: 'row', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F1F4F1' },
  evidenceDate: { width: 72, color: '#657482', fontSize: 11 },
  evidenceText: { flex: 1, minWidth: 0, color: '#182637', fontSize: 12, lineHeight: 17 },
  evidenceXp: { color: teal, fontSize: 12, fontWeight: '800' },
  more: { color: teal, fontSize: 12, fontWeight: '800', paddingVertical: 6 },
  hint: { color: '#657482', fontSize: 12, lineHeight: 17 },
  note: { color: '#9AA6A8', fontSize: 11, lineHeight: 16, marginTop: 14 },
});
