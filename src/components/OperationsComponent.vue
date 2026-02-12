<script setup lang="ts">
import { onMounted, ref, computed } from "@vue/runtime-core";
import axios from "axios";
import { ListBulletIcon, ExclamationCircleIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/vue/20/solid";
import CardComponent from "./CardComponent.vue";
import store from "@/types/Store";
import type { ProxyGetCoreApiOperationsRequest, ProxyGetCoreApiOperationsResult, ProxyCoreApiOperationItem } from "@/types/Types";
import { HandleError } from "@/types/HandleError";

// Loading durumu
const isLoading = ref(false);
// Hata mesajı
const errorMessage = ref("");
// İşlem verileri
const operationsData = ref<ProxyGetCoreApiOperationsResult | null>(null);

// Filtreler
const startDate = ref<string>("");
const endDate = ref<string>("");
const apiUserId = ref<string>("");
const operationType = ref<string>("");
const hasErrorFilter = ref<string>(""); // "", "true", "false"

// Sayfalama
const currentPage = ref(1);
const pageSize = ref(50);

// Dosya boyutunu formatla
function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Tarihi formatla
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('tr-TR');
}

// Toplam sayfa sayısı
const totalPages = computed(() => {
  if (!operationsData.value) return 0;
  return Math.ceil(operationsData.value.totalCount / operationsData.value.pageSize);
});

// Sayfa değiştir
function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchOperations();
}

// Filtreleri sıfırla
function resetFilters() {
  startDate.value = "";
  endDate.value = "";
  apiUserId.value = "";
  operationType.value = "";
  hasErrorFilter.value = "";
  currentPage.value = 1;
  fetchOperations();
}

// İşlemleri getir
function fetchOperations() {
  isLoading.value = true;
  errorMessage.value = "";
  
  const request: ProxyGetCoreApiOperationsRequest & { page?: number; pageSize?: number } = {
    startDate: startDate.value || null,
    endDate: endDate.value || null,
    apiUserId: apiUserId.value ? parseInt(apiUserId.value) : null,
    operationType: operationType.value ? parseInt(operationType.value) : null,
    hasError: hasErrorFilter.value === "" ? null : hasErrorFilter.value === "true",
    page: currentPage.value,
    pageSize: pageSize.value
  };
  
  axios
    .post(store.API_URL + "/Onaylarim/GetOperations", request)
    .then((response) => {
      console.log("GetOperations response", response);
      const result = response.data as ProxyGetCoreApiOperationsResult;
      operationsData.value = result;
      isLoading.value = false;
    })
    .catch((error) => {
      console.log("GetOperations error", error);
      errorMessage.value = HandleError(error);
      isLoading.value = false;
    });
}

// Component mount olduğunda verileri getir
onMounted(() => {
  fetchOperations();
});
</script>

