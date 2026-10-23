# Veri şeması (şu anki durum)

Tüm veriler cihazda, `@react-native-async-storage/async-storage` ile saklanır. Web'de bu, sitenin
`localStorage` alanıdır (origin: `emresoykan.github.io`; tarayıcı başına yaklaşık 5 MB). Sunucuya
kayıt gitmez. Tek istisna web hatırlatıcısıdır: `push-worker`'a cihaz kimliği, push aboneliği, saat,
saat dilimi ve "bugün kalan rutin sayısı" gider (`src/reminders.ts`). Kayıt metinleri gitmez.

Her anahtarın değeri bir JSON metnidir. Anahtar adındaki `:v1` şema sürümüdür; şu ana kadar
hiçbir anahtar `v2`'ye geçmedi. Alan düzeyindeki eski biçimler okuma sırasında onarılır
(bkz. "Okuma kuralları").

| Anahtar | Biçim | Kaynak | Yedeğe girer |
|---|---|---|---|
| `skill-journey:entries:v1` | `Entry[]` | `src/storage.ts` | evet |
| `skill-journey:habits:v1` | `Habit[]` | `src/storage.ts`, `src/routines.ts` | evet |
| `skill-journey:habit-counts:v1` | `{ [habitId]: { day, count } }` | `src/storage.ts` | evet |
| `skill-journey:todos:v1` | `Todo[]` | `src/todos.ts` | evet |
| `skill-journey:reviews:v1` | `{ [entryId]: { stage, due } }` | `src/learning.ts` | evet |
| `skill-journey:reminder:v1` | `{ enabled, hour, minute }` | `src/reminderStore.ts` | evet |
| `skill-journey:sound:v1` | `"on"` / `"off"` | `src/sounds.ts` | evet |
| `skill-journey:entry-mode:v1` | `"done"` / `"todo"` | `src/TodayLog.tsx` | evet |
| `skill-journey:quarantine:v1` | `QuarantineItem[]` | `src/storage.ts`, `src/backup.ts` | evet (geri yüklemede silinmez, birleştirilir) |
| `skill-journey:last-backup` | ISO tarih | `src/BackupCard.tsx` | hayır |
| `skill-journey:push-id` | UUID | `src/reminders.ts` | hayır (cihaza özgü) |
| `skill-journey:push-synced` | `"1"` | `src/reminders.ts` | hayır |

## Entry (kayıt)

```ts
type SkillAward = { skill: string; xp: number };          // skill: İngilizce iç ad ("Learning")
type Entry = {
  id: string;            // `${Date.now()}-${rastgele5}`
  createdAt: string;     // ISO 8601, UTC ("2026-10-23T18:40:00.000Z"); saat dilimi saklanmaz
  description: string;   // kullanıcının metni (öğrenme kaydında "terim — anlam")
  skill: string;         // ana beceri = awards[0].skill
  xp: number;            // becerilere giden XP toplamı = sum(awards.xp)
  reason: string;        // ana becerinin kural açıklaması (kanıt değil, sabit metin)
  awards: SkillAward[];  // 1–3 beceri
  bonusXp?: number;      // günlük görev bonusu; beceriye değil toplam XP'ye eklenir
  habitId?: string;      // rutin tikiyle oluştuysa
  measures?: { steps?: number; duration?: number; pages?: number };
  learning?: { term: string; meaning: string };
  review?: { count: number }; // günün tekrar kaydı: kaç kavram hatırlandı
};
```

Toplam XP ayrıca saklanmaz; her açılışta `sum(entry.xp + entry.bonusXp)` olarak hesaplanır
(`src/game.ts` → `totalXpOf`). Kayıt silinince XP'si de düşer. Rozetler ve seriler de saklanmaz,
kayıtlardan yeniden hesaplanır.

## Diğerleri

```ts
type Habit = { id; title; icon; skill; createdAt; target?; unit?; goalMinutes?; measures? };
type Todo = { id; title; createdAt; doneAt?; entryId? };   // tamamlanınca entryId ilgili Entry'yi gösterir
type ReviewState = { stage: number; due: 'YYYY-MM-DD' | '' }; // '' = ustalaşıldı
type QuarantineItem = { key: string; at: string; raw: string }; // okunamayan verinin ham metni
```

Gün sınırları (bugün, seri, gruplama, tekrar günü) cihazın o anki yerel saatine göre hesaplanır.

## Okuma kuralları (`src/storage.ts`, `src/storageSafety.ts`)

- Bozuk JSON silinmez. Ham metin `quarantine:v1`'e ayrılır, o anahtar boş sayılır.
- Şekli geçersiz ögeler (ör. `xp` alanı sayı değil) atılmaz. Ham halleriyle karantinaya ayrılır,
  geçerli ögeler normal okunur.
- Aynı veri her açılışta yeniden ayrılmaz (anahtar + ham metin aynıysa tekrar eklenmez).
- Eski biçim onarılır: `awards` alanı olmayan kayıtta `[{ skill, xp }]` üretilir. Eski rutin adı
  "20 dk kitap oku" → "Kitap okuma" olur (`renameLegacyHabit`).
- Bir anahtar okunamazsa (okuma ya da karantinaya yazma hatası), o anahtara yazma reddedilir
  (`src/journey-state.tsx` → `guarded`). Boş sanılan liste diskteki verinin üzerine yazılmaz.
- Web'de başka bir sekme veriyi değiştirirse (`storage` olayı) veriler baştan okunur.

## Yedek dosyası (`src/backup.ts`)

```json
{ "format": "skill-journey-backup", "version": 1, "exportedAt": "ISO", "data": { "<anahtar>": "<JSON metni>" } }
```

Geri yükleme `BACKUP_KEYS` içindeki her anahtarı yedekteki haline getirir: yedekte olmayan anahtar
silinir. Tek istisna karantinadır; cihazdaki ve yedekteki karantina birleştirilir.
