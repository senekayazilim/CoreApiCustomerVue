<script setup lang="ts">
import { computed, ref } from "@vue/runtime-core";
import axios from "axios";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/vue";
import { ChevronRightIcon, CheckCircleIcon, XCircleIcon, MinusCircleIcon } from "@heroicons/vue/20/solid";
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

// Orijinal dosya seçimi (detached imzalar için)
const selectedOriginalFile = ref<File | null>(null);
const selectedOriginalFileName = ref("");
const operationIdOfOriginalFileUpload = ref("");

const isDetachedSupported = computed(() =>
  selectedSignatureType.value.id === "cades" || selectedSignatureType.value.id === "xades"
);

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
    operationIdOfOriginalFileUpload.value = "";
    selectedOriginalFile.value = null;
    selectedOriginalFileName.value = "";
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
// ORİJİNAL DOSYA YÜKLEME (Detached imzalar için)
// ═══════════════════════════════════════════════════════════════

function onOriginalFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target?.files && target.files.length > 0) {
    const file = target.files[0];
    selectedOriginalFile.value = file;
    selectedOriginalFileName.value = file.name;
    logs.value.push(`Orijinal dosya seçildi: ${file.name}`);
    operationIdOfOriginalFileUpload.value = "";
    UploadOriginalFileToServer();
  } else {
    selectedOriginalFile.value = null;
    selectedOriginalFileName.value = "";
  }
}