<template>
  <main class="space-y-6">
    <!-- Filtreler -->
    <CardComponent title="Filtreler">
      <template v-slot:icon>
        <FunnelIcon />
      </template>
      <template v-slot:content>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <!-- Başlangıç Tarihi -->
          <div>
            <label for="startDate" class="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
            <input 
              type="date" 
              id="startDate" 
              v-model="startDate"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          
          <!-- Bitiş Tarihi -->
          <div>
            <label for="endDate" class="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
            <input 
              type="date" 
              id="endDate" 
              v-model="endDate"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          
          <!-- API User ID -->
          <div>
            <label for="apiUserId" class="block text-sm font-medium text-gray-700">API User ID</label>
            <input 
              type="number" 
              id="apiUserId" 
              v-model="apiUserId"
              placeholder="Tümü"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          
          <!-- İşlem Tipi -->
          <div>
            <label for="operationType" class="block text-sm font-medium text-gray-700">İşlem Tipi</label>
            <input 
              type="number" 
              id="operationType" 
              v-model="operationType"
              placeholder="Tümü"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          
          <!-- Hata Durumu -->
          <div>
            <label for="hasError" class="block text-sm font-medium text-gray-700">Durum</label>
            <select 
              id="hasError" 
              v-model="hasErrorFilter"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Tümü</option>
              <option value="false">Başarılı</option>
              <option value="true">Hatalı</option>
            </select>
          </div>
          
          <!-- Butonlar -->
          <div class="flex items-end gap-2">
            <button 
              @click="currentPage = 1; fetchOperations()" 
              :disabled="isLoading"
              class="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              Filtrele
            </button>
            <button 
              @click="resetFilters()" 
              :disabled="isLoading"
              class="rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 disabled:opacity-50"
            >
              Sıfırla
            </button>
          </div>
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

    <!-- İşlem Listesi -->
    <template v-if="operationsData && !isLoading">
      <CardComponent title="İşlem Detayları">
        <template v-slot:icon>
          <ListBulletIcon />
        </template>
        <template v-slot:content>
          <!-- Özet Bilgi -->
          <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
            <p class="text-sm text-gray-600">
              Toplam <span class="font-semibold">{{ operationsData.totalCount.toLocaleString('tr-TR') }}</span> kayıt bulundu.
              Sayfa <span class="font-semibold">{{ operationsData.page }}</span> / <span class="font-semibold">{{ totalPages }}</span>
            </p>
            
            <!-- Sayfa Boyutu -->
            <div class="flex items-center gap-2">
              <label for="pageSize" class="text-sm text-gray-600">Sayfa başı:</label>
              <select 
                id="pageSize" 
                v-model="pageSize"
                @change="currentPage = 1; fetchOperations()"
                class="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
                <option :value="200">200</option>
              </select>
            </div>
          </div>

          <!-- Tablo -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Key
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlem Tipi
                  </th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dosya Boyutu
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operation ID
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="op in operationsData.operations" :key="op.operationId" class="hover:bg-gray-50">
                  <!-- Durum -->
                  <td class="px-4 py-3 whitespace-nowrap">
                    <CheckCircleIcon v-if="!op.hasError" class="h-5 w-5 text-green-500" />
                    <div v-else class="group relative">
                      <XCircleIcon class="h-5 w-5 text-red-500 cursor-help" />
                      <!-- Tooltip -->
                      <div class="hidden group-hover:block absolute z-10 left-6 top-0 w-64 p-2 bg-red-50 border border-red-200 rounded shadow-lg">
                        <p class="text-xs text-red-700">{{ op.error || 'Hata detayı yok' }}</p>
                      </div>
                    </div>
                  </td>
                  <!-- Tarih -->
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {{ formatDate(op.createdDate) }}
                  </td>
                  <!-- API Key -->
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{{ op.apiUserName }}</div>
                    <div class="text-xs text-gray-500">ID: {{ op.apiUserId }}</div>
                  </td>
                  <!-- İşlem Tipi -->
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {{ op.operationTypeDescription }}
                  </td>
                  <!-- Dosya Boyutu -->
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                    {{ formatBytes(op.outputFileSize) }}
                  </td>
                  <!-- Operation ID -->
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="text-xs font-mono text-gray-500">{{ op.operationId }}</span>
                  </td>
                </tr>
                
                <!-- Boş durum -->
                <tr v-if="operationsData.operations.length === 0">
                  <td colspan="6" class="px-4 py-12 text-center text-gray-500">
                    Filtrelere uygun işlem bulunamadı.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Sayfalama -->
          <div v-if="totalPages > 1" class="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <button 
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage <= 1"
              class="flex items-center gap-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon class="h-4 w-4" />
              Önceki
            </button>
            
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">Sayfa</span>
              <input 
                type="number" 
                :value="currentPage"
                @change="goToPage(parseInt(($event.target as HTMLInputElement).value))"
                :min="1"
                :max="totalPages"
                class="w-16 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-center"
              />
              <span class="text-sm text-gray-600">/ {{ totalPages }}</span>
            </div>
            
            <button 
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage >= totalPages"
              class="flex items-center gap-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
              <ChevronRightIcon class="h-4 w-4" />
            </button>
          </div>
        </template>
      </CardComponent>
    </template>
  </main>
</template>
