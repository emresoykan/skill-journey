// Takvim günü hesapları. Kayıt hangi saat diliminde yazıldıysa o günün kaydıdır: İstanbul'da
// 23:30'da yazılan kayıt, telefon sonradan başka bir saat dilimine geçse de o günde kalır.
// Gün anahtarı "YYYY-MM-DD" biçimindedir; metin olarak sıralanabilir.

export const pad = (value: number) => String(value).padStart(2, '0');
// Cihazın yerel saatine göre gün.
export const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const deviceTz = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
})();
const formatters = new Map<string, Intl.DateTimeFormat>();

// Verilen saat dilimindeki gün. Saat dilimi yoksa, cihazınkiyle aynıysa ya da tanınmıyorsa yerel gün.
export function dayKeyIn(date: Date, tz?: string): string {
  if (!tz || tz === deviceTz || !Number.isFinite(date.getTime())) return dayKey(date);
  try {
    let format = formatters.get(tz);
    if (!format) {
      format = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      formatters.set(tz, format);
    }
    const parts = Object.fromEntries(format.formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    return dayKey(date);
  }
}

// Kaydın günü: yazıldığı saat dilimine göre (eski kayıtlarda tz yoktur, cihazın yerel günü).
export const entryDay = (item: { createdAt: string; tz?: string }) => dayKeyIn(new Date(item.createdAt), item.tz);
export const isValidDate = (iso: string) => Number.isFinite(new Date(iso).getTime());

// Gün anahtarını yerel gece yarısına çevirir (etiket ve hafta/ay hesabı için).
export function keyToDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}
export const addDaysToKey = (key: string, days: number) => {
  const date = keyToDate(key);
  return dayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
};
// İki gün arasındaki takvim günü farkı (b − a). Yaz saati geçişinden etkilenmez.
export function daysBetweenKeys(a: string, b: string): number {
  const utc = (key: string) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}
