<script setup lang="ts">
import { ref, shallowRef, type Component } from "@vue/runtime-core";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/vue";
import { ChevronRightIcon } from "@heroicons/vue/20/solid";
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
import SignComponentV4 from "./components/SignComponentV4.vue";
import CadesUpgradeComponentV4 from "./components/CadesUpgradeComponentV4.vue";
import SignPadesComponentV4 from "./components/SignPadesComponentV4.vue";
import PadesUpgradeComponentV4 from "./components/PadesUpgradeComponentV4.vue";
import SignXadesComponentV4 from "./components/SignXadesComponentV4.vue";
import XadesUpgradeComponentV4 from "./components/XadesUpgradeComponentV4.vue";
import MobileSignComponentV4 from "./components/MobileSignComponentV4.vue";
import VerifyComponentV4 from "./components/VerifyComponentV4.vue";
import StatsComponent from "./components/StatsComponent.vue";
import OperationsComponent from "./components/OperationsComponent.vue";

interface NavItem {
  name: string;
  tag?: ReturnType<typeof shallowRef<Component>>;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    name: "V1",
    children: [
      { name: "e-İmza", tag: shallowRef(SignComponent) },
      { name: "Mobil İmza", tag: shallowRef(MobileSignComponent) },
      { name: "PDF Convert", tag: shallowRef(PdfConvertComponent) },
      { name: "PDF Add Layers", tag: shallowRef(PdfAddLayers) },
      { name: "PAdES Upgrade", tag: shallowRef(PadesUpgradeComponent) },
      { name: "CAdES Upgrade", tag: shallowRef(CadesUpgradeComponent) },
    ],
  },
  {
    name: "V2",
    children: [
      { name: "e-İmza V2", tag: shallowRef(SignComponentV2) },
      { name: "Mobil İmza V2", tag: shallowRef(MobileSignComponentV2) },
      { name: "PDF Add Layers V2", tag: shallowRef(PdfAddQrAndVerificationInfoV2) },
      { name: "PAdES Upgrade V2", tag: shallowRef(PadesUpgradeComponentV2) },
      { name: "CAdES Upgrade V2", tag: shallowRef(CadesUpgradeComponentV2) },
      { name: "XAdES Upgrade V2", tag: shallowRef(XadesUpgradeComponentV2) },
    ],
  },
  {
    name: "V4",
    children: [
      { name: "CAdES e-İmza V4", tag: shallowRef(SignComponentV4) },
      { name: "CAdES Upgrade V4", tag: shallowRef(CadesUpgradeComponentV4) },
      { name: "PAdES e-İmza V4", tag: shallowRef(SignPadesComponentV4) },
      { name: "PAdES Upgrade V4", tag: shallowRef(PadesUpgradeComponentV4) },
      { name: "XAdES e-İmza V4", tag: shallowRef(SignXadesComponentV4) },
      { name: "XAdES Upgrade V4", tag: shallowRef(XadesUpgradeComponentV4) },
      { name: "Mobil İmza V4", tag: shallowRef(MobileSignComponentV4) },
      { name: "Doğrulama V4", tag: shallowRef(VerifyComponentV4) },
    ],
  },
  { name: "İstatistikler", tag: shallowRef(StatsComponent) },
  { name: "İşlemler", tag: shallowRef(OperationsComponent) },
  { name: "Settings", tag: shallowRef(SettingsComponent) },
];

const selectedItem = ref<NavItem | null>(null);

function selectItem(item: NavItem) {
  if (item.tag) {
    selectedItem.value = item;
  }
}

function isSelected(item: NavItem): boolean {
  return selectedItem.value?.name === item.name;
}
</script>

<template>
  <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 py-8">
    <div class="md:flex md:items-center md:justify-between sm:px-0 px-4">
      <div class="min-w-0 flex-1">
        <h2 class="text-3xl font-thin leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          ONAYLARIM Prime API Demo
        </h2>
      </div>
    </div>

    <div class="mt-6 sm:flex w-full">
      <!-- Mobile dropdown -->
      <div class="sm:hidden">
        <label for="nav-select" class="sr-only">Sayfa seçin</label>
        <select id="nav-select" name="nav-select"
          class="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          @change="(e: Event) => {
            const name = (e.target as HTMLSelectElement).value;
            for (const item of navigation) {
              if (item.tag && item.name === name) { selectItem(item); return; }
              if (item.children) {
                const child = item.children.find(c => c.name === name);
                if (child) { selectItem(child); return; }
              }
            }
          }">
          <template v-for="item in navigation" :key="item.name">
            <optgroup v-if="item.children" :label="item.name">
              <option v-for="child in item.children" :key="child.name" :selected="isSelected(child)">{{ child.name }}</option>
            </optgroup>
            <option v-else :selected="isSelected(item)">{{ item.name }}</option>
          </template>
        </select>
      </div>

      <!-- Sidebar navigation -->
      <div class="hidden sm:block shrink-0">
        <nav class="flex flex-col border-r border-gray-200 pr-0 w-48">
          <ul role="list" class="space-y-1">
            <li v-for="item in navigation" :key="item.name">
              <!-- Tek seviye item (children yok) -->
              <a v-if="!item.children"
                @click="selectItem(item)"
                :class="[
                  isSelected(item) ? 'bg-indigo-50 text-indigo-600 border-r-2 border-indigo-500' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-r-2 border-transparent',
                  'block rounded-l-md py-2 pl-4 pr-3 text-sm font-medium cursor-pointer'
                ]">
                {{ item.name }}
              </a>

              <!-- Grup (children var) -->
              <Disclosure as="div" v-else v-slot="{ open }" :default-open="item.children?.some(c => isSelected(c))">
                <DisclosureButton
                  :class="[
                    item.children?.some(c => isSelected(c)) ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900',
                    'flex w-full items-center gap-x-2 rounded-md p-2 text-left text-sm font-semibold'
                  ]">
                  <ChevronRightIcon
                    :class="[open ? 'rotate-90 text-gray-500' : 'text-gray-400', 'h-5 w-5 shrink-0 transition-transform']"
                    aria-hidden="true" />
                  {{ item.name }}
                </DisclosureButton>
                <DisclosurePanel as="ul" class="mt-1">
                  <li v-for="subItem in item.children" :key="subItem.name">
                    <a @click="selectItem(subItem)"
                      :class="[
                        isSelected(subItem) ? 'bg-indigo-50 text-indigo-600 border-r-2 border-indigo-500' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-r-2 border-transparent',
                        'block rounded-l-md py-2 pr-2 pl-9 text-sm cursor-pointer'
                      ]">
                      {{ subItem.name }}
                    </a>
                  </li>
                </DisclosurePanel>
              </Disclosure>
            </li>
          </ul>
        </nav>
      </div>

      <!-- Main content -->
      <div class="ml-4 flex-grow">
        <KeepAlive>
          <component :is="selectedItem?.tag"></component>
        </KeepAlive>
      </div>
    </div>
  </div>
</template>
