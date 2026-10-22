// Skill Journey web push sunucusu (Cloudflare Worker).
// Ana ekrana eklenmiş web sitesi buraya abonelik ve hatırlatma saatini gönderir;
// cron 15 dakikada bir saati gelenlere bildirim yollar. Kayıtların kendisi sunucuya gelmez,
// yalnız bugün kaç rutinin kaldığı bilgisi gelir.
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { dueAction, parseSync } from './schedule.js';

const validId = id => typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id);

function corsHeaders(request, env) {
  const origin = request.headers.get('origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map(value => value.trim());
  if (!allowed.includes(origin)) return null;
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' };
}

const json = (data, status, cors) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...cors } });

// Dönüş: push servisinin HTTP durumu; 'invalid' = abonelik anahtarları bozuk; 0 = ağ hatası.
async function sendPush(env, record, title, body) {
  let payload;
  try {
    // aes128gcm (RFC 8291) + vapid (RFC 8292): Apple'ın push servisi de bunları kabul eder.
    payload = await buildPushPayload(
      { data: { title, body, icon: env.ICON_URL, tag: 'routine-reminder', url: env.APP_URL }, options: { ttl: 3600, urgency: 'normal' } },
      { ...record.subscription, expirationTime: null },
      { subject: env.APP_URL, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY },
    );
  } catch {
    return 'invalid';
  }
  try {
    const response = await fetch(record.subscription.endpoint, payload);
    return response.status;
  } catch {
    return 0;
  }
}

// 404/410: kullanıcı aboneliği iptal etti ya da uygulamayı sildi; bozuk anahtar da hiç düzelmez. Kaydı temizle.
const isGone = status => status === 'invalid' || status === 404 || status === 410;
const isSent = status => typeof status === 'number' && status >= 200 && status < 300;

async function runReminders(env, now) {
  let cursor;
  do {
    const page = await env.SUBS.list({ prefix: 'sub:', cursor });
    for (const { name } of page.keys) {
      const record = await env.SUBS.get(name, 'json');
      if (!record) continue;
      const action = dueAction(record, now);
      if (action.type === 'wait') continue;
      if (action.type === 'send') {
        const status = await sendPush(env, record, 'Rutin zamanı', action.body);
        if (isGone(status)) { await env.SUBS.delete(name); continue; }
        // Geçici hata: lastSent yazılmaz, pencere kapanana kadar sonraki cron tekrar dener.
        if (!isSent(status)) continue;
      }
      await env.SUBS.put(name, JSON.stringify({ ...record, lastSent: action.date }));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (!cors) return new Response('forbidden', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'method' }, 405, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'json' }, 400, cors); }
    if (!validId(body?.id)) return json({ error: 'id' }, 400, cors);
    const key = `sub:${body.id}`;
    const path = new URL(request.url).pathname;

    if (path === '/sync') {
      const next = parseSync(body);
      if (!next) return json({ error: 'invalid' }, 400, cors);
      const previous = await env.SUBS.get(key, 'json');
      const record = { ...next, lastSent: previous?.lastSent ?? null };
      // KV yazma kotası için değişmeyen kayıt yeniden yazılmaz.
      if (JSON.stringify(record) !== JSON.stringify(previous)) await env.SUBS.put(key, JSON.stringify(record));
      return json({ ok: true }, 200, cors);
    }
    if (path === '/unsubscribe') {
      await env.SUBS.delete(key);
      return json({ ok: true }, 200, cors);
    }
    if (path === '/test') {
      const record = await env.SUBS.get(key, 'json');
      if (!record) return json({ error: 'not-found' }, 404, cors);
      const status = await sendPush(env, record, 'Skill Journey', 'Bildirimler çalışıyor 🎉 Rutin hatırlatmaların böyle gelecek.');
      if (isGone(status)) await env.SUBS.delete(key);
      return json({ ok: isSent(status), status }, 200, cors);
    }
    return json({ error: 'not-found' }, 404, cors);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runReminders(env, new Date(controller.scheduledTime)));
  },
};
