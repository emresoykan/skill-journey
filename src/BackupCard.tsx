import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BACKUP_KEYS, backupFileName, buildBackup, parseBackup, restorePlan, type Backup, type BackupSummary } from './backup';

const teal = '#166B65';
const LAST_BACKUP_KEY = 'skill-journey:last-backup';
const formatDate = (date: Date) => Number.isFinite(date.getTime())
  ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
  : 'tarihi bilinmiyor';

// Dosyayı iPhone'da paylaşım sayfasıyla (Dosyalar'a kaydet, AirDrop...), desteklemeyen tarayıcıda indirme olarak verir.
async function deliverFile(text: string, name: string) {
  const file = new File([text], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Skill Journey yedeği' });
    return;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pickFile(): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => { const file = input.files?.[0]; if (file) file.text().then(resolve, () => resolve(null)); else resolve(null); };
    input.click();
  });
}

// Kayıtlar yalnız bu tarayıcıda durur; yedek dosyası veri silinirse ya da cihaz değişirse geri dönmeyi sağlar.
export function BackupCard() {
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [pending, setPending] = useState<{ backup: Backup; summary: BackupSummary } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LAST_BACKUP_KEY).then(value => { if (value) setLastBackup(new Date(value)); }).catch(() => {});
  }, []);

  if (Platform.OS !== 'web') return null;

  async function exportBackup() {
    setWorking(true); setError(''); setMessage('');
    try {
      const values = Object.fromEntries(await AsyncStorage.multiGet([...BACKUP_KEYS]));
      const now = new Date();
      await deliverFile(buildBackup(values, now), backupFileName(now));
      await AsyncStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
      setLastBackup(now);
      setMessage('Yedek hazır. Dosyayı güvenli bir yere (ör. Dosyalar › iCloud Drive) kaydet.');
    } catch (cause) {
      // Paylaşım sayfasını kapatmak hata değildir.
      if (!(cause instanceof Error && cause.name === 'AbortError')) setError('Yedek alınamadı. Lütfen tekrar dene.');
    } finally { setWorking(false); }
  }

  async function chooseBackup() {
    setError(''); setMessage('');
    const text = await pickFile();
    if (text === null) return;
    try { setPending(parseBackup(text)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Dosya okunamadı.'); }
  }

  async function restore() {
    if (!pending) return;
    setWorking(true); setError('');
    try {
      const plan = restorePlan(pending.backup);
      await AsyncStorage.multiSet(plan.set);
      await AsyncStorage.multiRemove(plan.remove);
      // Uygulama bütün verileri baştan okusun diye sayfa yenilenir.
      window.location.reload();
    } catch {
      setError('Geri yükleme tamamlanamadı. Lütfen tekrar dene.');
      setWorking(false);
    }
  }

  return <View style={s.card}>
    <Text style={s.title}>💾 Yedekleme</Text>
    <Text style={s.text}>Kayıtların yalnız bu tarayıcıda saklanıyor. Tarayıcı verisi silinirse ya da telefon değişirse yedek dosyasıyla geri dönebilirsin.</Text>
    <Text style={s.last}>{lastBackup ? `Son yedek: ${formatDate(lastBackup)}` : 'Henüz yedek almadın.'}</Text>
    {pending ? <View style={s.confirm}>
      <Text style={s.confirmText}>
        {`${formatDate(pending.summary.exportedAt)} tarihli yedekte ${pending.summary.entries} kayıt ve ${pending.summary.habits} rutin var. Geri yüklersen şu anki kayıtların ve rutinlerin bu yedekteki haliyle değişecek.`}
      </Text>
      <View style={s.actions}>
        <Pressable accessibilityRole="button" disabled={working} onPress={() => setPending(null)}><Text style={s.cancel}>Vazgeç</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={working} onPress={restore}><Text style={s.danger}>Evet, geri yükle</Text></Pressable>
      </View>
    </View> : <View style={s.buttons}>
      <Pressable accessibilityRole="button" disabled={working} onPress={exportBackup} style={[s.primary, working && { opacity: 0.5 }]}><Text style={s.primaryText}>Yedeği indir</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={working} onPress={chooseBackup} style={[s.secondary, working && { opacity: 0.5 }]}><Text style={s.secondaryText}>Yedekten yükle</Text></Pressable>
    </View>}
    {message ? <Text style={s.message}>{message}</Text> : null}
    {error ? <Text style={s.error}>{error}</Text> : null}
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 21, padding: 18, marginBottom: 26 },
  title: { color: '#182637', fontSize: 16, fontWeight: '800' },
  text: { color: '#657482', fontSize: 12, lineHeight: 18, marginTop: 6 },
  last: { color: teal, fontSize: 12, fontWeight: '800', marginTop: 10 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primary: { flex: 1, backgroundColor: teal, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: 'white', fontSize: 13, fontWeight: '800' },
  secondary: { flex: 1, borderColor: '#BEDDD1', borderWidth: 1, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: teal, fontSize: 13, fontWeight: '800' },
  confirm: { backgroundColor: '#FFF5F3', borderRadius: 12, padding: 12, marginTop: 12 },
  confirmText: { color: '#6E3C37', fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 15, marginTop: 8 },
  cancel: { color: '#657482', fontSize: 12, fontWeight: '700', padding: 6 },
  danger: { color: '#A33D3D', fontSize: 12, fontWeight: '800', padding: 6 },
  message: { color: teal, fontSize: 12, lineHeight: 18, marginTop: 10 },
  error: { color: '#B34242', fontSize: 12, lineHeight: 18, marginTop: 10 },
});
