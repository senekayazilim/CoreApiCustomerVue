<script setup lang="ts">
import { computed, ref } from "@vue/runtime-core";
import axios from "axios";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/vue";
import { ChevronRightIcon } from "@heroicons/vue/20/solid";
import { ShieldCheckIcon } from "@heroicons/vue/24/outline";
import CardComponent from "./CardComponent.vue";
import {
  type ProxyVerifyCadesCoreRequestV4,
  type ProxyVerifyCadesCoreResultV4,
  type ProxyVerifyPadesCoreRequestV4,
  type ProxyVerifyPadesCoreResultV4,
  type ProxyVerifyXadesCoreRequestV4,
  type ProxyVerifyXadesCoreResultV4,
  type ProxyJavaValidationResultV4,
  type ProxySignatureValidationItemV4,
  type ProxyUploadFileResult,
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
const validationResult = ref(null as ProxyJavaValidationResultV4 | null);

// Dosya seçimi
const selectedFile = ref<File | null>(null);
const selectedFileName = ref("");

// ═══════════════════════════════════════════════════════════════
// DROPDOWN SEÇENEKLERİ
// ═══════════════════════════════════════════════════════════════

const signatureTypes = [
  { id: "cades", title: "CAdES" },
  { id: "pades", title: "PAdES" },
  { id: "xades", title: "XAdES" },
];
const selectedSignatureType = ref(signatureTypes[0]);

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
    operationIdOfFileUpload.value = "";
    validationResult.value = null;
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
  validationResult.value = null;

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
      waitString.value = "Dosya sunucuya başarıyla yüklendi. Doğrulama başlatılabilir.";
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
// DOĞRULAMA
// ═══════════════════════════════════════════════════════════════

async function VerifyV4() {
  validationResult.value = null;

  const type = selectedSignatureType.value.id;
  let endpoint = "";

  if (type === "cades") {
    endpoint = "/Onaylarim/VerifyCadesV4";
  } else if (type === "pades") {
    endpoint = "/Onaylarim/VerifyPadesV4";
  } else {
    endpoint = "/Onaylarim/VerifyXadesV4";
  }

  waitString.value = "Doğrulama işlemi yapılıyor.";
  logs.value.push(`${type.toUpperCase()} doğrulama isteği gönderiliyor.`);

  try {
    const response = await axios.post(store.API_URL + endpoint, {
      operationId: operationIdOfFileUpload.value,
    });

    const result = response.data as
      ProxyVerifyCadesCoreResultV4 |
      ProxyVerifyPadesCoreResultV4 |
      ProxyVerifyXadesCoreResultV4;

    if (result.error) {
      waitString.value = "Doğrulama hatası: " + result.error;
      logs.value.push("Doğrulama hata: " + result.error);
    } else {
      validationResult.value = result.validationResult;
      waitString.value = "Doğrulama tamamlandı.";
      logs.value.push("Doğrulama başarılı.");
    }
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    waitString.value = "Doğrulama isteği gönderilemedi. " + HandleError(normalizedError);
    logs.value.push("Doğrulama isteği gönderilemedi. " + HandleError(normalizedError));
    console.error("VerifyV4 error", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════

function getSummaryColor(summary: string | undefined): string {
  if (!summary) return "bg-gray-100 text-gray-800";
  if (summary === "ALL_VALID") return "bg-green-100 text-green-800";
  if (summary === "CONTAINS_INVALID") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

function getValidationResultColor(resultType: string | undefined): string {
  if (!resultType) return "text-gray-600";
  const lower = resultType.toLowerCase();
  if (lower.includes("valid") && !lower.includes("invalid")) return "text-green-700";
  if (lower.includes("invalid") || lower.includes("error")) return "text-red-700";
  return "text-yellow-700";
}
</script>

<template>
  <main class="space-y-4">
    <CardComponent title="Doğrulama V4">
      <template v-slot:icon>
        <ShieldCheckIcon></ShieldCheckIcon>
      </template>
      <template v-slot:content>
        <div class="flex flex-col lg:flex-row lg:gap-6">
          <!-- Sol: Form Alanları -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-col mt-2">

              <!-- İmza Türü -->
              <div class="text-sm text-gray-700">
                <p>Hangi türde imza doğrulaması yapılacak?</p>
              </div>
              <div class="mt-1 flex items-center">
                <fieldset>
                  <div class="space-y-4 sm:flex sm:items-center sm:space-x-10 sm:space-y-0">
                    <div v-for="signatureType in signatureTypes" :key="signatureType.id" class="flex items-center cursor-pointer">
                      <input :id="'verifyTypeV4_' + signatureType.id" name="verifyTypeV4" type="radio" :value="signatureType" v-model="selectedSignatureType"
                        class="h-4 w-4 border-gray-300 text-yellow-600 focus:ring-yellow-600 cursor-pointer" />
                      <label :for="'verifyTypeV4_' + signatureType.id" class="ml-3 block text-sm font-medium leading-6 text-gray-900 cursor-pointer">{{ signatureType.title }}</label>
                    </div>
                  </div>
                </fieldset>
              </div>

              <!-- Dosya Seçimi -->
              <div class="mt-2 max-w-sm">
                <label for="uploadFileVerifyV4" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Doğrulanacak Dosya</label>
                <div class="mt-1 flex items-center gap-3 rounded-md border-0 py-1.5 pl-0 pr-3 text-gray-900">
                  <input id="uploadFileVerifyV4" name="uploadFileVerifyV4" type="file" class="sr-only" @change="onFileSelected" />
                  <label for="uploadFileVerifyV4"
                    class="flex-shrink-0 rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                    Dosya seç
                  </label>
                  <span class="text-sm text-gray-500 truncate" :class="{ 'text-gray-400': !selectedFileName }">
                    {{ selectedFileName || "Seçili dosya yok" }}
                  </span>
                </div>
              </div>

              <!-- Doğrula Butonu -->
              <div class="mt-3 max-w-sm">
                <button type="button" @click="VerifyV4()" :disabled="!operationIdOfFileUpload"
                  class="rounded-md bg-yellow-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:bg-gray-300 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-800 focus:ring-offset-2 focus:ring-offset-yellow-200">
                  Doğrula
                </button>
              </div>

              <!-- Durum Mesajı -->
              <div class="mt-2" v-if="waitString">
                <p class="max-w-2xl text-sm leading-6 text-gray-500">{{ waitString }}</p>
              </div>
            </div>
          </div>

          <!-- Sağ: Doğrulama Sonuçları -->
          <div class="flex-1 min-w-0 mt-4 lg:mt-0">
            <div class="px-4 py-3 border-gray-200 border rounded-md bg-gray-100/50 h-full">
              <label class="block text-sm font-medium text-gray-900 dark:text-white">Doğrulama Sonucu</label>
              <p v-if="operationIdOfFileUpload" class="text-xs text-gray-500 mt-1">OperationId: <span class="font-mono select-all">{{ operationIdOfFileUpload }}</span></p>

              <div v-if="!validationResult && !waitString" class="text-sm text-gray-700 mt-2">
                <p>Henüz doğrulama yapılmadı.</p>
              </div>

              <div v-if="validationResult" class="mt-3">
                <!-- Özet Badge -->
                <div class="mb-3">
                  <span :class="[getSummaryColor(validationResult.summary), 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium']">
                    {{ validationResult.summary }}
                  </span>
                </div>

                <!-- İmza Listesi -->
                <div v-if="validationResult.signatureValidations && validationResult.signatureValidations.length > 0" class="space-y-2">
                  <Disclosure as="div" v-for="(sig, index) in validationResult.signatureValidations" :key="index" v-slot="{ open }" :default-open="index === 0">
                    <DisclosureButton class="flex w-full items-center gap-x-2 rounded-md p-2 text-left text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50">
                      <ChevronRightIcon :class="[open ? 'rotate-90 text-gray-500' : 'text-gray-400', 'h-5 w-5 shrink-0 transition-transform']" aria-hidden="true" />
                      <span class="flex-1 truncate">{{ sig.signerFullName || 'İmza ' + (index + 1) }}</span>
                      <span :class="[getValidationResultColor(sig.validationResultType), 'text-xs font-medium']">{{ sig.validationResult }}</span>
                    </DisclosureButton>
                    <DisclosurePanel class="mt-1 ml-7 space-y-1 text-xs">
                      <p class="text-black" v-if="sig.signerFullName"><span class="text-gray-600">İmzacı</span> {{ sig.signerFullName }}</p>
                      <p class="text-black" v-if="sig.serialNumber"><span class="text-gray-600">Seri No</span> {{ sig.serialNumber }}</p>
                      <p class="text-black" v-if="sig.signatureType"><span class="text-gray-600">İmza Tipi</span> {{ sig.signatureType }}</p>
                      <p class="text-black" v-if="sig.signatureFormat"><span class="text-gray-600">Format</span> {{ sig.signatureFormat }}</p>
                      <p class="text-black" v-if="sig.signatureAlg"><span class="text-gray-600">Algoritma</span> {{ sig.signatureAlg }}</p>
                      <p class="text-black" v-if="sig.signingTime"><span class="text-gray-600">İmza Zamanı</span> {{ sig.signingTime }}</p>
                      <p class="text-black" v-if="sig.signingTimeDeclared"><span class="text-gray-600">Beyan Edilen Zaman</span> {{ sig.signingTimeDeclared }}</p>
                      <p class="text-black" v-if="sig.policyTurkishESigProfile"><span class="text-gray-600">Profil</span> {{ sig.policyTurkishESigProfile }}</p>
                      <p class="text-black" v-if="sig.policyId"><span class="text-gray-600">Policy ID</span> {{ sig.policyId }}</p>
                      <p class="text-black" v-if="sig.policyUri"><span class="text-gray-600">Policy URI</span> {{ sig.policyUri }}</p>
                      <p class="text-black" v-if="sig.policyDigestAlgorithm"><span class="text-gray-600">Policy Digest</span> {{ sig.policyDigestAlgorithm }}</p>
                      <p class="text-black" v-if="sig.policyUserNotice"><span class="text-gray-600">Policy Notice</span> {{ sig.policyUserNotice }}</p>

                      <!-- Timestamp -->
                      <div v-if="sig.hasTimestamp && sig.timestamp" class="mt-1 pl-2 border-l-2 border-gray-300">
                        <p class="text-black"><span class="text-gray-600">ZD Tipi</span> {{ sig.timestamp.timestampType }}</p>
                        <p class="text-black"><span class="text-gray-600">ZD Tarihi</span> {{ sig.timestamp.dateOfTimestmap }}</p>
                      </div>

                      <!-- Doğrulama Detayları -->
                      <p class="text-black" v-if="sig.validationResult"><span class="text-gray-600">Sonuç</span> <span :class="getValidationResultColor(sig.validationResultType)">{{ sig.validationResult }}</span></p>
                      <p class="text-black" v-if="sig.validationResultType"><span class="text-gray-600">Sonuç Tipi</span> {{ sig.validationResultType }}</p>
                      <p class="text-black" v-if="sig.validationCertificateStatusInfotCertificateStatus"><span class="text-gray-600">Sertifika Durumu</span> {{ sig.validationCertificateStatusInfotCertificateStatus }}</p>
                      <p class="text-black" v-if="sig.validationCertificateStatusInfoCheckResultsToString"><span class="text-gray-600">Kontrol Sonuçları</span> {{ sig.validationCertificateStatusInfoCheckResultsToString }}</p>

                      <!-- Detaylı Bilgiler (genişletilebilir) -->
                      <Disclosure as="div" v-if="sig.validationCertificateStatusInfoDetailedMessage || sig.validationCertificateStatusInfoDetailedValidationReport || sig.validationCertificateStatusInfoValidationHistory" v-slot="{ open: detailOpen }">
                        <DisclosureButton class="flex items-center gap-x-1 text-xs text-gray-500 hover:text-gray-700 mt-1">
                          <ChevronRightIcon :class="[detailOpen ? 'rotate-90' : '', 'h-4 w-4 transition-transform']" aria-hidden="true" />
                          Detaylı Rapor
                        </DisclosureButton>
                        <DisclosurePanel class="mt-1 ml-4 space-y-1">
                          <p class="text-black whitespace-pre-wrap break-all" v-if="sig.validationCertificateStatusInfoDetailedMessage"><span class="text-gray-600">Detaylı Mesaj</span><br/>{{ sig.validationCertificateStatusInfoDetailedMessage }}</p>
                          <p class="text-black whitespace-pre-wrap break-all" v-if="sig.validationCertificateStatusInfoDetailedValidationReport"><span class="text-gray-600">Doğrulama Raporu</span><br/>{{ sig.validationCertificateStatusInfoDetailedValidationReport }}</p>
                          <p class="text-black whitespace-pre-wrap break-all" v-if="sig.validationCertificateStatusInfoValidationHistory"><span class="text-gray-600">Doğrulama Geçmişi</span><br/>{{ sig.validationCertificateStatusInfoValidationHistory }}</p>
                        </DisclosurePanel>
                      </Disclosure>

                      <!-- Counter Signatures (Recursive) -->
                      <div v-if="sig.counterSignatureValidations && sig.counterSignatureValidations.length > 0" class="mt-2 pl-2 border-l-2 border-yellow-300">
                        <p class="text-xs font-medium text-gray-700 mb-1">Counter İmzalar</p>
                        <div v-for="(counterSig, cIndex) in sig.counterSignatureValidations" :key="cIndex" class="mb-2">
                          <p class="text-black" v-if="counterSig.signerFullName"><span class="text-gray-600">İmzacı</span> {{ counterSig.signerFullName }}</p>
                          <p class="text-black" v-if="counterSig.signatureType"><span class="text-gray-600">Tip</span> {{ counterSig.signatureType }}</p>
                          <p class="text-black" v-if="counterSig.validationResult"><span class="text-gray-600">Sonuç</span> <span :class="getValidationResultColor(counterSig.validationResultType)">{{ counterSig.validationResult }}</span></p>
                        </div>
                      </div>
                    </DisclosurePanel>
                  </Disclosure>
                </div>

                <div v-else class="text-sm text-gray-700 mt-2">
                  <p>Doğrulama sonucu döndü ancak imza bilgisi bulunamadı.</p>
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
