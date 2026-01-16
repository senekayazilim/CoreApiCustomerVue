<script setup lang="ts">
import { computed, ref } from "@vue/runtime-core";
import axios, { AxiosError } from "axios";
import { v4 as uuidv4 } from "uuid";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, ListboxLabel } from "@headlessui/vue";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/20/solid";
import { DevicePhoneMobileIcon } from "@heroicons/vue/24/outline";
import CardComponent from "./CardComponent.vue";
import { SignatureLevelForPades, SignatureLevelForCades, type ProxyGetFingerPrintRequest, type ProxyMobileSignRequestV2, type ProxyMobilSignResult, type ProxyUploadFileResult, type ProxyGetSignatureListResult, type ProxyGetSignatureListResultItem, SignatureLevelForXades, type ProxyUploadFileResultV2, type ProxyMobilSignResultV2, type ProxyGetSignatureListResultItemV3, type ProxyGetSignatureListResultV3 } from "@/types/Types";
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
const operationIdOfFileUpload = ref("");
const operationIdOfMobileSign = ref("");
// imza atarken kullanılacak telefon numarası. 5334440099 şeklinde olmalıdır
const phoneNumber = ref("");
// imza atarken kullanılacak mobil hattın sahibi olan kişinin TC numarası. Eğer bu değer girilmez ise kontrol yapılmaz.
const citizenshipNo = ref("");
// kullanıcıya gösterilen mobil imza parmak izi değeri
const fingerPrint = ref("");
// işlemin başarıyla tamamlanıp tamamlanmadığını gösterir
const isSuccess = ref(false);
// cades imza listesi
const signatureList = ref(null as Array<ProxyGetSignatureListResultItemV3> | null);
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

// imza atarken kullanılacak e-imza tür
const isSerialOrParallelOptions = [
    { id: "SERIAL", title: "Seri" },
    { id: "PARALLEL", title: "Paralel" },
];

// Xades imza atarken kullanılacak e-imza tür
const isEnvelopingOrEnvelopedOptions = [
    { id: "ENVELOPED", title: "Enveloped" },
    { id: "ENVELOPING", title: "Enveloping" }
];

const turkishProfileOptions = [
    { id: "NONE", title: "Hiçbiri", value: null, disabled: false },
    { id: "P1", title: "P1", value: "P1", disabled: true },
    { id: "P2", title: "P2", value: "P2", disabled: true },
    { id: "P3", title: "P3", value: "P3", disabled: true },
    { id: "P4", title: "P4", value: "P4", disabled: false },
];

// kullanıcının seçtiği imza profili
const selectedTurkishProfile = ref(turkishProfileOptions[0]);

// imza atarken kullanılacak imza yöntemi
const selectedIsSerialOrParallelOption = ref(isSerialOrParallelOptions[0]);

// Xades imza atarken kullanılacak e-imza tür
const selectedIsEnvelopingOrEnvelopedOption = ref(isEnvelopingOrEnvelopedOptions[0]);


// pades imza seviyeleri
const signatureLevelForPadesOptions = Object.keys(SignatureLevelForPades).filter((key) => isNaN(Number(key))).map((key) => {
    return {
        label: key,
        value: SignatureLevelForPades[key as keyof typeof SignatureLevelForPades]
    };
});

// cades imza seviyeleri
const signatureLevelForCadesOptions = Object.keys(SignatureLevelForCades).filter((key) => isNaN(Number(key))).map((key) => {
    return {
        label: key,
        value: SignatureLevelForCades[key as keyof typeof SignatureLevelForCades]
    };
});

// xades imza seviyeleri
const signatureLevelForXadesOptions = Object.keys(SignatureLevelForXades).filter((key) => isNaN(Number(key))).map((key) => {
    return {
        label: key,
        value: SignatureLevelForXades[key as keyof typeof SignatureLevelForXades]
    };
});

const selectedPadesSignatureLevel = ref(signatureLevelForPadesOptions[0]);
const selectedCadesSignatureLevel = ref(signatureLevelForCadesOptions[0]);
const selectedXadesSignatureLevel = ref(signatureLevelForXadesOptions[0]);
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
        operationIdOfMobileSign.value = "";
        operationIdOfFileUpload.value = "";
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
    operationIdOfMobileSign.value = "";
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
            console.log("selectedSignatureType.value", selectedSignatureType.value);
            signatureList.value = null;
            if (selectedSignatureType.value.id === "cades") {
                GetSignatureListCades();
            }
            if (selectedSignatureType.value.id === "pades") {
                GetSignatureListPades();
            }
            if (selectedSignatureType.value.id === "xades") {
                GetSignatureListXades();
            }
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

