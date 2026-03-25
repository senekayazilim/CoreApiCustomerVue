<script setup lang="ts">
import { computed, ref } from "@vue/runtime-core";
import axios from "axios";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, ListboxLabel } from "@headlessui/vue";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/20/solid";
import { DevicePhoneMobileIcon } from "@heroicons/vue/24/outline";
import CardComponent from "./CardComponent.vue";
import {
  SignatureLevelForCadesV4,
  CadesProfileV4,
  SignatureLevelForPadesV4,
  PadesProfileV4,
  SignatureLevelForXadesV4,
  XadesProfileV4,
  type ProxySignStepOneCadesMobileCoreRequestV4,
  type ProxySignStepOneCoreForCadesMobileResultV4,
  type ProxySignStepOnePadesMobileCoreRequestV4,
  type ProxySignStepOneCoreForPadesMobileResultV4,
  type ProxySignStepOneXadesMobileCoreRequestV4,
  type ProxySignStepOneCoreForXadesMobileResultV4,
  type ProxyUploadFileResult,
  type ProxyGetFingerPrintRequest,
  type ProxySignatureWidgetInfo,
} from "@/types/Types";
import { HandleError } from "@/types/HandleError";
import store from "@/types/Store";

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

const waitString = ref("");
const logs = ref([] as Array<string>);
const displayedLogs = computed(() =>
  logs.value.map((entry, idx) => ({ entry, order: idx + 1 })).slice().reverse()
);

const operationIdOfFileUpload = ref("");
const operationIdOfMobileSign = ref("");
const fingerPrint = ref("");
const isSuccess = ref(false);

// Dosya seçimi
const selectedFile = ref<File | null>(null);
const selectedFileName = ref("");

// Mobil imza ortak alanlar
const phoneNumber = ref("");
const citizenshipNo = ref("");
const userPrompt = ref("Lütfen imzalayınız.");

// İmza yolu
const signaturePath = ref(null as string | null);

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
  imageBytes: null,
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
// DROPDOWN SEÇENEKLERİ
// ═══════════════════════════════════════════════════════════════

// İmza Türü
const signatureTypes = [
  { id: "cades", title: "CAdES" },
  { id: "pades", title: "PAdES" },
  { id: "xades", title: "XAdES" },
];
const selectedSignatureType = ref(signatureTypes[0]);

// Operatörler
const operators = [
  { id: "TURKCELL", name: "Turkcell" },
  { id: "VODAFONE", name: "Vodafone" },
  { id: "AVEA", name: "Türk Telekom" },
];
const selectedOperator = ref(operators[0]);

// Seri/Paralel
const serialOrParallelOptions = [
  { id: "SERIAL", title: "Seri" },
  { id: "PARALLEL", title: "Paralel" },
];
const selectedSerialOrParallel = ref(serialOrParallelOptions[1]);

// XAdES Enveloping/Enveloped
const envelopingOrEnvelopedOptions = [
  { id: "ENVELOPED", title: "Enveloped" },
  { id: "ENVELOPING", title: "Enveloping" },
];
const selectedEnvelopingOrEnveloped = ref(envelopingOrEnvelopedOptions[0]);

// CAdES imza seviyeleri
const cadesSignatureLevelOptions = Object.keys(SignatureLevelForCadesV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({ label: key, value: SignatureLevelForCadesV4[key as keyof typeof SignatureLevelForCadesV4] }));
const selectedCadesSignatureLevel = ref(cadesSignatureLevelOptions[0]);

// CAdES profilleri
const cadesProfileOptions = Object.keys(CadesProfileV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({ label: key, value: CadesProfileV4[key as keyof typeof CadesProfileV4] }));
const selectedCadesProfile = ref(cadesProfileOptions[0]);

// PAdES imza seviyeleri
const padesSignatureLevelOptions = Object.keys(SignatureLevelForPadesV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({ label: key, value: SignatureLevelForPadesV4[key as keyof typeof SignatureLevelForPadesV4] }));
const selectedPadesSignatureLevel = ref(padesSignatureLevelOptions[0]);

