// Yedek dosyasının saf mantığı: hangi veriler alınır, dosya nasıl kurulur ve okunur.
// Platform kodu içermez; npm test doğrudan çalıştırabilir.

// Yedeğe giren saklama anahtarları. Bildirim aboneliği (push-id) cihaza özgü olduğu için yedeğe girmez.
export const BACKUP_KEYS = [
  'skill-journey:entries:v1',
  'skill-journey:habits:v1',
  'skill-journey:habit-counts:v1',
  'skill-journey:reviews:v1',
  'skill-journey:reminder:v1',
  'skill-journey:sound:v1',
] as const;

const FORMAT = 'skill-journey-backup';
const VERSION = 1;

export type BackupValues = Partial<Record<(typeof BACKUP_KEYS)[number], string>>;
export type Backup = { format: typeof FORMAT; version: number; exportedAt: string; data: BackupValues };
export type BackupSummary = { exportedAt: Date; entries: number; habits: number };

export function buildBackup(stored: Record<string, string | null>, now = new Date()): string {
  const data: BackupValues = {};
  for (const key of BACKUP_KEYS) {
    const value = stored[key];
    if (typeof value === 'string') data[key] = value;
  }
  const backup: Backup = { format: FORMAT, version: VERSION, exportedAt: now.toISOString(), data };
  return JSON.stringify(backup);
}

// "skill-journey-yedek-2026-10-23.json"
export const backupFileName = (now = new Date()) =>
  `skill-journey-yedek-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.json`;

const countArray = (value: string | undefined) => {
  if (!value) return 0;
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.length : 0; } catch { return 0; }
};

// Dosyayı okur ve doğrular. Geçersizse kullanıcıya gösterilecek Türkçe bir hata fırlatır.
export function parseBackup(text: string): { backup: Backup; summary: BackupSummary } {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('Bu dosya okunamadı. Skill Journey yedeği olduğundan emin ol.'); }
  const candidate = parsed as Partial<Backup> | null;
  if (!candidate || typeof candidate !== 'object' || candidate.format !== FORMAT || typeof candidate.data !== 'object' || candidate.data === null) {
    throw new Error('Bu dosya bir Skill Journey yedeği değil.');
  }
  if (typeof candidate.version !== 'number' || candidate.version > VERSION) {
    throw new Error('Bu yedek uygulamanın daha yeni bir sürümüyle alınmış. Önce uygulamayı güncelle.');
  }
  const data: BackupValues = {};
  for (const key of BACKUP_KEYS) {
    const value = (candidate.data as Record<string, unknown>)[key];
    if (typeof value === 'string') data[key] = value;
  }
  // Kayıtlar yedeğin asıl içeriği; bozuksa geri yükleme mevcut verileri silmesin.
  const entries = data['skill-journey:entries:v1'];
  if (entries !== undefined) {
    try { if (!Array.isArray(JSON.parse(entries))) throw new Error(); } catch { throw new Error('Yedekteki kayıtlar bozuk; geri yükleme yapılmadı.'); }
  }
  const exportedAt = new Date(typeof candidate.exportedAt === 'string' ? candidate.exportedAt : '');
  return {
    backup: { format: FORMAT, version: candidate.version, exportedAt: Number.isFinite(exportedAt.getTime()) ? exportedAt.toISOString() : '', data },
    summary: { exportedAt, entries: countArray(entries), habits: countArray(data['skill-journey:habits:v1']) },
  };
}

// Geri yüklemede her anahtar yedekteki haline getirilir: yedekte olmayan anahtar silinir,
// böylece eski ve yeni veriler karışmaz.
export function restorePlan(backup: Backup): { set: [string, string][]; remove: string[] } {
  const set: [string, string][] = [];
  const remove: string[] = [];
  for (const key of BACKUP_KEYS) {
    const value = backup.data[key];
    if (typeof value === 'string') set.push([key, value]); else remove.push(key);
  }
  return { set, remove };
}
