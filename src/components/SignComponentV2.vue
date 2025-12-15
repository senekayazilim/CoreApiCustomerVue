<script setup lang="ts">
import { onMounted, ref } from "@vue/runtime-core";
import axios, { AxiosError } from "axios";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, ListboxLabel } from "@headlessui/vue";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/20/solid";
import { CpuChipIcon } from "@heroicons/vue/24/outline";
import { ExclamationTriangleIcon, ComputerDesktopIcon, ArrowDownTrayIcon, LockClosedIcon, CheckBadgeIcon } from "@heroicons/vue/24/outline";
import CardComponent from "./CardComponent.vue";
import { SignatureLevelForPades, SignatureLevelForCades, type ProxyUploadFileResult, type ProxyGetSignatureListResult, type ProxyGetSignatureListResultItem, SignatureLevelForXades, type ProxyCreateStateOnOnaylarimApiForPadesRequestV2, type ProxyCreateStateOnOnaylarimApiResult, type ProxyFinishSignForPadesRequestV2, type ProxyFinishSignResult, type ProxyCreateStateOnOnaylarimApiForCadesRequestV2, type ProxyFinishSignForCadesRequestV2, type ProxyFinishSignForXadesRequestV2, type ProxyCreateStateOnOnaylarimApiForXadesRequestV2 } from "@/types/Types";
import { HandleError } from "@/types/HandleError";
import store from "@/types/Store";
import type { CertificateInfo, GetSignerAppVersionsResult, SignStepTwoResult, SignerAppPingResult, SignerAppResetResult, WebToAvalonSignStepTwoRequest } from "@/types/AgentTypes";

// Kullanıcıya gösterilen mesaj
const waitString = ref("");
// yapılan işlemler
const logs = ref([] as Array<string>);
// primeAPI'de kullanılacak tekil operasyon numarası
//const operationId = ref("");

// primeAPI'de kullanılacak tekil operasyon numarası
const operationIdOfFileUpload = ref("");
const operationIdOfSignStepOne = ref("");
const operationIdOfFinishSign = ref("");

// işlemin başarıyla tamamlanıp tamamlanmadığını gösterir
const isSuccess = ref(false);
// imza listesi
const signatureList = ref(undefined as Array<ProxyGetSignatureListResultItem> | null | undefined);
// e-imza aracı durumu
const localSignerMode = ref("");
// kullanıcının seçtiği sertifika
const selectedCertificate = ref(null as CertificateInfo | null);
// onaylarim API'den alınan, e-imza aracının güncel versiyon bilgisi. bu bilgi ile kullanıcı bilgisayarında kurulu olan e-imza aracı sürümü karşılaştırılır, kullanıcıdaki sürüm eski ise uyarı verilir
const getSignerAppVersionsResult = ref({} as GetSignerAppVersionsResult);
// e-imza aracına yapılan RESET adlı GET request'i sonrasında dönen değer
const signerAppResetResult = ref(null as SignerAppResetResult | null);
// Kullanıcının kart şifresi
const userPin = ref("");
// ONAYLARIM e-imza aracına başarıyla bağlanılan URL adresi
const workingUrl = ref("");


// imza atarken kullanılacak e-imza tür
const signatureTypes = [
  { id: "pades", title: "Pades" },
  { id: "cades", title: "Cades" },
  { id: "xades", title: "Xades" },
];

// kullanıcının seçtiği imza türü
const selectedSignatureType = ref(signatureTypes[0]);

// imza atarken kullanılacak e-imza tür
const isSerialOrParallelOptions = [
  { id: "SERIAL", title: "Seri" },
  { id: "PARALLEL", title: "Paralel" },
];

// Xades imza atarken kullanılacak e-imza tür
const isEnvelopingOrEnvelopedOptions = [
  { id: "ENVELOPED", title: "Enveloped" },
  { id: "ENVELOPING", title: "Enveloping" }
];

const envelopingObjectMimeType = ref("application/pdf");

const envelopingObjectEncoding = ref("http://www.w3.org/2000/09/xmldsig#base64");

const turkishProfileOptions = [
  { id: "NONE", title: "Hiçbiri", value: null, disabled: false },
  { id: "P1", title: "P1", value: "P1", disabled: true },
  { id: "P2", title: "P2", value: "P2", disabled: true },
  { id: "P3", title: "P3", value: "P3", disabled: true },
  { id: "P4", title: "P4", value: "P4", disabled: false },
];

