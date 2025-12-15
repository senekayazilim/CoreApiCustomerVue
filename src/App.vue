<script setup lang="ts">
import { ref, shallowRef } from "@vue/runtime-core";
import SignComponent from "./components/SignComponent.vue";
import SignComponentV2 from "./components/SignComponentV2.vue";
import MobileSignComponent from "./components/MobileSignComponent.vue";
import MobileSignComponentV2 from "./components/MobileSignComponentV2.vue";
import PdfConvertComponent from "./components/PdfConvertComponent.vue";
import PdfAddLayers from "./components/PdfAddLayers.vue";
import PdfAddQrAndVerificationInfoV2 from "./components/PdfAddQrAndVerificationInfoV2.vue";
import SettingsComponent from "./components/SettingsComponent.vue";
import PadesUpgradeComponent from "./components/PadesUpgradeComponent.vue";
import PadesUpgradeComponentV2 from "./components/PadesUpgradeComponentV2.vue";
import CadesUpgradeComponent from "./components/CadesUpgradeComponent.vue";
import CadesUpgradeComponentV2 from "./components/CadesUpgradeComponentV2.vue";
import XadesUpgradeComponentV2 from "./components/XadesUpgradeComponentV2.vue";
import { StarIcon } from "@heroicons/vue/20/solid";

const tabs = [
    { name: "e-İmza", tag: shallowRef(SignComponent) },
    
    { name: "Mobil İmza", tag: shallowRef(MobileSignComponent) },
    
    { name: "PDF Convert", tag: shallowRef(PdfConvertComponent) },
    { name: "PDF Add Layers", tag: shallowRef(PdfAddLayers) },
    
    { name: "PAdES Upgrade", tag: shallowRef(PadesUpgradeComponent) },
    
    { name: "CAdES Upgrade", tag: shallowRef(CadesUpgradeComponent) },
    

    { name: "e-İmza V2", tag: shallowRef(SignComponentV2) },
    { name: "Mobil İmza V2", tag: shallowRef(MobileSignComponentV2) },
    { name: "PDF Add Layers V2", tag: shallowRef(PdfAddQrAndVerificationInfoV2) },
    { name: "PAdES Upgrade V2", tag: shallowRef(PadesUpgradeComponentV2) },
    { name: "CAdES Upgrade V2", tag: shallowRef(CadesUpgradeComponentV2) },
    { name: "XAdES Upgrade V2", tag: shallowRef(XadesUpgradeComponentV2) },

    { name: "Settings", tag: shallowRef(SettingsComponent) },
];

const selectedTab = ref(tabs[0]);

function selectTab(tab: any) {
    selectedTab.value = tab;
}
</script>

<template>
    <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 py-8">
        <div class="md:flex md:items-center md:justify-between sm:px-0 px-4">
            <div class="min-w-0 flex-1">
                <h2 class="text-3xl font-thin leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">ONAYLARIM
                    Prime API Demo</h2>
            </div>
        </div>

        <div class="mt-6 sm:flex w-full ">
            <div class="sm:hidden">
                <label for="tabs" class="sr-only">Select a tab</label>
                <!-- Use an "onChange" listener to redirect the user to the selected tab URL. -->
                <select id="tabs" name="tabs"
                    class="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
                    <option v-for="tab in tabs" :key="tab.name">{{ tab.name }}</option>
                </select>
            </div>
            <div class="hidden sm:block">
                <div class="border-r border-gray-200">
                    <nav class="-mb-px flex space-y-0 flex-col" aria-label="Tabs">
                        <div v-for="tab in tabs" :key="tab.name" :class="[
                            tab.name === selectedTab.name ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-transparent hover:bg-indigo-50/50 text-gray-500 hover:border-gray-300 hover:text-gray-700 cursor-pointer',
                            'whitespace-nowrap border-r-2 py-3 pl-4  pr-3 text-sm font-medium flex items-center relative ',
                        ]" :aria-current="tab.name === selectedTab.name ? 'page' : undefined" @click="selectTab(tab)">
                         
                         <span>{{ tab.name }}</span>
                         <StarIcon v-if="tab.name.endsWith('V2')" class="top-4 w-3 h-3 text-indigo-700/70 absolute left-1" />   
                        </div>
                    </nav>
                </div>
            </div>

            <div class="ml-4 flex-grow">
            <KeepAlive>
                <component :is="selectedTab.tag"></component>
            </KeepAlive>
            </div>
        </div>
    </div>
</template>