// https://github.com/uuidjs/uuid kullanılmak istenmediğinde onun yerine aşağıdaki fonksiyon kullanılabilir
// function uuidv4(): string {
//     return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: string) => {
//         const randomValues = new Uint8Array(1);
//         crypto.getRandomValues(randomValues);
//         const byte = randomValues[0];
//         return (c ^ (byte & (15 >> (parseInt(c, 10) / 4)))).toString(16);
//     });
// }

function GetSignatureListPades() {


    waitString.value = "Pades imza listesi alınıyor.";
    logs.value.push("Sizin sunucu katmanına GetSignatureListPades isteği gönderiliyor.");
    // mobil imza işlemi yapılır
    axios
        .get(store.API_URL + "/Onaylarim/GetSignatureListPadesV2?operationId=" + operationIdOfFileUpload.value)
        .then((getSignatureListResponse) => {
            logs.value.push("Sizin sunucu katmanına GetSignatureListPades isteği gönderildi. Detaylar için console'a bakınız.");
            console.log("Sizin sunucu katmanına GetSignatureListPades isteği gönderildi.", getSignatureListResponse);
            const getSignatureListResult = getSignatureListResponse.data as ProxyGetSignatureListResultV3;
            signatureList.value = getSignatureListResult.signatures;
            console.log("getSignatureListResult", getSignatureListResult);
        })
        .catch((error) => {
            logs.value.push("Sizin sunucu katmanına GetSignatureListPades isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
            console.log("Sizin sunucu katmanına GetSignatureListPades isteği gönderilemedi.", error);
        });


}

function GetSignatureListCades() {


    waitString.value = "Cades imza listesi alınıyor.";
    logs.value.push("Sizin sunucu katmanına GetSignatureListCades isteği gönderiliyor.");
    // mobil imza işlemi yapılır
    axios
        .get(store.API_URL + "/Onaylarim/GetSignatureListCadesV2?operationId=" + operationIdOfFileUpload.value)
        .then((getSignatureListResponse) => {
            logs.value.push("Sizin sunucu katmanına GetSignatureListCades isteği gönderildi. Detaylar için console'a bakınız.");
            console.log("Sizin sunucu katmanına GetSignatureListCades isteği gönderildi.", getSignatureListResponse);
            const getSignatureListResult = getSignatureListResponse.data as     ProxyGetSignatureListResultV3;
            signatureList.value = getSignatureListResult.signatures;
            console.log("getSignatureListResult", getSignatureListResult);
        })
        .catch((error) => {
            logs.value.push("Sizin sunucu katmanına GetSignatureListCades isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
            console.log("Sizin sunucu katmanına GetSignatureListCades isteği gönderilemedi.", error);
        });

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
            const getSignatureListResult = getSignatureListResponse.data as ProxyGetSignatureListResultV3;
            signatureList.value = getSignatureListResult.signatures;
            console.log("getSignatureListResult", getSignatureListResult);
        })
        .catch((error) => {
            logs.value.push("Sizin sunucu katmanına GetSignatureListXades isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
            console.log("Sizin sunucu katmanına GetSignatureListXades isteği gönderilemedi.", error);
        });

}

function MobileSignV2() {


    fingerPrint.value = "";
    operationIdOfMobileSign.value = "";

    const signatureLevelForCades =
        selectedSignatureType.value.id === "cades"
            ? selectedCadesSignatureLevel.value.value
            : null;
    const signatureLevelForPades =
        selectedSignatureType.value.id === "pades"
            ? selectedPadesSignatureLevel.value.value
            : null;

    const signatureLevelForXades =
        selectedSignatureType.value.id === "xades"
            ? selectedXadesSignatureLevel.value.value
            : null;

    const serialOrParallel =
        selectedIsSerialOrParallelOption.value.id === "SERIAL" || selectedIsSerialOrParallelOption.value.id === "PARALLEL"
            ? selectedIsSerialOrParallelOption.value.id
            : "PARALLEL";

    const envelopingOrEnveloped =
        selectedIsEnvelopingOrEnvelopedOption.value.id === "ENVELOPING" || selectedIsEnvelopingOrEnvelopedOption.value.id === "ENVELOPED"
            ? selectedIsEnvelopingOrEnvelopedOption.value.id
            : "ENVELOPED";

            console.log("signatureLevelForCades", signatureLevelForCades);
            console.log("selectedCadesSignatureLevel", selectedCadesSignatureLevel);

    const mobileSignRequest = {
        operationId:operationIdOfFileUpload.value,
        signatureType: selectedSignatureType.value.id,
        phoneNumber: phoneNumber.value,
        operator: selectedOperator.value.id,
        citizenshipNo: citizenshipNo.value,
        signatureLevelForCades: signatureLevelForCades,
        signatureLevelForPades: signatureLevelForPades,
        signatureLevelForXades: signatureLevelForXades,
        signaturePath: signaturePath.value,
        signatureTurkishProfile: selectedTurkishProfile.value.value,
        serialOrParallel,
        isFirstSigner: signatureList.value ===null || signatureList.value.length === 0 ? true : false,
        envelopingOrEnveloped
    } as ProxyMobileSignRequestV2;
    waitString.value = "İmza işlemi hazırlanıyor.";
    logs.value.push("Sizin sunucu katmanına MobileSign isteği gönderiliyor.");
    // mobil imza işlemi yapılır
    axios
        .post(store.API_URL + "/Onaylarim/MobileSignV2", mobileSignRequest)
        .then((mobileSignResponse) => {
            logs.value.push("Sizin sunucu katmanına MobileSign isteği gönderildi. Detaylar için console'a bakınız.");
            console.log("Sizin sunucu katmanına MobileSign isteği gönderildi.", mobileSignResponse);
            const mobileSignResult = mobileSignResponse.data as ProxyMobilSignResultV2;
            isSuccess.value = mobileSignResult.isSuccess;
            if (mobileSignResult.error) {
                waitString.value = "İmza işlemi tamamlanamadı. Hata: " + mobileSignResult.error;
            } else {
                waitString.value = "İmza işlemi tamamlandı.";
            }
            operationIdOfMobileSign.value = mobileSignResult.operationId || "";
        })
        .catch((error) => {
            logs.value.push("Sizin sunucu katmanına MobileSign isteği gönderilemedi. Mesaj: " + HandleError(error) + " Detaylar için console'a bakınız.");
            console.log("Sizin sunucu katmanına MobileSign isteği gönderilemedi.", error);
        });
    // mobil imza işlemi sürerken işleme ilişkin parmak izi değeri alınır
    
    logs.value.push("Sizin sunucu katmanına GetFingerPrintV2 isteği gönderiliyor.");
    console.log("Sizin sunucu katmanına GetFingerPrintV2 isteği gönderiliyor.", operationIdOfFileUpload.value);
    axios
        .post(store.API_URL + "/Onaylarim/GetFingerPrintV2", { operationId: operationIdOfFileUpload.value } as ProxyGetFingerPrintRequest)
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
    if (!operationIdOfMobileSign.value) {
        waitString.value = "İmza işlemi tamamlanmadan dosya indirilemez.";
        return;
    }
    axios
        .get(store.API_URL + "/Onaylarim/DownloadSignedFileFromOnaylarimApi?operationId=" + operationIdOfMobileSign.value, { responseType: "blob" })
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
        <CardComponent title="Mobil İmza V2">
            <template v-slot:icon>
                <DevicePhoneMobileIcon></DevicePhoneMobileIcon>
            </template>
            <template v-slot:content>
                <div class="flex items-end ">
                    <div class="">
                        <div class="text-sm text-gray-700">
                            <p>Hangi türde e-imza atılmasını istiyorsanız seçiniz?</p>
                        </div>
                        <div class="mt-1 flex items-center">
                            <fieldset>
                                <legend class="sr-only">Notification method</legend>
                                <div class="space-y-4 sm:flex sm:items-center sm:space-x-10 sm:space-y-0">
                                    <div v-for="signatureType in signatureTypes" :key="signatureType.id" class="flex items-center cursor-pointer">
                                        <input :id="signatureType.id" name="notification-method" type="radio" :value="signatureType" v-model="selectedSignatureType"
                                            class="h-4 w-4 border-gray-300 text-yellow-600 focus:ring-yellow-600 cursor-pointer" />
                                        <label :for="signatureType.id" class="ml-3 block text-sm font-medium leading-6 text-gray-900 cursor-pointer">{{
                                            signatureType.title }}</label>
                                    </div>
                                </div>
                            </fieldset>
                        </div>

                        <div class="flex flex-col mt-2">

                            <div class="mt-2 max-w-sm">
                                <label for="uploadFile" class="block text-sm/6 font-medium text-gray-900 dark:text-white">İmzalanacak
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



                            <Listbox as="div" v-model="selectedPadesSignatureLevel" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'pades'">
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

                                    <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                                        <ListboxOptions
                                            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                            <ListboxOption as="template" v-for="padesSignatureLevel in signatureLevelForPadesOptions" :key="padesSignatureLevel.value" :value="padesSignatureLevel"
                                                v-slot="{ active, selected }">
                                                <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                                                    <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                                                        padesSignatureLevel.label }}</span>
                                                    <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                                        <CheckIcon class="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                </li>
                                            </ListboxOption>
                                        </ListboxOptions>
                                    </transition>
                                </div>
                            </Listbox>

                            <Listbox as="div" v-model="selectedCadesSignatureLevel" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'cades'">
                                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Cades
                                    İmza Seviyesi</ListboxLabel>
                                <div class="relative mt-0">
                                    <ListboxButton
                                        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                                        <span class="block truncate">{{ selectedCadesSignatureLevel.label }}</span>
                                        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </span>
                                    </ListboxButton>

                                    <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                                        <ListboxOptions
                                            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                            <ListboxOption as="template" v-for="cadesSignatureLevel in signatureLevelForCadesOptions" :key="cadesSignatureLevel.value" :value="cadesSignatureLevel"
                                                v-slot="{ active, selected }">
                                                <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                                                    <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                                                        cadesSignatureLevel.label }}</span>
                                                    <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                                        <CheckIcon class="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                </li>
                                            </ListboxOption>
                                        </ListboxOptions>
                                    </transition>
                                </div>
                            </Listbox>

                            <Listbox as="div" v-model="selectedXadesSignatureLevel" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'xades'">
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
                                            <ListboxOption as="template" v-for="xadesSignatureLevel in signatureLevelForXadesOptions" :key="xadesSignatureLevel.value" :value="xadesSignatureLevel"
                                                v-slot="{ active, selected }">
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

                            <Listbox as="div" v-model="selectedIsEnvelopingOrEnvelopedOption" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'xades'">
                                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Xades
                                    İmza Türü</ListboxLabel>
                                <div class="relative mt-0">
                                    <ListboxButton
                                        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                                        <span class="block truncate">{{ selectedIsEnvelopingOrEnvelopedOption.title
                                            }}</span>
                                        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </span>
                                    </ListboxButton>

                                    <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                                        <ListboxOptions
                                            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                            <ListboxOption as="template" v-for="isEnvelopingOrEnvelopedOption in isEnvelopingOrEnvelopedOptions" :key="isEnvelopingOrEnvelopedOption.title"
                                                :value="isEnvelopingOrEnvelopedOption" v-slot="{ active, selected }">
                                                <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                                                    <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                                                        isEnvelopingOrEnvelopedOption.title }}</span>
                                                    <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                                        <CheckIcon class="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                </li>
                                            </ListboxOption>
                                        </ListboxOptions>
                                    </transition>
                                </div>
                            </Listbox>

                            <Listbox as="div" v-model="selectedIsSerialOrParallelOption" class="max-w-sm mt-2" v-if="selectedSignatureType.id === 'cades' || selectedSignatureType.id === 'xades'">
                                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">İmza
                                    Metodu</ListboxLabel>
                                <div class="relative mt-0">
                                    <ListboxButton
                                        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                                        <span class="block truncate">{{ selectedIsSerialOrParallelOption.title }}</span>
                                        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </span>
                                    </ListboxButton>

                                    <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                                        <ListboxOptions
                                            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                            <ListboxOption as="template" v-for="isSerialOrParallelOption in isSerialOrParallelOptions" :key="isSerialOrParallelOption.title"
                                                :value="isSerialOrParallelOption" v-slot="{ active, selected }">
                                                <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                                                    <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                                                        isSerialOrParallelOption.title }}</span>
                                                    <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                                        <CheckIcon class="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                </li>
                                            </ListboxOption>
                                        </ListboxOptions>
                                    </transition>
                                </div>
                            </Listbox>



                            <div class="mt-2 max-w-sm"
                                v-if="(selectedSignatureType.id === 'cades' || selectedSignatureType.id === 'xades') && selectedIsSerialOrParallelOption.id === 'SERIAL' && signatureList && signatureList.length > 0">
                                <label for="signaturePath" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Üstüne İmza
                                    Atılacak İmza Adı</label>
                                <input type="text" name="signaturePath" id="signaturePath" v-model="signaturePath"
                                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                    placeholder="S0:S0" />
                            </div>

                            <Listbox as="div" v-model="selectedOperator" class="max-w-sm mt-2">
                                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Operatör
                                </ListboxLabel>
                                <div class="relative mt-0">
                                    <ListboxButton
                                        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                                        <span class="block truncate">{{ selectedOperator.name }}</span>
                                        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </span>
                                    </ListboxButton>

                                    <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                                        <ListboxOptions
                                            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                            <ListboxOption as="template" v-for="gsmOperator in operators" :key="gsmOperator.id" :value="gsmOperator" v-slot="{ active, selectedOperator }">
                                                <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                                                    <span :class="[selectedOperator ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                                                        gsmOperator.name }}</span>
                                                    <span v-if="selectedOperator" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                                        <CheckIcon class="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                </li>
                                            </ListboxOption>
                                        </ListboxOptions>
                                    </transition>
                                </div>
                            </Listbox>




                            <div class="mt-2 max-w-sm">
                                <label for="phoneNumber" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Mobil Telefon
                                    Numarası</label>
                                <input type="text" name="phoneNumber" id="phoneNumber" v-model="phoneNumber"
                                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                    placeholder="5339992200" />
                            </div>


                            <Listbox as="div" v-model="selectedTurkishProfile" class="max-w-sm mt-2">
                                <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Turkish
                                    Profile</ListboxLabel>
                                <div class="relative mt-0">
                                    <ListboxButton
                                        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6">
                                        <span class="block truncate">{{ selectedTurkishProfile.title }}</span>
                                        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </span>
                                    </ListboxButton>

                                    <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                                        <ListboxOptions
                                            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                            <ListboxOption as="template" v-for="turkishProfile in turkishProfileOptions.filter(profile => !profile.disabled)" :key="turkishProfile.id"
                                                :value="turkishProfile" v-slot="{ active, selectedTurkishProfile }">
                                                <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']"
                                                    :disabled="turkishProfile.disabled">
                                                    <span :class="[selectedTurkishProfile ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                                                        turkishProfile.title }}</span>
                                                    <span v-if="selectedTurkishProfile" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                                        <CheckIcon class="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                </li>
                                            </ListboxOption>
                                        </ListboxOptions>
                                    </transition>
                                </div>
                            </Listbox>

                            <div class="mt-2 max-w-sm">
                                <label for="citizenshipNo" class="block text-sm/6 font-medium text-gray-900 dark:text-white">TC Kimlik
                                    Numarası</label>
                                <input type="text" name="citizenshipNo" id="citizenshipNo" v-model="citizenshipNo" maxlength="11"
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



                        <button type="button" @click="MobileSignV2()" :disabled="!operationIdOfFileUpload"
                            class="rounded-md bg-yellow-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:bg-gray-300 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-800 focus:ring-offset-2 focus:ring-offset-yellow-200">
                            İmzala
                        </button>


                    </div>

                </div>

                <div class="mt-4 px-4 py-2 border-gray-200 border bg-white " id="signatureList">
                    <label class="block text-sm font-medium text-gray-900 dark:text-white">Dosyadaki Önceki İmzalar</label>
                    <div v-if="signatureList === null">
                        <div class="text-sm text-gray-700">
                            <p>Belge yüklenmedi.</p>
                        </div>
                    </div>
                    <div v-else-if="signatureList && signatureList.length === 0">
                        <div class="text-sm text-gray-700">
                            <p>Belgede {{ selectedSignatureType.title }} türünde imza bulunmuyor.</p>
                        </div>
                    </div>

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
                        <p class="text-xs text-gray-500" v-if="signature.xadesSignatureType"><span class="font-bold text-gray-900">Xades Türü:</span> {{
                            signature.xadesSignatureType }}</p>
                        <hr class="my-2 border-gray-200">
                    </div>
                </div>

                <div class="pt-6 pb-2 text-sm text-gray-700" v-if="fingerPrint">
                    <p>Parmak izi</p>
                    <p class="font-medium text-sm">{{ fingerPrint }}</p>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-200" v-if="waitString">
                    <p class="max-w-2xl text-sm leading-6 text-gray-500">{{ waitString }}</p>

                    <p v-if="isSuccess" @click="DownloadFile()" class="max-w-2xl text-sm leading-6 text-orange-500 hover:underline cursor-pointer">e-İmzalı
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
