# Skill Journey

Windows üzerinde geliştirilebilen Expo + React Native + TypeScript MVP'si. Aynı kod tabanı Android, iOS ve web için kullanılabilir.

## Çalıştırma

1. [Node.js LTS](https://nodejs.org/) kurulu olmalı.
2. Bu klasörde `npm install` çalıştırın.
3. Web önizlemesi için `npm run web` çalıştırın ve terminaldeki yerel adresi açın.
4. Android için Expo Go yüklü bir telefonla `npm start` sonrası QR kodunu okutun. Telefon ve laptop aynı ağda olmalı. Android Studio emülatörü hazırsa `npm run android` da kullanılabilir.

## MVP kapsamı

- Home ekranında seviye ve toplam XP ilerlemesi
- “What happened today?” deneyim girişi
- `src/mockAnalysis.ts` içinde anahtar sözcüklere dayalı yerel mock analiz
- Skill, XP ve level-up sonucu
- En sık görülen beceriler ve en yeniden eskiye timeline
- `AsyncStorage` ile cihazda kalıcı kayıt

Mock analiz gerçek yapay zekâ değildir. Anahtar sözcük eşleşmesi ve metin uzunluğuna göre sonuç üretir; API anahtarı veya hesap gerekmez. XP her 100 puanda bir seviye artırır.

Eşleşme kuralları `tests/analysis.test.mjs` içindeki örnek cümlelerle sınanır: `npm test` (Node 22.18+ gerekir). Yeni bir kök eklerken alakasız kelimelere takılıyorsa `src/mockAnalysis.ts` içindeki `falseFriends` listesine istisna ekleyin ve örneği teste yazın.

## iOS sonraki adım

Windows üzerinde iOS simülatörü ve yerel Xcode build'i çalışmaz. iOS paketi için ileride [EAS Build](https://docs.expo.dev/build/introduction/) gibi bir bulut build hizmeti veya fiziksel Mac gerekir. Bu MVP'de iOS build ya da yayınlama yapılandırılmadı.

## Web yayını

Kayıtlar yalnız kullanıcının kendi tarayıcısında (AsyncStorage → localStorage) ve adrese bağlı saklanır; cihazlar ve adresler arasında taşınmaz.

### GitHub Pages (asıl adres)

`main` dalına her gönderimde `.github/workflows/pages.yml` web sürümünü derleyip `https://emresoykan.github.io/skill-journey/` adresine yayınlar. İlk kez: repo **Settings → Pages → Source: GitHub Actions**. Alt yol (`/skill-journey`) yalnız bu derlemede `EXPO_BASE_URL` ile verilir (`app.config.js`); `npm run web` ve Cloudflare derlemesi etkilenmez.

### Cloudflare Pages (yedek)

Cloudflare Pages projesi de `main`'den `https://skill-journey.pages.dev` adresine yayınlar. `pages.dev` adresleri bazı Türkiye ağlarında açılmadığı için asıl adres GitHub Pages'tir. Proje ayarları:

- Build command: `npx expo export --platform web`
- Build output directory: `dist`
- Production branch: `main`

Node sürümü `.node-version` dosyasından okunur.
