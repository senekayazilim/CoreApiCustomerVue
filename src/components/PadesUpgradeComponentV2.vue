<script setup lang="ts">
import {  computed, ref } from "@vue/runtime-core";
import axios, { AxiosError } from "axios";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, ListboxLabel } from "@headlessui/vue";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/20/solid";
import { ArrowUpOnSquareIcon } from "@heroicons/vue/24/outline";
import CardComponent from "./CardComponent.vue";
import { SignatureLevelForPades, type ProxyGetSignatureListResult, type ProxyGetSignatureListResultItem, type ProxyUploadFileResultV2} from "@/types/Types";
import { HandleError } from "@/types/HandleError";
import store from "@/types/Store";

// Kullanıcıya gösterilen mesaj
const waitString = ref("");
// yapılan işlemler
const logs = ref([] as Array<string>);
const displayedLogs = computed(() => {
  const original = logs.value;
  const total = original.length;
  return original.slice().reverse().map((entry, index) => ({
    entry,
    order: total - index,
  }));
});
// primeAPI'de kullanılacak tekil operasyon numarası
const operationId = ref(null as string | null);

// işlemin başarıyla tamamlanıp tamamlanmadığını gösterir
const isSuccess = ref(false);


// cades imza listesi
const signatureList = ref([] as Array<ProxyGetSignatureListResultItem>);
// Enum'ı Combo Box için Diziye Çevirme
const signatureOptions = Object.keys(SignatureLevelForPades).filter((key) => isNaN(Number(key))).map((key) => {
  return {
    label: key,
    value: SignatureLevelForPades[key as keyof typeof SignatureLevelForPades]
  };
});

const selectedPadesSignatureLevel = ref(signatureOptions[0]);

const selectedFile = ref<File | null>(null);
const selectedFileName = ref("");

