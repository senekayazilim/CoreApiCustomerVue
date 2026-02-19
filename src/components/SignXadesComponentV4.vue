<script setup lang="ts">
import { computed, onMounted, ref } from "@vue/runtime-core";
import axios, { AxiosError } from "axios";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, ListboxLabel } from "@headlessui/vue";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/20/solid";
import { CpuChipIcon } from "@heroicons/vue/24/outline";
import { ExclamationTriangleIcon, ComputerDesktopIcon, ArrowDownTrayIcon, LockClosedIcon, CheckBadgeIcon } from "@heroicons/vue/24/outline";
import CardComponent from "./CardComponent.vue";
import {
  SignatureLevelForXadesV4,
  XadesProfileV4,
  CadesHashAlgorithmV4,
  XadesSignatureModeV4,
  type ProxyCreateStateOnOnaylarimApiForXadesRequestV4,
  type ProxyCreateStateOnOnaylarimApiResult,
  type ProxyFinishSignForXadesRequestV4,
  type ProxyFinishSignResult,
  type ProxyUploadFileResult,
  type ProxyGetSignatureListXadesRequestV4,
  type ProxyGetSignatureListXadesResultV4,
  type ProxyXadesSignatureInfoV4,
} from "@/types/Types";
import { HandleError } from "@/types/HandleError";
import store from "@/types/Store";
import type {
  CertificateInfo,
  GetSignerAppVersionsResult,
  SignStepTwoResult,
  SignerAppPingResult,
  SignerAppResetResult,
  WebToAvalonSignStepTwoRequest,
} from "@/types/AgentTypes";

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

const waitString = ref("");
const logs = ref([] as Array<string>);
const displayedLogs = computed(() =>
  logs.value.map((entry, idx) => ({ entry, order: idx + 1 })).slice().reverse()
);

const operationIdOfFileUpload = ref("");
const operationIdOfSignStepOne = ref("");
const operationIdOfFinishSign = ref("");

const isSuccess = ref(false);

// İmza listesi
const signatureList = ref(undefined as Array<ProxyXadesSignatureInfoV4> | null | undefined);
const isFileDetached = ref(false);
const originalFileOperationId = ref(null as string | null);

// e-İmza aracı durumu
const localSignerMode = ref("");
const selectedCertificate = ref(null as CertificateInfo | null);
const getSignerAppVersionsResult = ref({} as GetSignerAppVersionsResult);
const signerAppResetResult = ref(null as SignerAppResetResult | null);
const userPin = ref("");
const workingUrl = ref("");

// Dosya seçimi
const selectedFile = ref<File | null>(null);
const selectedFileName = ref("");

// ═══════════════════════════════════════════════════════════════
// DROPDOWN SEÇENEKLERİ
// ═══════════════════════════════════════════════════════════════

// İmza seviyesi
const signatureLevelOptions = Object.keys(SignatureLevelForXadesV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({
    label: key,
    value: SignatureLevelForXadesV4[key as keyof typeof SignatureLevelForXadesV4],
  }));
const selectedSignatureLevel = ref(signatureLevelOptions[0]);

// Profil
const profileOptions = Object.keys(XadesProfileV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({
    label: key,
    value: XadesProfileV4[key as keyof typeof XadesProfileV4],
  }));
const selectedProfile = ref(profileOptions[0]);

// Hash algoritması
const hashAlgorithmOptions = Object.keys(CadesHashAlgorithmV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({
    label: key,
    value: CadesHashAlgorithmV4[key as keyof typeof CadesHashAlgorithmV4],
  }));
const selectedHashAlgorithm = ref(hashAlgorithmOptions[0]);

// Seri/Paralel
const serialOrParallelOptions = [
  { id: "SERIAL", title: "Seri" },
  { id: "PARALLEL", title: "Paralel" },
];
const selectedSerialOrParallel = ref(serialOrParallelOptions[0]);

// İmza Modu (XAdES'e özgü)
const signatureModeOptions = Object.keys(XadesSignatureModeV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({
    label: key,
    value: XadesSignatureModeV4[key as keyof typeof XadesSignatureModeV4],
  }));
const selectedSignatureMode = ref(signatureModeOptions[0]);

// İmza yolu
const signaturePath = ref(null as string | null);

