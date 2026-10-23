# Skill Journey — Denetim (Faz 0) ve Faz 1 durumu

Tarih: 2026-10-23 · Kapsam: `main` @ `cedeea5` (PR #18 sonrası) · Repo: `emresoykan/skill-journey`
(GitHub Pages: `.github/workflows/pages.yml` → https://emresoykan.github.io/skill-journey/)

Etiketler: **[DOĞRULANDI]** kod okundu ve/veya çalıştırılarak denendi · **[KODDAN]** koddan kesin,
ama tarayıcıda ayrıca denenmedi · **[HİPOTEZ]** doğrulanmadı.

## 1. Mimari özeti [DOĞRULANDI]

- **Yığın:** Expo SDK 57, React Native 0.86, React 19.2, `react-native-web`, `expo-router` 57,
  TypeScript 6. Bağımlılık az; UI kütüphanesi ve analitik SDK'sı yok.
- **Rotalar:** `src/app/_layout.tsx` (sekmeler + `<Head>`). `index.tsx`, `growth.tsx` ve
  `memories.tsx` aynı `JourneyScreen`'i (`src/journey-screen.tsx`) farklı `section` ile açar.
- **Durum:** Tek bir React context (`src/journey-state.tsx`, `useJourneyState`). Tüm listeler bellekte
  tutulur; her değişiklikte ilgili anahtarın tamamı yeniden yazılır (read-modify-write yok).
- **Kalıcılık:** AsyncStorage. Web'de `localStorage` kullanılır ve sunucu yoktur.
  Şema: `docs/DATA_SCHEMA.md`.
- **Analiz:** `src/mockAnalysis.ts` yerel anahtar kelime eşleştirmesi yapar. 20 beceri var,
  yapay 450 ms bekleme konmuş. LLM yok; README bunu açıkça "gerçek yapay zekâ değildir" diye yazıyor.
- **Oyunlaştırma:** `src/game.ts` (seviye, rütbe, seri, görev, rozet), `src/routines.ts`,
  `src/learning.ts` (aralıklı tekrar), `src/todos.ts`.
- **Ses girişi:** Web Speech API (`src/speech.ts`). Desteklenmiyorsa mikrofon düğmesi gizlenir.
- **Bildirim:** Web'de Cloudflare Worker (`push-worker/`, VAPID) kullanılır. Gönderilen veri cihaz
  kimliği, abonelik, saat, saat dilimi ve kalan rutin sayısıdır; kayıt metni gitmez. Telefonda
  `expo-notifications` (`src/reminders.native.ts`) kullanılır.
- **Yayın:** `main`'e push → `npm ci` → `expo export` (`EXPO_BASE_URL=/skill-journey`, statik çıktı)
  → Pages. Ayrıca kullanılmayan bir Cloudflare Pages kontrolü her PR'da çalışıyor.
- **Test:** `node --test` ile saf modüller (`tests/*.test.mjs`, 135 test). UI testi yok; bu
  denetimde Playwright betikleri yerelde, CI dışında çalıştırıldı.

## 2. Doğrulanmış en önemli 10 sorun

| # | Sorun | Yer | Durum |
|---|---|---|---|
| 1 | **Bozuk JSON'da veri kaybı.** `entries:v1` okunamazsa uyarı çıkıyor ama giriş açık kalıyordu; ilk yeni kayıt eski verinin üzerine yazılıyordu. Tarayıcıda tekrarlandı. | `src/storage.ts`, `src/journey-state.tsx` | **Faz 1'de düzeltildi** |
| 2 | **Geçersiz kayıtlar sessizce siliniyordu.** Şekli bozuk tek bir kayıt okumada atlanıyor, sonraki kayıtta kalıcı olarak gidiyordu. Tekrarlandı. | `src/storage.ts` | **Faz 1'de düzeltildi** |
| 3 | **Yükleme bitmeden yazma.** Yapılacaklar listesi kayıtlardan önce yüklenirse, o anda atılan tik `[yeni]` listesini kaydedip eski kayıtları silebiliyordu (yarış koşulu). | `src/TodoItems.tsx`, `src/journey-state.tsx` | **Faz 1'de düzeltildi** (yazma kilidi) |
| 4 | **İki sekme birbirini eziyordu.** Her sekme kendi bellek kopyasını yazdığı için son yazan kazanıyordu. | `src/journey-state.tsx` | **Faz 1'de büyük ölçüde düzeltildi** (bkz. §8) |
| 5 | **Sınıflandırma alana özgü değil.** "Today I created and reviewed a cash flow forecast…" → yalnız *Creativity* ("created" ⇒ `create`). "Nakit akış tahminini hazırladım…" → yalnız *Productivity*. "Kredi faiz riskini analiz ettim" → *Self Awareness* (eşleşme yok). Kanıt, güven skoru ve kullanıcı onayı yok. | `src/mockAnalysis.ts` | Faz 2 |
| 6 | **XP kasılabiliyor.** Becerilerden alakasız kelimeler sıralanınca tek kayıt 54 XP (3×18) alıyor. Uzunluk bonusu var (her 8 kelimeye +1, en fazla +4). Günlük sınır yok; yalnız aynı gün birebir aynı metin engelleniyor. | `src/mockAnalysis.ts` | Faz 2 |
| 7 | **Saat dilimi saklanmıyor.** `createdAt` UTC tutuluyor, gün hesabı cihazın o anki yerel saatine göre yapılıyor. Başka saat dilimine geçince geçmiş günler, seriler ve tekrar günleri kayabilir. | `src/game.ts`, `src/learning.ts`, `src/storage.ts` | Faz 2 (şema) |
| 8 | **Rozetler ve seri saklanmıyor, her seferinde yeniden hesaplanıyor.** Kayıt silinince rozet kilitleniyor; yeniden kazanınca "yeni rozet" kutlaması tekrar çıkıyor. | `src/game.ts` (`badgeProgress`, `newlyUnlocked`) | Faz 2/5 |
| 9 | **React #418 hydration hatası** (`/`, `/memories`). Statik HTML ile istemci ilk render'ı uyuşmuyor; tarayıcı konsolunda görülüyor. | statik export + tarih/yerel veri bağımlı render | Açık |
| 10 | **Lint hatası:** `import/no-unresolved 'expo-notifications'`. `npx expo lint` her çalıştırmada 1 hata veriyor. | `src/reminders.native.ts` | Açık (zararsız ama CI'ya lint eklemeyi engelliyor) |

Ek bulgular [KODDAN]:

- Düzenlemede görev bonusu (`bonusXp`) korunuyor. Düzenleme görevin becerisini kaldırsa bile
  bonus kalıyor (`saveEdit`).
- Seviye doğrusal: her 100 XP bir seviye (`LEVEL_XP`). Beceri seviyesi de aynı formülle hesaplanıyor;
  "Uzmanlık" rozeti tek beceride 200 XP'ye denk geliyor. Bu, uzmanlık iddiası için zayıf.
- Kullanıcıya görünen bütün metinler Türkçe ve koda gömülü. Tarih biçimi `tr-TR` sabit; i18n katmanı yok.
- `prefers-reduced-motion` desteği yok (konfeti, sayaç animasyonu). Karanlık mod yok.
- Rozet adları `numberOfLines={1}` ile kesiliyor (`src/Badges.tsx`). Görsel olarak ölçülmedi [HİPOTEZ].
- Geri yükleme, yedekte olmayan anahtarları siler. Yapılacaklardan önce alınmış bir yedek geri
  yüklenirse bugünkü yapılacaklar gider. Bu tasarım gereği; onay metni Faz 1'de netleştirildi.

## 3. En riskli veri bütünlüğü sorunları

1. **Tek kopya, tek tarayıcı.** Bütün geçmiş `localStorage`'da duruyor. Safari/iOS kullanılmayan
   site verisini temizleyebilir [HİPOTEZ: ITP'nin 7 günlük kuralı Ana Ekran uygulamalarında
   farklı işler]. Ana Ekran uygulaması ile Safari sekmesi ayrı depolama kullanabilir.
   Bugünkü tek güvence elle alınan yedek dosyası.
2. **Atomik olmayan çoklu yazma.** Yapılacak tamamlama `entries` ve ardından `todos` yazar; ikinci
   yazma düşerse iş açık kalır. Aynı gün tekrar tamamlanması engellendiği için çift XP oluşmaz
   [KODDAN]. Yine de tutarlılık işlem (transaction) ile sağlanmıyor.
3. **Şema sürümü / göç altyapısı yok.** Her anahtar `:v1`. Göç mekanizması yok; eski biçimler
   okuma sırasında yerinde onarılıyor.
4. **Depolama kotası.** Yaklaşık 5 MB sınır var. Kayıt başına ~300–600 bayt ile yıllarca yeter
   [TAHMİN]. Kota aşılırsa yazma hata verir ve UI "kaydedilemedi" der; veri silinmez [KODDAN].

## 4. XP hesabı — mevcut kesin davranış [KODDAN + testler]

| Olay | Beceri XP'si | Toplam XP'ye ek |
|---|---|---|
| Serbest kayıt | Eşleşen en fazla 3 kural; her biri `min(18, 8 + 3×eşleşen_kök + min(4, ⌊kelime/8⌋))`. Eşleşme yoksa *Self Awareness* 10. | — |
| Günlük görev | — | O gün görev becerisini içeren ilk kayda +20 (`bonusXp`) |
| Rutin tiki | rutinin becerisine 10 (`HABIT_XP`) | — |
| Öğrenilen kavram | *Learning* 12 (`LEARN_XP`) | — |
| Tekrar | Hatırlanan her kavram için *Learning* +4. Günün tek "tekrar" kaydında toplanır. | — |
| Düzenleme | Yeniden analiz yapılır; XP eskisini **aşamaz** (`capAwards`), düşebilir. | `bonusXp` korunur |
| Beceri düzeltme | XP bir beceriden ötekine taşınır; toplam değişmez | — |
| Silme | Kaydın XP'si toplamdan düşer (toplam kayıtlardan türetilir) | bonus da düşer |

- Toplam seviye: `⌊XP/100⌋ + 1`.
- Rütbeler: 1 Çaylak, 3 Kaşif, 5 Maceracı, 8 Usta, 12 Bilge, 20 Efsane.
- Seri, kayıt olan yerel günlerden hesaplanır. Bugün kayıt yoksa dünden geriye sayılır; ceza yok.

## 5. Sınıflandırma — mevcut uygulama [KODDAN + çalıştırıldı]

- 19 kural, her birinde Türkçe/İngilizce kök listesi var. Kelime başı (`startsWith`) eşleşmesi
  yapılıyor. `falseFriends` listesi yanlış eşleşmeleri ayıklıyor (ör. `koş` ≠ `koşul`).
- Sıralama: eşleşen kök sayısı, ardından "belirli alan" (Müzik, Finans…), ardından kural sırası.
- Hiyerarşi (üst kategori), güven skoru, kanıt (metinden alıntı), "yaptı / öğrendi" ayrımı yok.
  Kullanıcı özel beceri ekleyemiyor. `reason` alanı kurala bağlı sabit bir cümle.
- Kullanıcı sonradan beceriyi değiştirebiliyor (`SkillEvidence` → `correctAward`). Ama öneriyi
  kaydetmeden önce kabul ya da ret akışı yok.

## 6. Önceliklendirilmiş uygulama planı

| Faz | İş | Neden önce |
|---|---|---|
| **1 (bu PR)** | Veri kaybı düzeltmeleri, karantina, yazma kilidi, sekmeler arası yenileme, testler, şema belgesi | Geri alınamaz kayıp riski |
| 1b | #418 hydration, lint hatası, yedek hatırlatması (ör. 14 gün yedek alınmadıysa nazik uyarı) | Hızlı, düşük risk |
| 2 | Beceri kataloğu (hiyerarşi, tr/en ad), açıklanabilir öneri (beceri, üst kategori, derinlik, güven, kanıt), kabul/ret/düzenleme, XP defteri, günlük üst sınır, saat dilimi alanı, şema v2 + göç | Ürünün asıl farkı. Şema değişikliği burada tek seferde yapılmalı |
| 3 | Bugün / Gelişim / Anılar bilgi hiyerarşisi, filtreler | Faz 2 verisine dayanır |
| 4 | Görsel beceri ağacı + erişilebilir liste görünümü | Katalog hiyerarşisi gerekir |
| 5 | Haftalık değerlendirme (önce deterministik istatistik), tekrar kartı genişletme, kilometre taşları | Defter ve katalog gerekir |
| 6 | i18n, gizlilik metni, isteğe bağlı bulut eşitleme (Supabase vb.), dağıtım belgeleri | Onay ve maliyet kararı gerekir |

**Sizden karar gereken noktalar (Faz 2 başlamadan):**

1. **AI analizi.** Seçenekler: (a) yalnız geliştirilmiş yerel kurallar (ücretsiz, gizli);
   (b) mevcut Cloudflare Worker üzerinden bir LLM API'si. Bunun maliyeti var ve kayıt metni üçüncü
   tarafa gider; açık rıza gerekir.
2. **Mevcut XP.** Yeni ekonomi mevcut toplamı değiştirecek mi (geriye dönük yeniden hesap),
   yoksa eski kayıtlar bugünkü XP'leriyle mi kalacak?
3. **İngilizce arayüz** önceliği.

## 7. Önerilen veri modeli (Faz 2 — taslak, henüz uygulanmadı)

```ts
type SkillDef = { id: string; name: { tr: string; en: string }; parentId?: string; domain: Domain; custom?: true };
type Depth = 'exposure' | 'learned' | 'practiced' | 'applied' | 'produced' | 'taught' | 'mastery';
type Suggestion = { skillId: string; depth: Depth; confidence: number; evidence: string; rationale: string; engine: 'rules@2' | `llm:${string}` };
type EntryV2 = {
  id: string; createdAt: string; tz: string; localDay: string;   // gün, kayıt anındaki saat dilimiyle sabitlenir
  text: string; kind: 'moment' | 'habit' | 'learning' | 'review' | 'todo';
  refs?: { habitId?: string; todoId?: string };
  suggestions: Suggestion[];                                      // motorun önerdiği, değişmez
  skills: { skillId: string; depth: Depth; source: 'accepted' | 'edited' | 'manual' }[]; // kullanıcının onayladığı
  rulesVersion: number;                                           // XP bu sürümle hesaplandı
};
// XP saklanmaz; (EntryV2, rulesVersion) → XpEvent[] saf fonksiyonla türetilir.
// Böylece silme ve düzenleme kendiliğinden tutarlı olur, testler deterministik kalır.
type XpEvent = { entryId: string; skillId?: string; amount: number; reason: 'experience' | 'quest' | 'habit' | 'learning' | 'review' | 'daily-cap' };
```

- Göç: `skill-journey:meta` → `{ schemaVersion }`. Saf `migrateV1toV2` fonksiyonu testlerle
  korunur. Göçten önce v1 anahtarları olduğu gibi `…:v1` adlarıyla bırakılır; v1 silinmez, yeni
  veri `…:v2`'ye yazılır.

## 8. Faz 1'de yapılanlar

- `src/storageSafety.ts` (yeni, saf): `parseEntries` geçerli ve geçersiz kayıtları ayırır;
  `splitArray` ve `splitRecord` aynı işi diğer anahtarlar için yapar.
- `src/backup.ts`: karantina yardımcıları; geri yükleme karantinayı silmez, birleştirir.
- `src/storage.ts`: bozuk JSON ve geçersiz ögeler `skill-journey:quarantine:v1`'e ayrılır.
  Karantinaya yazılamazsa okuma başarısız sayılır.
- `src/journey-state.tsx`:
  - yüklenmemiş ya da yüklenemeyen anahtara yazma reddedilir (`guarded`);
  - web'de `storage` olayıyla sekmeler arası yeniden okuma yapılır;
  - yükleme hatası mesajı "verilerin silinmedi" diyor.
- `src/TodoItems.tsx`: yükleme sürerken liste gösterilmez.
- `src/BackupCard.tsx`: karantina varsa uyarı gösterir; geri yükleme onay metni neyin değişeceğini
  tam söyler.
- Testler: `tests/storageSafety.test.mjs` (yeni, 6 test); `tests/backup.test.mjs` güncellendi.
- Tarayıcıda denendi (Pages derlemesi, 390 px):
  - bozuk JSON → eski kayıt karantinada, yeniden açılışta çoğalmıyor;
  - geçersiz kayıt karantinada, sağlam kayıt yerinde;
  - Gelişim'de uyarı görünüyor;
  - iki sekmede ayrı kayıt → ikisi de duruyor;
  - yedekle/geri yükle, yapılacaklar ve mod hatırlama akışları bozulmadı.

**Kalan sınırlamalar:**

- Sekmeler arası yenileme, iki sekmenin *aynı anda* (milisaniyeler içinde) yazmasını engellemez.
  Bunun için yazmadan önce yeniden okuma gerekir (Faz 2 şema işiyle birlikte).
- Karantinadaki veriyi uygulama içinden kurtarma ekranı yok. Veri yedek dosyasında ham olarak duruyor.
