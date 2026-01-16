# 🤖 Cursor AI - PAdES Test Rehberi

Bu dokümantasyon, **Cursor AI**'ın `@browser` komutu ile PAdES e-imza testlerini çalıştırabilmesi için hazırlanmıştır.

> 📚 **Playwright ile test için:** [TESTING.md](./TESTING.md)

---

## 📋 Nasıl Kullanılır?

1. Bu projeyi Cursor IDE'de açın
2. Dev server'ı başlatın: `npm run dev`
3. Backend API'nin çalıştığından emin olun (`https://localhost:7294`)
4. e-İmza Aracı'nın yüklü ve çalışır olduğunu kontrol edin
5. Cursor AI'a şu komutu verin:

```
@browser CURSOR-PADES-GUIDE.md dosyasındaki PAdES testlerini çalıştır
```

---

## 🔑 Test Sertifikaları

| Sertifika | TC Kimlik No | PIN |
|-----------|--------------|-----|
| ULUÇ EFE ÖZTÜRK | 14495523968 | `123987` |
| BÜLENT DAYIOĞLU | 20206372664 | `0606` |

---

## 🌐 URL ve Portlar

| Servis | URL |
|--------|-----|
| Frontend | `http://localhost:4000` |
| Backend API | `https://localhost:7294` |
| e-İmza Aracı | `https://localsigner.onaylarim.com:8099` |

---

## 📁 Test Dosyaları

| Dosya | Konum | Açıklama |
|-------|-------|----------|
| `sample.pdf` | `/docs/sample.pdf` | Orijinal imzasız PDF |
| `sample-signed-BES.pdf` | `/docs/sample-signed-BES.pdf` | BES imzalı PDF |
| `sample-signed-LTV.pdf` | `/docs/sample-signed-LTV.pdf` | LTV imzalı PDF |

---

## 🧪 TEST SENARYOLARI

### BÖLÜM 1: UI ve Başlangıç Durumu Testleri

#### Test P1.1: Varsayılan İmza Türü
**Amaç:** Sayfa açıldığında Pades varsayılan seçili olmalı

**Adımlar:**
1. `http://localhost:4000` adresine git
2. "e-İmza V2" sekmesine tıkla
3. Radio button'ları kontrol et

**Beklenen Sonuç:**
- ✅ "Pades" radio button'ı seçili olmalı
- ✅ "Cades" ve "Xades" seçili olmamalı

---

#### Test P1.2: Pades Dropdown Kontrolü
**Amaç:** Pades seçiliyken sadece "Pades İmza Seviyesi" dropdown'ı görünmeli

**Adımlar:**
1. e-İmza V2 sekmesinde Pades seçili olmalı
2. Dropdown'ları kontrol et

**Beklenen Sonuç:**
- ✅ "Pades İmza Seviyesi" dropdown'ı görünür
- ✅ "İmza Metodu" dropdown'ı görünmez (Cades/Xades'te görünür)

---

#### Test P1.3: Varsayılan İmza Seviyesi
**Amaç:** Varsayılan imza seviyesi paslBES olmalı

**Adımlar:**
1. e-İmza V2 sekmesine git
2. Dropdown değerini kontrol et

**Beklenen Sonuç:**
- ✅ Dropdown'da "paslBES" gösterilmeli

---

#### Test P1.4: Dosya Seçim Alanı
**Amaç:** Başlangıçta "Seçili dosya yok" mesajı görünmeli

**Beklenen Sonuç:**
- ✅ "Seçili dosya yok" metni görünür

---

#### Test P1.5: Önceki İmzalar Bölümü
**Amaç:** Dosya yüklenmeden önce uygun mesaj gösterilmeli

**Beklenen Sonuç:**
- ✅ "Belge yüklenmedi." metni görünür

---

### BÖLÜM 2: Dropdown Testleri

#### Test P2.1: Dropdown Açma/Kapama
**Adımlar:**
1. "Pades İmza Seviyesi" dropdown'ına tıkla
2. Dropdown açıldığını doğrula
3. Heading'e tıklayarak kapat

