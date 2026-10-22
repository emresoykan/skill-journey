# Web push sunucusu

Ana ekrana eklenmiş web sitesine (GitHub Pages) günlük rutin hatırlatması gönderen Cloudflare Worker. Telefon uygulaması bunu kullanmaz; orada bildirimler telefonun kendisinde zamanlanır (`src/reminders.native.ts`).

## Nasıl çalışır

- Site, hatırlatıcı açıldığında `POST /sync` ile tarayıcının push aboneliğini, saati, saat dilimini ve bugün kalan rutin sayısını gönderir. Kayıtların kendisi gönderilmez.
- Cron 15 dakikada bir çalışır. Saati gelmiş ve bugün bildirim almamış abonelere bildirim yollar. O günün rutinleri bitmişse göndermez. Uygulama bugün açılmadıysa genel bir mesaj gider.
- `POST /test` anında bir deneme bildirimi yollar. `POST /unsubscribe` aboneliği siler.
- Push servisi 404/410 dönerse ya da abonelik anahtarları bozuksa kayıt silinir.
- Şifreleme `aes128gcm` (RFC 8291), kimlik doğrulama `vapid` (RFC 8292) ile `@block65/webcrypto-web-push` üzerinden yapılır.

Zamanlama mantığı `src/schedule.js` dosyasındadır; testleri kök dizinde `npm test` ile çalışır (`tests/pushSchedule.test.mjs`).

## Kurulum

```bash
cd push-worker
npm install
npx wrangler login
npx wrangler kv namespace create SUBS        # çıkan id'yi wrangler.jsonc'deki KV_NAMESPACE_ID yerine yaz
npx wrangler secret put VAPID_PRIVATE_KEY    # özel VAPID anahtarının "d" değeri
npx wrangler deploy
```

Ardından Worker adresini `src/pushConfig.ts` içindeki `PUSH_URL`'e yaz. Açık VAPID anahtarı hem orada hem `wrangler.jsonc`'de aynı olmalıdır.

Yeni anahtar çifti gerekirse: `npx @pushforge/builder vapid` (çıktıdaki JWK'nin `d` alanı özel anahtardır). Anahtar değişirse mevcut abonelikler geçersizleşir; kullanıcıların hatırlatıcıyı kapatıp açması gerekir.

## Yerelde deneme

`.dev.vars` dosyasına `VAPID_PRIVATE_KEY=...` yazıp `npx wrangler dev --test-scheduled` çalıştır. Cron'u `curl "http://127.0.0.1:8787/__scheduled?cron=*/15+*+*+*+*"` ile tetikleyebilirsin. `.dev.vars` Git'e girmez.
