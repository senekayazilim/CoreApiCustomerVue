# Sample Porject for ONAYLARIM coreAPI

ONAYLARIM coreAPI için örnek istemci (browser) uygulamasıdır.

![image](https://github.com/DanialHuckabee/CoreApiCustomerVue/assets/14294898/dc7c4193-7399-4c3d-b39f-291aeb1b8aef)

## Başlarken

Sunucu tarafı için [Sunucu Projesini](https://github.com/DanialHuckabee/CoreApiCustomerApi) indirin.

Koddaki `API_URL` değişkenlerini sunucu tarafı projesinin URL'sine güncelleyin.

ONAYLARIM e-İmza Aracı, yalnızca onaylanmış URL'lerden gelen istekleri kabul eder. Bu nedenle lütfen bize istemci tarafı uygulamanızın URL'sini gönderin.

# e-İmza Aracı getstatus Metodu

## Genel Bakış
Uygulama, çeşitli işlemleri ve durumları dört ana bileşenden oluşur:

1. `Log` - Güvenli URL işlemleri için detaylı loglar
2. `LogSummary` - Güvenli URL işlemleri için özet durum
3. `LogForVersionControl` - Sürüm kontrol işlemleri için detaylı loglar
4. `LogForVersionControlSummary` - Sürüm kontrol işlemleri için özet durum

## Log Türleri ve Kullanımları

### 1. Güvenli URL Loglaması (`Log`)

#### Amaç
Güvenli URL yönetimi ile ilgili detaylı işlemleri takip eder:
- URL listesi indirme işlemleri
- Önbellek işlemleri
- Hata durumları
- Varsayılan URL listesi kullanımı

#### Yaygın Log Mesajları
- "SafeUrls downloaded from server." (Sunucudan URL'ler indirildi)
- "Cache successfully updated." (Önbellek başarıyla güncellendi)
- "Using cache. Cache date: {date}" (Önbellek kullanılıyor. Tarih: {date})
- "Cache is too old or invalid. Cache date: {date}" (Önbellek çok eski veya geçersiz. Tarih: {date})
- "Using default URL list." (Varsayılan URL listesi kullanılıyor)
- "Decryption failed. Error: {error}" (Şifre çözme başarısız. Hata: {error})
- "Cache file cannot be read. Error: {error}" (Önbellek dosyası okunamıyor. Hata: {error})

### 2. Güvenli URL Özeti (`LogSummary`)

#### Amaç
Güvenli URL işleminin durumunu tek satırda özetler.

#### Olası Değerler
- `"DOWNLOADEDFROMSERVER"` - URL'ler sunucudan başarıyla indirildiğinde
- `"USINGCACHE.{date}"` - Önbellekteki veri kullanıldığında (tarih ile)
- `"CACHEISOLD.{date}"` - Önbellek çok eski olduğunda (tarih ile)

### 3. Sürüm Kontrol Loglaması (`LogForVersionControl`)

#### Amaç
Sürüm kontrolü ile ilgili detaylı işlemleri takip eder:
- Sürüm kontrol süreci
- Önbellek işlemleri
- Sunucu iletişimi
- Sürüm karşılaştırmaları

#### Yaygın Log Mesajları
- "Starting version check process." (Sürüm kontrol süreci başlatılıyor)
- "Successfully downloaded version information from server." (Sunucudan sürüm bilgisi başarıyla indirildi)
- "Version cache successfully updated." (Sürüm önbelleği başarıyla güncellendi)
- "Using cached version data from {timestamp}" (Önbellekteki sürüm verisi kullanılıyor)
- "Local version: {version}" (Yerel sürüm)
- "Server version: {version}" (Sunucu sürümü)
- "New version available." (Yeni sürüm mevcut)
- "Application is up to date." (Uygulama güncel)

### 4. Sürüm Kontrol Özeti (`LogForVersionControlSummary`)

#### Amaç
Sürüm kontrol işleminin durumunu tek satırda özetler.

#### Olası Değerler
- `"DOWNLOADEDFROMSERVER"` - Sürüm bilgisi sunucudan başarıyla indirildiğinde
- `"USINGCACHE.{timestamp}"` - Önbellekteki sürüm verisi kullanıldığında
- `"CACHEISOLD.{timestamp}"` - Önbellek çok eski olduğunda

## Log Erişimi

Loglar `/getstatus` endpoint'i üzerinden erişilebilir ve aşağıdaki yapıda bir JSON nesnesi döndürür:

```json
{
    "SafeUrlLog": [], // SafeUrlUtil.Log girişlerinin dizisi
    "VersionControlLog": [], // SafeUrlUtil.LogForVersionControl girişlerinin dizisi
    "LogSummary": "", // SafeUrlUtil.LogSummary değeri
    "LogForVersionControlSummary": "" // SafeUrlUtil.LogForVersionControlSummary değeri
}
```

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
    1. Run `Extensions: Show Built-in Extensions` from VSCode's command palette
    2. Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build


https://seneka.com.tr

https://seneka.com.tr/primeapi
```