// PAdES profilleri
const padesProfileOptions = Object.keys(PadesProfileV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({ label: key, value: PadesProfileV4[key as keyof typeof PadesProfileV4] }));
const selectedPadesProfile = ref(padesProfileOptions[0]);

// XAdES imza seviyeleri
const xadesSignatureLevelOptions = Object.keys(SignatureLevelForXadesV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({ label: key, value: SignatureLevelForXadesV4[key as keyof typeof SignatureLevelForXadesV4] }));
const selectedXadesSignatureLevel = ref(xadesSignatureLevelOptions[0]);

// XAdES profilleri
const xadesProfileOptions = Object.keys(XadesProfileV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({ label: key, value: XadesProfileV4[key as keyof typeof XadesProfileV4] }));
const selectedXadesProfile = ref(xadesProfileOptions[0]);

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
    operationIdOfMobileSign.value = "";
    operationIdOfFileUpload.value = "";
    fingerPrint.value = "";
    isSuccess.value = false;
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
  operationIdOfMobileSign.value = "";

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
// MOBİL İMZA
// ═══════════════════════════════════════════════════════════════

async function MobileSignV4() {
  fingerPrint.value = "";
  operationIdOfMobileSign.value = "";
  isSuccess.value = false;

  const type = selectedSignatureType.value.id;
  let endpoint = "";
  let request: unknown;

  if (type === "cades") {
    endpoint = "/Onaylarim/MobileSignCadesV4";
    request = {
      operationId: operationIdOfFileUpload.value,
      phoneNumber: phoneNumber.value,
      operator: selectedOperator.value.id,
      userPrompt: userPrompt.value,
      citizenshipNo: citizenshipNo.value || null,
      signatureLevel: selectedCadesSignatureLevel.value.value,
      profile: selectedCadesProfile.value.value,
      serialOrParallel: selectedSerialOrParallel.value.id,
      signaturePath: signaturePath.value,
    } as ProxySignStepOneCadesMobileCoreRequestV4;
  } else if (type === "pades") {
    endpoint = "/Onaylarim/MobileSignPadesV4";
    request = {
      operationId: operationIdOfFileUpload.value,
      phoneNumber: phoneNumber.value,
      operator: selectedOperator.value.id,
      userPrompt: userPrompt.value,
      citizenshipNo: citizenshipNo.value || null,
      signatureLevel: selectedPadesSignatureLevel.value.value,
      profile: selectedPadesProfile.value.value,
      signatureWidgetInfo: useVisibleSignature.value ? signatureWidgetInfo.value : null,
    } as ProxySignStepOnePadesMobileCoreRequestV4;
  } else {
    endpoint = "/Onaylarim/MobileSignXadesV4";
    request = {
      operationId: operationIdOfFileUpload.value,
      phoneNumber: phoneNumber.value,
      operator: selectedOperator.value.id,
      userPrompt: userPrompt.value,
      citizenshipNo: citizenshipNo.value || null,
      signatureLevel: selectedXadesSignatureLevel.value.value,
      profile: selectedXadesProfile.value.value,
      serialOrParallel: selectedSerialOrParallel.value.id,
      signaturePath: signaturePath.value,
      envelopingOrEnveloped: selectedEnvelopingOrEnveloped.value.id,
    } as ProxySignStepOneXadesMobileCoreRequestV4;
  }

  waitString.value = "Mobil imza işlemi hazırlanıyor.";
  logs.value.push(`${type.toUpperCase()} mobil imza isteği gönderiliyor.`);

  // Mobil imza + GetFingerPrintV2 paralel çağrılır
  const mobileSignPromise = axios.post(store.API_URL + endpoint, request);

  logs.value.push("GetFingerPrintV2 isteği gönderiliyor.");
  const fingerPrintPromise = axios.post(
    store.API_URL + "/Onaylarim/GetFingerPrintV2",
    { operationId: operationIdOfFileUpload.value } as ProxyGetFingerPrintRequest
  );

  // FingerPrint sonucunu bekle (paralel)
  fingerPrintPromise
    .then((response) => {
      fingerPrint.value = response.data.fingerPrint;
      logs.value.push("Parmak izi alındı.");
    })
    .catch((error) => {
      logs.value.push("GetFingerPrintV2 isteği gönderilemedi. Mesaj: " + HandleError(error));
      console.error("GetFingerPrintV2 error", error);
    });

  // Mobil imza sonucunu bekle
  try {
    const mobileSignResponse = await mobileSignPromise;
    const result = mobileSignResponse.data as
      ProxySignStepOneCoreForCadesMobileResultV4 |
      ProxySignStepOneCoreForPadesMobileResultV4 |
      ProxySignStepOneCoreForXadesMobileResultV4;

    if (result.error) {
      waitString.value = "Mobil imza işlemi tamamlanamadı. Hata: " + result.error;
      logs.value.push("Mobil imza hata: " + result.error);
    } else if (result.isSuccess) {
      isSuccess.value = true;
      operationIdOfMobileSign.value = result.operationId || "";
      waitString.value = "Mobil imza işlemi başarıyla tamamlandı.";
      logs.value.push("Mobil imza başarılı.");
    } else {
      waitString.value = "Mobil imza işlemi tamamlanamadı.";
      logs.value.push("Mobil imza başarısız.");
    }
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    waitString.value = "Mobil imza isteği gönderilemedi. " + HandleError(normalizedError);
    logs.value.push("Mobil imza isteği gönderilemedi. " + HandleError(normalizedError));
    console.error("MobileSignV4 error", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// DOSYA İNDİRME
// ═══════════════════════════════════════════════════════════════

async function DownloadFile() {
  if (!operationIdOfMobileSign.value) {
    waitString.value = "İmza işlemi tamamlanmadan dosya indirilemez.";
    return;
  }

  try {
    const response = await axios.get(
      store.API_URL + "/Onaylarim/DownloadCoreV2?operationId=" + operationIdOfMobileSign.value,
      { responseType: "blob" }
    );

    if (response.data.error) {
      waitString.value = "Hata oluştu. " + response.data.error;
      return;
    }

    const type = selectedSignatureType.value.id;
    let filename = type === "pades" ? "dosya.pdf" : type === "xades" ? "dosya.xml" : "dosya.p7s";
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
</script>

<template>
  <main class="space-y-4">
    <CardComponent title="Mobil İmza V4">
      <template v-slot:icon>
        <DevicePhoneMobileIcon></DevicePhoneMobileIcon>
      </template>
      <template v-slot:content>
        <div class="flex flex-col lg:flex-row lg:gap-6">
          <!-- Sol: Form Alanları -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-col mt-2">

              <!-- İmza Türü -->
              <div class="text-sm text-gray-700">
                <p>Hangi türde e-imza atılmasını istiyorsunuz?</p>
              </div>
              <div class="mt-1 flex items-center">
                <fieldset>
                  <div class="space-y-4 sm:flex sm:items-center sm:space-x-10 sm:space-y-0">
                    <div v-for="signatureType in signatureTypes" :key="signatureType.id" class="flex items-center cursor-pointer">
                      <input :id="'sigTypeV4_' + signatureType.id" name="signatureTypeV4" type="radio" :value="signatureType" v-model="selectedSignatureType"
                        class="h-4 w-4 border-gray-300 text-yellow-600 focus:ring-yellow-600 cursor-pointer" />
                      <label :for="'sigTypeV4_' + signatureType.id" class="ml-3 block text-sm font-medium leading-6 text-gray-900 cursor-pointer">{{ signatureType.title }}</label>
                    </div>
                  </div>
                </fieldset>
              </div>

              <!-- Dosya Seçimi -->
              <div class="mt-2 max-w-sm">
                <label for="uploadFileMobileV4" class="block text-sm/6 font-medium text-gray-900 dark:text-white">İmzalanacak Dosya</label>
                <div class="mt-1 flex items-center gap-3 rounded-md border-0 py-1.5 pl-0 pr-3 text-gray-900">
                  <input id="uploadFileMobileV4" name="uploadFileMobileV4" type="file" class="sr-only" @change="onFileSelected" />
                  <label for="uploadFileMobileV4"
                    class="flex-shrink-0 rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                    Dosya seç
                  </label>
                  <span class="text-sm text-gray-500 truncate" :class="{ 'text-gray-400': !selectedFileName }">
                    {{ selectedFileName || "Seçili dosya yok" }}
                  </span>
                </div>
              </div>

              <!-- CAdES İmza Seviyesi -->
              <Listbox as="div" v-model="selectedCadesSignatureLevel" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'cades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">CAdES İmza Seviyesi</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedCadesSignatureLevel.label }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="option in cadesSignatureLevelOptions" :key="option.value" :value="option" v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"><CheckIcon class="h-5 w-5" aria-hidden="true" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <!-- CAdES Profil -->
              <Listbox as="div" v-model="selectedCadesProfile" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'cades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">CAdES Profil</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedCadesProfile.label }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="option in cadesProfileOptions" :key="option.value" :value="option" v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"><CheckIcon class="h-5 w-5" aria-hidden="true" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <!-- PAdES İmza Seviyesi -->
              <Listbox as="div" v-model="selectedPadesSignatureLevel" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'pades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">PAdES İmza Seviyesi</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedPadesSignatureLevel.label }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="option in padesSignatureLevelOptions" :key="option.value" :value="option" v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"><CheckIcon class="h-5 w-5" aria-hidden="true" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <!-- PAdES Profil -->
              <Listbox as="div" v-model="selectedPadesProfile" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'pades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">PAdES Profil</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedPadesProfile.label }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="option in padesProfileOptions" :key="option.value" :value="option" v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"><CheckIcon class="h-5 w-5" aria-hidden="true" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <!-- Görsel İmza (sadece PAdES) -->
              <div class="mt-3 max-w-sm" v-if="selectedSignatureType.id === 'pades'">
                <div class="flex items-center">
                  <input id="useVisibleSignatureMobile" name="useVisibleSignatureMobile" type="checkbox" v-model="useVisibleSignature"
                    class="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-600 cursor-pointer" />
                  <label for="useVisibleSignatureMobile" class="ml-3 block text-sm font-medium leading-6 text-gray-900 cursor-pointer">Görsel İmza</label>
                </div>
              </div>

              <!-- Görsel İmza Ayarları -->
              <div v-if="useVisibleSignature && selectedSignatureType.id === 'pades'" class="mt-2 max-w-sm p-3 bg-gray-50 border border-gray-200 rounded-md space-y-2">
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

              <!-- XAdES İmza Seviyesi -->
              <Listbox as="div" v-model="selectedXadesSignatureLevel" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'xades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">XAdES İmza Seviyesi</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedXadesSignatureLevel.label }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="option in xadesSignatureLevelOptions" :key="option.value" :value="option" v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"><CheckIcon class="h-5 w-5" aria-hidden="true" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <!-- XAdES Profil -->
              <Listbox as="div" v-model="selectedXadesProfile" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'xades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">XAdES Profil</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedXadesProfile.label }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="option in xadesProfileOptions" :key="option.value" :value="option" v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"><CheckIcon class="h-5 w-5" aria-hidden="true" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <!-- XAdES Enveloping/Enveloped -->
              <Listbox as="div" v-model="selectedEnvelopingOrEnveloped" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'xades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">XAdES İmza Türü</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedEnvelopingOrEnveloped.title }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="option in envelopingOrEnvelopedOptions" :key="option.id" :value="option" v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.title }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"><CheckIcon class="h-5 w-5" aria-hidden="true" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <!-- Seri/Paralel (CAdES ve XAdES) -->
              <Listbox as="div" v-model="selectedSerialOrParallel" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'cades' || selectedSignatureType.id === 'xades'">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">İmza Metodu</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedSerialOrParallel.title }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="option in serialOrParallelOptions" :key="option.id" :value="option" v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.title }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"><CheckIcon class="h-5 w-5" aria-hidden="true" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <!-- İmza Yolu (CAdES ve XAdES, Seri modda) -->
              <div class="mt-2 max-w-sm" v-if="(selectedSignatureType.id === 'cades' || selectedSignatureType.id === 'xades') && selectedSerialOrParallel.id === 'SERIAL'">
                <label for="signaturePathMobileV4" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Üstüne İmza Atılacak İmza Adı</label>
                <input type="text" name="signaturePathMobileV4" id="signaturePathMobileV4" v-model="signaturePath" autocomplete="off"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                  placeholder="S0:S0" />
              </div>

              <!-- Operatör -->
              <Listbox as="div" v-model="selectedOperator" class="max-w-sm mt-2">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Operatör</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedOperator.name }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="gsmOperator in operators" :key="gsmOperator.id" :value="gsmOperator" v-slot="{ active, selected }">
                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ gsmOperator.name }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"><CheckIcon class="h-5 w-5" aria-hidden="true" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>

              <!-- Telefon Numarası -->
              <div class="mt-2 max-w-sm">
                <label for="phoneNumberV4" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Mobil Telefon Numarası</label>
                <input type="text" name="phoneNumberV4" id="phoneNumberV4" v-model="phoneNumber" autocomplete="off"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                  placeholder="5339992200" />
              </div>

              <!-- Kullanıcı Mesajı -->
              <div class="mt-2 max-w-sm">
                <label for="userPromptV4" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Kullanıcı Mesajı</label>
                <input type="text" name="userPromptV4" id="userPromptV4" v-model="userPrompt" autocomplete="off"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                  placeholder="Lütfen imzalayınız." />
              </div>

              <!-- TC Kimlik No -->
              <div class="mt-2 max-w-sm">
                <label for="citizenshipNoV4" class="block text-sm/6 font-medium text-gray-900 dark:text-white">TC Kimlik Numarası</label>
                <input type="text" name="citizenshipNoV4" id="citizenshipNoV4" v-model="citizenshipNo" maxlength="11" autocomplete="off"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                  placeholder="TC Kimlik numarası" />
                <p class="mt-1 text-xs text-gray-500">TC kimlik numarası verilmesi durumunda, mobil imza sahibi ile burada girilen TC numarası kontrol edilir.</p>
              </div>

              <!-- İmzala Butonu -->
              <div class="mt-3 max-w-sm">
                <button type="button" @click="MobileSignV4()" :disabled="!operationIdOfFileUpload"
                  class="rounded-md bg-yellow-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:bg-gray-300 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-800 focus:ring-offset-2 focus:ring-offset-yellow-200">
                  İmzala
                </button>
              </div>

            </div>
          </div>

          <!-- Sağ: Sonuç Bilgileri -->
          <div class="flex-1 min-w-0 mt-4 lg:mt-0">
            <div class="px-4 py-3 border-gray-200 border rounded-md bg-gray-100/50 h-full">
              <label class="block text-sm font-medium text-gray-900 dark:text-white">Sonuç</label>
              <p v-if="operationIdOfFileUpload" class="text-xs text-gray-500 mt-1">Dosya OperationId: <span class="font-mono select-all">{{ operationIdOfFileUpload }}</span></p>

              <!-- Parmak İzi -->
              <div v-if="fingerPrint" class="mt-3">
                <p class="text-xs text-gray-600">Parmak İzi</p>
                <p class="font-medium text-sm text-gray-900 select-all">{{ fingerPrint }}</p>
              </div>

              <!-- Durum Mesajı -->
              <div class="mt-3" v-if="waitString">
                <p class="text-sm leading-6 text-gray-500">{{ waitString }}</p>
                <p v-if="isSuccess && operationIdOfMobileSign" @click="DownloadFile()"
                  class="text-sm leading-6 text-orange-500 hover:underline cursor-pointer mt-1">e-İmzalı dosyayı indir</p>
              </div>

              <div v-if="operationIdOfMobileSign" class="mt-3">
                <p class="text-xs text-gray-500">İmza OperationId: <span class="font-mono select-all">{{ operationIdOfMobileSign }}</span></p>
              </div>

              <div v-if="!operationIdOfFileUpload && !waitString" class="text-sm text-gray-700 mt-2">
                <p>Dosya yüklenmedi.</p>
              </div>
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
