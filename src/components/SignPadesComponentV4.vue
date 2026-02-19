<script setup lang="ts">
import { computed, onMounted, ref } from "@vue/runtime-core";
import axios, { AxiosError } from "axios";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, ListboxLabel } from "@headlessui/vue";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/20/solid";
import { CpuChipIcon } from "@heroicons/vue/24/outline";
import { ExclamationTriangleIcon, ComputerDesktopIcon, ArrowDownTrayIcon, LockClosedIcon, CheckBadgeIcon } from "@heroicons/vue/24/outline";
import CardComponent from "./CardComponent.vue";
import {
  SignatureLevelForPadesV4,
  PadesProfileV4,
  CadesHashAlgorithmV4,
  type ProxyCreateStateOnOnaylarimApiForPadesRequestV4,
  type ProxyCreateStateOnOnaylarimApiResult,
  type ProxyFinishSignForPadesRequestV4,
  type ProxyFinishSignResult,
  type ProxyUploadFileResult,
  type ProxyGetSignatureListPadesRequestV4,
  type ProxyGetSignatureListPadesResultV4,
  type ProxyPadesSignatureInfoV4,
  type ProxySignatureWidgetInfo,
  type ProxyLineInfo,
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
const signatureList = ref(undefined as Array<ProxyPadesSignatureInfoV4> | null | undefined);

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
const signatureLevelOptions = Object.keys(SignatureLevelForPadesV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({
    label: key,
    value: SignatureLevelForPadesV4[key as keyof typeof SignatureLevelForPadesV4],
  }));
const selectedSignatureLevel = ref(signatureLevelOptions[0]);

// Profil
const profileOptions = Object.keys(PadesProfileV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({
    label: key,
    value: PadesProfileV4[key as keyof typeof PadesProfileV4],
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

// Görsel imza
const useVisibleSignature = ref(false);
const signatureWidgetInfo = ref<ProxySignatureWidgetInfo>({
  width: 200,
  height: 50,
  left: 0.1,
  right: 0.5,
  top: 0.1,
  bottom: 0.2,
  transformOrigin: "",
  imageBytes: [],
  pagesToPlaceOn: [1],
  lines: [
    {
      text: "İmzalandı",
      leftMargin: 2,
      topMargin: 2,
      bottomMargin: 2,
      rightMargin: 2,
      fontName: "Arial",
      fontSize: 10,
      fontStyle: "Regular",
      colorHtml: "#000000",
    },
  ],
});

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

    // signerAppStatus === 1 ise sertifika aranıyor, polling ile bekle
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
  isSuccess.value = false;
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
      GetSignatureListPadesV4();
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
// PADES V4 İMZALAMA
// ═══════════════════════════════════════════════════════════════

async function SignPadesV4(certificate: CertificateInfo) {
  operationIdOfFinishSign.value = "";
  isSuccess.value = false;

  try {
    // Adım 1: CreateState
    waitString.value = "İmza işlemi hazırlanıyor.";
    logs.value.push("CreateStateOnOnaylarimApiForPadesV4 isteği gönderiliyor.");

    const createRequest: ProxyCreateStateOnOnaylarimApiForPadesRequestV4 = {
      certificate: certificate.data,
      operationId: operationIdOfFileUpload.value,
      signatureLevel: selectedSignatureLevel.value.value,
      profile: selectedProfile.value.value,
      hashAlgorithm: selectedHashAlgorithm.value.value,
      signatureWidgetInfo: useVisibleSignature.value ? signatureWidgetInfo.value : null,
    };

    const createResponse = await axios.post(
      store.API_URL + "/Onaylarim/CreateStateOnOnaylarimApiForPadesV4",
      createRequest
    );

    const createResult = createResponse.data as ProxyCreateStateOnOnaylarimApiResult;
    console.log("createStateOnOnaylarimApiResult", createResult);

    if (createResult.error !== undefined && createResult.error !== null && createResult.error.length > 0) {
      logs.value.push("CreateStateOnOnaylarimApiForPadesV4 hata döndü. Hata: " + createResult.error);
      waitString.value = "Hata: " + createResult.error;
      return;
    }

    logs.value.push("CreateStateOnOnaylarimApiForPadesV4 başarılı. Detaylar için console'a bakınız.");
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
    logs.value.push("FinishSignForPadesV4 isteği gönderiliyor.");

    const finishRequest: ProxyFinishSignForPadesRequestV4 = {
      signedData: signResult.signedData,
      keyId: createResult.keyID,
      keySecret: createResult.keySecret,
      operationId: operationIdOfSignStepOne.value,
    };

    const finishResponse = await axios.post(
      store.API_URL + "/Onaylarim/FinishSignForPadesV4",
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
      logs.value.push("FinishSignForPadesV4 başarısız.");
    }
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    waitString.value = "Hata oluştu: " + HandleError(normalizedError);
    logs.value.push("Hata: " + HandleError(normalizedError));
    console.error("SignPadesV4 error", error);
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

async function GetSignatureListPadesV4() {
  try {
    waitString.value = "PAdES imza listesi alınıyor.";
    logs.value.push("GetSignatureListPadesV4 isteği gönderiliyor.");

    const request: ProxyGetSignatureListPadesRequestV4 = {
      operationId: operationIdOfFileUpload.value,
    };

    const response = await axios.post(
      store.API_URL + "/Onaylarim/GetSignatureListPadesV4",
      request
    );

    const result = response.data as ProxyGetSignatureListPadesResultV4;
    console.log("getSignatureListPadesV4Result", result);

    if (result.error !== undefined && result.error !== null && result.error.length > 0) {
      waitString.value = "İmza listesi alınamadı: " + result.error;
      logs.value.push("GetSignatureListPadesV4 hata: " + result.error);
      signatureList.value = null;
    } else {
      signatureList.value = result.signatures;
      waitString.value = "PAdES imza listesi alındı.";
      logs.value.push("GetSignatureListPadesV4 başarılı.");
    }
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    waitString.value = "İmza listesi alınamadı. " + HandleError(normalizedError);
    logs.value.push("GetSignatureListPadesV4 hata: " + HandleError(normalizedError));
    console.error("GetSignatureListPadesV4 error", error);
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

    let filename = "dosya.pdf";
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

function getTimestampedLabel(signature: ProxyPadesSignatureInfoV4) {
  if (signature.timestamp) {
    return "Evet";
  }
  return signature.timestamped ? "Evet" : "Hayır";
}

function getSignatureTimeLabel(signature: ProxyPadesSignatureInfoV4) {
  return signature.claimedSigningTimeAsTime ?? signature.claimedSigningTime;
}
</script>

<template>
  <main class="space-y-4">
    <!-- Card 1: Ana Ayarlar -->
    <CardComponent title="e-İmza PAdES V4">
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
                    <label for="uploadFilePadesV4" class="block text-sm/6 font-medium text-gray-900 dark:text-white">İmzalanacak PDF Dosya</label>
                    <div class="mt-1 flex items-center gap-3 rounded-md border-0 py-1.5 pl-0 pr-3 text-gray-900">
                      <input id="uploadFilePadesV4" name="uploadFilePadesV4" type="file" accept=".pdf" class="sr-only" @change="onFileSelected" />
                      <label for="uploadFilePadesV4"
                        class="flex-shrink-0 rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                        Dosya seç
                      </label>
                      <span class="text-sm text-gray-500 truncate" :class="{ 'text-gray-400': !selectedFileName }">
                        {{ selectedFileName || "Seçili dosya yok" }}
                      </span>
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

                  <!-- Görsel İmza -->
                  <div class="mt-3 max-w-sm">
                    <div class="flex items-center">
                      <input id="useVisibleSignature" name="useVisibleSignature" type="checkbox" v-model="useVisibleSignature"
                        class="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-600 cursor-pointer" />
                      <label for="useVisibleSignature" class="ml-3 block text-sm font-medium leading-6 text-gray-900 cursor-pointer">Görsel İmza</label>
                    </div>
                  </div>

                  <!-- Görsel İmza Ayarları -->
                  <div v-if="useVisibleSignature" class="mt-2 max-w-sm p-3 bg-gray-50 border border-gray-200 rounded-md space-y-2">
                    <p class="text-xs font-medium text-gray-700">Görsel İmza Ayarları</p>
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="block text-xs text-gray-600">Genişlik (px)</label>
                        <input type="number" v-model.number="signatureWidgetInfo.width"
                          class="block w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-xs sm:leading-6" />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-600">Yükseklik (px)</label>
                        <input type="number" v-model.number="signatureWidgetInfo.height"
                          class="block w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-xs sm:leading-6" />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-600">Sol (oran)</label>
                        <input type="number" step="0.01" v-model.number="signatureWidgetInfo.left"
                          class="block w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-xs sm:leading-6" />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-600">Sağ (oran)</label>
                        <input type="number" step="0.01" v-model.number="signatureWidgetInfo.right"
                          class="block w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-xs sm:leading-6" />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-600">Üst (oran)</label>
                        <input type="number" step="0.01" v-model.number="signatureWidgetInfo.top"
                          class="block w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-xs sm:leading-6" />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-600">Alt (oran)</label>
                        <input type="number" step="0.01" v-model.number="signatureWidgetInfo.bottom"
                          class="block w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-xs sm:leading-6" />
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs text-gray-600">Sayfa Numaraları (virgülle ayırın)</label>
                      <input type="text" :value="signatureWidgetInfo.pagesToPlaceOn.join(',')"
                        @input="signatureWidgetInfo.pagesToPlaceOn = ($event.target as HTMLInputElement).value.split(',').filter(s => s.trim()).map(Number)"
                        class="block w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-xs sm:leading-6"
                        placeholder="1" />
                    </div>
                    <div>
                      <label class="block text-xs text-gray-600">İmza Metni</label>
                      <input type="text" v-model="signatureWidgetInfo.lines[0].text"
                        class="block w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-xs sm:leading-6"
                        placeholder="İmzalandı" />
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="block text-xs text-gray-600">Font</label>
                        <input type="text" v-model="signatureWidgetInfo.lines[0].fontName"
                          class="block w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-xs sm:leading-6" />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-600">Font Boyutu</label>
                        <input type="number" v-model.number="signatureWidgetInfo.lines[0].fontSize"
                          class="block w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-xs sm:leading-6" />
                      </div>
                    </div>
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
                  <p>Belgede PAdES türünde imza bulunmuyor.</p>
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
                  <p class="text-xs text-black"><span class="text-gray-600">Uzun Vadeli Bilgi</span> {{ signature.containsLongTermInfo ? "Evet" : "Hayır" }}</p>
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
                      <button @click="SignPadesV4(certificate)" type="button"
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
