<script setup lang="ts">
import { onMounted, ref, computed } from "@vue/runtime-core";
import axios from "axios";
import { ChartBarIcon, ExclamationCircleIcon, DocumentIcon, UsersIcon, CalendarIcon } from "@heroicons/vue/24/outline";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/vue/20/solid";
import CardComponent from "./CardComponent.vue";
import store from "@/types/Store";
import type { ProxyGetCoreApiStatsRequest, ProxyGetCoreApiStatsResult, ProxyApiUserStatsItem } from "@/types/Types";
import { HandleError } from "@/types/HandleError";

// Loading durumu
const isLoading = ref(false);
// Hata mesajı
const errorMessage = ref("");
// İstatistik verisi
const statsData = ref<ProxyGetCoreApiStatsResult | null>(null);
// Tarih filtreleri
const startDate = ref<string>("");
const endDate = ref<string>("");
// Açık olan API key detayları
const expandedApiKeys = ref<Set<number>>(new Set());

// Dosya boyutunu formatla
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Sayıyı formatla (binlik ayraç)
function formatNumber(num: number): string {
  return num.toLocaleString('tr-TR');
}

// API key detaylarını aç/kapa
function toggleApiKeyDetails(apiUserId: number) {
  if (expandedApiKeys.value.has(apiUserId)) {
    expandedApiKeys.value.delete(apiUserId);
  } else {
    expandedApiKeys.value.add(apiUserId);
  }
}

// İstatistikleri getir
function fetchStats() {
  isLoading.value = true;
  errorMessage.value = "";
  
  const request: ProxyGetCoreApiStatsRequest = {
    startDate: startDate.value || null,
    endDate: endDate.value || null
  };
  
  axios
    .post(store.API_URL + "/Onaylarim/GetStats", request)
    .then((response) => {
      console.log("GetStats response", response);
      const result = response.data as ProxyGetCoreApiStatsResult;
      statsData.value = result;
      isLoading.value = false;
    })
    .catch((error) => {
      console.log("GetStats error", error);
      errorMessage.value = HandleError(error);
      isLoading.value = false;
    });
}

// Hata oranını hesapla
function calculateErrorRate(errors: number, total: number): string {
  if (total === 0) return '0%';
  return ((errors / total) * 100).toFixed(1) + '%';
}

// Component mount olduğunda verileri getir
onMounted(() => {
  fetchStats();
});
</script>

