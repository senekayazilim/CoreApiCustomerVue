<script setup lang="ts">
import { ref } from "@vue/runtime-core";
import axios, { AxiosError } from "axios";
import { v4 as uuidv4 } from "uuid";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/vue";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/20/solid";
import { DevicePhoneMobileIcon } from "@heroicons/vue/24/outline";
import CardComponent from "./CardComponent.vue";
import {  SignatureLevelForCades, type ProxyGetFingerPrintRequest, type ProxyMobileSignRequestV2, type ProxyMobilSignResult } from "@/types/Types";
import {  HandleError } from "@/types/HandleError";
import store from "@/types/Store";

// Kullanıcıya gösterilen mesaj
const waitString = ref("");
// yapılan işlemler
const logs = ref([] as Array<string>);
// primeAPI'de kullanılacak tekil operasyon numarası
const operationId = ref("");
// imza atarken kullanılacak telefon numarası. 5334440099 şeklinde olmalıdır
const phoneNumber = ref("");
// imza atarken kullanılacak mobil hattın sahibi olan kişinin TC numarası. Eğer bu değer girilmez ise kontrol yapılmaz.
const citizenshipNo = ref("");
// kullanıcıya gösterilen mobil imza parmak izi değeri
const fingerPrint = ref("");
// işlemin başarıyla tamamlanıp tamamlanmadığını gösterir
const isSuccess = ref(false);

// mobil imza için kullanılacak operatörler. Id değerinde yazan ifade API'ye gönderilir. Bu ifadeler değiştirilmemelidir.
const operators = [
    { id: "TURKCELL", name: "Turkcell" },
    { id: "VODAFONE", name: "Vodafone" },
    { id: "AVEA", name: "Türk Telekom" },
];

// kullanıcının seçtiği mobil operator
const selectedOperator = ref(operators[0]);

// imza atarken kullanılacak e-imza tür
const signatureTypes = [
    { id: "pades", title: "Pades" },
    { id: "cades", title: "Cades" },
    { id: "xades", title: "Xades" },
];

// kullanıcının seçtiği imza türü
const selectedSignatureType = ref(signatureTypes[0]);

// https://github.com/uuidjs/uuid kullanılmak istenmediğinde onun yerine aşağıdaki fonksiyon kullanılabilir
// function uuidv4(): string {
//     return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: string) => {
//         const randomValues = new Uint8Array(1);
//         crypto.getRandomValues(randomValues);
//         const byte = randomValues[0];
//         return (c ^ (byte & (15 >> (parseInt(c, 10) / 4)))).toString(16);
//     });
// }