// imza atarken kullanılacak imza yolu
const signaturePath = ref(null as string | null);

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

  const formData = new FormData();
  formData.append("file", selectedFile.value);
  formData.append("filename", selectedFile.value.name);

  try {
    waitString.value = "Dosya sunucuya yükleniyor.";
    logs.value.push(`Sunucuya dosya yükleme isteği gönderiliyor: ${selectedFile.value.name}`);
    
    const response = await axios.post(store.API_URL + "/Onaylarim/UploadFileV2", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const uploadResult = response.data as   ProxyUploadFileResultV2;
    if (uploadResult?.isSuccess) {
      waitString.value = "Dosya sunucuya başarıyla yüklendi.";
      logs.value.push("Dosya sunucuya başarıyla yüklendi.");
      operationId.value = uploadResult.operationId;
      signatureList.value = [];
      GetSignatureListPades();
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



function GetSignatureListPades() {
  waitString.value = "Pades imza listesi alınıyor.";
  logs.value.push("Sizin sunucu katmanına GetSignatureListPades isteği gönderiliyor.");
  // mobil imza işlemi yapılır
  axios
    .get(store.API_URL + "/Onaylarim/GetSignatureListPadesV2?operationId=" + operationId.value)
    .then((getSignatureListResponse) => {
      logs.value.push("Sizin sunucu katmanına GetSignatureListPades isteği gönderildi. Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına GetSignatureListPades isteği gönderildi.", getSignatureListResponse);
      const getSignatureListResult = getSignatureListResponse.data as   ProxyGetSignatureListResult;
      signatureList.value = getSignatureListResult.signatures;
      console.log("getSignatureListResult", getSignatureListResult);
    })
    .catch((error) => {
      logs.value.push("Sizin sunucu katmanına GetSignatureListPades isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına GetSignatureListPades isteği gönderilemedi.", error);
    });
}

function DownloadFile() {
  axios
    .get(store.API_URL + "/Onaylarim/DownloadSignedFileFromOnaylarimApi?operationId=" + operationId.value, { responseType: "blob" })
    .then((e) => {
      if (e.data.error) {
        waitString.value = "Hata oluştu. " + e.data.error;
      } else {
        let filename = "dosya.pdf";
        const contentDisposition = e.headers["Content-Disposition"];
        if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;\n]*=(UTF-\d['"]*)?((['"]).*?[.]$\2|[^;\n]*)?/gi);
          if (match && match[1]) {
            const a1 = match[1].split("''")[1];
            if (a1) {
              filename = decodeURI(a1);
            }
          }
        }
        const fileURL = window.URL.createObjectURL(new Blob([e.data]));
        const fileLink = document.createElement("a");
        fileLink.href = fileURL;
        fileLink.setAttribute("download", filename);
        document.body.appendChild(fileLink);
        fileLink.click();
      }
    })
    .catch((error: AxiosError) => {
      if (error.response) {
        waitString.value = "Hata oluştu. " + error.response.data;
      } else {
        waitString.value = "Hata oluştu. " + error.code;
      }
    })
    .catch((error: Error | AxiosError) => {
      waitString.value = "Hata oluştu . " + error.message;
    });
}

function UpgradePades() {

  logs.value.push("Sizin sunucu katmanına UpgradePades isteği gönderiliyor.");
  axios
    .get(store.API_URL + "/Onaylarim/UpgradePadesV2?operationId=" + operationId.value + "&signatureLevel=" + selectedPadesSignatureLevel.value.value + "&signaturePath=" + signaturePath.value)
    .then((e) => {
      logs.value.push("Sizin sunucu katmanına UpgradePades isteği gönderildi. Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına UpgradePades isteği gönderildi.", e);
      if (e.data.error) {
        waitString.value = "Hata oluştu. " + e.data.error;
      } else {
        logs.value.push("e-İmzalar zenginleştirildi.");
        isSuccess.value=true;
        console.log("e", e.data);
      }
    })
    .catch((error) => {
      logs.value.push("Sizin sunucu katmanına UpgradePades isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
      console.log("Sizin sunucu katmanına UpgradePades isteği gönderilemedi.", error);
    });
}

</script>

<template>
  <main class="space-y-4">
    <CardComponent title="Pades Upgrade V2">
      <template v-slot:icon>
        <ArrowUpOnSquareIcon></ArrowUpOnSquareIcon>
      </template>
      <template v-slot:content>
        <div class="flex items-end ">
          <div class="">


            <div class="flex flex-col mt-2">

              <div class="mt-2 max-w-sm">
                <label for="uploadFile" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Upgrade
                  Edilecek
                  Dosya</label>
                <div class="mt-1 flex items-center gap-3 rounded-md border-0  py-1.5 pl-0 pr-3 text-gray-900  ">
                  <input id="uploadFile" name="uploadFile" type="file" class="sr-only" @change="onFileSelected" />
                  <label for="uploadFile"
                    class="flex-shrink-0 rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                    Dosya seç
                  </label>
                  <span class="text-sm text-gray-500 truncate" :class="{ 'text-gray-400': !selectedFileName }">
                    {{ selectedFileName || "Seçili dosya yok" }}
                  </span>


                </div>
              </div>



              <Listbox as="div" v-model="selectedPadesSignatureLevel" class="max-w-sm mt-2">
                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Pades
                  İmza Seviyesi</ListboxLabel>
                <div class="relative mt-0">
                  <ListboxButton
                    class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                    <span class="block truncate">{{ selectedPadesSignatureLevel.label }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </ListboxButton>

                  <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100"
                    leave-to-class="opacity-0">
                    <ListboxOptions
                      class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <ListboxOption as="template" v-for="padesSignatureLevel in signatureOptions"
                        :key="padesSignatureLevel.label" :value="padesSignatureLevel" v-slot="{ active, selected }">
                        <li
                          :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                            padesSignatureLevel.label }}</span>
                          <span v-if="selected"
                            :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>





              <div class="mt-2 max-w-sm" v-if="signatureList.length > 0">
                <label for="signaturePath" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Upgrade
                  Edilecek İmza</label>
                <input type="text" name="signaturePath" id="signaturePath" v-model="signaturePath"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                  placeholder="S0:S0" />
              </div>
















            </div>
          </div>
          <div class="flex-grow"></div>
          <div>



            <button type="button" @click="UpgradePades()" :disabled="!operationId"
              class="rounded-md bg-yellow-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:bg-gray-300 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-800 focus:ring-offset-2 focus:ring-offset-yellow-200">
              Upgrade Et
            </button>


          </div>

        </div>

        <div class="mt-4 pt-4 border-t border-gray-200" id="signatureList">

          <div v-for="(signature, index) in signatureList" :key="signature.entityLabel" class="mb-4">

            <p class="text-xs text-gray-900"><span class="font-bold text-gray-900">İmza Adı:</span> {{
              signature.entityLabel }}</p>
            <p class="text-xs text-gray-500"><span class="font-bold text-gray-900">İmza Seviyesi:</span> {{
              signature.levelString }}</p>
            <p class="text-xs text-gray-500"><span class="font-bold text-gray-900">İmzacı:</span> {{
              signature.subjectRDN }}</p>
            <p class="text-xs text-gray-500"><span class="font-bold text-gray-900">TC No:</span> {{
              signature.citizenshipNo }}</p>
            <p class="text-xs text-gray-500"><span class="font-bold text-gray-900">Zaman Damgalı Mı:</span>
              {{ signature.timestamped }}</p>
            <p class="text-xs text-gray-500"><span class="font-bold text-gray-900">İmza Tarihi:</span> {{
              signature.claimedSigningTime }}</p>
            <p class="text-xs text-gray-500" v-if="signature.xadesSignatureType"><span
                class="font-bold text-gray-900">Xades Türü:</span> {{
                  signature.xadesSignatureType }}</p>
            <hr class="my-2 border-gray-200">
          </div>
        </div>


        <div class="mt-4 pt-4 border-t border-gray-200" v-if="waitString">
          <p class="max-w-2xl text-sm leading-6 text-gray-500">{{ waitString }}</p>

          <p v-if="isSuccess" @click="DownloadFile()"
            class="max-w-2xl text-sm leading-6 text-orange-500 hover:underline cursor-pointer">e-İmzalı
            dosyayı
            indir</p>
        </div>
      </template>
    </CardComponent>
    <div class="pt-4 border-t border-gray-200 text-xs" v-if="displayedLogs.length > 0">
      <p class="leading-6 text-sm font-medium">İşlemler</p>

      <p v-for="logItem in displayedLogs" :key="logItem.order" class="">
        {{ logItem.order }}. {{ logItem.entry }}
      </p>
    </div>
  </main>
</template>