// Enveloped moda özgü
const envelopedContentElementId = ref(null as string | null);

// Enveloping moda özgü
const envelopingObjectMimeType = ref("text/xml");
const envelopingObjectEncoding = ref("http://www.w3.org/2000/09/xmldsig#base64");

// ═══════════════════════════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════════════════════════

onMounted(() => {
  logs.value = [] as Array<string>;
  GetSignerAppVersions();
});

// ═══════════════════════════════════════════════════════════════
// E-İMZA ARACI BAĞLANTI FONKSİYONLARI
// ═══════════════════════════════════════════════════════════════

async function GetSignerAppVersions() {
  logs.value.push("e-İmza aracı son sürümü alınıyor.");
  try {
    const result = await axios.get("https://apitest.onaylarim.com/sign/GetSignerAppVersions");
    if (result.data.error) {
      logs.value.push("Uygulama güncel sürümü alınırken hata oluştu. Detaylar için console'a bakınız.");
      console.log("Uygulama güncel sürümü alınırken hata oluştu.", result);
    } else {
      getSignerAppVersionsResult.value = result.data.result as GetSignerAppVersionsResult;
      logs.value.push("Uygulama güncel sürümü alındı. Detaylar için console'a bakınız.");
      console.log("Uygulama güncel sürümü.", getSignerAppVersionsResult.value);
    }
  } catch (error) {
    logs.value.push("Uygulama güncel sürümü alınırken hata oluştu. Detaylar için console'a bakınız.");
    console.log("Uygulama güncel sürümü alınırken hata oluştu. ", error);
  }
}

async function TryToConnect() {
  const httpsTryIsOk = await LocalSignerPing(true, false);
  if (httpsTryIsOk) {
    workingUrl.value = "https://localsigner.onaylarim.com:8099";
    await LocalSignerReset();
  } else {
    const httpTryIsOk = await LocalSignerPing(false, false);
    if (httpTryIsOk) {
      workingUrl.value = "http://localsigner.onaylarim.com:8099";
      await LocalSignerReset();
    } else {
      const httpTryWithLocalhostIsOk = await LocalSignerPing(false, true);
      if (httpTryWithLocalhostIsOk) {
        workingUrl.value = "http://localhost:8099";
        await LocalSignerReset();
      }
    }
  }
}

