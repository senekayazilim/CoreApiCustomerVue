# 🧪 ONAYLARIM Prime API Demo - Playwright Test Rehberi

Bu dokümantasyon, projenin **Playwright** ile e2e (end-to-end) testlerini çalıştırmak ve yeni testler eklemek için gerekli bilgileri içerir.

> 📚 **Diğer Rehberler:**
> - Cursor AI ile PAdES testi: [CURSOR-PADES-GUIDE.md](./CURSOR-PADES-GUIDE.md)
> - Cursor AI ile CAdES testi: [CURSOR-CADES-GUIDE.md](./CURSOR-CADES-GUIDE.md)

## 📋 İçindekiler

- [Gereksinimler](#gereksinimler)
- [Kurulum](#kurulum)
- [Testleri Çalıştırma](#testleri-çalıştırma)
- [Test Senaryoları](#test-senaryoları)
- [Test Dosyaları](#test-dosyaları)
- [Yeni Test Ekleme](#yeni-test-ekleme)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Gereksinimler

### Yazılım Gereksinimleri

| Gereksinim | Açıklama |
|------------|----------|
| **Node.js** | v18+ |
| **npm** | v9+ |
| **Backend API** | `https://localhost:7294` adresinde çalışır durumda |
| **e-İmza Aracı** | Yüklü ve çalışır durumda |

### Donanım Gereksinimleri (İmzalama Testleri İçin)

| Gereksinim | Açıklama |
|------------|----------|
| **Akıllı Kart Okuyucu** | USB bağlantılı |
| **Test Sertifikaları** | Geçerli e-imza sertifikaları |
| **PIN Kodları** | Sertifikalar için geçerli PIN'ler |

---

## 📦 Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Playwright Tarayıcılarını Yükleyin

```bash
npx playwright install chromium
```

### 3. Test Dosyalarını Kontrol Edin

`public/docs/` klasöründe aşağıdaki dosyaların bulunduğundan emin olun:

**PAdES Test Dosyaları:**
| Dosya | Açıklama |
|-------|----------|
| `sample.pdf` | Orijinal imzasız PDF |
| `sample-signed-BES.pdf` | BES imzalı PDF |
| `sample-signed-LTV.pdf` | LTV imzalı PDF |

**CAdES Test Dosyaları:**
| Dosya | Açıklama |
|-------|----------|
| `sample-cades-BES.p7m` | BES imzalı CAdES |
| `sample-cades-T.p7m` | T (Timestamped) imzalı CAdES |
| `sample-cades-XL.p7m` | XL (X-Long) imzalı CAdES |

---

## 🚀 Testleri Çalıştırma

### 📋 Hızlı Başlangıç (Testçiler İçin)

```bash
# 1. Bağımlılıkları yükle (ilk seferde)
npm install
npx playwright install chromium

# 2. Frontend'i başlat (ayrı terminal)
npm run dev

# 3. PAdES testlerini çalıştır
npm run test:pades

# 4. CAdES testlerini çalıştır
npm run test:cades
```

### 🎯 Tek Komut ile Test

| Komut | Açıklama | Oluşan Dosyalar |
|-------|----------|-----------------|
| `npm run test:pades` | PAdES imzalama testleri | `public/docs/sample-signed-*.pdf` |
| `npm run test:cades` | CAdES imzalama testleri | `public/docs/sample-cades-*.p7m` |
| `npm run test:all` | Tüm testler | Tüm imzalı dosyalar |

### ✅ Test Sonuçlarını Kontrol Et

Test bittikten sonra `public/docs/` klasöründe şu dosyalar oluşmalı:

**PAdES (npm run test:pades):**
```
public/docs/
├── sample-signed-BES.pdf      (~966 KB) - BES imzalı
├── sample-signed-LTV.pdf      (~1154 KB) - LTV imzalı
├── sample-signed-BES-BES.pdf  (~998 KB) - Çift BES imzalı
└── sample-signed-BES-LTV.pdf  (~1058 KB) - BES + LTV imzalı
```

**CAdES (npm run test:cades):**
```
public/docs/
├── sample-cades-BES.p7m       (~959 KB) - BES imzalı
├── sample-cades-T.p7m         (~961 KB) - T imzalı
└── sample-cades-XL.p7m        (~1327 KB) - XL imzalı
```

**PowerShell ile kontrol:**
```powershell
Get-ChildItem public\docs\*.pdf,public\docs\*.p7m | Select Name, Length | Format-Table
```

### Tüm Testleri Çalıştır

```bash
npm run test:e2e
```

### UI Modunda Çalıştır (İnteraktif)

```bash
npm run test:e2e:ui
```

### Headed Modda Çalıştır (Tarayıcı Görünür)

```bash
npm run test:e2e:headed
```

### Debug Modunda Çalıştır

```bash
npm run test:e2e:debug
```

### Test Raporunu Görüntüle

```bash
npm run test:e2e:report
```

---

### 📁 Belirli Test Dosyası Çalıştırma

```bash
# Sadece PAdES testleri
npm run test:e2e -- tests/e2e/pades.spec.ts

# Sadece CAdES testleri
npm run test:e2e -- tests/e2e/cades.spec.ts

# Headed modda CAdES testleri
npm run test:e2e:headed -- tests/e2e/cades.spec.ts
```

### 🔍 Belirli Test Seçme (--grep)

```bash
# Sadece UI testleri (akıllı kart gerekmez)
npm run test:e2e -- --grep "UI|Dropdown"

# CAdES tek imza testleri
npm run test:e2e:headed -- tests/e2e/cades.spec.ts --grep "C5"

# CAdES paralel imza testleri
npm run test:e2e:headed -- tests/e2e/cades.spec.ts --grep "C6"

# CAdES seri imza testleri
npm run test:e2e:headed -- tests/e2e/cades.spec.ts --grep "C7"

# Dosya oluşturma testleri (public/docs'a kaydeder)
npm run test:e2e:headed -- tests/e2e/cades.spec.ts --grep "C10"
```

---

## 📊 Test Senaryoları

### PAdES Test Matrisi (20 test)

| Kategori | Test ID | Açıklama | Otomatik |
|----------|---------|----------|----------|
| **UI Başlangıç** | P1.1-P1.5 | Varsayılan değerler ve UI kontrolleri | ✅ |
| **Dropdown** | P2.1-P2.3 | İmza seviyesi dropdown testleri | ✅ |
| **Dosya Yükleme** | P3.1-P3.3 | PDF yükleme ve imza listesi | ✅ |
| **e-İmza Bağlantı** | P4.1-P4.2 | Araç bağlantısı ve sertifika listesi | ✅ |
| **İmzalama** | P5.1-P5.4 | Gerçek imzalama testleri | 🔐 Akıllı kart |
| **Tür Değiştirme** | P6.1-P6.3 | Pades/Cades/Xades geçişleri | ✅ |

### CAdES Test Matrisi (36 test)

| Kategori | Test ID | Açıklama | Otomatik |
|----------|---------|----------|----------|
| **UI Başlangıç** | C1.1-C1.4 | Cades dropdown ve varsayılan değerler | ✅ |
| **Dropdown** | C2.1-C2.6 | İmza seviyesi ve metod seçimi | ✅ |
| **Dosya Yükleme** | C3.1-C3.5 | PDF/P7M yükleme ve imza listesi | ✅ |
| **e-İmza Bağlantı** | C4.1-C4.2 | Araç bağlantısı ve sertifika listesi | ✅ |
| **Tek İmza** | C5.1-C5.3 | aslBES, aslT, aslXLType2 imzalama | 🔐 Akıllı kart |
| **Paralel İmza** | C6.1-C6.3 | Paralel çoklu imza | 🔐 Akıllı kart |
| **Seri İmza** | C7.1-C7.4 | Seri zincir imza | 🔐 Akıllı kart |
| **Tür Değiştirme** | C8.1-C8.3 | Cades/Pades/Xades geçişleri | ✅ |
| **Dosya Boyutu** | C9.1-C9.3 | BES < T < XL boyut doğrulama | ✅ |
| **Dosya Oluşturma** | C10.1-C10.3 | İmzalı dosyaları public/docs'a kaydet | 🔐 Akıllı kart |

### Simge Açıklaması

| Simge | Açıklama |
|-------|----------|
| ✅ | Otomatik çalışır, akıllı kart gerekmez |
| 🔐 | Akıllı kart ve PIN gerektirir |

---

## 📁 Test Dosyaları

```
tests/
└── e2e/
    ├── pades.spec.ts      # PAdES test senaryoları (20 test)
    ├── cades.spec.ts      # CAdES test senaryoları (36 test)
    └── test-utils.ts      # Yardımcı fonksiyonlar
```

### Test Yardımcı Fonksiyonları

`test-utils.ts` dosyasında kullanılabilir fonksiyonlar:

```typescript
// Sayfa navigasyonu
navigateToEImzaV2(page)

// PDF dosya yükleme
uploadPdfFile(page, '/docs/sample.pdf', 'sample.pdf')

// CAdES dosya yükleme (PDF veya P7M)
uploadFileForCades(page, '/docs/sample-cades-BES.p7m', 'sample-cades-BES.p7m')

// İmza türü seçimi
selectSignatureType(page, 'Pades' | 'Cades' | 'Xades')

// İmza seviyesi seçimi
selectSignatureLevel(page, 'paslBES', 'Pades')
selectSignatureLevel(page, 'aslT', 'Cades')

// İmza metodu seçimi (sadece Cades/Xades)
selectSignatureMethod(page, 'Seri' | 'Paralel')

// İmzalama sürecini başlat
startSigningProcess(page)

// Sertifika ile imzala
signWithCertificate(page, TEST_CERTIFICATES.ULUC)

// İmzalı dosyayı indir ve kaydet
downloadAndSaveSignedFile(page, 'dosya-adi.p7m')
```

---

## ➕ Yeni Test Ekleme

### 1. Test Dosyası Oluştur

```typescript
// tests/e2e/my-test.spec.ts
import { test, expect } from '@playwright/test';
import { navigateToEImzaV2 } from './test-utils';

test.describe('My Test Suite', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await navigateToEImzaV2(page);
    
    // Test kodları...
    await expect(page.getByText('Expected')).toBeVisible();
  });
});
```

### 2. Test Konvansiyonları

- Test ID'leri kategoriye göre prefix kullan (P = PAdES, C = CAdES, X = XAdES)
- Her test bağımsız çalışabilmeli
- `test.skip()` kullanarak manuel gerektiren testleri işaretle
- Timeout değerlerini imzalama işlemleri için artır

---

## 🔧 Test Sertifikası Yapılandırması

### `test-utils.ts` İçinde Sertifika Tanımlama

```typescript
export const TEST_CERTIFICATES: Record<string, Certificate> = {
  ULUC: {
    name: 'ULUÇ EFE ÖZTÜRK',
    tcNo: '14495523968',
    pin: process.env.CERT_PIN_ULUC || '', // Env variable kullan!
  },
  // Yeni sertifika ekle...
};
```

### Environment Variables (Önerilen)

PIN kodlarını güvenli tutmak için `.env.local` dosyası kullanın:

```env
CERT_PIN_ULUC=123456
CERT_PIN_BULENT=654321
```

> ⚠️ **Güvenlik:** PIN kodlarını asla Git'e commit etmeyin!

---

## 🐛 Troubleshooting

### "e-İmza aracı bulunamadı" Hatası

1. e-İmza Aracı'nın yüklü ve çalışır olduğunu kontrol edin
2. `https://localsigner.onaylarim.com:8099/ping` adresine tarayıcıda erişin
3. SSL sertifikasını kabul edin

### "Backend API bağlantı hatası"

1. Backend API'nin çalıştığını kontrol edin:
   ```bash
   curl -k https://localhost:7294/health
   ```

### "Sertifika bulunamadı"

1. Akıllı kart okuyucunun bağlı olduğunu kontrol edin
2. Kartın takılı olduğunu kontrol edin
3. e-İmza Aracı'nı yeniden başlatın

### Test Timeout Hataları

`playwright.config.ts` içinde timeout değerlerini artırın:

```typescript
export default defineConfig({
  timeout: 180000, // 3 dakika
  expect: {
    timeout: 15000,
  },
});
```

---

## 📈 CI/CD Entegrasyonu

### GitHub Actions Örneği

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install chromium
      
      - name: Run E2E tests
        run: npm run test:e2e
        # NOT: CI'da sadece UI testleri çalışır
        # İmzalama testleri fiziksel kart gerektirir
```

---

## 📚 Faydalı Linkler

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [ONAYLARIM Prime API Docs](https://docs.onaylarim.com)
- [e-İmza Aracı Kurulum](https://onaylarim.com/e-imza-araci)

---

## 🤝 Katkıda Bulunma

1. Yeni test senaryoları için issue açın
2. Test kategorilerini takip edin (PAdES, CAdES, XAdES, Mobil İmza)
3. Testlerinizi pull request olarak gönderin

---

*Son güncelleme: Ocak 2026*