function MobileSign() {
    // Parmak izi değerinin alınması için mobil imza işlemi bitmeden operationId'nin bilinmesi gerekmektedir. Bu nedenle operationId client side'da oluşturulmuştur.
    operationId.value = uuidv4();
    fingerPrint.value = "";

    const mobileSignRequest = { operationId: operationId.value, phoneNumber: phoneNumber.value, operator: selectedOperator.value.id, signatureType: selectedSignatureType.value.id, citizenshipNo: citizenshipNo.value };
    waitString.value = "İmza işlemi hazırlanıyor.";
    logs.value.push("Sizin sunucu katmanına MobileSign isteği gönderiliyor.");
    // mobil imza işlemi yapılır
    axios
        .post(store.API_URL + "/Onaylarim/MobileSign", mobileSignRequest)
        .then((mobileSignResponse) => {
            logs.value.push("Sizin sunucu katmanına MobileSign isteği gönderildi. Detaylar için console'a bakınız.");
            console.log("Sizin sunucu katmanına MobileSign isteği gönderildi.", mobileSignResponse);
            const mobileSignResult = mobileSignResponse.data as ProxyMobilSignResult;
            isSuccess.value = mobileSignResult.isSuccess;
            if (mobileSignResult.error) {
                waitString.value = "İmza işlemi tamamlanamadı. Hata: " + mobileSignResult.error;
            } else {
                waitString.value = "İmza işlemi tamamlandı.";
            }
        })
        .catch((error) => {
            logs.value.push("Sizin sunucu katmanına MobileSign isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
            console.log("Sizin sunucu katmanına MobileSign isteği gönderilemedi.", error);
        });
    // mobil imza işlemi sürerken işleme ilişkin parmak izi değeri alınır
    axios
        .post(store.API_URL + "/Onaylarim/GetFingerPrint", { operationId: operationId.value } as ProxyGetFingerPrintRequest)
        .then((getFingerResponse) => {
            console.log("getFingerResponse", getFingerResponse);
            fingerPrint.value = getFingerResponse.data.fingerPrint;
        })
        .catch((error) => {
            logs.value.push("Sizin sunucu katmanına GetFingerPrint isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
            console.log("Sizin sunucu katmanına GetFingerPrint isteği gönderilemedi.", error);
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
            waitString.value = "Hata oluştu. " + error.message;
        });
}
</script>

<template>
    <main class="space-y-4">
        <CardComponent title="Mobil İmza">
            <template v-slot:icon>
                <DevicePhoneMobileIcon></DevicePhoneMobileIcon>
            </template>
            <template v-slot:content>
                <div class="flex items-end">
                    <div class="">
                        <div class="text-sm text-gray-700">
                            <p>Hangi türde e-imza atılmasını istiyorsanız seçiniz?</p>
                        </div>
                        <div class="mt-1 flex items-center">
                            <fieldset>
                                <legend class="sr-only">Notification method</legend>
                                <div class="space-y-4 sm:flex sm:items-center sm:space-x-10 sm:space-y-0">
                                    <div v-for="signatureType in signatureTypes" :key="signatureType.id"
                                        class="flex items-center cursor-pointer">
                                        <input :id="signatureType.id" name="notification-method" type="radio"
                                            :value="signatureType" v-model="selectedSignatureType"
                                            class="h-4 w-4 border-gray-300 text-yellow-600 focus:ring-yellow-600 cursor-pointer" />
                                        <label :for="signatureType.id"
                                            class="ml-3 block text-sm font-medium leading-6 text-gray-900 cursor-pointer">{{
                                                signatureType.title }}</label>
                                    </div>
                                </div>
                            </fieldset>
                        </div>
                        <div class="text-sm text-gray-700 mt-8">
                            <p>Operatör ve cep numaranızı girip mobil imza atabilirsiniz.</p>
                        </div>
                        <div class="flex flex-col mt-2">
                            <Listbox as="div" v-model="selectedOperator" class="max-w-sm">
                                <div class="relative mt-2">
                                    <ListboxButton
                                        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                                        <span class="block truncate">{{ selectedOperator.name }}</span>
                                        <span
                                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </span>
                                    </ListboxButton>

                                    <transition leave-active-class="transition ease-in duration-100"
                                        leave-from-class="opacity-100" leave-to-class="opacity-0">
                                        <ListboxOptions
                                            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                            <ListboxOption as="template" v-for="gsmOperator in operators"
                                                :key="gsmOperator.id" :value="gsmOperator"
                                                v-slot="{ active, selectedOperator }">
                                                <li
                                                    :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                                                    <span
                                                        :class="[selectedOperator ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                                                            gsmOperator.name }}</span>
                                                    <span v-if="selectedOperator"
                                                        :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                                        <CheckIcon class="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                </li>
                                            </ListboxOption>
                                        </ListboxOptions>
                                    </transition>
                                </div>
                            </Listbox>

                            <div class="mt-2 max-w-sm">
                                <input type="text" name="phoneNumber" id="phoneNumber" v-model="phoneNumber"
                                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                    placeholder="5339992200" />
                            </div>

                            <div class="mt-2 max-w-sm">
                                <input type="text" name="citizenshipNo" id="citizenshipNo" v-model="citizenshipNo"
                                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                    placeholder="TC Kimlik numarası" />

                            </div>

                            <div class="mt-2 text-xs text-gray-600">TC kimlik numarası verilmesi durumunda, mobil imza
                                sahibi ile burada
                                girilen TC
                                numarası kontrol edilir.</div>

                        </div>
                    </div>
                    <div class="flex-grow"></div>
                    <div>
                        <button @click="MobileSign()" type="button"
                            class="rounded-md bg-orange-200 px-2 py-1.5 text-sm font-medium text-gray-900 hover:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-800 focus:ring-offset-2 focus:ring-offset-orange-200">
                            İmzala
                        </button>
                        
                    </div>
                </div>

                <div class="pt-6 pb-2 text-sm text-gray-700" v-if="fingerPrint">
                    <p>Parmak izi</p>
                    <p class="font-medium text-sm">{{ fingerPrint }}</p>
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
        <div class="pt-4 border-t border-gray-200 text-xs" v-if="logs && logs.length > 0">
            <p class="leading-6 text-sm font-medium">İşlemler</p>

            <p v-for="(logItem, index) in logs" :key="index" class="">{{ logItem }}</p>
        </div>
    </main>
</template>
