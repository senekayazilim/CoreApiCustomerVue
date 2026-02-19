<script setup lang="ts">
import { computed, ref } from "@vue/runtime-core";
import axios from "axios";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, ListboxLabel } from "@headlessui/vue";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/20/solid";
import { ArrowUpOnSquareIcon } from "@heroicons/vue/24/outline";
import CardComponent from "./CardComponent.vue";
import {
  SignatureLevelForXadesV4,
  type ProxyUploadFileResult,
  type ProxyGetSignatureListXadesRequestV4,
  type ProxyGetSignatureListXadesResultV4,
  type ProxyXadesSignatureInfoV4,
  type ProxyUpgradeXadesRequestV4,
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
const operationIdOfUpgrade = ref("");
const isSuccess = ref(false);

// İmza listesi
const signatureList = ref(undefined as Array<ProxyXadesSignatureInfoV4> | null | undefined);
const isFileDetached = ref(false);

// İmza seviyesi (upgrade hedef seviyesi)
const signatureLevelOptions = Object.keys(SignatureLevelForXadesV4)
  .filter((key) => isNaN(Number(key)))
  .map((key) => ({
    label: key,
    value: SignatureLevelForXadesV4[key as keyof typeof SignatureLevelForXadesV4],
  }));
const selectedTargetLevel = ref(signatureLevelOptions[0]);

const selectedFile = ref<File | null>(null);
const selectedFileName = ref("");

// Upgrade edilecek imza yolu
const signaturePath = ref(null as string | null);

// Detached imzalar için orijinal dosyanın operationId'si
const originalFileOperationId = ref(null as string | null);

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

    // State reset
    signatureList.value = undefined;
    isFileDetached.value = false;
    operationIdOfUpgrade.value = "";
    operationIdOfFileUpload.value = "";
    isSuccess.value = false;
    signaturePath.value = null;
    originalFileOperationId.value = null;
    waitString.value = "";

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
// İMZA UPGRADE
// ═══════════════════════════════════════════════════════════════

async function UpgradeXadesV4() {
  try {
    waitString.value = "XAdES imza zenginleştiriliyor.";
    logs.value.push("UpgradeXadesV4 isteği gönderiliyor.");

    const request: ProxyUpgradeXadesRequestV4 = {
      operationId: operationIdOfFileUpload.value,
      targetLevel: selectedTargetLevel.value.value,
      signaturePath: signaturePath.value,
      originalFileOperationId: isFileDetached.value ? originalFileOperationId.value : null,
    };

    const response = await axios.post(
      store.API_URL + "/Onaylarim/UpgradeXadesV4",
      request
    );

    if (response.data?.error) {
      waitString.value = "Upgrade hata: " + response.data.error;
      logs.value.push("UpgradeXadesV4 hata: " + response.data.error);
    } else {
      operationIdOfUpgrade.value = response.data as string;
      isSuccess.value = true;
      waitString.value = "XAdES imza zenginleştirildi.";
      logs.value.push("UpgradeXadesV4 başarılı.");
      // İmza listesini yenile
      GetSignatureListXadesV4();
    }
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    waitString.value = "Upgrade hata: " + HandleError(normalizedError);
    logs.value.push("UpgradeXadesV4 hata: " + HandleError(normalizedError));
    console.error("UpgradeXadesV4 error", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// DOSYA İNDİRME
// ═══════════════════════════════════════════════════════════════

async function DownloadFile() {
  try {
    const response = await axios.get(
      store.API_URL + "/Onaylarim/DownloadCoreV2?operationId=" + operationIdOfUpgrade.value,
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
</script>

<template>
  <main class="space-y-4">
    <CardComponent title="XAdES Upgrade V4">
      <template v-slot:icon>
        <ArrowUpOnSquareIcon></ArrowUpOnSquareIcon>
      </template>
      <template v-slot:content>
        <div class="flex flex-col lg:flex-row lg:gap-6">
          <!-- Sol: Form Alanları -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-col mt-2">

              <!-- Dosya Seçimi -->
              <div class="mt-2 max-w-sm">
                <label for="uploadFileXadesUpgradeV4" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Upgrade Edilecek Dosya</label>
                <div class="mt-1 flex items-center gap-3 rounded-md border-0 py-1.5 pl-0 pr-3 text-gray-900">
                  <input id="uploadFileXadesUpgradeV4" name="uploadFileXadesUpgradeV4" type="file" class="sr-only" @change="onFileSelected" />
                  <label for="uploadFileXadesUpgradeV4"
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
                <p class="text-xs text-yellow-800 mb-1">Bu dosya detached imza içeriyor. Upgrade yapabilmek için orijinal dosyanın OperationId'sini giriniz.</p>
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

              <!-- Hedef İmza Seviyesi -->
              <Listbox as="div" v-model="selectedTargetLevel" class="max-w-sm mt-2">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Hedef İmza Seviyesi</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton
                    class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedTargetLevel.label }}</span>
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

              <!-- Upgrade Edilecek İmza Yolu -->
              <div class="mt-2 max-w-sm" v-if="signatureList && signatureList.length > 0">
                <label for="signaturePathXadesUpgrade" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Upgrade Edilecek İmza</label>
                <input type="text" name="signaturePathXadesUpgrade" id="signaturePathXadesUpgrade" v-model="signaturePath" autocomplete="off"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                  placeholder="S0" />
              </div>

              <div class="mt-3 max-w-sm">
                <button type="button" @click="UpgradeXadesV4()" :disabled="!operationIdOfFileUpload"
                  class="rounded-md bg-yellow-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:bg-gray-300 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-800 focus:ring-offset-2 focus:ring-offset-yellow-200">
                  Upgrade Et
                </button>
              </div>
            </div>

            <!-- Durum Mesajı -->
            <div class="mt-0 pt-4" v-if="waitString">
              <p class="max-w-2xl text-sm leading-6 text-gray-500">{{ waitString }}</p>
              <p v-if="isSuccess" @click="DownloadFile()"
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
                <div v-for="signature in signatureList" :key="signature.entityLabel" class="mb-0">
                  <p class="text-xs text-black"><span class="text-gray-600">İmza Adı</span> {{ signature.entityLabel }}</p>
                  <p class="text-xs text-black"><span class="text-gray-600">İmza Seviyesi</span> {{ signature.levelString }}</p>
                  <p class="text-xs text-black"><span class="text-gray-600">İmzacı</span> {{ signature.subjectRDN }}</p>
                  <p class="text-xs text-black" v-if="signature.citizenshipNo"><span class="text-gray-600">TC No</span> {{ signature.citizenshipNo }}</p>
                  <p class="text-xs text-black"><span class="text-gray-600">Zaman Damgalı Mı</span> {{ signature.timestamped ? "Evet" : "Hayır" }}</p>
                  <p class="text-xs text-black"><span class="text-gray-600">İmza Tarihi</span> {{ signature.claimedSigningTimeAsTime ?? signature.claimedSigningTime }}</p>
                  <p class="text-xs text-black" v-if="signature.profileName"><span class="text-gray-600">Profil</span> {{ signature.profileName }}</p>
                  <p class="text-xs text-black" v-if="signature.hashAlgorithm"><span class="text-gray-600">Hash Algoritması</span> {{ signature.hashAlgorithm }}</p>
                  <p class="text-xs text-black" v-if="signature.parentEntity"><span class="text-gray-600">Üst İmza</span> {{ signature.parentEntity }}</p>
                  <p class="text-xs text-black"><span class="text-gray-600">Uzun Vadeli Bilgi</span> {{ signature.containsLongTermInfo ? "Evet" : "Hayır" }}</p>
                  <p class="text-xs text-black" v-if="signature.lastArchivalTime"><span class="text-gray-600">Son Arşiv Zamanı</span> {{ signature.lastArchivalTime }}</p>
                  <p class="text-xs text-black" v-if="signature.signatureMode"><span class="text-gray-600">İmza Modu</span> {{ signature.signatureMode }}</p>
                  <p class="text-xs text-black" v-if="signature.timestamp"><span class="text-gray-600">Zaman Damgası</span> {{ signature.timestamp.entityLabel }}</p>
                  <p class="text-xs text-black" v-if="signature.timestamp"><span class="text-gray-600">Zaman Damgası Tarihi</span> {{ signature.timestamp.timeAsTime ?? signature.timestamp.time }}</p>
                  <p class="text-xs text-black" v-if="signature.timestamp?.tSAName"><span class="text-gray-600">TSA</span> {{ signature.timestamp.tSAName }}</p>
                  <p class="text-xs text-black" v-if="signature.upgradeOptions && signature.upgradeOptions.length > 0"><span class="text-gray-600">Upgrade Seçenekleri</span> {{ signature.upgradeOptions.join(", ") }}</p>
                  <p class="text-xs text-black" v-if="signature.profileRecommendedUpgrades && signature.profileRecommendedUpgrades.length > 0"><span class="text-gray-600">Profil Uyumlu Upgrade</span> {{ signature.profileRecommendedUpgrades.join(", ") }}</p>
                </div>
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
