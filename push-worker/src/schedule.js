// Hatırlatma zamanlamasının saf mantığı: Worker ve testler (npm test) birlikte kullanır.

// Cron 15 dakikada bir çalışır; kaçan bir çalışmada hatırlatma bu pencere içinde yine gönderilir.
export const SEND_WINDOW_MINUTES = 60;
export const MAX_ROUTINES = 50;

// Kaydın saat dilimindeki yerel tarih (YYYY-AA-GG) ve gün içindeki dakika.
export function localParts(now, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

// wait: henüz değil ya da bugün gönderildi · skip: bugünün rutinleri bitti · send: gönder.
export function dueAction(record, now) {
  const { date, minutes } = localParts(now, record.tz);
  if (record.lastSent === date) return { type: 'wait' };
  const target = record.hour * 60 + record.minute;
  if (minutes < target || minutes >= target + SEND_WINDOW_MINUTES) return { type: 'wait' };
  // Uygulama bugün açılmadıysa kalan rutin sayısı bilinmez; o zaman genel mesaj gider.
  const knownToday = record.status?.date === date;
  if (knownToday && record.status.left <= 0) return { type: 'skip', date };
  const body = knownToday
    ? `${record.status.left} rutinin seni bekliyor. Serini koru 🔥`
    : 'Bugünkü rutinlerin seni bekliyor. Serini koru 🔥';
  return { type: 'send', date, body };
}

const isValidTimeZone = timeZone => {
  try { new Intl.DateTimeFormat('en-US', { timeZone }); return true; } catch { return false; }
};

// İstemciden gelen /sync gövdesini doğrular; geçersizse null döner.
export function parseSync(body) {
  const { subscription, hour, minute, tz, status } = body ?? {};
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys;
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || endpoint.length > 1000) return null;
  if (typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string' || keys.p256dh.length > 200 || keys.auth.length > 100) return null;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  if (typeof tz !== 'string' || tz.length > 64 || !isValidTimeZone(tz)) return null;
  const validStatus = typeof status?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(status.date)
    && Number.isInteger(status.left) && status.left >= 0 && status.left <= MAX_ROUTINES;
  return {
    subscription: { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    hour, minute, tz,
    status: validStatus ? { date: status.date, left: status.left } : null,
  };
}