// kullanıcının seçtiği imza profili
const selectedTurkishProfile = ref(turkishProfileOptions[0]);

// imza atarken kullanılacak imza yöntemi
const selectedIsSerialOrParallelOption = ref(isSerialOrParallelOptions[0]);

// Xades imza atarken kullanılacak e-imza tür
const selectedIsEnvelopingOrEnvelopedOption = ref(isEnvelopingOrEnvelopedOptions[0]);


// pades imza seviyeleri
const signatureLevelForPadesOptions = Object.keys(SignatureLevelForPades).filter((key) => isNaN(Number(key))).map((key) => {
  return {
    label: key,
    value: SignatureLevelForPades[key as keyof typeof SignatureLevelForPades]
  };
});

// cades imza seviyeleri
const signatureLevelForCadesOptions = Object.keys(SignatureLevelForCades).filter((key) => isNaN(Number(key))).map((key) => {
  return {
    label: key,
    value: SignatureLevelForCades[key as keyof typeof SignatureLevelForCades]
  };
});

// xades imza seviyeleri
const signatureLevelForXadesOptions = Object.keys(SignatureLevelForXades).filter((key) => isNaN(Number(key))).map((key) => {
  return {
    label: key,
    value: SignatureLevelForXades[key as keyof typeof SignatureLevelForXades]
  };
});



const selectedPadesSignatureLevel = ref(signatureLevelForPadesOptions[0]);
const selectedCadesSignatureLevel = ref(signatureLevelForCadesOptions[0]);
const selectedXadesSignatureLevel = ref(signatureLevelForXadesOptions[0]);
const selectedFile = ref<File | null>(null);
const selectedFileName = ref("");

// imza atarken kullanılacak imza yolu
const signaturePath = ref(null as string | null);


onMounted(() => {
  // sayfa ilk yüklendiğinde onaylarim API'den e-imza aracının güncel versiyon bilgisi alınır
  logs.value = [] as Array<string>;
  GetSignerAppVersions();
});

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

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target?.files && target.files.length > 0) {
    const file = target.files[0];
    selectedFile.value = file;
    selectedFileName.value = file.name;
    logs.value.push(`Sunucuya yüklenecek dosya seçildi: ${file.name}`);
    UploadFileToServer();
  } else {
    selectedFile.value = null;
    selectedFileName.value = "";
  }
}

async function UploadFileToServer() {
  if (!selectedFile.value) {
    waitString.value = "Lütfen sunucuya yüklenecek dosyayı seçiniz.";
    return;
  }

  operationIdOfFileUpload.value = "";
  operationIdOfFinishSign.value = "";
  operationIdOfSignStepOne.value = "";

  const formData = new FormData();
  formData.append("file", selectedFile.value);
  formData.append("filename", selectedFile.value.name);

  try {
    waitString.value = "Dosya sunucuya yükleniyor.";
    logs.value.push(`Sunucuya dosya yükleme isteği gönderiliyor: ${selectedFile.value.name}`);
    const response = await axios.post(store.API_URL + "/Onaylarim/UploadFileV2", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });


    const uploadResult = response.data as ProxyUploadFileResult;
    if (uploadResult?.isSuccess) {
      waitString.value = "Dosya sunucuya başarıyla yüklendi.";
      logs.value.push("Dosya sunucuya başarıyla yüklendi.");
      operationIdOfFileUpload.value = uploadResult.operationId;

      signatureList.value = undefined;
      if (selectedSignatureType.value.id === "cades") {
        GetSignatureListCades();
      }
      if (selectedSignatureType.value.id === "pades") {
        GetSignatureListPades();
      }
      if (selectedSignatureType.value.id === "xades") {
        GetSignatureListXades();
      }
    } else {
      const errorMessage = uploadResult?.error || "Dosya yüklemesi başarısız oldu.";
      waitString.value = errorMessage;
      logs.value.push(errorMessage);
    }
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    const errorMessage = HandleError(normalizedError);
    waitString.value = "Dosya yüklemesi başarısız oldu. " + errorMessage;
    logs.value.push("Dosya yüklemesi başarısız oldu. " + errorMessage);
    console.error("UploadFile error", error);
  }
}


