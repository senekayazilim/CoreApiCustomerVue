<script setup lang="ts">
  import { ref } from "@vue/runtime-core";
  import axios, { AxiosError } from "axios";
  import { Listbox, ListboxButton, ListboxOption, ListboxOptions, ListboxLabel } from "@headlessui/vue";
  import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/20/solid";
  import { ArrowUpOnSquareIcon } from "@heroicons/vue/24/outline";
  import CardComponent from "./CardComponent.vue";
  import { SignatureLevelForXades,  type ProxyGetSignatureListResult, type ProxyGetSignatureListResultItem, type ProxyUploadFileResultV2 } from "@/types/Types";
  import { HandleError } from "@/types/HandleError";
  import store from "@/types/Store";
  
  // Kullanıcıya gösterilen mesaj
  const waitString = ref("");
  // yapılan işlemler
  const logs = ref([] as Array<string>);
  // primeAPI'de kullanılacak tekil operasyon numarası
  const operationIdOfFileUpload = ref("");
  const operationIdOfUpgradeXades = ref("");
  // işlemin başarıyla tamamlanıp tamamlanmadığını gösterir
  const isSuccess = ref(false);
  
  
  // xades imza listesi
  const signatureList = ref(undefined as Array<ProxyGetSignatureListResultItem> | null | undefined);
  // Enum'ı Combo Box için Diziye Çevirme
  const signatureOptions = Object.keys(SignatureLevelForXades).filter((key) => isNaN(Number(key))).map((key) => {
    return {
      label: key,
      value: SignatureLevelForXades[key as keyof typeof SignatureLevelForXades]
    };
  });
  
  const selectedXadesSignatureLevel = ref(signatureOptions[0]);
  
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
      signatureList.value = undefined;
      operationIdOfUpgradeXades.value="";
      operationIdOfFileUpload.value="";
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
      const uploadResult = response.data as ProxyUploadFileResultV2;
      if (uploadResult?.isSuccess) {
        waitString.value = "Dosya sunucuya başarıyla yüklendi.";
        logs.value.push("Dosya sunucuya başarıyla yüklendi.");
        operationIdOfFileUpload.value = uploadResult.operationId;
        signatureList.value = undefined;
        GetSignatureListXades();
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
  
  
  
  function GetSignatureListXades() {
    waitString.value = "Xades imza listesi alınıyor.";
    logs.value.push("Sizin sunucu katmanına GetSignatureListXades isteği gönderiliyor.");
    // mobil imza işlemi yapılır
    axios
      .get(store.API_URL + "/Onaylarim/GetSignatureListXadesV2?operationId=" + operationIdOfFileUpload.value)
      .then((getSignatureListResponse) => {
        logs.value.push("Sizin sunucu katmanına GetSignatureListXades isteği gönderildi. Detaylar için console'a bakınız.");
        console.log("Sizin sunucu katmanına GetSignatureListXades isteği gönderildi.", getSignatureListResponse);
        const getSignatureListResult = getSignatureListResponse.data as ProxyGetSignatureListResult;
        signatureList.value = getSignatureListResult.signatures;
        console.log("getSignatureListResult", getSignatureListResult);
        waitString.value = "Xades imza listesi alındı.";
      })
      .catch((error) => {
        logs.value.push("Sizin sunucu katmanına GetSignatureListXades isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
        console.log("Sizin sunucu katmanına GetSignatureListXades isteği gönderilemedi.", error);
        waitString.value = "Xades imza listesi alınamadı. " + HandleError(error);
      });
  }
  
  function DownloadFile() {
    axios
    .get(store.API_URL + "/Onaylarim/DownloadCoreV2?operationId=" + operationIdOfUpgradeXades.value, { responseType: "blob" })
      .then((e) => {
        if (e.data.error) {
          waitString.value = "Hata oluştu. " + e.data.error;
        } else {
          let filename = "dosya.pdf";
        console.log("e.headers",e.headers);
        const contentDisposition = e.headers["content-disposition"];
        console.log("contentDisposition",contentDisposition);
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
        waitString.value = "Hata oluştu. " + error.message;
      });
  }
  
  function UpgradeXades() {
  
    logs.value.push("Sizin sunucu katmanına UpgradeXades isteği gönderiliyor.");
    axios
      .get(store.API_URL + "/Onaylarim/UpgradeXadesV2?operationId=" + operationIdOfFileUpload.value + "&signatureLevel=" + selectedXadesSignatureLevel.value.value + "&signaturePath=" + signaturePath.value)
      .then((e) => {
        logs.value.push("Sizin sunucu katmanına UpgradeXades isteği gönderildi. Detaylar için console'a bakınız.");
        console.log("Sizin sunucu katmanına UpgradeXades isteği gönderildi.", e);
        if (e.data.error) {
          waitString.value = "Hata oluştu. " + e.data.error;
        } else {
          logs.value.push("e-İmzalar zenginleştirildi.");
          console.log("e.data", e.data);
          operationIdOfUpgradeXades.value = e.data as string;
          isSuccess.value = true;
          console.log("e", e.data);
        }
      })
      .catch((error) => {
        logs.value.push("Sizin sunucu katmanına UpgradeXades isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
        console.log("Sizin sunucu katmanına UpgradeXades isteği gönderilemedi.", error);
      });
  }
  
  </script>
  
  <template>
    <main class="space-y-4">
      <CardComponent title="Xades Upgrade V2">
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
  
  
  
                <Listbox as="div" v-model="selectedXadesSignatureLevel" class="max-w-sm mt-2">
                  <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Xades
                    İmza Seviyesi</ListboxLabel>
                  <div class="relative mt-0">
                    <ListboxButton
                      class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                      <span class="block truncate">{{ selectedXadesSignatureLevel.label }}</span>
                      <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </span>
                    </ListboxButton>
  
                    <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                      <ListboxOptions
                        class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        <ListboxOption as="template" v-for="xadesSignatureLevel in signatureOptions" :key="xadesSignatureLevel.label" :value="xadesSignatureLevel" v-slot="{ active, selected }">
                          <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                            <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                              xadesSignatureLevel.label }}</span>
                            <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                              <CheckIcon class="h-5 w-5" aria-hidden="true" />
                            </span>
                          </li>
                        </ListboxOption>
                      </ListboxOptions>
                    </transition>
                  </div>
                </Listbox>

                <div class="mt-2 max-w-sm" v-if="signatureList && signatureList.length > 0">
                <label for="signaturePath" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Upgrade
                  Edilecek İmza</label>
                <input type="text" name="signaturePath" id="signaturePath" v-model="signaturePath"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                  placeholder="S0:S0" />
              </div>
  
  
  
  
  
                <div class="mt-4 px-4 py-2 border-gray-200 border bg-white " id="signatureList">
                  <label class="block text-sm font-medium text-gray-900 dark:text-white">Dosyadaki Önceki İmzalar</label>
                  <div v-if="signatureList === undefined">
                    <div class="text-sm text-gray-700">
                      <p>Belge yüklenmedi.</p>
                    </div>
                  </div>
                  <div v-else-if="signatureList === null || (signatureList !== null && signatureList.length === 0)">
                    <div class="text-sm text-gray-700">
                      <p>Belgede imza bulunmuyor.</p>
                    </div>
                  </div>
                  <div class="space-y-4 mt-2" v-else>
                    <div v-for="(signature, index) in signatureList" :key="signature.entityLabel" class="mb-0">
                      <p class="text-xs text-black"><span class="text-gray-600">İmza Adı</span> {{
                        signature.entityLabel }}</p>
                      <p class="text-xs text-black"><span class="text-gray-600">İmza Seviyesi</span> {{
                        signature.levelString }}</p>
                      <p class="text-xs text-black"><span class="text-gray-600">İmzacı</span> {{
                        signature.subjectRDN }}</p>
                      <p class="text-xs text-black"><span class="text-gray-600">TC No</span> {{
                        signature.citizenshipNo }}</p>
                      <p class="text-xs text-black"><span class="text-gray-600">Zaman Damgalı Mı</span>
                        {{ signature.timestamped }}</p>
                      <p class="text-xs text-black"><span class="text-gray-600">İmza Tarihi</span> {{
                        signature.claimedSigningTime }}</p>
                      <p class="text-xs text-black" v-if="signature.xadesSignatureType"><span class="text-gray-600">Xades
                          Türü</span> {{
                            signature.xadesSignatureType }}</p>
  
                    </div>
                  </div>
                </div>
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
              </div>
            </div>
            <div class="flex-grow"></div>
            <div>
  
  
  
              <button type="button" @click="UpgradeXades()" :disabled="!operationIdOfFileUpload"
                class="rounded-md bg-yellow-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:bg-gray-300 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-800 focus:ring-offset-2 focus:ring-offset-yellow-200">
                Upgrade Et
              </button>
  
  
            </div>
  
          </div>
  
  
  
  
          <div class="mt-4 pt-4 border-t border-gray-200" v-if="waitString">
            <p class="max-w-2xl text-sm leading-6 text-gray-500">{{ waitString }}</p>
  
            <p v-if="isSuccess" @click="DownloadFile()" class="max-w-2xl text-sm leading-6 text-orange-500 hover:underline cursor-pointer">e-İmzalı
              dosyayı
              indir</p>
          </div>
        </template>
      </CardComponent>
      <div class="pt-4 border-t border-gray-200 text-xs" v-if="logs && logs.length > 0">
        <p class="leading-6 text-sm font-medium">İşlemler</p>
  
        <p v-for="(logItem, index) in logs.reverse()" :key="index" class=""> {{ logs.length - index }}. {{ logItem }}</p>
      </div>
    </main>
  </template>