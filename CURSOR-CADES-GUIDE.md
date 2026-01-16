# 🤖 Cursor AI - CAdES Test Rehberi

Bu dokümantasyon, **Cursor AI**'ın `@browser` komutu ile CAdES e-imza testlerini çalıştırabilmesi için hazırlanmıştır.

> 📚 **Playwright ile test için:** [TESTING.md](./TESTING.md)

---

## 📋 Nasıl Kullanılır?

1. Bu projeyi Cursor IDE'de açın
2. Dev server'ı başlatın: `npm run dev`
3. Backend API'nin çalıştığından emin olun (`https://localhost:7294`)
4. e-İmza Aracı'nın yüklü ve çalışır olduğunu kontrol edin
5. Cursor AI'a şu komutu verin:

```
@browser CURSOR-CADES-GUIDE.md dosyasındaki CAdES testlerini çalıştır
```

---

## 🔑 Test Sertifikaları

| Kısaltma | Sertifika | TC Kimlik No | PIN |
|----------|-----------|--------------|-----|
| **K1** | ULUÇ EFE ÖZTÜRK | 14495523968 | `123987` |
| **K2** | BÜLENT DAYIOĞLU | 20206372664 | `0606` |

---

## 🌐 URL ve Portlar

| Servis | URL |
|--------|-----|
| Frontend | `http://localhost:4000` |
| Backend API | `https://localhost:7294` |
| e-İmza Aracı | `https://localsigner.onaylarim.com:8099` |

---

## 📊 CAdES İmza Seviyeleri

| Seviye | Enum Değeri | Açıklama |
|--------|-------------|----------|
| **aslBES** | 6 | Basic Electronic Signature |
| **aslT** | 8 | Timestamped |
| **aslXLType2** | 15 | X-L Type 2 (revocation + timestamp) |
| **aslA** | 16 | Archived (uzun vadeli) |

---

## 🔀 İmza Metotları

| Metod | Açıklama | signaturePath |
|-------|----------|---------------|
| **PARALLEL** | İmzalar birbirinden bağımsız | Kullanılmaz |
| **SERIAL** | İmzalar zincir şeklinde | S0, S0:S0, ... |

---

## ⬇️ Dosya İndirme Yöntemi

İmzalama tamamlandıktan sonra dosyayı indirmek için:

1. "e-İmzalı dosyayı indir" linkine **tıkla**
2. Dosya otomatik olarak Downloads klasörüne indirilir
3. İndirilen dosyayı `public/docs/` altına kopyala ve uygun isimle kaydet

**Örnek PowerShell komutu:**
```powershell
Copy-Item "$env:USERPROFILE\Downloads\Signed_*.p7m" "public\docs\sample-cades-BES.p7m"
```

---

## 📁 Test Dosyaları

### Temel Dosya
| Dosya | Konum | Açıklama |
|-------|-------|----------|
| `sample.pdf` | `/docs/sample.pdf` | Orijinal imzasız PDF |

### Tek İmzalı Dosyalar (Bölüm 1)
| Dosya | İmza | Kişi |
|-------|------|------|
| `sample-cades-BES.p7m` | aslBES | K1 |
| `sample-cades-T.p7m` | aslT | K1 |
| `sample-cades-XL.p7m` | aslXLType2 | K1 |
| `sample-cades-A.p7m` | aslA | K1 |

### Paralel İmzalı Dosyalar (Bölüm 2)
| Dosya | 1. İmza (K1) | 2. İmza (K2) |
|-------|--------------|--------------|
| `sample-cades-BES-P-BES.p7m` | BES | BES |
| `sample-cades-BES-P-T.p7m` | BES | T |
| `sample-cades-BES-P-XL.p7m` | BES | XL |
| `sample-cades-BES-P-A.p7m` | BES | A |
| `sample-cades-T-P-BES.p7m` | T | BES |
| `sample-cades-T-P-T.p7m` | T | T |
| `sample-cades-T-P-XL.p7m` | T | XL |
| `sample-cades-T-P-A.p7m` | T | A |
| `sample-cades-XL-P-BES.p7m` | XL | BES |
| `sample-cades-XL-P-T.p7m` | XL | T |
| `sample-cades-XL-P-XL.p7m` | XL | XL |
| `sample-cades-XL-P-A.p7m` | XL | A |
| `sample-cades-A-P-BES.p7m` | A | BES |
| `sample-cades-A-P-T.p7m` | A | T |
| `sample-cades-A-P-XL.p7m` | A | XL |
| `sample-cades-A-P-A.p7m` | A | A |