// imza işlemini gerçekleştiren fonksiyondur
function Sign(certificate: CertificateInfo) {
  if (selectedSignatureType.value.id === "pades") {
    SignPadesV2(certificate);
  }
  else if (selectedSignatureType.value.id === "cades") {
    SignCadesV2(certificate);
  }
  else if (selectedSignatureType.value.id === "xades") {
    SignXadesV2(certificate);
  }
}

// Pades imza işlemini gerçekleştiren fonksiyondur
function SignPadesV2(certificate: CertificateInfo) {

  const createStateOnOnaylarimApiForPadesRequestV2 = { certificate: certificate.data, operationId: operationIdOfFileUpload.value } as ProxyCreateStateOnOnaylarimApiForPadesRequestV2;



  waitString.value = "İmza işlemi hazırlanıyor.";
  logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApiForPadesV2 isteği gönderiliyor.");
  axios
    .post(store.API_URL + "/Onaylarim/CreateStateOnOnaylarimApiForPadesV2", createStateOnOnaylarimApiForPadesRequestV2)
    .then((createStateOnOnaylarimApiForPadesResponse) => {
      logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApiForPadesV2 isteği gönderildi. Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına CreateStateOnOnaylarimApiForPadesV2 isteği gönderildi.", createStateOnOnaylarimApiForPadesResponse);

      waitString.value = "İmza işlemi baştıldı.";
      const config = {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };
      const createStateOnOnaylarimApiResult = createStateOnOnaylarimApiForPadesResponse.data as ProxyCreateStateOnOnaylarimApiResult;
      console.log("createStateOnOnaylarimApiResult", createStateOnOnaylarimApiResult);

      if (createStateOnOnaylarimApiResult.error !== undefined && createStateOnOnaylarimApiResult.error !== null && createStateOnOnaylarimApiResult.error.length > 0) {
        logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApiForPadesV2 isteği hata döndü. Hata: " + createStateOnOnaylarimApiResult.error);
        return;
      }
      operationIdOfSignStepOne.value = createStateOnOnaylarimApiResult.operationId;

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
              const finishSignForPadesRequestV2 = {
                keyId: createStateOnOnaylarimApiResult.keyID,
                keySecret: createStateOnOnaylarimApiResult.keySecret,
                signedData: signStepTwoResult.signedData,
                operationId: operationIdOfSignStepOne.value,
                signatureLevel: selectedPadesSignatureLevel.value.value,
              } as ProxyFinishSignForPadesRequestV2;
              logs.value.push("Sizin sunucu katmanına FinishSign isteği gönderiliyor.");
              axios
                .post(store.API_URL + "/Onaylarim/FinishSignForPadesV2", finishSignForPadesRequestV2)
                .then((finishSignResponse) => {
                  logs.value.push("Sizin sunucu katmanına FinishSignForPadesV2 isteği gönderildi. Detaylar için console'a bakınız.");
                  console.log("Sizin sunucu katmanına FinishSignForPadesV2 isteği gönderildi.", finishSignResponse);
                  const finishSignResult = finishSignResponse.data as ProxyFinishSignResult;
                  if (finishSignResult.isSuccess) {
                    logs.value.push("Sizin sunucu katmanına FinishSignForPadesV2 istiği sonucu: İşlem başarılı.");
                    waitString.value = "İmza işlemi tamamlandı.";

                    operationIdOfFinishSign.value = finishSignResult.operationId;
                    isSuccess.value = true;
                  } else {
                    logs.value.push("Sizin sunucu katmanına FinishSignForPadesV2 istiği sonucu: İşlem başarısız.");
                    waitString.value = "İmza işlemi tamamlanamadı.";
                  }
                })
                .catch((error) => {
                  logs.value.push("Sizin sunucu katmanına FinishSignForPadesV2 isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
                  console.log("Sizin sunucu katmanına FinishSignForPadesV2 isteği gönderilemedi.", error);
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
      logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApiForPadesV2 isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına CreateStateOnOnaylarimApiForPadesV2 isteği gönderilemedi.", error);
    });
}

// Cades imza işlemini gerçekleştiren fonksiyondur
function SignCadesV2(certificate: CertificateInfo) {

  const createStateOnOnaylarimApiForCadesRequestV2 =
    {
      certificate: certificate.data,
      operationId: operationIdOfFileUpload.value,

      serialOrParallel: selectedIsSerialOrParallelOption.value.id,
      citizenshipNo: null,
      signatureTurkishProfile: null,
      signaturePath: signaturePath.value
    } as ProxyCreateStateOnOnaylarimApiForCadesRequestV2;



  waitString.value = "İmza işlemi hazırlanıyor.";
  logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApiForCadesV2 isteği gönderiliyor.");
  axios
    .post(store.API_URL + "/Onaylarim/CreateStateOnOnaylarimApiForCadesV2", createStateOnOnaylarimApiForCadesRequestV2)
    .then((createStateOnOnaylarimApiForCadesResponse) => {
      logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApiForCadesV2 isteği gönderildi. Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına CreateStateOnOnaylarimApiForCadesV2 isteği gönderildi.", createStateOnOnaylarimApiForCadesResponse);

      waitString.value = "İmza işlemi baştıldı.";
      const config = {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };
      const createStateOnOnaylarimApiResult = createStateOnOnaylarimApiForCadesResponse.data as ProxyCreateStateOnOnaylarimApiResult;
      console.log("createStateOnOnaylarimApiResult", createStateOnOnaylarimApiResult);



      if (createStateOnOnaylarimApiResult.error !== undefined && createStateOnOnaylarimApiResult.error !== null && createStateOnOnaylarimApiResult.error.length > 0) {
        logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApiForPadesV2 isteği hata döndü. Hata: " + createStateOnOnaylarimApiResult.error);
        return;
      }

      operationIdOfSignStepOne.value = createStateOnOnaylarimApiResult.operationId;

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
              const finishSignForCadesRequestV2 = {
                keyId: createStateOnOnaylarimApiResult.keyID,
                keySecret: createStateOnOnaylarimApiResult.keySecret,
                signedData: signStepTwoResult.signedData,
                operationId: operationIdOfSignStepOne.value,
                signatureLevel: selectedCadesSignatureLevel.value.value,
              } as ProxyFinishSignForCadesRequestV2;
              logs.value.push("Sizin sunucu katmanına FinishSign isteği gönderiliyor.");
              axios
                .post(store.API_URL + "/Onaylarim/FinishSignForCadesV2", finishSignForCadesRequestV2)
                .then((finishSignResponse) => {
                  logs.value.push("Sizin sunucu katmanına FinishSignForCadesV2 isteği gönderildi. Detaylar için console'a bakınız.");
                  console.log("Sizin sunucu katmanına FinishSignForCadesV2 isteği gönderildi.", finishSignResponse);
                  const finishSignResult = finishSignResponse.data as ProxyFinishSignResult;
                  if (finishSignResult.isSuccess) {
                    logs.value.push("Sizin sunucu katmanına FinishSignForCadesV2 istiği sonucu: İşlem başarılı.");
                    waitString.value = "İmza işlemi tamamlandı.";

                    operationIdOfFinishSign.value = finishSignResult.operationId;
                    isSuccess.value = true;
                  } else {
                    logs.value.push("Sizin sunucu katmanına FinishSignForCadesV2 istiği sonucu: İşlem başarısız.");
                    waitString.value = "İmza işlemi tamamlanamadı.";
                  }
                })
                .catch((error) => {
                  logs.value.push("Sizin sunucu katmanına FinishSignForCadesV2 isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
                  console.log("Sizin sunucu katmanına FinishSignForCadesV2 isteği gönderilemedi.", error);
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
      logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApiForCadesV2 isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına CreateStateOnOnaylarimApiForCadesV2 isteği gönderilemedi.", error);
    });
}

function SignXadesV2(certificate: CertificateInfo) {

  const envelopingOrEnveloped =
        selectedIsEnvelopingOrEnvelopedOption.value.id === "ENVELOPING" || selectedIsEnvelopingOrEnvelopedOption.value.id === "ENVELOPED"
            ? selectedIsEnvelopingOrEnvelopedOption.value.id
            : "ENVELOPED";

  const createStateOnOnaylarimApiForXadesRequestV2 =
    {
      certificate: certificate.data,
      operationId: operationIdOfFileUpload.value,
      envelopingOrEnveloped: envelopingOrEnveloped,
      serialOrParallel: selectedIsSerialOrParallelOption.value.id,
      citizenshipNo: null,
      signatureTurkishProfile: null,
      signaturePath: signaturePath.value,
      envelopingObjectMimeType:envelopingObjectMimeType.value,
      envelopingObjectEncoding:envelopingObjectEncoding.value
    } as ProxyCreateStateOnOnaylarimApiForXadesRequestV2;



  waitString.value = "İmza işlemi hazırlanıyor.";
  logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApiForXadesV2 isteği gönderiliyor.");
  axios
    .post(store.API_URL + "/Onaylarim/CreateStateOnOnaylarimApiForXadesV2", createStateOnOnaylarimApiForXadesRequestV2)
    .then((createStateOnOnaylarimApiForXadesResponse) => {
      logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApiForXadesV2 isteği gönderildi. Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına CreateStateOnOnaylarimApiForXadesV2 isteği gönderildi.", createStateOnOnaylarimApiForXadesResponse);

      waitString.value = "İmza işlemi baştıldı.";
      const config = {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };
      const createStateOnOnaylarimApiResult = createStateOnOnaylarimApiForXadesResponse.data as ProxyCreateStateOnOnaylarimApiResult;
      console.log("createStateOnOnaylarimApiResult", createStateOnOnaylarimApiResult);



      if (createStateOnOnaylarimApiResult.error !== undefined && createStateOnOnaylarimApiResult.error !== null && createStateOnOnaylarimApiResult.error.length > 0) {
        logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApiForXadesV2 isteği hata döndü. Hata: " + createStateOnOnaylarimApiResult.error);
        return;
      }

      operationIdOfSignStepOne.value = createStateOnOnaylarimApiResult.operationId;

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
              const finishSignForXadesRequestV2 = {
                keyId: createStateOnOnaylarimApiResult.keyID,
                keySecret: createStateOnOnaylarimApiResult.keySecret,
                signedData: signStepTwoResult.signedData,
                operationId: operationIdOfSignStepOne.value,
                signatureLevel: selectedXadesSignatureLevel.value.value,
              } as ProxyFinishSignForXadesRequestV2;
              logs.value.push("Sizin sunucu katmanına FinishSign isteği gönderiliyor.");
              axios
                .post(store.API_URL + "/Onaylarim/FinishSignForXadesV2", finishSignForXadesRequestV2)
                .then((finishSignResponse) => {
                  logs.value.push("Sizin sunucu katmanına FinishSignForXadesV2 isteği gönderildi. Detaylar için console'a bakınız.");
                  console.log("Sizin sunucu katmanına FinishSignForXadesV2 isteği gönderildi.", finishSignResponse);
                  const finishSignResult = finishSignResponse.data as ProxyFinishSignResult;
                  if (finishSignResult.isSuccess) {
                    logs.value.push("Sizin sunucu katmanına FinishSignForXadesV2 istiği sonucu: İşlem başarılı.");
                    waitString.value = "İmza işlemi tamamlandı.";

                    operationIdOfFinishSign.value = finishSignResult.operationId;
                    isSuccess.value = true;
                  } else {
                    logs.value.push("Sizin sunucu katmanına FinishSignForXadesV2 istiği sonucu: İşlem başarısız.");
                    waitString.value = "İmza işlemi tamamlanamadı.";
                  }
                })
                .catch((error) => {
                  logs.value.push("Sizin sunucu katmanına FinishSignForXadesV2 isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
                  console.log("Sizin sunucu katmanına FinishSignForXadesV2 isteği gönderilemedi.", error);
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
      logs.value.push("Sizin sunucu katmanına CreateStateOnOnaylarimApiForXadesV2 isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına CreateStateOnOnaylarimApiForXadesV2 isteği gönderilemedi.", error);
    });
}

// https://github.com/uuidjs/uuid kullanılmak istenmediğinde onun yerine aşağıdaki fonksiyon kullanılabilir
// function uuidv4(): string {
//     return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: string) => {
//         const randomValues = new Uint8Array(1);
//         crypto.getRandomValues(randomValues);
//         const byte = randomValues[0];
//         return (c ^ (byte & (15 >> (parseInt(c, 10) / 4)))).toString(16);
//     });
// }

function GetSignatureListPades() {


  waitString.value = "Pades imza listesi alınıyor.";
  logs.value.push("Sizin sunucu katmanına GetSignatureListPades isteği gönderiliyor.");
  // mobil imza işlemi yapılır
  axios
    .get(store.API_URL + "/Onaylarim/GetSignatureListPadesV2?operationId=" + operationIdOfFileUpload.value)
    .then((getSignatureListResponse) => {
      logs.value.push("Sizin sunucu katmanına GetSignatureListPades isteği gönderildi. Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına GetSignatureListPades isteği gönderildi.", getSignatureListResponse);
      const getSignatureListResult = getSignatureListResponse.data as ProxyGetSignatureListResult;
      signatureList.value = getSignatureListResult.signatures;
      waitString.value = "Pades imza listesi alındı.";
      console.log("getSignatureListResult", getSignatureListResult);
    })
    .catch((error) => {
      logs.value.push("Sizin sunucu katmanına GetSignatureListPades isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına GetSignatureListPades isteği gönderilemedi.", error);
    });


}

function GetSignatureListCades() {


  waitString.value = "Cades imza listesi alınıyor.";
  logs.value.push("Sizin sunucu katmanına GetSignatureListCades isteği gönderiliyor.");
  // mobil imza işlemi yapılır
  axios
    .get(store.API_URL + "/Onaylarim/GetSignatureListCadesV2?operationId=" + operationIdOfFileUpload.value)
    .then((getSignatureListResponse) => {
      logs.value.push("Sizin sunucu katmanına GetSignatureListCades isteği gönderildi. Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına GetSignatureListCades isteği gönderildi.", getSignatureListResponse);
      const getSignatureListResult = getSignatureListResponse.data as ProxyGetSignatureListResult;
      signatureList.value = getSignatureListResult.signatures;
      console.log("getSignatureListResult", getSignatureListResult);
      waitString.value = "Cades imza listesi alındı.";
    })
    .catch((error) => {
      logs.value.push("Sizin sunucu katmanına GetSignatureListCades isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına GetSignatureListCades isteği gönderilemedi.", error);
    });

}

function GetSignatureListXades() {


  waitString.value = "Xades imza listesi alınıyor.";
  logs.value.push("Sizin sunucu katmanına GetSignatureListXades isteği gönderiliyor.");
  // mobil imza işlemi yapılır
  axios
    .get(store.API_URL + "/Onaylarim/GetSignatureListXadesV2?operationId=" + operationIdOfFileUpload.value)
    .then((getSignatureListResponse) => {
      logs.value.push("Sizin sunucu katmanına GetSignatureListXades isteği gönderildi. Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına GetSignatureListXades isteği gönderildi.", getSignatureListResponse);
      const getSignatureListResult = getSignatureListResponse.data as ProxyGetSignatureListResult;
      signatureList.value = getSignatureListResult.signatures;
      console.log("getSignatureListResult", getSignatureListResult);
      waitString.value = "Xades imza listesi alındı.";
    })
    .catch((error) => {
      logs.value.push("Sizin sunucu katmanına GetSignatureListXades isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına GetSignatureListXades isteği gönderilemedi.", error);
    });

}



function DownloadFile() {
  axios
    .get(store.API_URL + "/Onaylarim/DownloadCoreV2?operationId=" + operationIdOfFinishSign.value, { responseType: "blob" })
    .then((e) => {
      if (e.data.error) {
        waitString.value = "Hata oluştu. " + e.data.error;
      } else {
        let filename = "dosya.pdf";
        console.log("e.headers", e.headers);
        const contentDisposition = e.headers["content-disposition"];
        console.log("contentDisposition", contentDisposition);
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
    .catch((error: AxiosError) => {
      if (error.response) {
        waitString.value = "Hata oluştu. " + error.response.data;
      } else {
        waitString.value = "Hata oluştu. " + error.code;
      }
    })
    .catch((error: Error | AxiosError) => {
      waitString.value = "Hata oluştu. " + error.message;
    });
}
</script>

<template>
  <main class="space-y-4">
    <CardComponent title="e-İmza V2">
      <template v-slot:icon>
        <CpuChipIcon></CpuChipIcon>
      </template>
      <template v-slot:content>
        <div class="flex items-end ">
          <div class="">
            <div class="text-sm text-gray-700">
              <p>Hangi türde e-imza atılmasını istiyorsanız seçiniz?</p>

            </div>
            <div class="mt-1 flex items-center">
              <fieldset>
                <legend class="sr-only">Notification method</legend>
                <div class="space-y-4 sm:flex sm:items-center sm:space-x-10 sm:space-y-0">
                  <div v-for="signatureType in signatureTypes" :key="signatureType.id" class="flex items-center cursor-pointer">
                    <input :id="signatureType.id" name="notification-method" type="radio" :value="signatureType" v-model="selectedSignatureType"
                      class="h-4 w-4 border-gray-300 text-yellow-600 focus:ring-yellow-600 cursor-pointer" />
                    <label :for="signatureType.id" class="ml-3 block text-sm font-medium leading-6 text-gray-900 cursor-pointer">{{
                      signatureType.title }}</label>
                  </div>
                </div>
              </fieldset>
            </div>

            <div class="flex flex-col mt-2">

              <div class="mt-2 max-w-sm">
                <label for="uploadFile" class="block text-sm/6 font-medium text-gray-900 dark:text-white">İmzalanacak
                  Dosya</label>
                <div class="mt-1 flex items-center gap-3 rounded-md border-0  py-1.5 pl-0 pr-3 text-gray-900  ">
                  <input id="uploadFile" name="uploadFile" type="file" class="sr-only" @change="onFileSelected" />
                  <label for="uploadFile"
                    class="flex-shrink-0 rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                    Dosya seç
                  </label>
                  <span class="text-sm text-gray-500 truncate" :class="{ 'text-gray-400': !selectedFileName }">
                    {{ selectedFileName || "Seçili dosya yok" }}
                  </span>
                </div>
              </div>


              <Listbox as="div" v-model="selectedPadesSignatureLevel" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'pades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Pades
                  İmza Seviyesi</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton
                    class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedPadesSignatureLevel.label }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </ListboxButton>

                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions
                      class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="padesSignatureLevel in signatureLevelForPadesOptions" :key="padesSignatureLevel.value" :value="padesSignatureLevel"
                        v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                            padesSignatureLevel.label }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <Listbox as="div" v-model="selectedCadesSignatureLevel" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'cades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Cades
                  İmza Seviyesi</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton
                    class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedCadesSignatureLevel.label }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </ListboxButton>

                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions
                      class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="cadesSignatureLevel in signatureLevelForCadesOptions" :key="cadesSignatureLevel.value" :value="cadesSignatureLevel"
                        v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                            cadesSignatureLevel.label }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <Listbox as="div" v-model="selectedXadesSignatureLevel" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'xades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Xades
                  İmza Seviyesi</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton
                    class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedXadesSignatureLevel.label }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </ListboxButton>

                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions
                      class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="xadesSignatureLevel in signatureLevelForXadesOptions" :key="xadesSignatureLevel.value" :value="xadesSignatureLevel"
                        v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                            xadesSignatureLevel.label }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <Listbox as="div" v-model="selectedIsEnvelopingOrEnvelopedOption" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'xades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Xades
                  İmza Türü</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton
                    class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedIsEnvelopingOrEnvelopedOption.title
                    }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </ListboxButton>

                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions
                      class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="isEnvelopingOrEnvelopedOption in isEnvelopingOrEnvelopedOptions" :key="isEnvelopingOrEnvelopedOption.title"
                        :value="isEnvelopingOrEnvelopedOption" v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                            isEnvelopingOrEnvelopedOption.title }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <Listbox as="div" v-model="selectedIsSerialOrParallelOption" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'cades' || selectedSignatureType.id === 'xades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">İmza
                  Metodu</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton
                    class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedIsSerialOrParallelOption.title }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </ListboxButton>

                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions
                      class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="isSerialOrParallelOption in isSerialOrParallelOptions" :key="isSerialOrParallelOption.title" :value="isSerialOrParallelOption"
                        v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                            isSerialOrParallelOption.title }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <div class="mt-2 max-w-sm" v-if="(selectedSignatureType.id === 'xades') && selectedIsEnvelopingOrEnvelopedOption.id === 'ENVELOPING'">
                <label for="envelopingObjectMimeType" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Enveloping Object MIME Type</label>
                <input type="text" name="envelopingObjectMimeType" id="envelopingObjectMimeType" v-model="envelopingObjectMimeType" autocomplete="off"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                  placeholder="application/pdf" />
              </div>

              <div class="mt-2 max-w-sm" v-if="(selectedSignatureType.id === 'xades') && selectedIsEnvelopingOrEnvelopedOption.id === 'ENVELOPING'">
                <label for="envelopingObjectEncoding" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Enveloping Object Encoding</label>
                  
                <input type="text" name="envelopingObjectEncoding" id="envelopingObjectEncoding" v-model="envelopingObjectEncoding" autocomplete="off"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                  placeholder="application/pdf" />
              </div>

              <div class="mt-2 max-w-sm" v-if="(selectedSignatureType.id === 'cades' || selectedSignatureType.id === 'xades') && signatureList && signatureList.length > 0">
                <label for="signaturePath" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Üstüne İmza
                  Atılacak İmza Adı</label>
                <input type="text" name="signaturePath" id="signaturePath" v-model="signaturePath" autocomplete="off"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                  placeholder="S0:S0" />
              </div>

              <Listbox as="div" v-model="selectedTurkishProfile" class="max-w-sm mt-2 hidden">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Turkish
                  Profile</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton
                    class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedTurkishProfile.title }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </ListboxButton>

                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions
                      class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="turkishProfile in turkishProfileOptions.filter(profile => !profile.disabled)" :key="turkishProfile.id" :value="turkishProfile"
                        v-slot="{ active, selectedTurkishProfile }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']" :disabled="turkishProfile.disabled">
                          <span :class="[selectedTurkishProfile ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                            turkishProfile.title }}</span>
                          <span v-if="selectedTurkishProfile" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

            </div>
          </div>
          <div class="flex-grow"></div>
          <div>
            <button type="button" @click="TryToConnect()"
              class="rounded-md bg-yellow-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:bg-gray-300 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-800 focus:ring-offset-2 focus:ring-offset-yellow-200">
              Başla
            </button>
          </div>

        </div>

        <div class="mt-4 px-4 py-2 border-gray-200 border bg-white " id="signatureList">
          <label class="block text-sm font-medium text-gray-900 dark:text-white">Dosyadaki Önceki İmzalar</label>
          <div v-if="signatureList === undefined">
            <div class="text-sm text-gray-700">
              <p>Belge yüklenmedi.</p>
            </div>
          </div>
          <div v-else-if="signatureList === null || (signatureList !== null && signatureList.length === 0)">
            <div class="text-sm text-gray-700">
              <p>Belgede {{ selectedSignatureType.title }} türünde imza bulunmuyor.</p>
            </div>
          </div>
          <div class="space-y-4 mt-2" v-else>
            <div v-for="(signature, index) in signatureList" :key="signature.entityLabel" class="mb-0">
              <p class="text-xs text-black"><span class="text-gray-600">İmza Adı</span> {{
                signature.entityLabel }}</p>
              <p class="text-xs text-black"><span class="text-gray-600">İmza Seviyesi</span> {{
                signature.levelString }}</p>
              <p class="text-xs text-black"><span class="text-gray-600">İmzacı</span> {{
                signature.subjectRDN }}</p>
              <p class="text-xs text-black"><span class="text-gray-600">TC No</span> {{
                signature.citizenshipNo }}</p>
              <p class="text-xs text-black"><span class="text-gray-600">Zaman Damgalı Mı</span>
                {{ signature.timestamped }}</p>
              <p class="text-xs text-black"><span class="text-gray-600">İmza Tarihi</span> {{
                signature.claimedSigningTime }}</p>
              <p class="text-xs text-black" v-if="signature.xadesSignatureType"><span class="text-gray-600">Xades
                  Türü</span> {{
                    signature.xadesSignatureType }}</p>

            </div>
          </div>
        </div>


        <div class="mt-0 pt-4" v-if="waitString">
          <p class="max-w-2xl text-sm leading-6 text-gray-500">{{ waitString }}</p>

          <p v-if="operationIdOfFinishSign && operationIdOfFinishSign.length > 0" @click="DownloadFile()" class="max-w-2xl text-sm leading-6 text-orange-500 hover:underline cursor-pointer">e-İmzalı
            dosyayı
            indir</p>
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

    <div class="grid grid-cols-2 gap-4" v-if="localSignerMode === 'baglantiKurulamadı'">
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
          <div v-if="signerAppResetResult?.certificates !== null && signerAppResetResult?.certificates.length === 0" class="border-t border-gray-200">
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
          <div v-if="signerAppResetResult && signerAppResetResult.certificates !== null && signerAppResetResult.certificates.length > 0" class="border-t border-gray-200">
            <div class="px-4 sm:px-6">
              <dl v-for="certificate in signerAppResetResult?.certificates" :key="certificate.id" class="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4">
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

        </div>
      </template>
    </CardComponent>
    <div class="pt-4 border-t border-gray-200 text-xs" v-if="logs && logs.length > 0">
      <p class="leading-6 text-sm font-medium">İşlemler</p>
      <p v-for="(logItem, index) in logs.reverse()" :key="index" class=""> {{ logs.length - index }}. {{ logItem }}</p>
    </div>
  </main>
</template>