async function LocalSignerPing(useHttps: boolean, useLocalhost: boolean): Promise<boolean> {
  const url = (useHttps ? "https" : "http") + (useLocalhost ? "://localhost:8099/ping" : "://localsigner.onaylarim.com:8099/ping");
  logs.value.push("e-İmza aracına " + (useHttps ? "SSL" : "HTTP") + " PING isteği gönderiliyor. Url: " + url);
  try {
    const axiosResponse = await axios.get(url, { timeout: 500 });
    logs.value.push("e-İmza aracına " + (useHttps ? "SSL" : "HTTP") + " PING isteği döndü. Detaylar için console'a bakınız.");
    console.log("e-İmza aracına " + (useHttps ? "SSL" : "HTTP") + " PING istek sonucu.", axiosResponse);
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

async function LocalSignerReset() {
  signerAppResetResult.value = null;
  localSignerMode.value = "working";
  waitString.value = "";

  logs.value.push("e-İmza aracına " + workingUrl.value + " RESET isteği gönderiliyor.");
  try {
    const result = await axios.get(workingUrl.value + "/reset");
    logs.value.push("e-İmza aracına " + workingUrl.value + " RESET isteği döndü. Detaylar için console'a bakınız.");
    console.log("e-İmza aracına " + workingUrl.value + " RESET istek sonucu.", result);
    signerAppResetResult.value = result.data as SignerAppResetResult;

    if (signerAppResetResult.value.signerAppStatus === 1) {
      for (let counter = 0; counter < 10; counter++) {
        const pingResponse = await axios.get(workingUrl.value + "/ping");
        const pingResult = pingResponse.data as SignerAppPingResult;
        if (pingResult.signerAppStatus !== 1) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    let desiredVersion = 0;
    const platform = signerAppResetResult.value.signerAppPlatform;
    if (platform === "windows") {
      desiredVersion = getSignerAppVersionsResult.value.signerAppWindowsVersion;
    } else if (platform === "macos") {
      desiredVersion = getSignerAppVersionsResult.value.signerAppMacVersion;
    } else if (platform === "linux" || platform === "freebsd") {
      desiredVersion = getSignerAppVersionsResult.value.signerAppLinuxVersion;
    }

    if (signerAppResetResult.value.signerAppDllVersion < desiredVersion) {
      localSignerMode.value = "varAncakVersiyonEski";
    } else {
      localSignerMode.value = "varVeVersiyonYeni";
      selectedCertificate.value = null;
      if (signerAppResetResult.value.certificates !== undefined && signerAppResetResult.value.certificates !== null && signerAppResetResult.value.certificates.length === 1) {
        selectedCertificate.value = signerAppResetResult.value.certificates[0];
      }
    }
  } catch (error: any) {
    logs.value.push("e-İmza aracına " + workingUrl.value + " RESET isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
    console.log("e-İmza aracına " + workingUrl.value + " RESET isteği gönderilemedi.", error);
    localSignerMode.value = "baglantiKurulamadı";
  } finally {
    logs.value.push("e-İmza aracı durumu " + workingUrl.value + " : " + localSignerMode.value);
  }
}

function OpenSignerApp() {
  try {
    window.location.href = 'onaylarimsignerapp:"start"';
    TryToConnect();
  } catch (err) {
    console.log("open signer app error.", err);
  }
}

// ═══════════════════════════════════════════════════════════════
// DOSYA YÜKLEME
// ═══════════════════════════════════════════════════════════════

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
  signatureList.value = undefined;
  isFileDetached.value = false;
  originalFileOperationId.value = null;
  isSuccess.value = false;
  signaturePath.value = null;
  waitString.value = "";

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
      GetSignatureListXadesV4();
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

// ═══════════════════════════════════════════════════════════════
// XADES V4 İMZALAMA
// ═══════════════════════════════════════════════════════════════

async function SignXadesV4(certificate: CertificateInfo) {
  operationIdOfFinishSign.value = "";
  isSuccess.value = false;

  try {
    // Adım 1: CreateState
    waitString.value = "İmza işlemi hazırlanıyor.";
    logs.value.push("CreateStateOnOnaylarimApiForXadesV4 isteği gönderiliyor.");

    const isDetachedMode = selectedSignatureMode.value.value === XadesSignatureModeV4.Detached;

    const createRequest: ProxyCreateStateOnOnaylarimApiForXadesRequestV4 = {
      certificate: certificate.data,
      operationId: operationIdOfFileUpload.value,
      serialOrParallel: selectedSerialOrParallel.value.id,
      signaturePath: signaturePath.value,
      signatureLevel: selectedSignatureLevel.value.value,
      profile: selectedProfile.value.value,
      hashAlgorithm: selectedHashAlgorithm.value.value,
      signatureMode: selectedSignatureMode.value.value,
      originalFileOperationId: isDetachedMode && isFileDetached.value ? originalFileOperationId.value : null,
      envelopedContentElementId: selectedSignatureMode.value.value === XadesSignatureModeV4.Enveloped ? envelopedContentElementId.value : null,
      envelopingObjectMimeType: selectedSignatureMode.value.value === XadesSignatureModeV4.Enveloping ? envelopingObjectMimeType.value : null,
      envelopingObjectEncoding: selectedSignatureMode.value.value === XadesSignatureModeV4.Enveloping ? envelopingObjectEncoding.value : null,
    };

    const createResponse = await axios.post(
      store.API_URL + "/Onaylarim/CreateStateOnOnaylarimApiForXadesV4",
      createRequest
    );

    const createResult = createResponse.data as ProxyCreateStateOnOnaylarimApiResult;
    console.log("createStateOnOnaylarimApiResult", createResult);

    if (createResult.error !== undefined && createResult.error !== null && createResult.error.length > 0) {
      logs.value.push("CreateStateOnOnaylarimApiForXadesV4 hata döndü. Hata: " + createResult.error);
      waitString.value = "Hata: " + createResult.error;
      return;
    }

    logs.value.push("CreateStateOnOnaylarimApiForXadesV4 başarılı. Detaylar için console'a bakınız.");
    operationIdOfSignStepOne.value = createResult.operationId;

    // Adım 2: e-İmza aracı ile imzalama
    waitString.value = "İmza işlemi başlatıldı. e-İmza kartı ile imzalanıyor.";
    logs.value.push("e-İmza aracına SIGNSTEPTWO isteği gönderiliyor.");

    const signStepTwoRequest: WebToAvalonSignStepTwoRequest = {
      keyId: createResult.keyID,
      keySecret: createResult.keySecret,
      state: createResult.state,
      pkcsLibrary: certificate.pkcsLibrary,
      slot: certificate.slot,
      pin: userPin.value,
      certificateIndex: certificate.certificateIndex,
    };

    const signResponse = await axios.post(
      workingUrl.value + "/signStepTwo",
      JSON.stringify(signStepTwoRequest),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const signResult = signResponse.data as SignStepTwoResult;
    if (signResult.error !== undefined && signResult.error !== null) {
      handleSignStepTwoError(signResult);
      return;
    }

    logs.value.push("e-İmza aracında imzalama başarıyla tamamlandı.");

    // Adım 3: FinishSign
    waitString.value = "İmza tamamlanıyor.";
    logs.value.push("FinishSignForXadesV4 isteği gönderiliyor.");

    const finishRequest: ProxyFinishSignForXadesRequestV4 = {
      signedData: signResult.signedData,
      keyId: createResult.keyID,
      keySecret: createResult.keySecret,
      operationId: operationIdOfSignStepOne.value,
    };

    const finishResponse = await axios.post(
      store.API_URL + "/Onaylarim/FinishSignForXadesV4",
      finishRequest
    );

    const finishResult = finishResponse.data as ProxyFinishSignResult;
    if (finishResult.isSuccess) {
      operationIdOfFinishSign.value = finishResult.operationId;
      isSuccess.value = true;
      waitString.value = "İmza işlemi başarıyla tamamlandı.";
      logs.value.push("İmza işlemi başarılı.");
    } else {
      waitString.value = "İmza işlemi tamamlanamadı.";
      logs.value.push("FinishSignForXadesV4 başarısız.");
    }
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    waitString.value = "Hata oluştu: " + HandleError(normalizedError);
    logs.value.push("Hata: " + HandleError(normalizedError));
    console.error("SignXadesV4 error", error);
  }
}

function handleSignStepTwoError(result: SignStepTwoResult) {
  if (result.error.search("INCORRECT_PIN") >= 0) {
    waitString.value = "Hata oluştu. e-İmza şifreniz yanlış.";
  } else if (result.error.search("PIN_BLOCKED") >= 0) {
    waitString.value = "Hata oluştu. e-İmza şifreniz blokeli.";
  } else {
    waitString.value = "Hata oluştu. " + result.error;
  }
  logs.value.push("e-İmza aracında hata oluştu: " + result.error);
  console.log("SignStepTwo error", result);
}

// ═══════════════════════════════════════════════════════════════
// İMZA LİSTESİ SORGULAMA
// ═══════════════════════════════════════════════════════════════

async function GetSignatureListXadesV4() {
  try {
    waitString.value = "XAdES imza listesi alınıyor.";
    logs.value.push("GetSignatureListXadesV4 isteği gönderiliyor.");

    const request: ProxyGetSignatureListXadesRequestV4 = {
      operationId: operationIdOfFileUpload.value,
      originalFileOperationId: originalFileOperationId.value,
    };

    const response = await axios.post(
      store.API_URL + "/Onaylarim/GetSignatureListXadesV4",
      request
    );

    const result = response.data as ProxyGetSignatureListXadesResultV4;
    console.log("getSignatureListXadesV4Result", result);

    if (result.error !== undefined && result.error !== null && result.error.length > 0) {
      waitString.value = "İmza listesi alınamadı: " + result.error;
      logs.value.push("GetSignatureListXadesV4 hata: " + result.error);
      signatureList.value = null;
    } else {
      signatureList.value = result.signatures;
      isFileDetached.value = result.isDetached;
      if (result.isDetached) {
        // Detached mod'a zorla
        const detachedOption = signatureModeOptions.find(o => o.value === XadesSignatureModeV4.Detached);
        if (detachedOption) {
          selectedSignatureMode.value = detachedOption;
        }
        logs.value.push("Dosya detached imza içeriyor. Orijinal dosyanın OperationId'si gerekecek.");
      }
      waitString.value = "XAdES imza listesi alındı.";
      logs.value.push("GetSignatureListXadesV4 başarılı.");
    }
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    waitString.value = "İmza listesi alınamadı. " + HandleError(normalizedError);
    logs.value.push("GetSignatureListXadesV4 hata: " + HandleError(normalizedError));
    console.error("GetSignatureListXadesV4 error", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// DOSYA İNDİRME
// ═══════════════════════════════════════════════════════════════

async function DownloadFile() {
  try {
    const response = await axios.get(
      store.API_URL + "/Onaylarim/DownloadCoreV2?operationId=" + operationIdOfFinishSign.value,
      { responseType: "blob" }
    );

    if (response.data.error) {
      waitString.value = "Hata oluştu. " + response.data.error;
      return;
    }

    let filename = "dosya.xml";
    const contentDisposition = response.headers["content-disposition"];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;\n]*=(UTF-\d['"]*)?((['"]).*?[.]$\2|[^;\n]*)?/gi);
      if (match && match[1]) {
        const a1 = match[1].split("''")[1];
        if (a1) {
          filename = decodeURI(a1);
        }
      }
    }

    const fileURL = window.URL.createObjectURL(new Blob([response.data]));
    const fileLink = document.createElement("a");
    fileLink.href = fileURL;
    fileLink.setAttribute("download", filename);
    document.body.appendChild(fileLink);
    fileLink.click();
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    waitString.value = "Hata oluştu. " + HandleError(normalizedError);
    console.error("DownloadFile error", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════

function getTimestampedLabel(signature: ProxyXadesSignatureInfoV4) {
  if (signature.timestamp) {
    return "Evet";
  }
  return signature.timestamped ? "Evet" : "Hayır";
}

function getSignatureTimeLabel(signature: ProxyXadesSignatureInfoV4) {
  return signature.claimedSigningTimeAsTime ?? signature.claimedSigningTime;
}
</script>

<template>
  <main class="space-y-4">
    <!-- Card 1: Ana Ayarlar -->
    <CardComponent title="XAdES e-İmza V4">
      <template v-slot:icon>
        <CpuChipIcon></CpuChipIcon>
      </template>
      <template v-slot:content>
        <div class="flex flex-col lg:flex-row lg:gap-6">
          <!-- Sol: Form Alanları -->
          <div class="flex-1 min-w-0">
            <div class="flex items-end">
              <div class="flex-grow">
                <div class="flex flex-col mt-2">

                  <!-- Dosya Seçimi -->
                  <div class="mt-2 max-w-sm">
                    <label for="uploadFileXadesV4" class="block text-sm/6 font-medium text-gray-900 dark:text-white">İmzalanacak Dosya</label>
                    <div class="mt-1 flex items-center gap-3 rounded-md border-0 py-1.5 pl-0 pr-3 text-gray-900">
                      <input id="uploadFileXadesV4" name="uploadFileXadesV4" type="file" class="sr-only" @change="onFileSelected" />
                      <label for="uploadFileXadesV4"
                        class="flex-shrink-0 rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                        Dosya seç
                      </label>
                      <span class="text-sm text-gray-500 truncate" :class="{ 'text-gray-400': !selectedFileName }">
                        {{ selectedFileName || "Seçili dosya yok" }}
                      </span>
                    </div>
                  </div>

                  <!-- Detached dosya uyarısı -->
                  <div v-if="isFileDetached" class="mt-2 max-w-sm p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p class="text-xs text-yellow-800 mb-1">Bu dosya detached imza içeriyor. İmza atabilmek için orijinal dosyanın OperationId'sini giriniz.</p>
                    <div class="flex items-center gap-2">
                      <input type="text" v-model="originalFileOperationId" autocomplete="off"
                        class="block w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                        placeholder="Orijinal Dosya OperationId" />
                      <button type="button" @click="GetSignatureListXadesV4()"
                        class="flex-shrink-0 rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-600">
                        Yenile
                      </button>
                    </div>
                  </div>

                  <!-- İmza Seviyesi -->
                  <Listbox as="div" v-model="selectedSignatureLevel" class="max-w-sm mt-2">
                    <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">İmza Seviyesi</ListboxLabel>
                    <div class="relative mt-0">
                      <ListboxButton
                        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                        <span class="block truncate">{{ selectedSignatureLevel.label }}</span>
                        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </span>
                      </ListboxButton>
                      <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                        <ListboxOptions
                          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          <ListboxOption as="template" v-for="option in signatureLevelOptions" :key="option.value" :value="option" v-slot="{ active, selected }">
                            <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>
                              <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                <CheckIcon class="h-5 w-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>

                  <!-- Profil -->
                  <Listbox as="div" v-model="selectedProfile" class="max-w-sm mt-2">
                    <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Profil</ListboxLabel>
                    <div class="relative mt-0">
                      <ListboxButton
                        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                        <span class="block truncate">{{ selectedProfile.label }}</span>
                        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </span>
                      </ListboxButton>
                      <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                        <ListboxOptions
                          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          <ListboxOption as="template" v-for="option in profileOptions" :key="option.value" :value="option" v-slot="{ active, selected }">
                            <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>
                              <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                <CheckIcon class="h-5 w-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>

                  <!-- Hash Algoritması -->
                  <Listbox as="div" v-model="selectedHashAlgorithm" class="max-w-sm mt-2">
                    <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Hash Algoritması</ListboxLabel>
                    <div class="relative mt-0">
                      <ListboxButton
                        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                        <span class="block truncate">{{ selectedHashAlgorithm.label }}</span>
                        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </span>
                      </ListboxButton>
                      <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                        <ListboxOptions
                          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          <ListboxOption as="template" v-for="option in hashAlgorithmOptions" :key="option.value" :value="option" v-slot="{ active, selected }">
                            <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>
                              <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                <CheckIcon class="h-5 w-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>

                  <!-- Seri/Paralel -->
                  <Listbox as="div" v-model="selectedSerialOrParallel" class="max-w-sm mt-2">
                    <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">İmza Metodu</ListboxLabel>
                    <div class="relative mt-0">
                      <ListboxButton
                        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                        <span class="block truncate">{{ selectedSerialOrParallel.title }}</span>
                        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </span>
                      </ListboxButton>
                      <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                        <ListboxOptions
                          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          <ListboxOption as="template" v-for="option in serialOrParallelOptions" :key="option.id" :value="option" v-slot="{ active, selected }">
                            <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.title }}</span>
                              <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                <CheckIcon class="h-5 w-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>

                  <!-- İmza Modu (Enveloped/Enveloping/Detached) -->
                  <Listbox as="div" v-model="selectedSignatureMode" class="max-w-sm mt-2">
                    <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">İmza Modu</ListboxLabel>
                    <div class="relative mt-0">
                      <ListboxButton
                        :disabled="isFileDetached"
                        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6 disabled:opacity-50 disabled:cursor-not-allowed">
                        <span class="block truncate">{{ selectedSignatureMode.label }}</span>
                        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </span>
                      </ListboxButton>
                      <span v-if="isFileDetached" class="text-xs text-gray-400">(dosya detached olduğu için zorunlu)</span>
                      <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                        <ListboxOptions
                          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          <ListboxOption as="template" v-for="option in signatureModeOptions" :key="option.value" :value="option" v-slot="{ active, selected }">
                            <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>
                              <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                <CheckIcon class="h-5 w-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>

                  <!-- Enveloped Content Element ID (sadece Enveloped modda) -->
                  <div class="mt-2 max-w-sm" v-if="selectedSignatureMode.value === 0">
                    <label for="envelopedContentElementId" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Enveloped Content Element ID</label>
                    <input type="text" name="envelopedContentElementId" id="envelopedContentElementId" v-model="envelopedContentElementId" autocomplete="off"
                      class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                      placeholder="content-1 (boş ise tüm doküman)" />
                  </div>

                  <!-- Enveloping Object MIME Type (sadece Enveloping modda) -->
                  <div class="mt-2 max-w-sm" v-if="selectedSignatureMode.value === 1">
                    <label for="envelopingMimeType" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Enveloping Object MIME Type</label>
                    <input type="text" name="envelopingMimeType" id="envelopingMimeType" v-model="envelopingObjectMimeType" autocomplete="off"
                      class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                      placeholder="text/xml" />
                  </div>

                  <!-- Enveloping Object Encoding (sadece Enveloping modda) -->
                  <div class="mt-2 max-w-sm" v-if="selectedSignatureMode.value === 1">
                    <label for="envelopingEncoding" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Enveloping Object Encoding</label>
                    <input type="text" name="envelopingEncoding" id="envelopingEncoding" v-model="envelopingObjectEncoding" autocomplete="off"
                      class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                      placeholder="http://www.w3.org/2000/09/xmldsig#base64" />
                  </div>

                  <!-- İmza Yolu -->
                  <div class="mt-2 max-w-sm" v-if="signatureList && signatureList.length > 0">
                    <label for="signaturePathXades" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Üstüne İmza Atılacak İmza Adı</label>
                    <input type="text" name="signaturePathXades" id="signaturePathXades" v-model="signaturePath" autocomplete="off"
                      class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                      placeholder="S0:S0" />
                  </div>

                  <div class="mt-3 max-w-sm">
                    <button type="button" @click="TryToConnect()"
                      class="rounded-md bg-yellow-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:bg-gray-300 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-800 focus:ring-offset-2 focus:ring-offset-yellow-200">
                      Başla
                    </button>
                  </div>

                </div>
              </div>

            </div>

            <!-- Durum Mesajı -->
            <div class="mt-0 pt-4" v-if="waitString">
              <p class="max-w-2xl text-sm leading-6 text-gray-500">{{ waitString }}</p>
              <p v-if="operationIdOfFinishSign && operationIdOfFinishSign.length > 0" @click="DownloadFile()"
                class="max-w-2xl text-sm leading-6 text-orange-500 hover:underline cursor-pointer">e-İmzalı dosyayı indir</p>
            </div>
          </div>

          <!-- Sağ: İmza Listesi -->
          <div class="flex-1 min-w-0 mt-4 lg:mt-0">
            <div class="px-4 py-3 border-gray-200 border rounded-md bg-gray-100/50 h-full">
              <label class="block text-sm font-medium text-gray-900 dark:text-white">Dosyadaki Önceki İmzalar</label>
              <p v-if="operationIdOfFileUpload" class="text-xs text-gray-500 mt-1">OperationId: <span class="font-mono select-all">{{ operationIdOfFileUpload }}</span></p>
              <div v-if="signatureList === undefined">
                <div class="text-sm text-gray-700 mt-2">
                  <p>Belge yüklenmedi.</p>
                </div>
              </div>
              <div v-else-if="signatureList === null || signatureList.length === 0">
                <div class="text-sm text-gray-700 mt-2">
                  <p>Belgede XAdES türünde imza bulunmuyor.</p>
                </div>
              </div>
              <div class="space-y-4 mt-2" v-else>
                <div v-for="(signature, index) in signatureList" :key="signature.entityLabel" class="mb-0">
                  <p class="text-xs text-black"><span class="text-gray-600">İmza Adı</span> {{ signature.entityLabel }}</p>
                  <p class="text-xs text-black"><span class="text-gray-600">İmza Seviyesi</span> {{ signature.levelString }}</p>
                  <p class="text-xs text-black"><span class="text-gray-600">İmzacı</span> {{ signature.subjectRDN }}</p>
                  <p class="text-xs text-black" v-if="signature.citizenshipNo"><span class="text-gray-600">TC No</span> {{ signature.citizenshipNo }}</p>
                  <p class="text-xs text-black"><span class="text-gray-600">Zaman Damgalı Mı</span> {{ getTimestampedLabel(signature) }}</p>
                  <p class="text-xs text-black"><span class="text-gray-600">İmza Tarihi</span> {{ getSignatureTimeLabel(signature) }}</p>
                  <p class="text-xs text-black" v-if="signature.profileName"><span class="text-gray-600">Profil</span> {{ signature.profileName }}</p>
                  <p class="text-xs text-black" v-if="signature.hashAlgorithm"><span class="text-gray-600">Hash Algoritması</span> {{ signature.hashAlgorithm }}</p>
                  <p class="text-xs text-black" v-if="signature.policyOID"><span class="text-gray-600">Policy OID</span> {{ signature.policyOID }}</p>
                  <p class="text-xs text-black" v-if="signature.parentEntity"><span class="text-gray-600">Üst İmza</span> {{ signature.parentEntity }}</p>
                  <p class="text-xs text-black"><span class="text-gray-600">Uzun Vadeli Bilgi</span> {{ signature.containsLongTermInfo ? "Evet" : "Hayır" }}</p>
                  <p class="text-xs text-black" v-if="signature.lastArchivalTime"><span class="text-gray-600">Son Arşiv Zamanı</span> {{ signature.lastArchivalTime }}</p>
                  <p class="text-xs text-black" v-if="signature.signatureMode"><span class="text-gray-600">İmza Modu</span> {{ signature.signatureMode }}</p>
                  <p class="text-xs text-black" v-if="signature.timestamp"><span class="text-gray-600">Zaman Damgası</span> {{ signature.timestamp.entityLabel }}</p>
                  <p class="text-xs text-black" v-if="signature.timestamp"><span class="text-gray-600">Zaman Damgası Tarihi</span> {{ signature.timestamp.timeAsTime ?? signature.timestamp.time }}</p>
                  <p class="text-xs text-black" v-if="signature.timestamp?.tSAName"><span class="text-gray-600">TSA</span> {{ signature.timestamp.tSAName }}</p>
                  <p class="text-xs text-black" v-if="signature.timestamp?.hashAlgorithm"><span class="text-gray-600">ZD Hash Algoritması</span> {{ signature.timestamp.hashAlgorithm }}</p>
                  <p class="text-xs text-black" v-if="signature.timestamp?.timestampTypeStr"><span class="text-gray-600">ZD Tipi</span> {{ signature.timestamp.timestampTypeStr }}</p>
                  <p class="text-xs text-black" v-if="signature.upgradeOptions && signature.upgradeOptions.length > 0"><span class="text-gray-600">Upgrade Seçenekleri</span> {{ signature.upgradeOptions.join(", ") }}</p>
                  <p class="text-xs text-black" v-if="signature.profileRecommendedUpgrades && signature.profileRecommendedUpgrades.length > 0"><span class="text-gray-600">Profil Uyumlu Upgrade</span> {{ signature.profileRecommendedUpgrades.join(", ") }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </template>
    </CardComponent>

    <!-- Card 2: e-İmza Aracı Bulunamadı -->
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
      <CardComponent title="e-İmza Aracını Aç">
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
      <CardComponent title="e-İmza Aracını İndir">
        <template v-slot:icon>
          <ArrowDownTrayIcon></ArrowDownTrayIcon>
        </template>
        <template v-slot:content>
          <div class="mt-2 text-sm text-gray-700">
            <p>e-İmza aracını bilgisayarınıza kurmak için aşağıdaki butonu kullanabilirsiniz. Kurulumu tamamladıktan sonra aşağıdaki yenile butonuna basabilirsiniz.</p>
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

    <!-- Card 3: e-İmzalar (Sertifika Listesi) -->
    <CardComponent v-if="localSignerMode === 'varVeVersiyonYeni'" title="e-İmzalar">
      <template v-slot:icon>
        <CpuChipIcon></CpuChipIcon>
      </template>
      <template v-slot:content>
        <div class="flex flex-col space-y-4">
          <div class="text-sm text-gray-700">
            <p>Bilgisayarınıza takılı e-imzalar aşağıda listelenmiştir. İşlem yapmak istediğiniz sertifika için PIN girip imzalama işlemi yapabilirsiniz.</p>
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
          <div v-if="signerAppResetResult && signerAppResetResult.certificates !== null && signerAppResetResult.certificates.length > 0"
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
                        <input type="password" v-model="userPin"
                          class="block w-full rounded-none rounded-l-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                          placeholder="PIN" />
                      </div>
                      <button @click="SignXadesV4(certificate)" type="button"
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

    <!-- Log Bölümü -->
    <div class="pt-4 border-t border-gray-200 text-xs" v-if="displayedLogs.length > 0">
      <p class="leading-6 text-sm font-medium">İşlemler</p>
      <p v-for="(logItem, index) in displayedLogs" :key="logItem.order" :class="index >= 2 ? 'text-gray-400' : ''">
        {{ logItem.order }}. {{ logItem.entry }}
      </p>
    </div>
  </main>
</template>
