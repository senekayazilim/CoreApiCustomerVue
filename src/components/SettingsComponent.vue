<script setup lang="ts">
import { onMounted, ref } from "@vue/runtime-core";
import { Cog6ToothIcon } from "@heroicons/vue/24/outline";
import CardComponent from "./CardComponent.vue";
import store from "@/types/Store";

const apiOptions = [
  { id: "local", label: "Localhost (Debug)", url: "https://localhost:7294" },
  { id: "prod", label: "Production", url: "https://primeapicustomerapi.onaylarim.com" },
];

const selectedOption = ref(apiOptions[0].id);

onMounted(() => {
  const match = apiOptions.find(o => o.url === store.API_URL);
  selectedOption.value = match ? match.id : apiOptions[0].id;
});

function Save() {
  const option = apiOptions.find(o => o.id === selectedOption.value);
  if (option) {
    store.API_URL = option.url;
  }
}
</script>

<template>
    <main class="space-y-4">
        <CardComponent title="Ayarlar">
            <template v-slot:icon>
                <Cog6ToothIcon></Cog6ToothIcon>
            </template>
            <template v-slot:content>
                <div class="flex items-end">
                    <div>
                        <div class="text-sm text-gray-700">
                            <p>Proxy servis adresini seçiniz.</p>
                        </div>
                        <div class="mt-3">
                            <fieldset>
                                <div class="space-y-2">
                                    <div v-for="option in apiOptions" :key="option.id" class="flex items-center">
                                        <input :id="'api_' + option.id" name="apiUrl" type="radio" :value="option.id" v-model="selectedOption"
                                            class="h-4 w-4 border-gray-300 text-yellow-600 focus:ring-yellow-600 cursor-pointer" />
                                        <label :for="'api_' + option.id" class="ml-3 cursor-pointer">
                                            <span class="block text-sm font-medium text-gray-900">{{ option.label }}</span>
                                            <span class="block text-xs text-gray-500 font-mono">{{ option.url }}</span>
                                        </label>
                                    </div>
                                </div>
                            </fieldset>
                        </div>
                    </div>
                    <div class="flex-grow"></div>
                    <div>
                        <button @click="Save()" type="button"
                            class="rounded-md bg-orange-200 px-2 py-1.5 text-sm font-medium text-gray-900 hover:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-800 focus:ring-offset-2 focus:ring-offset-orange-200">
                            Kaydet
                        </button>
                    </div>
                </div>
            </template>
        </CardComponent>
    </main>
</template>
