import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { keyToDate } from './dates';
import { displaySkill } from './skillEngine';
import type { Entry } from './storage';
import { weeklyReview } from './weeklyReview';

const teal = '#166B65';
const range = (start: string, end: string) => {
  const format = (key: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('tr-TR', options).format(keyToDate(key));
  return `${format(start, { day: 'numeric', month: 'short' })} – ${format(end, { day: 'numeric', month: 'short' })}`;
};
const delta = (now: number, before: number) => now === before ? 'geçen haftayla aynı' : `geçen hafta ${before}`;

// Gelişim › Genel: son 7 günün değerlendirmesi. Her satır kayıtlardan hesaplanır; öneriler gerekçesiyle gösterilir.
export function WeeklyReviewCard({ entries, earned, dueReviews }: { entries: Entry[]; earned: Record<string, string>; dueReviews: number }) {
  const review = weeklyReview(entries, new Date(), earned, dueReviews);
  const parts = [
    review.breakdown.moments ? `${review.breakdown.moments} an` : '',
    review.breakdown.habits ? `${review.breakdown.habits} rutin` : '',
    review.breakdown.learnings ? `${review.breakdown.learnings} kavram` : '',
    review.breakdown.reviews ? `${review.breakdown.reviews} tekrar oturumu` : '',
  ].filter(Boolean).join(' · ');

  const section = (title: string, children: ReactNode) => <View style={s.section}>
    <Text style={s.label}>{title}</Text>
    {children}
  </View>;

  return <View style={s.card}>
    <View style={s.head}>
      <Text style={s.title}>📅 Haftalık değerlendirme</Text>
      <Text style={s.range}>{range(review.start, review.end)}</Text>
    </View>
    <View style={s.stats}>
      {[
        [String(review.entries), 'kayıt', delta(review.entries, review.prevEntries)],
        [`${review.activeDays}/7`, 'aktif gün', delta(review.activeDays, review.prevActiveDays)],
        [`+${review.xp}`, 'XP', delta(review.xp, review.prevXp)],
      ].map(([value, label, note]) => <View key={label} style={s.stat} accessibilityLabel={`${value} ${label}, ${note}`}>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
        <Text style={s.statNote}>{note}</Text>
      </View>)}
    </View>
    {parts ? <Text style={s.line}>{parts}</Text> : null}

    {review.topSkills.length ? section('ÇALIŞTIĞIN BECERİLER', <Text style={s.line}>{review.topSkills.map(item => `${displaySkill(item.skill)} +${item.xp}`).join(' · ')}</Text>) : null}
    {review.newSkills.length ? section('YENİ KEŞFETTİKLERİN', review.newSkills.map(item => <Text key={item.skill} style={s.line}>{`✦ ${displaySkill(item.skill)} — “${item.description}”`}</Text>)) : null}
    {review.learned || review.recalled ? section('ÖĞRENME', <Text style={s.line}>{[review.learned ? `${review.learned} yeni kavram` : '', review.recalled ? `tekrarlarda ${review.recalled} kez hatırladın` : ''].filter(Boolean).join(', ')}</Text>) : null}
    {review.depths.length ? section('DENEYİMLERİN DERİNLİĞİ', <Text style={s.line}>{review.depths.map(item => `${item.label} ${item.count}`).join(' · ')}</Text>) : null}
    {review.milestones.length ? section('KİLOMETRE TAŞLARI', review.milestones.map(item => <Text key={item} style={s.milestone}>{`🏁 ${item}`}</Text>)) : null}
    {review.quietDomains.length ? section('BU HAFTA ARA VERDİĞİN ALANLAR', <Text style={s.line}>{review.quietDomains.map(item => `${item.domain} (önceki 4 haftada ${item.earlier} kayıt)`).join(' · ')}</Text>) : null}
    {review.suggestions.length ? section('SIRADAKİ ADIMLAR', review.suggestions.map(item => <View key={item.text} style={s.suggestion}>
      <Text style={s.suggestionText}>{`→ ${item.text}`}</Text>
      <Text style={s.reason}>{`Neden: ${item.reason}`}</Text>
    </View>)) : null}
    <Text style={s.note}>Kayıtlarına dayalı istatistiktir; yapay zekâ kullanılmaz.</Text>
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 21, padding: 18, marginBottom: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { color: '#182637', fontSize: 17, fontWeight: '800', flexShrink: 1 },
  range: { color: '#657482', fontSize: 12, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: { flex: 1, minWidth: 0, backgroundColor: '#F4FAF7', borderRadius: 14, padding: 10 },
  statValue: { color: '#182637', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#3D4B58', fontSize: 11, fontWeight: '800' },
  statNote: { color: '#8A969E', fontSize: 10, marginTop: 2 },
  section: { marginTop: 14 },
  label: { color: '#657482', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  line: { color: '#182637', fontSize: 13, lineHeight: 19, marginTop: 4 },
  milestone: { color: '#664708', fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 4 },
  suggestion: { marginTop: 6 },
  suggestionText: { color: teal, fontSize: 13, fontWeight: '800', lineHeight: 19 },
  reason: { color: '#657482', fontSize: 11, lineHeight: 16, marginTop: 1 },
  note: { color: '#9AA6A8', fontSize: 10, marginTop: 14 },
});