async function UploadOriginalFileToServer() {
  if (!selectedOriginalFile.value) {
    waitString.value = "Lütfen orijinal dosyayı seçiniz.";
    return;
  }

  operationIdOfOriginalFileUpload.value = "";

  const formData = new FormData();
  formData.append("file", selectedOriginalFile.value);
  formData.append("filename", selectedOriginalFile.value.name);

  try {
    waitString.value = "Orijinal dosya sunucuya yükleniyor.";
    logs.value.push(`Orijinal dosya yükleme isteği gönderiliyor: ${selectedOriginalFile.value.name}`);
    const response = await axios.post(store.API_URL + "/Onaylarim/UploadFileV2", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const uploadResult = response.data as ProxyUploadFileResult;
    if (uploadResult?.isSuccess) {
      waitString.value = "Orijinal dosya sunucuya başarıyla yüklendi. Doğrulama başlatılabilir.";
      logs.value.push("Orijinal dosya sunucuya başarıyla yüklendi.");
      operationIdOfOriginalFileUpload.value = uploadResult.operationId;
    } else {
      const errorMessage = uploadResult?.error || "Orijinal dosya yüklemesi başarısız oldu.";
      waitString.value = errorMessage;
      logs.value.push(errorMessage);
    }
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    const errorMessage = HandleError(normalizedError);
    waitString.value = "Orijinal dosya yüklemesi başarısız oldu. " + errorMessage;
    logs.value.push("Orijinal dosya yüklemesi başarısız oldu. " + errorMessage);
    console.error("UploadOriginalFile error", error);
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
    const requestBody: Record<string, string | null> = {
      operationId: operationIdOfFileUpload.value,
    };
    if (type === "cades" || type === "xades") {
      requestBody.originalFileOperationId = operationIdOfOriginalFileUpload.value || null;
    }

    const response = await axios.post(store.API_URL + endpoint, requestBody);

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

function getSummaryLabel(summary: string | undefined): string {
  if (!summary) return "Bilinmiyor";
  if (summary === "ALL_VALID") return "Tüm İmzalar Geçerli";
  if (summary === "CONTAINS_INVALID") return "Geçersiz İmza İçeriyor";
  if (summary === "CONTAINS_INCOMPLETE") return "Eksik İmza İçeriyor";
  return summary;
}

interface ParsedCheck {
  status: "pass" | "fail" | "info";
  title: string;
  detail: string;
}

function parseCheckText(text: string | null | undefined): { header: string; checks: ParsedCheck[] } {
  if (!text) return { header: "", checks: [] };

  const lines = text.split("\n");
  const headerLines: string[] = [];
  const checks: ParsedCheck[] = [];
  let currentCheck: ParsedCheck | null = null;

  for (const line of lines) {
    const trimmed = line.replace(/\r/g, "").trim();
    if (!trimmed) continue;

    const passMatch = trimmed.match(/^\(\+\)\s*(.+)/);
    const failMatch = trimmed.match(/^\(-\)\s*(.+)/);
    const infoMatch = trimmed.match(/^\[-\]\s*(.+)/);

    if (passMatch) {
      if (currentCheck) checks.push(currentCheck);
      currentCheck = { status: "pass", title: passMatch[1], detail: "" };
    } else if (failMatch) {
      if (currentCheck) checks.push(currentCheck);
      currentCheck = { status: "fail", title: failMatch[1], detail: "" };
    } else if (infoMatch) {
      if (currentCheck) checks.push(currentCheck);
      currentCheck = { status: "info", title: infoMatch[1], detail: "" };
    } else if (currentCheck) {
      currentCheck.detail = currentCheck.detail ? currentCheck.detail + " " + trimmed : trimmed;
    } else {
      headerLines.push(trimmed);
    }
  }

  if (currentCheck) checks.push(currentCheck);

  return { header: headerLines.join("\n"), checks };
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

              <!-- Orijinal Dosya Seçimi (Detached imzalar için) -->
              <div class="mt-2 max-w-sm" v-if="isDetachedSupported">
                <label for="uploadOriginalFileVerifyV4" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Orijinal Dosya <span class="font-normal text-gray-500">(Detached imza ise)</span></label>
                <div class="mt-1 flex items-center gap-3 rounded-md border-0 py-1.5 pl-0 pr-3 text-gray-900">
                  <input id="uploadOriginalFileVerifyV4" name="uploadOriginalFileVerifyV4" type="file" class="sr-only" @change="onOriginalFileSelected" />
                  <label for="uploadOriginalFileVerifyV4"
                    class="flex-shrink-0 rounded-md bg-gray-500 px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                    Dosya seç
                  </label>
                  <span class="text-sm text-gray-500 truncate" :class="{ 'text-gray-400': !selectedOriginalFileName }">
                    {{ selectedOriginalFileName || "Seçili dosya yok" }}
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
                    {{ getSummaryLabel(validationResult.summary) }}
                  </span>
                </div>

                <!-- İmza Listesi -->
                <div v-if="validationResult.signatureValidations && validationResult.signatureValidations.length > 0" class="space-y-2">
                  <Disclosure as="div" v-for="(sig, index) in validationResult.signatureValidations" :key="index" v-slot="{ open }" :default-open="index === 0">
                    <DisclosureButton class="flex w-full items-center gap-x-2 rounded-md p-2 text-left text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50">
                      <ChevronRightIcon :class="[open ? 'rotate-90 text-gray-500' : 'text-gray-400', 'h-5 w-5 shrink-0 transition-transform']" aria-hidden="true" />
                      <CheckCircleIcon v-if="sig.validationResultType === 'VALID'" class="h-5 w-5 text-green-500 shrink-0" />
                      <XCircleIcon v-else-if="sig.validationResultType === 'INVALID'" class="h-5 w-5 text-red-500 shrink-0" />
                      <MinusCircleIcon v-else class="h-5 w-5 text-yellow-500 shrink-0" />
                      <span class="flex-1 truncate">{{ sig.signerFullName || 'İmza ' + (index + 1) }}</span>
                      <span v-if="sig.signatureFormat" class="text-xs text-gray-400 font-normal">{{ sig.signatureFormat }}</span>
                      <span :class="[getValidationResultColor(sig.validationResultType), 'text-xs font-medium']">{{ sig.validationResultType }}</span>
                    </DisclosureButton>
                    <DisclosurePanel class="mt-1 ml-7 text-xs">
                      <!-- Temel Bilgiler -->
                      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 mt-1">
                        <template v-if="sig.signerFullName">
                          <dt class="text-gray-500">İmzacı</dt>
                          <dd class="text-gray-900 font-medium">{{ sig.signerFullName }}</dd>
                        </template>
                        <template v-if="sig.serialNumber">
                          <dt class="text-gray-500">Seri No</dt>
                          <dd class="text-gray-900 font-mono">{{ sig.serialNumber }}</dd>
                        </template>
                        <template v-if="sig.signatureType">
                          <dt class="text-gray-500">İmza Tipi</dt>
                          <dd class="text-gray-900">{{ sig.signatureType }}</dd>
                        </template>
                        <template v-if="sig.signatureFormat">
                          <dt class="text-gray-500">Format</dt>
                          <dd class="text-gray-900">{{ sig.signatureFormat }}</dd>
                        </template>
                        <template v-if="sig.signatureAlg">
                          <dt class="text-gray-500">Algoritma</dt>
                          <dd class="text-gray-900">{{ sig.signatureAlg }}</dd>
                        </template>
                        <template v-if="sig.signingTime">
                          <dt class="text-gray-500">İmza Zamanı</dt>
                          <dd class="text-gray-900">{{ sig.signingTime }}</dd>
                        </template>
                        <template v-if="sig.signingTimeDeclared">
                          <dt class="text-gray-500">Beyan Edilen Zaman</dt>
                          <dd class="text-gray-900">{{ sig.signingTimeDeclared }}</dd>
                        </template>
                        <template v-if="sig.policyTurkishESigProfile">
                          <dt class="text-gray-500">Profil</dt>
                          <dd class="text-gray-900">{{ sig.policyTurkishESigProfile }}</dd>
                        </template>
                        <template v-if="sig.policyId">
                          <dt class="text-gray-500">Policy ID</dt>
                          <dd class="text-gray-900 font-mono break-all">{{ sig.policyId }}</dd>
                        </template>
                        <template v-if="sig.policyUri">
                          <dt class="text-gray-500">Policy URI</dt>
                          <dd class="text-gray-900 font-mono break-all">{{ sig.policyUri }}</dd>
                        </template>
                        <template v-if="sig.policyDigestAlgorithm">
                          <dt class="text-gray-500">Policy Digest</dt>
                          <dd class="text-gray-900">{{ sig.policyDigestAlgorithm }}</dd>
                        </template>
                        <template v-if="sig.policyUserNotice">
                          <dt class="text-gray-500">Policy Notice</dt>
                          <dd class="text-gray-900">{{ sig.policyUserNotice }}</dd>
                        </template>
                        <template v-if="sig.validationCertificateStatusInfotCertificateStatus">
                          <dt class="text-gray-500">Sertifika Durumu</dt>
                          <dd :class="getValidationResultColor(sig.validationCertificateStatusInfotCertificateStatus)" class="font-medium">{{ sig.validationCertificateStatusInfotCertificateStatus }}</dd>
                        </template>
                      </dl>

                      <!-- Zaman Damgası -->
                      <div v-if="sig.hasTimestamp && sig.timestamp" class="mt-3 pl-3 border-l-2 border-gray-300">
                        <p class="font-medium text-gray-700 mb-1">Zaman Damgası</p>
                        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                          <dt class="text-gray-500">Tip</dt>
                          <dd class="text-gray-900">{{ sig.timestamp.timestampType }}</dd>
                          <dt class="text-gray-500">Tarih</dt>
                          <dd class="text-gray-900">{{ sig.timestamp.dateOfTimestmap }}</dd>
                        </dl>
                      </div>

                      <!-- İmza Doğrulama Kontrolleri -->
                      <div v-if="sig.validationResult" class="mt-3">
                        <p class="font-medium text-gray-700 mb-1.5">İmza Doğrulama Kontrolleri</p>
                        <p v-if="parseCheckText(sig.validationResult).header" class="text-gray-600 mb-1.5">
                          {{ parseCheckText(sig.validationResult).header }}
                        </p>
                        <div class="space-y-1">
                          <div v-for="(check, ci) in parseCheckText(sig.validationResult).checks" :key="ci" class="flex items-start gap-1.5">
                            <CheckCircleIcon v-if="check.status === 'pass'" class="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <XCircleIcon v-else-if="check.status === 'fail'" class="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <MinusCircleIcon v-else class="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                              <span class="font-medium text-gray-800">{{ check.title }}</span>
                              <p v-if="check.detail" class="text-gray-500">{{ check.detail }}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- İptal Durumu Kontrolleri -->
                      <div v-if="sig.validationCertificateStatusInfoCheckResultsToString" class="mt-3">
                        <p class="font-medium text-gray-700 mb-1.5">İptal Durumu Kontrolleri</p>
                        <div class="space-y-1">
                          <div v-for="(check, ci) in parseCheckText(sig.validationCertificateStatusInfoCheckResultsToString).checks" :key="ci" class="flex items-start gap-1.5">
                            <CheckCircleIcon v-if="check.status === 'pass'" class="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <XCircleIcon v-else-if="check.status === 'fail'" class="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <MinusCircleIcon v-else class="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                              <span class="font-medium text-gray-800">{{ check.title }}</span>
                              <p v-if="check.detail" class="text-gray-500">{{ check.detail }}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Detaylı Bilgiler (genişletilebilir) -->
                      <Disclosure as="div" v-if="sig.validationCertificateStatusInfoDetailedMessage || sig.validationCertificateStatusInfoDetailedValidationReport || sig.validationCertificateStatusInfoValidationHistory || sig.validationCertificateStatusInfoCheckResults" v-slot="{ open: detailOpen }" class="mt-3">
                        <DisclosureButton class="flex items-center gap-x-1 text-xs text-gray-500 hover:text-gray-700">
                          <ChevronRightIcon :class="[detailOpen ? 'rotate-90' : '', 'h-4 w-4 transition-transform']" aria-hidden="true" />
                          Detaylı Rapor
                        </DisclosureButton>
                        <DisclosurePanel class="mt-1 ml-4 space-y-2">
                          <div v-if="sig.validationCertificateStatusInfoDetailedMessage">
                            <p class="text-gray-600 font-medium mb-0.5">Detaylı Mesaj</p>
                            <p class="text-gray-900 bg-white rounded p-2 border border-gray-200">{{ sig.validationCertificateStatusInfoDetailedMessage }}</p>
                          </div>
                          <div v-if="sig.validationCertificateStatusInfoCheckResults">
                            <p class="text-gray-600 font-medium mb-0.5">Sertifika Kontrolleri</p>
                            <div class="bg-white rounded p-2 border border-gray-200 space-y-1">
                              <div v-for="(check, ci) in parseCheckText(sig.validationCertificateStatusInfoCheckResults).checks" :key="ci" class="flex items-start gap-1.5">
                                <MinusCircleIcon class="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                  <span class="font-medium text-gray-800">{{ check.title }}</span>
                                  <p v-if="check.detail" class="text-gray-500">{{ check.detail }}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div v-if="sig.validationCertificateStatusInfoDetailedValidationReport">
                            <p class="text-gray-600 font-medium mb-0.5">Doğrulama Raporu</p>
                            <pre class="text-gray-900 whitespace-pre-wrap break-all bg-white rounded p-2 border border-gray-200 text-xs max-h-64 overflow-y-auto">{{ sig.validationCertificateStatusInfoDetailedValidationReport }}</pre>
                          </div>
                          <div v-if="sig.validationCertificateStatusInfoValidationHistory">
                            <p class="text-gray-600 font-medium mb-0.5">Doğrulama Geçmişi</p>
                            <p class="text-gray-900 bg-white rounded p-2 border border-gray-200">{{ sig.validationCertificateStatusInfoValidationHistory }}</p>
                          </div>
                        </DisclosurePanel>
                      </Disclosure>

                      <!-- Counter Signatures -->
                      <div v-if="sig.counterSignatureValidations && sig.counterSignatureValidations.length > 0" class="mt-3 pl-3 border-l-2 border-yellow-300">
                        <p class="font-medium text-gray-700 mb-1">Counter İmzalar</p>
                        <div v-for="(counterSig, cIndex) in sig.counterSignatureValidations" :key="cIndex" class="mb-2">
                          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                            <template v-if="counterSig.signerFullName">
                              <dt class="text-gray-500">İmzacı</dt>
                              <dd class="text-gray-900">{{ counterSig.signerFullName }}</dd>
                            </template>
                            <template v-if="counterSig.signatureType">
                              <dt class="text-gray-500">Tip</dt>
                              <dd class="text-gray-900">{{ counterSig.signatureType }}</dd>
                            </template>
                            <template v-if="counterSig.validationResultType">
                              <dt class="text-gray-500">Sonuç</dt>
                              <dd :class="getValidationResultColor(counterSig.validationResultType)">{{ counterSig.validationResultType }}</dd>
                            </template>
                          </dl>
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