<template>
  <main class="space-y-6">
    <!-- Tarih Filtresi -->
    <CardComponent title="Tarih Filtresi">
      <template v-slot:icon>
        <CalendarIcon />
      </template>
      <template v-slot:content>
        <div class="flex flex-wrap items-end gap-4">
          <div>
            <label for="startDate" class="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
            <input 
              type="date" 
              id="startDate" 
              v-model="startDate"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label for="endDate" class="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
            <input 
              type="date" 
              id="endDate" 
              v-model="endDate"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <button 
            @click="fetchStats()" 
            :disabled="isLoading"
            class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {{ isLoading ? 'Yükleniyor...' : 'Filtrele' }}
          </button>
        </div>
      </template>
    </CardComponent>

    <!-- Hata Mesajı -->
    <div v-if="errorMessage" class="rounded-md bg-red-50 p-4">
      <div class="flex">
        <ExclamationCircleIcon class="h-5 w-5 text-red-400" />
        <div class="ml-3">
          <p class="text-sm font-medium text-red-800">{{ errorMessage }}</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>

    <!-- İstatistik Verileri -->
    <template v-if="statsData && !isLoading">
      <!-- Özet Kartları -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Organizasyon -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <UsersIcon class="h-6 w-6 text-gray-400" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Organizasyon</dt>
                  <dd class="text-lg font-semibold text-gray-900">{{ statsData.organizationName }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Toplam İşlem -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <ChartBarIcon class="h-6 w-6 text-indigo-400" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Toplam İşlem</dt>
                  <dd class="text-lg font-semibold text-gray-900">{{ formatNumber(statsData.totalOperationCount) }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Toplam Hata -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <ExclamationCircleIcon class="h-6 w-6 text-red-400" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Toplam Hata</dt>
                  <dd class="text-lg font-semibold text-gray-900">
                    {{ formatNumber(statsData.totalErrorCount) }}
                    <span class="text-sm font-normal text-gray-500">
                      ({{ calculateErrorRate(statsData.totalErrorCount, statsData.totalOperationCount) }})
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Toplam Dosya Boyutu -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <DocumentIcon class="h-6 w-6 text-green-400" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Toplam Dosya Boyutu</dt>
                  <dd class="text-lg font-semibold text-gray-900">{{ formatBytes(statsData.totalFileSizeBytes) }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- API Key Tablosu -->
      <CardComponent title="API Key Bazlı İstatistikler">
        <template v-slot:icon>
          <ChartBarIcon />
        </template>
        <template v-slot:content>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Key
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlem Sayısı
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hata Sayısı
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dosya Boyutu
                  </th>
                  <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detay
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <template v-for="apiUser in statsData.apiUserStats" :key="apiUser.apiUserId">
                  <!-- Ana Satır -->
                  <tr 
                    class="hover:bg-gray-50 cursor-pointer"
                    @click="toggleApiKeyDetails(apiUser.apiUserId)"
                  >
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-gray-900">{{ apiUser.apiUserName }}</div>
                      <div class="text-sm text-gray-500">ID: {{ apiUser.apiUserId }}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span 
                        :class="[
                          'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                          apiUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        ]"
                      >
                        {{ apiUser.isActive ? 'Aktif' : 'Pasif' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {{ formatNumber(apiUser.totalOperationCount) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span :class="apiUser.totalErrorCount > 0 ? 'text-red-600' : 'text-gray-900'">
                        {{ formatNumber(apiUser.totalErrorCount) }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {{ formatBytes(apiUser.totalFileSizeBytes) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                      <ChevronUpIcon v-if="expandedApiKeys.has(apiUser.apiUserId)" class="h-5 w-5 text-gray-400 inline" />
                      <ChevronDownIcon v-else class="h-5 w-5 text-gray-400 inline" />
                    </td>
                  </tr>
                  
                  <!-- Detay Satırı -->
                  <tr v-if="expandedApiKeys.has(apiUser.apiUserId)">
                    <td colspan="6" class="px-6 py-4 bg-gray-50">
                      <div class="text-sm font-medium text-gray-700 mb-2">İşlem Tipi Detayları</div>
                      <table class="min-w-full divide-y divide-gray-200 border border-gray-200 rounded">
                        <thead class="bg-gray-100">
                          <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">İşlem Tipi</th>
                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sayı</th>
                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Hata</th>
                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Boyut</th>
                          </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                          <tr v-for="(op, idx) in apiUser.operationDetails" :key="idx">
                            <td class="px-4 py-2 text-sm text-gray-900">{{ op.operationTypeDescription }}</td>
                            <td class="px-4 py-2 text-sm text-gray-900 text-right">{{ formatNumber(op.count) }}</td>
                            <td class="px-4 py-2 text-sm text-right" :class="op.errorCount > 0 ? 'text-red-600' : 'text-gray-900'">
                              {{ formatNumber(op.errorCount) }}
                            </td>
                            <td class="px-4 py-2 text-sm text-gray-900 text-right">{{ formatBytes(op.totalFileSizeBytes) }}</td>
                          </tr>
                          <tr v-if="apiUser.operationDetails.length === 0">
                            <td colspan="4" class="px-4 py-2 text-sm text-gray-500 text-center">İşlem detayı bulunamadı</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </template>
                
                <!-- Boş durum -->
                <tr v-if="statsData.apiUserStats.length === 0">
                  <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    Henüz istatistik verisi bulunmuyor.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </CardComponent>
    </template>
  </main>
</template>