### Seri İmzalı Dosyalar (Bölüm 3)
| Dosya | 1. İmza (K1) | 2. İmza (K2) | signaturePath |
|-------|--------------|--------------|---------------|
| `sample-cades-BES-S-BES.p7m` | BES | BES | S0 |
| `sample-cades-BES-S-T.p7m` | BES | T | S0 |
| `sample-cades-BES-S-XL.p7m` | BES | XL | S0 |
| `sample-cades-BES-S-A.p7m` | BES | A | S0 |
| `sample-cades-T-S-BES.p7m` | T | BES | S0 |
| `sample-cades-T-S-T.p7m` | T | T | S0 |
| `sample-cades-T-S-XL.p7m` | T | XL | S0 |
| `sample-cades-T-S-A.p7m` | T | A | S0 |
| `sample-cades-XL-S-BES.p7m` | XL | BES | S0 |
| `sample-cades-XL-S-T.p7m` | XL | T | S0 |
| `sample-cades-XL-S-XL.p7m` | XL | XL | S0 |
| `sample-cades-XL-S-A.p7m` | XL | A | S0 |
| `sample-cades-A-S-BES.p7m` | A | BES | S0 |
| `sample-cades-A-S-T.p7m` | A | T | S0 |
| `sample-cades-A-S-XL.p7m` | A | XL | S0 |
| `sample-cades-A-S-A.p7m` | A | A | S0 |

### Üçlü İmza Zinciri (Bölüm 4)
| Dosya | İmza Zinciri | signaturePath |
|-------|--------------|---------------|
| `sample-cades-BES-S-BES-S-T.p7m` | BES→BES→T | S0:S0 |
| `sample-cades-T-P-T-P-A.p7m` | T+T+A | PARALLEL |
| `sample-cades-BES-S-T-S-A.p7m` | BES→T→A | S0:S0 |
| `sample-cades-A-P-A-P-A.p7m` | A+A+A | PARALLEL |

---

## 🧪 TEST SENARYOLARI

---

## BÖLÜM 1: TEK İMZA SENARYOLARI

### Test C-S1: sample.pdf → aslBES İmza
**Amaç:** PDF dosyasına CAdES BES imza atılması

**Adımlar:**
1. `http://localhost:4000` adresine git
2. "e-İmza V2" sekmesine tıkla
3. "Cades" radio button'ını seç
4. İmza Seviyesi: **aslBES** seç
5. İmza Metodu: **Seri** (varsayılan)
6. sample.pdf dosyasını yükle
7. "Başla" butonuna tıkla
8. ULUÇ EFE ÖZTÜRK sertifikası için PIN gir: `123987`
9. "İmzala" butonuna tıkla
10. İmzalı dosyayı indir ve `public/docs/sample-cades-BES.p7m` olarak kaydet

