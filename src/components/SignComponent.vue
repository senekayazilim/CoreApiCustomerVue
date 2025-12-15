<script setup lang="ts">
import { onMounted, ref } from "@vue/runtime-core";
import axios from "axios";
import { CpuChipIcon } from "@heroicons/vue/20/solid";
import { ExclamationTriangleIcon, ComputerDesktopIcon, ArrowDownTrayIcon, ClockIcon, LockClosedIcon, CheckBadgeIcon, Cog6ToothIcon } from "@heroicons/vue/24/outline";
import { type ProxyCreateStateOnOnaylarimApiResult, type ProxyFinishSignResult, type ProxyCreateStateOnOnaylarimApiRequest } from "../types/Types";
import { type CertificateInfo, type GetSignerAppVersionsResult, type SignerAppPingResult, type SignerAppResetResult, type SignStepTwoResult, type WebToAvalonSignStepTwoRequest } from "../types/AgentTypes";
import { HandleError } from "../types/HandleError";
import CardComponent from "./CardComponent.vue";
import store from "@/types/Store";

// Kullanıcıya gösterilen mesaj
const waitString = ref("");
// yapılan işlemler
const logs = ref([] as Array<string>);
// e-imza aracı durumu
const localSignerMode = ref("");
// kullanıcının seçtiği sertifika
const selectedCertificate = ref(null as CertificateInfo | null);
// onaylarim API'den alınan, e-imza aracının güncel versiyon bilgisi. bu bilgi ile kullanıcı bilgisayarında kurulu olan e-imza aracı sürümü karşılaştırılır, kullanıcıdaki sürüm eski ise uyarı verilir
const getSignerAppVersionsResult = ref({} as GetSignerAppVersionsResult);
// e-imza aracına yapılan RESET adlı GET request'i sonrasında dönen değer
const signerAppResetResult = ref(null as SignerAppResetResult | null);
// primeAPI'de kullanılacak tekil operasyon numarası
const operationId = ref("");
// ONAYLARIM e-imza aracına başarıyla bağlanılan URL adresi
const workingUrl = ref("");
// imza türleri
const signatureTypes = [
  { id: "pades", title: "Pades" },
  { id: "cades", title: "Cades" },
  { id: "xades", title: "Xades" },

];
// kullanıcının seçtiği imza türü
const selectedSignatureType = ref(signatureTypes[0]);

// Pades imza atılırken, İmza işlemi sonrası imzanın LTV'ye upgrade edilip edilmeyeceğini belirler. Belgede N imza olacaksa, 1, 2, 3 ... , N-1 inci imzalar için False, sadece son imza için True gönderilmelidir.
const upgradeToLtv = ref(false);

// XADES imza atarken Enveloped yerine Enveloping imza at
const useEnvelopingSignature = ref(false);

// Kullanıcının kart şifresi
const userPin = ref("");

onMounted(() => {
  // sayfa ilk yüklendiğinde onaylarim API'den e-imza aracının güncel versiyon bilgisi alınır
  logs.value = [] as Array<string>;
  GetSignerAppVersions();
});

// kullanıcı AÇ butonuna bastığında e-imza aracı açılır
function OpenSignerApp() {
  try {
    window.location.href = 'onaylarimsignerapp:"start"';
    // e-imza aracına bağlanılmaya çalışılır
    TryToConnect();
  } catch (err) {
    console.log("open signer app error.", err);
  }
}

// onaylarim API'den e-imza aracının güncel versiyon bilgisini alır
function GetSignerAppVersions() {
  // CORS hatası alacaktır. Ancak demo uygulamanın çalışmasına engel bir durum değildir.
  // ONAYLARIM on-Prem kurulduğunda, client uygulamadan gelen requestlere izin verilecek şekilde CORS ayarı yapılacaktır.
  // ONAYLARIM SaaS kullanıldığında, client uygulamadan gelen requestlere izin verilecek şekilde CORS ayarı yapılacaktır.
  logs.value.push("e-İmza aracı son sürümü alınıyor.");
  axios
    .get("https://apitest.onaylarim.com/sign/GetSignerAppVersions")
    .then((result) => {
      if (result.data.error) {
        logs.value.push("Uygulama güncel sürümü alınırken hata oluştu. Detaylar için console'a bakınız.");
        console.log("Uygulama güncel sürümü alınırken hata oluştu.", result);
      } else {
        getSignerAppVersionsResult.value = result.data.result as GetSignerAppVersionsResult;
        logs.value.push("Uygulama güncel sürümü alındı. Detaylar için console'a bakınız.");
        console.log("Uygulama güncel sürümü.", getSignerAppVersionsResult.value);
      }
    })
    .catch(async (error) => {
      logs.value.push("Uygulama güncel sürümü alınırken hata oluştu. Detaylar için console'a bakınız.");
      console.log("Uygulama güncel sürümü alınırken hata oluştu. ", error);
    });
}