**Beklenen Sonuç:**
- ✅ Dropdown açılıp kapanabilmeli

---

#### Test P2.2: Dropdown Seçenekleri
**Adımlar:**
1. Dropdown'ı aç
2. Seçenekleri kontrol et

**Beklenen Sonuç:**
- ✅ "paslBES" seçeneği mevcut
- ✅ "paslLTV" seçeneği mevcut

---

#### Test P2.3: Seviye Değiştirme
**Adımlar:**
1. Dropdown'ı aç
2. "paslLTV" seçeneğini seç

**Beklenen Sonuç:**
- ✅ Dropdown "paslLTV" göstermeli

---

### BÖLÜM 3: Dosya Yükleme Testleri

#### Test P3.1: PDF Dosyası Yükleme
**Amaç:** PDF dosyası programatik olarak yüklenebilmeli

**JavaScript Kodu (Browser Console'da çalıştır):**
```javascript
(async () => {
  const response = await fetch('/docs/sample.pdf');
  const blob = await response.blob();
  const file = new File([blob], 'sample.pdf', { type: 'application/pdf' });
  
  const fileInput = document.getElementById('uploadFile');
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;
  
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  console.log('Dosya yüklendi:', file.name);
})();
```

**Beklenen Sonuç:**
- ✅ Dosya adı "sample.pdf" gösterilmeli
- ✅ "Dosya sunucuya başarıyla yüklendi" log mesajı

---

#### Test P3.2: İmzasız PDF Kontrolü
**Amaç:** İmzasız PDF yüklendiğinde uygun mesaj gösterilmeli

**Beklenen Sonuç:**
- ✅ "Belge yüklenmedi" mesajı kaybolmalı
- ✅ İmza listesi kontrol edilmeli

---

#### Test P3.3: İmzalı PDF Kontrolü
**Amaç:** BES imzalı PDF yüklendiğinde önceki imza bilgisi gösterilmeli

**JavaScript Kodu:**
```javascript
(async () => {
  const response = await fetch('/docs/sample-signed-BES.pdf');
  const blob = await response.blob();
  const file = new File([blob], 'sample-signed-BES.pdf', { type: 'application/pdf' });
  
  const fileInput = document.getElementById('uploadFile');
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;
  
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
})();
```

**Beklenen Sonuç (3 saniye sonra):**
- ✅ "İmza Adı" görünmeli
- ✅ "İmza Seviyesi: paslBaselineB" görünmeli
- ✅ İmzacı bilgisi görünmeli

---

### BÖLÜM 4: e-İmza Aracı Bağlantı Testleri

#### Test P4.1: Başla Butonu
**Adımlar:**
1. PDF dosyası yükle
2. "Başla" butonuna tıkla
3. Bağlantı loglarını kontrol et

**Beklenen Sonuç:**
- ✅ "e-İmza aracına SSL PING isteği" log mesajı
- ✅ "RESET isteği gönderiliyor" log mesajı
- ✅ "e-İmzalar" başlığı görünmeli

---

#### Test P4.2: Sertifika Listesi
**Beklenen Sonuç:**
- ✅ Sertifika kartları görünmeli
- ✅ Her kartta: Ad Soyad, TC No, Geçerlilik tarihi
- ✅ PIN textbox'ı görünmeli
- ✅ "İmzala" butonu görünmeli

---

### BÖLÜM 5: İmzalama Testleri

#### Test P5.1: paslBES ile İmzalama
**Ön Koşul:** e-İmza aracı bağlı, sertifika listesi görünür

**Adımlar:**
1. sample.pdf dosyasını yükle
2. İmza seviyesi: paslBES
3. "Başla" butonuna tıkla
4. ULUÇ EFE ÖZTÜRK sertifikası için PIN gir: `123987`
5. "İmzala" butonuna tıkla

**Beklenen Sonuç:**
- ✅ "İmza işlemi hazırlanıyor" mesajı
- ✅ "CreateStateOnOnaylarimApi" log mesajı
- ✅ "SIGNSTEPTWO" log mesajı
- ✅ "FinishSign" log mesajı
- ✅ "İmza işlemi tamamlandı" mesajı
- ✅ "e-İmzalı dosyayı indir" linki görünmeli

---

#### Test P5.2: paslLTV ile İmzalama
**Adımlar:**
1. sample.pdf dosyasını yükle
2. İmza seviyesi: paslLTV seç
3. "Başla" butonuna tıkla
4. ULUÇ EFE ÖZTÜRK için PIN: `123987`
5. "İmzala" butonuna tıkla

**Beklenen Sonuç:**
- ✅ İmza işlemi başarılı
- ✅ LTV imzalı dosya indirilebilir

---

#### Test P5.3: Çoklu İmza (BES + BES)
**Amaç:** Farklı kişi ile ikinci imza atılabilmeli

**Adımlar:**
1. sample-signed-BES.pdf dosyasını yükle
2. Mevcut imzanın gösterildiğini doğrula
3. İmza seviyesi: paslBES
4. "Başla" butonuna tıkla
5. BÜLENT DAYIOĞLU için PIN: `0606`
6. "İmzala" butonuna tıkla

**Beklenen Sonuç:**
- ✅ İkinci imza başarıyla atılmalı
- ✅ Dosya boyutu artmalı (~32 KB)

---

#### Test P5.4: Çoklu İmza (BES + LTV)
**Amaç:** BES imzalı dosyaya LTV imza atılabilmeli

**Adımlar:**
1. sample-signed-BES.pdf dosyasını yükle
2. İmza seviyesi: paslLTV seç
3. "Başla" butonuna tıkla
4. BÜLENT DAYIOĞLU için PIN: `0606`
5. "İmzala" butonuna tıkla

**Beklenen Sonuç:**
- ✅ LTV imza başarıyla atılmalı
- ✅ Dosya boyutu önemli ölçüde artmalı (~120 KB)

---

### BÖLÜM 6: İmza Türü Değiştirme Testleri

#### Test P6.1: Cades Seçimi
**Adımlar:**
1. "Cades" radio button'ına tıkla

**Beklenen Sonuç:**
- ✅ "Cades İmza Seviyesi" dropdown'ı görünür
- ✅ "İmza Metodu" dropdown'ı görünür

---

#### Test P6.2: Xades Seçimi
**Adımlar:**
1. "Xades" radio button'ına tıkla

**Beklenen Sonuç:**
- ✅ "Xades İmza Seviyesi" dropdown'ı görünür
- ✅ "Xades İmza Türü" dropdown'ı görünür
- ✅ "İmza Metodu" dropdown'ı görünür

---

#### Test P6.3: Pades'e Geri Dönüş
**Adımlar:**
1. Cades veya Xades seç
2. Tekrar "Pades" seç

**Beklenen Sonuç:**
- ✅ Sadece "Pades İmza Seviyesi" dropdown'ı görünür
- ✅ Diğer dropdown'lar kaybolur

---

## 🔄 İmzalı Dosya İndirme

İmzalama tamamlandıktan sonra dosyayı indirmek için:

1. "e-İmzalı dosyayı indir" linkine **tıkla**
2. Dosya otomatik olarak Downloads klasörüne indirilir
3. İndirilen dosyayı `public/docs/` altına kopyala ve uygun isimle kaydet

**Örnek PowerShell komutu:**
```powershell
Copy-Item "$env:USERPROFILE\Downloads\Signed_*.pdf" "public\docs\sample-signed-BES.pdf"
```

---

## 📊 Test Özet Tablosu

| Test ID | Test Adı | Otomatik | Sonuç |
|---------|----------|----------|-------|
| P1.1 | Varsayılan imza türü | ✅ | ⬜ |
| P1.2 | Pades dropdown kontrolü | ✅ | ⬜ |
| P1.3 | Varsayılan imza seviyesi | ✅ | ⬜ |
| P1.4 | Dosya seçim alanı | ✅ | ⬜ |
| P1.5 | Önceki imzalar bölümü | ✅ | ⬜ |
| P2.1 | Dropdown açma/kapama | ✅ | ⬜ |
| P2.2 | Dropdown seçenekleri | ✅ | ⬜ |
| P2.3 | Seviye değiştirme | ✅ | ⬜ |
| P3.1 | PDF dosyası yükleme | ✅ | ⬜ |
| P3.2 | İmzasız PDF kontrolü | ✅ | ⬜ |
| P3.3 | İmzalı PDF kontrolü | ✅ | ⬜ |
| P4.1 | Başla butonu | ✅ | ⬜ |
| P4.2 | Sertifika listesi | ✅ | ⬜ |
| P5.1 | paslBES imzalama | 🔐 | ⬜ |
| P5.2 | paslLTV imzalama | 🔐 | ⬜ |
| P5.3 | Çoklu imza BES+BES | 🔐 | ⬜ |
| P5.4 | Çoklu imza BES+LTV | 🔐 | ⬜ |
| P6.1 | Cades seçimi | ✅ | ⬜ |
| P6.2 | Xades seçimi | ✅ | ⬜ |
| P6.3 | Pades'e geri dönüş | ✅ | ⬜ |

**Semboller:**
- ✅ Otomatik çalıştırılabilir
- 🔐 Akıllı kart + PIN gerekli
- ⬜ Test edilmedi
- ✔️ Başarılı
- ❌ Başarısız

---

## 🤖 AI Asistan İçin Komutlar

### Tüm UI Testlerini Çalıştır
```
@browser http://localhost:4000 adresine git, e-İmza V2 sekmesini aç ve P1.1-P1.5 testlerini yap
```

### Dropdown Testleri
```
@browser e-İmza V2'de dropdown testlerini yap (P2.1-P2.3)
```

### Dosya Yükleme Testi
```
@browser e-İmza V2'de sample.pdf dosyasını programatik olarak yükle ve sonuçları kontrol et
```

### İmzalama Testi
```
@browser sample.pdf'i paslBES ile imzala. ULUÇ EFE ÖZTÜRK sertifikası, PIN: 123987
```

### Çoklu İmza Testi
```
@browser sample-signed-BES.pdf dosyasına BÜLENT DAYIOĞLU ile LTV imza at. PIN: 0606
```

---

## ⚠️ Önemli Notlar

1. **PIN Güvenliği:** Bu dokümandaki PIN'ler test amaçlıdır. Gerçek projelerde `.env` dosyası kullanın.

2. **e-İmza Aracı:** Testler öncesi `https://localsigner.onaylarim.com:8099/ping` adresini tarayıcıda açıp SSL sertifikasını kabul edin.

3. **Backend API:** API'nin `https://localhost:7294` adresinde çalıştığından emin olun.

4. **Timeout:** İmzalama işlemleri 5-10 saniye sürebilir. Yeterli bekleme süresi tanıyın.

---

## 📝 Test Raporu Şablonu

```markdown
# PAdES Test Raporu

**Tarih:** [TARİH]
**Test Eden:** [AI/KULLANICI]
**Ortam:** [DEV/TEST/PROD]

## Sonuçlar

| Test | Sonuç | Not |
|------|-------|-----|
| P1.1 | ✔️/❌ | |
| P1.2 | ✔️/❌ | |
| ... | ... | ... |

## Bulunan Hatalar

1. [Hata açıklaması]

## Ekran Görüntüleri

[Gerekirse ekleyin]
```

---

---

## 📚 Diğer Rehberler

| Rehber | Dosya | Açıklama |
|--------|-------|----------|
| **CAdES (Cursor)** | [CURSOR-CADES-GUIDE.md](./CURSOR-CADES-GUIDE.md) | CAdES testleri için Cursor rehberi |
| **Playwright** | [TESTING.md](./TESTING.md) | npm komutları ile otomatik test |

---

*Son güncelleme: Ocak 2026*