**JavaScript ile Dosya Yükleme:**
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
})();
```

**Beklenen Sonuç:**
- ✅ "İmza işlemi tamamlandı" mesajı
- ✅ .p7m dosyası indirilebilir
- ✅ Dosya boyutu ~5-10 KB artış

**Dosya Kaydetme:**
1. "e-İmzalı dosyayı indir" linkine tıkla
2. Playwright artifacts'tan `public/docs/sample-cades-BES.p7m` olarak kopyala

---

### Test C-S2: sample.pdf → aslT İmza
**Amaç:** PDF dosyasına CAdES Timestamped imza atılması

**Adımlar:**
1. "e-İmza V2" sekmesine git
2. "Cades" seç
3. İmza Seviyesi: **aslT** seç
4. sample.pdf yükle
5. "Başla" → PIN: `123987` → "İmzala"
6. `public/docs/sample-cades-T.p7m` olarak kaydet

**Beklenen Sonuç:**
- ✅ Zaman damgası eklenmeli
- ✅ Dosya boyutu BES'ten büyük olmalı

---

### Test C-S3: sample.pdf → aslXLType2 İmza
**Amaç:** PDF dosyasına CAdES X-L Type 2 imza atılması

**Adımlar:**
1. "e-İmza V2" → "Cades"
2. İmza Seviyesi: **aslXLType2** seç
3. sample.pdf yükle
4. "Başla" → PIN: `123987` → "İmzala"
5. `public/docs/sample-cades-XL.p7m` olarak kaydet

**Beklenen Sonuç:**
- ✅ Revocation values + timestamp eklenmeli
- ✅ Dosya boyutu T'den büyük olmalı

---

### Test C-S4: sample.pdf → aslA İmza
**Amaç:** PDF dosyasına CAdES Archived imza atılması

**Adımlar:**
1. "e-İmza V2" → "Cades"
2. İmza Seviyesi: **aslA** seç
3. sample.pdf yükle
4. "Başla" → PIN: `123987` → "İmzala"
5. `public/docs/sample-cades-A.p7m` olarak kaydet

**Beklenen Sonuç:**
- ✅ Arşiv zaman damgası eklenmeli
- ✅ En büyük dosya boyutu

---

## BÖLÜM 2: PARALEL İMZA SENARYOLARI

### Test C-P1: BES + Paralel BES
**Amaç:** BES imzalı dosyaya 2. kişi paralel BES eklemesi

**Ön Koşul:** `sample-cades-BES.p7m` mevcut

**Adımlar:**
1. "e-İmza V2" → "Cades"
2. İmza Seviyesi: **aslBES**
3. İmza Metodu: **Paralel** seç
4. `sample-cades-BES.p7m` dosyasını yükle
5. Mevcut imzanın gösterildiğini doğrula
6. "Başla" butonuna tıkla
7. BÜLENT DAYIOĞLU sertifikası için PIN: `0606`
8. "İmzala" butonuna tıkla
9. `public/docs/sample-cades-BES-P-BES.p7m` olarak kaydet

**JavaScript ile CAdES Dosya Yükleme:**
```javascript
(async () => {
  const response = await fetch('/docs/sample-cades-BES.p7m');
  const blob = await response.blob();
  const file = new File([blob], 'sample-cades-BES.p7m', { type: 'application/pkcs7-mime' });
  
  const fileInput = document.getElementById('uploadFile');
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;
  
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
})();
```

**Beklenen Sonuç:**
- ✅ 2 imza görünmeli (paralel)
- ✅ Her iki imzacı bilgisi ayrı ayrı görünmeli

---

### Test C-P2: BES + Paralel T
**Ön Koşul:** `sample-cades-BES.p7m` mevcut

**Adımlar:**
1. Cades → aslT → Paralel
2. `sample-cades-BES.p7m` yükle
3. K2 ile imzala (PIN: `0606`)
4. `sample-cades-BES-P-T.p7m` kaydet

---

### Test C-P3: BES + Paralel XL
**Ön Koşul:** `sample-cades-BES.p7m` mevcut

**Adımlar:**
1. Cades → aslXLType2 → Paralel
2. `sample-cades-BES.p7m` yükle
3. K2 ile imzala
4. `sample-cades-BES-P-XL.p7m` kaydet

---

### Test C-P4: BES + Paralel A
**Ön Koşul:** `sample-cades-BES.p7m` mevcut

**Adımlar:**
1. Cades → aslA → Paralel
2. `sample-cades-BES.p7m` yükle
3. K2 ile imzala
4. `sample-cades-BES-P-A.p7m` kaydet

---

### Test C-P5: T + Paralel BES
**Ön Koşul:** `sample-cades-T.p7m` mevcut

**Adımlar:**
1. Cades → aslBES → Paralel
2. `sample-cades-T.p7m` yükle
3. K2 ile imzala
4. `sample-cades-T-P-BES.p7m` kaydet

---

### Test C-P6: T + Paralel T
**Ön Koşul:** `sample-cades-T.p7m` mevcut

**Adımlar:**
1. Cades → aslT → Paralel
2. `sample-cades-T.p7m` yükle
3. K2 ile imzala
4. `sample-cades-T-P-T.p7m` kaydet

---

### Test C-P7: T + Paralel XL
**Ön Koşul:** `sample-cades-T.p7m` mevcut

**Adımlar:**
1. Cades → aslXLType2 → Paralel
2. `sample-cades-T.p7m` yükle
3. K2 ile imzala
4. `sample-cades-T-P-XL.p7m` kaydet

---

### Test C-P8: T + Paralel A
**Ön Koşul:** `sample-cades-T.p7m` mevcut

**Adımlar:**
1. Cades → aslA → Paralel
2. `sample-cades-T.p7m` yükle
3. K2 ile imzala
4. `sample-cades-T-P-A.p7m` kaydet

---

### Test C-P9: XL + Paralel BES
**Ön Koşul:** `sample-cades-XL.p7m` mevcut

**Adımlar:**
1. Cades → aslBES → Paralel
2. `sample-cades-XL.p7m` yükle
3. K2 ile imzala
4. `sample-cades-XL-P-BES.p7m` kaydet

---

### Test C-P10: XL + Paralel T
**Ön Koşul:** `sample-cades-XL.p7m` mevcut

**Adımlar:**
1. Cades → aslT → Paralel
2. `sample-cades-XL.p7m` yükle
3. K2 ile imzala
4. `sample-cades-XL-P-T.p7m` kaydet

---

### Test C-P11: XL + Paralel XL
**Ön Koşul:** `sample-cades-XL.p7m` mevcut

**Adımlar:**
1. Cades → aslXLType2 → Paralel
2. `sample-cades-XL.p7m` yükle
3. K2 ile imzala
4. `sample-cades-XL-P-XL.p7m` kaydet

---

### Test C-P12: XL + Paralel A
**Ön Koşul:** `sample-cades-XL.p7m` mevcut

**Adımlar:**
1. Cades → aslA → Paralel
2. `sample-cades-XL.p7m` yükle
3. K2 ile imzala
4. `sample-cades-XL-P-A.p7m` kaydet

---

### Test C-P13: A + Paralel BES
**Ön Koşul:** `sample-cades-A.p7m` mevcut

**Adımlar:**
1. Cades → aslBES → Paralel
2. `sample-cades-A.p7m` yükle
3. K2 ile imzala
4. `sample-cades-A-P-BES.p7m` kaydet

---

### Test C-P14: A + Paralel T
**Ön Koşul:** `sample-cades-A.p7m` mevcut

**Adımlar:**
1. Cades → aslT → Paralel
2. `sample-cades-A.p7m` yükle
3. K2 ile imzala
4. `sample-cades-A-P-T.p7m` kaydet

---

### Test C-P15: A + Paralel XL
**Ön Koşul:** `sample-cades-A.p7m` mevcut

**Adımlar:**
1. Cades → aslXLType2 → Paralel
2. `sample-cades-A.p7m` yükle
3. K2 ile imzala
4. `sample-cades-A-P-XL.p7m` kaydet

---

### Test C-P16: A + Paralel A
**Ön Koşul:** `sample-cades-A.p7m` mevcut

**Adımlar:**
1. Cades → aslA → Paralel
2. `sample-cades-A.p7m` yükle
3. K2 ile imzala
4. `sample-cades-A-P-A.p7m` kaydet

---

## BÖLÜM 3: SERİ İMZA SENARYOLARI

### Test C-S5: BES + Seri BES (signaturePath: S0)
**Amaç:** BES imzalı dosyaya 2. kişi seri BES eklemesi

**Ön Koşul:** `sample-cades-BES.p7m` mevcut

**Adımlar:**
1. "e-İmza V2" → "Cades"
2. İmza Seviyesi: **aslBES**
3. İmza Metodu: **Seri** seç
4. `sample-cades-BES.p7m` dosyasını yükle
5. Mevcut imzanın gösterildiğini doğrula (İmza Adı: S0)
6. "Üstüne İmza Atılacak İmza Adı" alanına: **S0** yaz
7. "Başla" butonuna tıkla
8. BÜLENT DAYIOĞLU sertifikası için PIN: `0606`
9. "İmzala" butonuna tıkla
10. `public/docs/sample-cades-BES-S-BES.p7m` olarak kaydet

**Beklenen Sonuç:**
- ✅ İmza zinciri: S0 → S0:S0
- ✅ 2. imza 1. imzaya bağlı

---

### Test C-S6: BES + Seri T
**Ön Koşul:** `sample-cades-BES.p7m` mevcut

**Adımlar:**
1. Cades → aslT → Seri
2. `sample-cades-BES.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-BES-S-T.p7m` kaydet

---

### Test C-S7: BES + Seri XL
**Ön Koşul:** `sample-cades-BES.p7m` mevcut

**Adımlar:**
1. Cades → aslXLType2 → Seri
2. `sample-cades-BES.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-BES-S-XL.p7m` kaydet

---

### Test C-S8: BES + Seri A
**Ön Koşul:** `sample-cades-BES.p7m` mevcut

**Adımlar:**
1. Cades → aslA → Seri
2. `sample-cades-BES.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-BES-S-A.p7m` kaydet

---

### Test C-S9: T + Seri BES
**Ön Koşul:** `sample-cades-T.p7m` mevcut

**Adımlar:**
1. Cades → aslBES → Seri
2. `sample-cades-T.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-T-S-BES.p7m` kaydet

---

### Test C-S10: T + Seri T
**Ön Koşul:** `sample-cades-T.p7m` mevcut

**Adımlar:**
1. Cades → aslT → Seri
2. `sample-cades-T.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-T-S-T.p7m` kaydet

---

### Test C-S11: T + Seri XL
**Ön Koşul:** `sample-cades-T.p7m` mevcut

**Adımlar:**
1. Cades → aslXLType2 → Seri
2. `sample-cades-T.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-T-S-XL.p7m` kaydet

---

### Test C-S12: T + Seri A
**Ön Koşul:** `sample-cades-T.p7m` mevcut

**Adımlar:**
1. Cades → aslA → Seri
2. `sample-cades-T.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-T-S-A.p7m` kaydet

---

### Test C-S13: XL + Seri BES
**Ön Koşul:** `sample-cades-XL.p7m` mevcut

**Adımlar:**
1. Cades → aslBES → Seri
2. `sample-cades-XL.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-XL-S-BES.p7m` kaydet

---

### Test C-S14: XL + Seri T
**Ön Koşul:** `sample-cades-XL.p7m` mevcut

**Adımlar:**
1. Cades → aslT → Seri
2. `sample-cades-XL.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-XL-S-T.p7m` kaydet

---

### Test C-S15: XL + Seri XL
**Ön Koşul:** `sample-cades-XL.p7m` mevcut

**Adımlar:**
1. Cades → aslXLType2 → Seri
2. `sample-cades-XL.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-XL-S-XL.p7m` kaydet

---

### Test C-S16: XL + Seri A
**Ön Koşul:** `sample-cades-XL.p7m` mevcut

**Adımlar:**
1. Cades → aslA → Seri
2. `sample-cades-XL.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-XL-S-A.p7m` kaydet

---

### Test C-S17: A + Seri BES
**Ön Koşul:** `sample-cades-A.p7m` mevcut

**Adımlar:**
1. Cades → aslBES → Seri
2. `sample-cades-A.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-A-S-BES.p7m` kaydet

---

### Test C-S18: A + Seri T
**Ön Koşul:** `sample-cades-A.p7m` mevcut

**Adımlar:**
1. Cades → aslT → Seri
2. `sample-cades-A.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-A-S-T.p7m` kaydet

---

### Test C-S19: A + Seri XL
**Ön Koşul:** `sample-cades-A.p7m` mevcut

**Adımlar:**
1. Cades → aslXLType2 → Seri
2. `sample-cades-A.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-A-S-XL.p7m` kaydet

---

### Test C-S20: A + Seri A
**Ön Koşul:** `sample-cades-A.p7m` mevcut

**Adımlar:**
1. Cades → aslA → Seri
2. `sample-cades-A.p7m` yükle
3. signaturePath: **S0**
4. K2 ile imzala
5. `sample-cades-A-S-A.p7m` kaydet

---

## BÖLÜM 4: ÜÇLÜ İMZA ZİNCİRİ

### Test C-T1: BES → BES → T (Seri Zincir)
**Ön Koşul:** `sample-cades-BES-S-BES.p7m` mevcut

**Adımlar:**
1. Cades → aslT → Seri
2. `sample-cades-BES-S-BES.p7m` yükle
3. signaturePath: **S0:S0**
4. K1 ile imzala (PIN: `123987`)
5. `sample-cades-BES-S-BES-S-T.p7m` kaydet

**Beklenen Sonuç:**
- ✅ 3 kademeli imza zinciri

---

### Test C-T2: T + T + A (Paralel Üçlü)
**Ön Koşul:** `sample-cades-T-P-T.p7m` mevcut

**Adımlar:**
1. Cades → aslA → Paralel
2. `sample-cades-T-P-T.p7m` yükle
3. K1 ile imzala
4. `sample-cades-T-P-T-P-A.p7m` kaydet

---

### Test C-T3: BES → T → A (Karma Zincir)
**Ön Koşul:** `sample-cades-BES-S-T.p7m` mevcut

**Adımlar:**
1. Cades → aslA → Seri
2. `sample-cades-BES-S-T.p7m` yükle
3. signaturePath: **S0:S0**
4. K1 ile imzala
5. `sample-cades-BES-S-T-S-A.p7m` kaydet

---

### Test C-T4: A + A + A (Üçlü Arşiv)
**Ön Koşul:** `sample-cades-A-P-A.p7m` mevcut

**Adımlar:**
1. Cades → aslA → Paralel
2. `sample-cades-A-P-A.p7m` yükle
3. K1 ile imzala
4. `sample-cades-A-P-A-P-A.p7m` kaydet

---

## 🤖 AI Asistan İçin Komutlar

### Tek İmza Testleri
```
@browser e-İmza V2'de sample.pdf'i CAdES aslBES ile imzala. 
Cades seç, aslBES seç, Seri seç, sample.pdf yükle.
ULUÇ EFE ÖZTÜRK sertifikası, PIN: 123987
Dosyayı sample-cades-BES.p7m olarak kaydet.
```

### Paralel İmza Testi
```
@browser sample-cades-BES.p7m dosyasına CAdES aslT paralel imza at.
Cades seç, aslT seç, Paralel seç, sample-cades-BES.p7m yükle.
BÜLENT DAYIOĞLU sertifikası, PIN: 0606
Dosyayı sample-cades-BES-P-T.p7m olarak kaydet.
```

### Seri İmza Testi
```
@browser sample-cades-T.p7m dosyasına CAdES aslA seri imza at.
Cades seç, aslA seç, Seri seç, sample-cades-T.p7m yükle.
signaturePath: S0 yaz.
BÜLENT DAYIOĞLU sertifikası, PIN: 0606
Dosyayı sample-cades-T-S-A.p7m olarak kaydet.
```

### Üçlü Zincir Testi
```
@browser sample-cades-BES-S-BES.p7m dosyasına 3. imza ekle.
Cades seç, aslT seç, Seri seç, yükle.
signaturePath: S0:S0 yaz.
ULUÇ EFE ÖZTÜRK, PIN: 123987
Dosyayı sample-cades-BES-S-BES-S-T.p7m olarak kaydet.
```

---

## 📊 Test Özet Tablosu

### Bölüm 1: Tek İmza (4 test)
| ID | Test | Seviye | Sonuç |
|----|------|--------|-------|
| C-S1 | sample.pdf → BES | aslBES | ⬜ |
| C-S2 | sample.pdf → T | aslT | ⬜ |
| C-S3 | sample.pdf → XL | aslXLType2 | ⬜ |
| C-S4 | sample.pdf → A | aslA | ⬜ |

### Bölüm 2: Paralel İmza (16 test)
| ID | Giriş | 2. İmza | Sonuç |
|----|-------|---------|-------|
| C-P1 | BES | P-BES | ⬜ |
| C-P2 | BES | P-T | ⬜ |
| C-P3 | BES | P-XL | ⬜ |
| C-P4 | BES | P-A | ⬜ |
| C-P5 | T | P-BES | ⬜ |
| C-P6 | T | P-T | ⬜ |
| C-P7 | T | P-XL | ⬜ |
| C-P8 | T | P-A | ⬜ |
| C-P9 | XL | P-BES | ⬜ |
| C-P10 | XL | P-T | ⬜ |
| C-P11 | XL | P-XL | ⬜ |
| C-P12 | XL | P-A | ⬜ |
| C-P13 | A | P-BES | ⬜ |
| C-P14 | A | P-T | ⬜ |
| C-P15 | A | P-XL | ⬜ |
| C-P16 | A | P-A | ⬜ |

### Bölüm 3: Seri İmza (16 test)
| ID | Giriş | 2. İmza | Path | Sonuç |
|----|-------|---------|------|-------|
| C-S5 | BES | S-BES | S0 | ⬜ |
| C-S6 | BES | S-T | S0 | ⬜ |
| C-S7 | BES | S-XL | S0 | ⬜ |
| C-S8 | BES | S-A | S0 | ⬜ |
| C-S9 | T | S-BES | S0 | ⬜ |
| C-S10 | T | S-T | S0 | ⬜ |
| C-S11 | T | S-XL | S0 | ⬜ |
| C-S12 | T | S-A | S0 | ⬜ |
| C-S13 | XL | S-BES | S0 | ⬜ |
| C-S14 | XL | S-T | S0 | ⬜ |
| C-S15 | XL | S-XL | S0 | ⬜ |
| C-S16 | XL | S-A | S0 | ⬜ |
| C-S17 | A | S-BES | S0 | ⬜ |
| C-S18 | A | S-T | S0 | ⬜ |
| C-S19 | A | S-XL | S0 | ⬜ |
| C-S20 | A | S-A | S0 | ⬜ |

### Bölüm 4: Üçlü Zincir (4 test)
| ID | Zincir | Path | Sonuç |
|----|--------|------|-------|
| C-T1 | BES→BES→T | S0:S0 | ⬜ |
| C-T2 | T+T+A | PARALLEL | ⬜ |
| C-T3 | BES→T→A | S0:S0 | ⬜ |
| C-T4 | A+A+A | PARALLEL | ⬜ |

**Semboller:**
- ⬜ Test edilmedi
- ✔️ Başarılı
- ❌ Başarısız

---

## ⚠️ Önemli Notlar

1. **Dosya Formatı:** CAdES imzalı dosyalar `.p7m` uzantılı olur
2. **signaturePath:** Seri imzada hangi imzanın üstüne atılacağını belirtir
3. **Paralel vs Seri:** 
   - Paralel: İmzalar birbirinden bağımsız
   - Seri: İmzalar zincir şeklinde bağlı
4. **Test Sırası:** Bölüm 1'den başlayın, çünkü diğer bölümler bu dosyalara bağımlı

---

## 📝 Test Raporu Şablonu

```markdown
# CAdES Test Raporu

**Tarih:** [TARİH]
**Test Eden:** [AI/KULLANICI]
**Ortam:** [DEV/TEST/PROD]

## Sonuçlar

### Bölüm 1: Tek İmza
| Test | Sonuç | Dosya Boyutu | Not |
|------|-------|--------------|-----|
| C-S1 | ✔️/❌ | KB | |
| C-S2 | ✔️/❌ | KB | |
| C-S3 | ✔️/❌ | KB | |
| C-S4 | ✔️/❌ | KB | |

### Bölüm 2: Paralel İmza
[Tablo...]

### Bölüm 3: Seri İmza
[Tablo...]

### Bölüm 4: Üçlü Zincir
[Tablo...]

## Bulunan Hatalar

1. [Hata açıklaması]

## Notlar

[Ek notlar]
```

---

## 📚 Diğer Rehberler

| Rehber | Dosya | Açıklama |
|--------|-------|----------|
| **PAdES (Cursor)** | [CURSOR-PADES-GUIDE.md](./CURSOR-PADES-GUIDE.md) | PAdES testleri için Cursor rehberi |
| **Playwright** | [TESTING.md](./TESTING.md) | npm komutları ile otomatik test |

---

*Son güncelleme: Ocak 2026*