async function TryToConnect() {
  const httpsTryIsOk = await LocalSignerPing(true, false);
  if (httpsTryIsOk) {
    workingUrl.value = "https://localsigner.onaylarim.com:8099";

    // bilgisayarda e-imza aracı var, çalışıyor durumda ve https bağlantı yapılabildi
    LocalSignerReset();
  } else {
    // bilgisayarda e-imza aracı var, çalışmıyor
    // bilgisayarda e-imza aracı var, çalışıyor ancak https bağlantı yapılamadı
    const httpTryIsOk = await LocalSignerPing(false, false);
    if (httpTryIsOk) {
      workingUrl.value = "http://localsigner.onaylarim.com:8099";
      // bilgisayarda e-imza aracı var, çalışıyor durumda ve http bağlantı yapılabildi
      LocalSignerReset();
    } else {
      // bilgisayarda e-imza aracı var, çalışmıyor
      // bilgisayarda e-imza aracı var, çalışıyor ancak http bağlantı yapılamadı

      const httpTryWithLocalhostIsOk = await LocalSignerPing(false, true);
      if (httpTryWithLocalhostIsOk) {
        workingUrl.value = "http://localhost:8099";

        LocalSignerReset();
      }
    }
  }
}

// e-İmza aracına bağlanmaya çalışır. sertifikaları almaya çalışmadığı için bilgisayarda e-imza aracının çalışır durumda olup olmadığını anlamak için en hızlı yöntemdir.
async function LocalSignerPing(useHttps: boolean, useLocalhost: boolean): Promise<boolean> {
  const url = (useHttps ? "https" : "http") + (useLocalhost ? "://localhost:8099/ping" : "://localsigner.onaylarim.com:8099/ping");

  logs.value.push("e-İmza aracına " + (useHttps ? "SSL" : "HTTP") + " PING isteği gönderiliyor. Url: " + url);
  try {
    const axiosResponse = await axios.get(url, { timeout: 500 });
    logs.value.push("e-İmza aracına " + (useHttps ? "SSL" : "HTTP") + " PING isteği döndü. Detaylar için console'a bakınız.");
    console.log("e-İmza aracına " + (useHttps ? "SSL" : "HTTP") + " PING isteğ sonucu.", axiosResponse);
    const signerAppPingResult = axiosResponse.data as SignerAppPingResult;
    if (signerAppPingResult.error === undefined || signerAppPingResult.error === null || signerAppPingResult.error.length === 0) {
      return true;
    }
    return false;
  } catch (error: any) {
    logs.value.push("e-İmza aracına " + (useHttps ? "SSL" : "HTTP") + " PING isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
    console.log("e-İmza aracına " + (useHttps ? "SSL" : "HTTP") + " PING isteği gönderilemedi.", error);
    localSignerMode.value = "baglantiKurulamadı";
    return false;
  }
}

// e-İmza aracına bağlanıp varsa takılı sertifikalar alınır
function LocalSignerReset() {
  signerAppResetResult.value = null;
  operationId.value = "";
  localSignerMode.value = "working";
  waitString.value = "";
  // reset fonkisyonu ile e-İmza aracına bağlanıp varsa takılı sertifikalar alınır. e-imza aracı reset fonksiyonu ile takılı sertifiları baştan aramaya başlar.
  logs.value.push("e-İmza aracına " + workingUrl.value + " RESET isteği gönderiliyor. ");
  axios
    .get(workingUrl.value + "/reset")
    .then((result) => {
      logs.value.push("e-İmza aracına " + workingUrl.value + " RESET isteği döndü. Detaylar için console'a bakınız.");
      console.log("e-İmza aracına " + workingUrl.value + " RESET isteğ sonucu.", result);
      signerAppResetResult.value = result.data as SignerAppResetResult;
      // signerAppStatus açıklamaları definition'da bulunabilir
      if (signerAppResetResult.value.signerAppStatus === 1) {
        // e-imza aracı sertifikaları bulmaya çalışıyorsa arka arkaya en fazla 10 kere olacak şekilde tekrardan e-imza aracı durumu sorgulanır. reset fonksiyonundan farklı olarak takılı sertifikalar baştan aranmaz, sadece e-imza aracı durumunu döner
        let counter = 0;
        while (counter < 10) {
          axios.get(workingUrl.value + "/ping").then((result) => {
            const signerAppPingResult = result.data as SignerAppPingResult;
            // GettingSmartCards dışında bir değer dönerse while loop sonlandırılır
            if (signerAppPingResult.signerAppStatus !== 1) {
              counter = 10;
            }
          });
          counter++;
        }
      }
      let desiredVersion = 0;
      if (signerAppResetResult.value.signerAppPlatform === "windows") {
        // e-imza aracı Windows sürümü ise, yani son kullanıcı bilgisayarı Windows ise, olması gereken sürüm olarak OnaylarimAPI'den alınan Windows için son sürüm numarası set edilir
        desiredVersion = getSignerAppVersionsResult.value.signerAppWindowsVersion;
      } else if (signerAppResetResult.value.signerAppPlatform === "macos") {
        // e-imza aracı MacOS sürümü ise, yani son kullanıcı bilgisayarı MacOS ise, olması gereken sürüm olarak OnaylarimAPI'den alınan MacOS için son sürüm numarası set edilir
        desiredVersion = getSignerAppVersionsResult.value.signerAppMacVersion;
      } else if (signerAppResetResult.value.signerAppPlatform === "linux") {
        // e-imza aracı Linux sürümü ise, yani son kullanıcı bilgisayarı Linux ise, olması gereken sürüm olarak OnaylarimAPI'den alınan Linux için son sürüm numarası set edilir
        desiredVersion = getSignerAppVersionsResult.value.signerAppMacVersion;
      } else if (signerAppResetResult.value.signerAppPlatform === "freebsd") {
        // e-imza aracı freebsd sürümü ise, yani son kullanıcı bilgisayarı freebsd ise, olması gereken sürüm olarak OnaylarimAPI'den alınan freebsd için son sürüm numarası set edilir
        desiredVersion = getSignerAppVersionsResult.value.signerAppMacVersion;
      }
      // kullanıcı bilgisayrında kurulu sürüm, olması gereken sürümden eski bir sürüm ise
      if (signerAppResetResult.value.signerAppDllVersion < desiredVersion) {
        localSignerMode.value = "varAncakVersiyonEski";
        return;
      } else {
        localSignerMode.value = "varVeVersiyonYeni";
        selectedCertificate.value = null;
        // kullanıcı bilgisayarında en az bir tane sertifika bulundu ise seçili sertifika olarak atanır
        if (signerAppResetResult.value.certificates !== undefined && signerAppResetResult.value.certificates !== null && signerAppResetResult.value.certificates.length === 1) {
          selectedCertificate.value = signerAppResetResult.value.certificates[0];
        }
        return;
      }
    })
    .catch((error) => {
      logs.value.push("e-İmza aracına " + workingUrl.value + " RESET isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
      console.log("e-İmza aracına " + workingUrl.value + " RESET isteği gönderilemedi.", error);
      localSignerMode.value = "baglantiKurulamadı";
    })
    .finally(() => {
      logs.value.push("e-İmza aracına durumu " + workingUrl.value + " : " + localSignerMode.value);
    });
}

// imza işlemini gerçekleştiren fonksiyondur
function Sign(certificate: CertificateInfo) {
  operationId.value = "";
  const createStateOnOnaylarimApiRequest = { certificate: certificate.data, signatureType: selectedSignatureType.value.id } as ProxyCreateStateOnOnaylarimApiRequest;

  if (useEnvelopingSignature.value === true) {
    createStateOnOnaylarimApiRequest.xmlSignatureType = 2;
  }

  waitString.value = "İmza işlemi hazırlanıyor.";
  logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApi isteği gönderiliyor.");
  axios
    .post(store.API_URL + "/Onaylarim/CreateStateOnOnaylarimApi", createStateOnOnaylarimApiRequest)
    .then((createStateOnOnaylarimApiResponse) => {
      logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApi isteği gönderildi. Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına CreateStateOnOnaylarimApi isteği gönderildi.", createStateOnOnaylarimApiResponse);

      waitString.value = "İmza işlemi baştıldı.";
      const config = {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };
      const createStateOnOnaylarimApiResult = createStateOnOnaylarimApiResponse.data as ProxyCreateStateOnOnaylarimApiResult;
      console.log("createStateOnOnaylarimApiResult", createStateOnOnaylarimApiResult);

      if (createStateOnOnaylarimApiResult.error !== undefined && createStateOnOnaylarimApiResult.error !== null && createStateOnOnaylarimApiResult.error.length > 0) {
        logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApi isteği hata döndü. Hata: " + createStateOnOnaylarimApiResult.error);
        return;
      }
      const signStepTwoRequest = {
        keyId: createStateOnOnaylarimApiResult.keyID,
        keySecret: createStateOnOnaylarimApiResult.keySecret,
        state: createStateOnOnaylarimApiResult.state,
        pkcsLibrary: certificate.pkcsLibrary,
        slot: certificate.slot,
        pin: userPin.value,
        certificateIndex: certificate.certificateIndex
      } as WebToAvalonSignStepTwoRequest;
      // e-imza aracına e-imza atması için istekte bulunulur. Kartta bulunan sertifika ile imzalama işlemi bu adımda yapılır.
      logs.value.push("e-İmza aracına SIGNSTEPTWO isteği gönderiliyor.");
      axios
        .post(workingUrl.value + "/signStepTwo", JSON.stringify(signStepTwoRequest), config)
        .then((signStepTwoResponse) => {
          const signStepTwoResult = signStepTwoResponse.data as SignStepTwoResult;
          if (signStepTwoResult.error !== undefined && signStepTwoResult.error !== null) {
            if (signStepTwoResult.error.search("INCORRECT_PIN") >= 0) {
              logs.value.push("e-İmza aracına SIGNSTEPTWO isteği hata döndü. Detaylar için console'a bakınız.");
              console.log("e-İmza aracına SIGNSTEPTWO isteği sonucu.", signStepTwoResult);
              waitString.value = "Hata oluştu. " + "e-İmza şifreniz yanlış.";
            } else if (signStepTwoResult.error.search("PIN_BLOCKED") >= 0) {
              logs.value.push("e-İmza aracına SIGNSTEPTWO isteği hata döndü. Detaylar için console'a bakınız.");
              console.log("e-İmza aracına SIGNSTEPTWO isteği sonucu.", signStepTwoResult);
              waitString.value = "Hata oluştu. " + "e-İmza şifreniz blokeli.";
            } else {
              logs.value.push("e-İmza aracına SIGNSTEPTWO isteği hata döndü. Detaylar için console'a bakınız.");
              console.log("e-İmza aracına SIGNSTEPTWO isteği sonucu.", signStepTwoResult);
              waitString.value = "Hata oluştu. " + signStepTwoResult.error;
            }
          } else {
            if (signStepTwoResult.error) {
              logs.value.push("e-İmza aracına SIGNSTEPTWO isteği hata döndü. Detaylar için console'a bakınız.");
              console.log("e-İmza aracına SIGNSTEPTWO isteği sonucu.", signStepTwoResult);
              waitString.value = "Hata oluştu. " + signStepTwoResult.error;
            } else {
              logs.value.push("e-İmza aracına SIGNSTEPTWO isteği başarıyla tamamlandı.");
              // e-imza son adım çalıştırılır. 2. adımda imzalanan veri API'ye gönderilir
              const finishSignRequest = {
                keyId: createStateOnOnaylarimApiResult.keyID,
                keySecret: createStateOnOnaylarimApiResult.keySecret,
                signedData: signStepTwoResult.signedData,
                operationId: createStateOnOnaylarimApiResult.operationId,
                signatureType: selectedSignatureType.value.id,
                dontUpgradeToLtv: !upgradeToLtv.value,
              };
              logs.value.push("Sizin sunucu katmanına FinishSign isteği gönderiliyor.");
              axios
                .post(store.API_URL + "/Onaylarim/FinishSign", finishSignRequest)
                .then((finishSignResponse) => {
                  logs.value.push("Sizin sunucu katmanına FinishSign isteği gönderildi. Detaylar için console'a bakınız.");
                  console.log("Sizin sunucu katmanına FinishSign isteği gönderildi.", createStateOnOnaylarimApiResponse);
                  const finishSignResult = finishSignResponse.data as ProxyFinishSignResult;
                  if (finishSignResult.isSuccess) {
                    logs.value.push("Sizin sunucu katmanına FinishSign istiği sonucu: İşlem başarılı.");
                    waitString.value = "İmza işlemi tamamlandı.";
                    operationId.value = createStateOnOnaylarimApiResult.operationId;
                  } else {
                    logs.value.push("Sizin sunucu katmanına FinishSign istiği sonucu: İşlem başarısız.");
                    waitString.value = "İmza işlemi tamamlanamadı.";
                  }
                })
                .catch((error) => {
                  logs.value.push("Sizin sunucu katmanına FinishSign isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
                  console.log("Sizin sunucu katmanına FinishSign isteği gönderilemedi.", error);
                });
            }
          }
        })
        .catch((error) => {
          logs.value.push("e-İmza aracına SIGNSTEPTWO isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
          console.log("e-İmza aracına SIGNSTEPTWO isteği gönderilemedi.", error);
        });
    })
    .catch((error) => {
      logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApi isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına CreateStateOnOnaylarimApi isteği gönderilemedi.", error);
    });
}

function DownloadFile() {
  axios
    .get(store.API_URL + "/Onaylarim/DownloadSignedFileFromOnaylarimApi?operationId=" + operationId.value, { responseType: "blob" })
    .then((e) => {
      if (e.data.error) {
        waitString.value = "Hata oluştu. " + e.data.error;
      } else {
        let filename = "dosya.pdf";
        const contentDisposition = e.headers["Content-Disposition"];
        if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;\n]*=(UTF-\d['"]*)?((['"]).*?[.]$\2|[^;\n]*)?/gi);
          if (match && match[1]) {
            const a1 = match[1].split("''")[1];
            if (a1) {
              filename = decodeURI(a1);
            }
          }
        }
        const fileURL = window.URL.createObjectURL(new Blob([e.data]));
        const fileLink = document.createElement("a");
        fileLink.href = fileURL;
        fileLink.setAttribute("download", filename);
        document.body.appendChild(fileLink);
        fileLink.click();
      }
    })
    .catch((error) => {
      logs.value.push("Sizin sunucu katmanına DownloadSignedFileFromOnaylarimApi isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına DownloadSignedFileFromOnaylarimApi isteği gönderilemedi.", error);
    });
}
</script>

<template>
  <main class="space-y-4">
    <CardComponent title="e-İmza">
      <template v-slot:icon>
        <Cog6ToothIcon></Cog6ToothIcon>
      </template>
      <template v-slot:content>
        <div class="flex items-end">
          <div class="">
            <div class="text-sm text-gray-700">
              <p>Hangi türde e-imza atılmasını istiyorsanız seçiniz?</p>
            </div>
            <div class="mt-1 flex items-center">
              <fieldset>
                <legend class="sr-only">Notification method</legend>
                <div class="space-y-4 sm:flex sm:items-center sm:space-x-10 sm:space-y-0">
                  <div v-for="signatureType in signatureTypes" :key="signatureType.id"
                    class="flex items-center cursor-pointer">
                    <input :id="signatureType.id" name="notification-method" type="radio" :value="signatureType"
                      v-model="selectedSignatureType"
                      class="h-4 w-4 border-gray-300 text-yellow-600 focus:ring-yellow-600 cursor-pointer" />
                    <label :for="signatureType.id"
                      class="ml-3 block text-sm font-medium leading-6 text-gray-900 cursor-pointer">{{
                        signatureType.title
                      }}</label>
                  </div>
                </div>
                <div class="relative flex items-start" v-if="selectedSignatureType.id === signatureTypes[0].id">
                  <div class="flex h-6 items-center">
                    <input v-model="upgradeToLtv" id="candidates" aria-describedby="candidates-description"
                      name="candidates" type="checkbox"
                      class="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-600" />
                  </div>
                  <div class="ml-3 text-sm leading-6">
                    <label for="candidates" class="font-medium text-gray-500">LTV imza at</label>
                  </div>
                </div>
                <div class="relative flex items-start" v-if="selectedSignatureType.id === signatureTypes[2].id">
                  <div class="flex h-6 items-center">
                    <input v-model="useEnvelopingSignature" id="useEnvelopingSignature"
                      aria-describedby="useEnvelopingSignature-description" name="useEnvelopingSignature"
                      type="checkbox" class="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-600" />
                  </div>
                  <div class="ml-3 text-sm leading-6">
                    <label for="useEnvelopingSignature" class="font-medium text-gray-500">Enveloping imza at</label>
                  </div>
                </div>
              </fieldset>



            </div>
          </div>
          <div class="flex-grow"></div>
          <div class="">
            <button @click="TryToConnect()" type="button"
              class="rounded-md bg-orange-200 px-2 py-1.5 text-sm font-medium text-gray-900 hover:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-800 focus:ring-offset-2 focus:ring-offset-orange-200">Başla</button>
          </div>
        </div>
      </template>
    </CardComponent>

    <CardComponent v-if="localSignerMode === 'working'" title="e-İmzalar aranıyor">
      <template v-slot:icon>
        <ClockIcon></ClockIcon>
      </template>
      <template v-slot:content>
        <div class="mt-2 text-sm text-gray-700">
          <p>e-İmza aracı ve e-imza kartları aranıyor. Lütfen bekleyiniz.</p>
        </div>
      </template>
    </CardComponent>

    <CardComponent v-if="localSignerMode === 'baglantiKurulamadı'" title="e-İmza Aracı Bulunamadı">
      <template v-slot:icon>
        <ExclamationTriangleIcon></ExclamationTriangleIcon>
      </template>
      <template v-slot:content>
        <div class="text-sm text-gray-700">
          <p>Aşağıdaki seçeneklerden birini tamamladıktan sonra yenile düğmesine basabilirsiniz</p>
        </div>
        <div class="mt-4">
          <div class="-mx-2 -my-1.5 flex space-x-3">
            <button @click="TryToConnect()" type="button"
              class="rounded-md bg-orange-200 px-2 py-1.5 text-sm font-medium text-gray-900 hover:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-800 focus:ring-offset-2 focus:ring-offset-orange-200">Yenile</button>
          </div>
        </div>
      </template>
    </CardComponent>

    <div class="grid grid-cols-2 gap-4">
      <CardComponent v-if="localSignerMode === 'baglantiKurulamadı'" title="e-İmza Aracını Aç">
        <template v-slot:icon>
          <ComputerDesktopIcon></ComputerDesktopIcon>
        </template>
        <template v-slot:content>
          <div class="mt-2 text-sm text-gray-700">
            <p>e-İmza aracını bilgisayarınıza daha önce kurduysanız aşağıdaki butonu kullanarak açabilirsiniz.</p>
          </div>
          <div class="mt-4">
            <div class="-mx-2 -my-1.5 flex space-x-3">
              <button @click="OpenSignerApp" type="button"
                class="rounded-md bg-orange-200 px-2 py-1.5 text-sm font-medium text-gray-900 hover:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-800 focus:ring-offset-2 focus:ring-offset-gray-200">Aç</button>
            </div>
          </div>
        </template>
      </CardComponent>
      <CardComponent v-if="localSignerMode === 'baglantiKurulamadı'" title="e-İmza Aracını İndir">
        <template v-slot:icon>
          <ArrowDownTrayIcon></ArrowDownTrayIcon>
        </template>
        <template v-slot:content>
          <div class="mt-2 text-sm text-gray-700">
            <p>e-İmza aracını bilgisayarınıza kurmak için aşağıdaki butonu kullanabilirsiniz. Kurulumu tamamladıktan
              sonra aşağıdaki yenile butonuna basabilirsiniz.</p>
          </div>
          <div class="mt-4">
            <div class="-mx-2 -my-1.5 flex space-x-3">
              <a :href="getSignerAppVersionsResult.signerAppWindowsUrl"
                class="rounded-md bg-orange-200 px-2 py-1.5 text-sm font-medium text-gray-900 hover:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-800 focus:ring-offset-2 focus:ring-offset-orange-200">
                Windows </a>
              <a :href="getSignerAppVersionsResult.signerAppMacUrl"
                class="rounded-md bg-orange-200 px-2 py-1.5 text-sm font-medium text-gray-900 hover:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-800 focus:ring-offset-2 focus:ring-offset-orange-200">
                Mac </a>
            </div>
          </div>
        </template>
      </CardComponent>
    </div>

    <CardComponent v-if="localSignerMode === 'varVeVersiyonYeni'" title="e-İmzalar">
      <template v-slot:icon>
        <CpuChipIcon></CpuChipIcon>
      </template>
      <template v-slot:content>
        <div class="flex flex-col space-y-4">
          <div class="text-sm text-gray-700">
            <p>Bilgisayarınıza takılı e-imzalar aşağıda listelenmiştir. İşlem yapmak istediğiniz sertifika için PIN
              girip imzalama işlemi yapabilirsiniz.</p>
          </div>
          <div v-if="signerAppResetResult?.certificates !== null && signerAppResetResult?.certificates.length === 0"
            class="border-t border-gray-200">
            <div class="px-4 sm:px-6">
              <dl>
                <div class="px-4 py-6 sm:px-0 flex">
                  <div class="flex-shrink-0">
                    <ExclamationTriangleIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <dt class="ml-3 text-sm text-gray-500">Bilgisayara takılı bir e-imza bulunamadı.</dt>
                </div>
              </dl>
            </div>
          </div>
          <div
            v-if="signerAppResetResult && signerAppResetResult.certificates !== null && signerAppResetResult.certificates.length > 0"
            class="border-t border-gray-200">
            <div class="px-4 sm:px-6">
              <dl v-for="certificate in signerAppResetResult?.certificates" :key="certificate.id"
                class="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4">
                <div class="px-4 py-2 sm:py-6 sm:col-span-1 sm:px-0">
                  <dt class="text-sm font-medium leading-6 text-gray-900">Ad Soyad</dt>
                  <dd class="mt-1 text-sm leading-6 text-gray-700">{{ certificate.personFullname }}</dd>
                </div>
                <div class="px-4 py-2 sm:py-6 sm:col-span-1 sm:px-0">
                  <dt class="text-sm font-medium leading-6 text-gray-900">TC Kimlik No</dt>
                  <dd class="mt-1 text-sm leading-6 text-gray-700">{{ certificate.citizenshipNo }}</dd>
                </div>
                <div class="px-4 py-2 sm:py-6 sm:col-span-1 sm:px-0">
                  <dt class="text-sm font-medium leading-6 text-gray-900">Geçerlilik tarihi</dt>
                  <dd class="mt-1 text-sm leading-6 text-gray-700">{{ certificate.validTo }}</dd>
                </div>
                <div class="px-4 py-2 sm:py-6 sm:col-span-1 sm:px-0">
                  <div>
                    <div class="mt-2 flex rounded-md shadow-sm">
                      <div class="relative flex flex-grow items-stretch focus-within:z-10">
                        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <LockClosedIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input type="password" name="email" id="email" v-model="userPin"
                          class="block w-full rounded-none rounded-l-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                          placeholder="PIN" />
                      </div>
                      <button @click="Sign(certificate)" type="button"
                        class="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                        <CheckBadgeIcon class="-ml-0.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                        İmzala
                      </button>
                    </div>
                  </div>
                </div>
              </dl>
            </div>
          </div>
          <div class="pt-4 border-t border-gray-200" v-if="waitString">
            <p class="max-w-2xl text-sm leading-6 text-gray-500">{{ waitString }}</p>

            <p v-if="operationId && operationId.length > 0" @click="DownloadFile()"
              class="max-w-2xl text-sm leading-6 text-orange-500 hover:underline cursor-pointer">e-İmzalı dosyayı indir
            </p>
          </div>
        </div>
      </template>
    </CardComponent>

    <div class="pt-4 border-t border-gray-200 text-xs" v-if="logs && logs.length > 0">
      <p class="leading-6 text-sm font-medium">İşlemler</p>

      <p v-for="(logItem, index) in logs" :key="index" class="">{{ logItem }}</p>
    </div>
  </main>
</template>
