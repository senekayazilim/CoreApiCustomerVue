<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "@vue/runtime-core";
import axios, { AxiosError } from "axios";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, ListboxLabel } from "@headlessui/vue";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/20/solid";
import { DocumentTextIcon } from "@heroicons/vue/24/outline";
import CardComponent from "./CardComponent.vue";
import {  type ProxyAddVerificationInfoCoreRequest, type ProxyUploadFileResultV2 } from "@/types/Types";
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
const operationId = ref("");
// işlemin başarıyla tamamlanıp tamamlanmadığını gösterir
const isSuccess = ref(false);

const selectedFile = ref<File | null>(null);
const selectedFileName = ref("");

type TransformOption = {
    id: "left top" | "right top" | "left bottom" | "right bottom";
    label: string;
    primaryHorizontal: "left" | "right";
    primaryVertical: "top" | "bottom";
};

const transformOriginOptions: TransformOption[] = [
    { id: "left top", label: "Sol Üst (left top)", primaryHorizontal: "left", primaryVertical: "top" },
    { id: "right top", label: "Sağ Üst (right top)", primaryHorizontal: "right", primaryVertical: "top" },
    { id: "left bottom", label: "Sol Alt (left bottom)", primaryHorizontal: "left", primaryVertical: "bottom" },
    { id: "right bottom", label: "Sağ Alt (right bottom)", primaryHorizontal: "right", primaryVertical: "bottom" },
];

type LayerType = "verification" | "qr";

const activeLayer = ref<LayerType>("verification");
const verificationTransformOrigin = ref<TransformOption>(transformOriginOptions[0]);
const qrTransformOrigin = ref<TransformOption>(transformOriginOptions[0]);

const transformOriginAnchors = [
    { id: "left top", top: 0, left: 0 },
    { id: "right top", top: 0, left: 1 },
    { id: "left bottom", top: 1, left: 0 },
    { id: "right bottom", top: 1, left: 1 },
];

const verificationText = ref("");
const verificationWidth = ref("0.8");
const verificationHeight = ref("0.1");
const verificationLeft = ref("");
const verificationRight = ref("");
const verificationTop = ref("");
const verificationBottom = ref("");

const qrText = ref("");
const qrWidth = ref("0.2");
const qrLeft = ref("");
const qrRight = ref("");
const qrTop = ref("");
const qrBottom = ref("");

const previewRef = ref<HTMLDivElement | null>(null);
let interactionMode: "move" | "resize" | null = null;
let interactionLayer: LayerType | null = null;
const dragOffset = { x: 0, y: 0 };
const startPointer = { x: 0, y: 0 };
const startRect = { left: 0, top: 0, width: 0, height: 0 };

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
            headers: { "Content-Type": "multipart/form-data"  },
        });
        const uploadResult = response.data as   ProxyUploadFileResultV2;
        if (uploadResult?.isSuccess) {
            waitString.value = "Dosya sunucuya başarıyla yüklendi.";
            logs.value.push("Dosya sunucuya başarıyla yüklendi.");
            operationId.value = uploadResult.operationId;
            isSuccess.value = false;
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

function parseOptionalNumber(value: string): number | null {
    if (value === "" || value === null) {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseRequiredNumber(value: string): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

const verificationHasLeftRightConflict = computed(() => verificationLeft.value !== "" && verificationRight.value !== "");
const verificationHasTopBottomConflict = computed(() => verificationTop.value !== "" && verificationBottom.value !== "");
const qrHasLeftRightConflict = computed(() => qrLeft.value !== "" && qrRight.value !== "");
const qrHasTopBottomConflict = computed(() => qrTop.value !== "" && qrBottom.value !== "");

const sanitizedWidthRatio = computed(() => {
    const width = parseRequiredNumber(verificationWidth.value);
    if (width === null || width <= 0) {
        return 0.1;
    }
    return clamp(width, 0.01, 1);
});

const sanitizedHeightRatio = computed(() => {
    const height = parseRequiredNumber(verificationHeight.value);
    if (height === null || height <= 0) {
        return 0.1;
    }
    return clamp(height, 0.01, 1);
});

const PAGE_WIDTH_TO_HEIGHT_RATIO = 1 / 1.4142;

const qrSanitizedWidthRatio = computed(() => {
    const width = parseRequiredNumber(qrWidth.value);
    if (width === null || width <= 0) {
        return 0.1;
    }
    return clamp(width, 0.01, 1);
});

const qrSanitizedHeightRatio = computed(() => qrSanitizedWidthRatio.value * PAGE_WIDTH_TO_HEIGHT_RATIO);

function formatRatio(value: number): string {
    if (!Number.isFinite(value)) {
        return "";
    }
    return clamp(value, 0, 1).toFixed(3);
}

function getWidthRatioByLayer(layer: LayerType) {
    return layer === "verification" ? sanitizedWidthRatio.value : qrSanitizedWidthRatio.value;
}

function getHeightRatioByLayer(layer: LayerType) {
    return layer === "verification" ? sanitizedHeightRatio.value : qrSanitizedHeightRatio.value;
}

function getTransformOriginByLayer(layer: LayerType) {
    return layer === "verification" ? verificationTransformOrigin.value : qrTransformOrigin.value;
}

function updatePositionFields(leftRatioValue: number, topRatioValue: number, layer: LayerType = activeLayer.value) {
    const widthRatio = getWidthRatioByLayer(layer);
    const heightRatio = getHeightRatioByLayer(layer);
    const transform = getTransformOriginByLayer(layer);

    const clampedLeft = clamp(leftRatioValue, 0, 1 - widthRatio);
    const clampedTop = clamp(topRatioValue, 0, 1 - heightRatio);
    const rightRatio = clamp(1 - widthRatio - clampedLeft, 0, 1);
    const bottomRatio = clamp(1 - heightRatio - clampedTop, 0, 1);

    if (layer === "verification") {
        if (transform.primaryHorizontal === "left") {
            verificationLeft.value = formatRatio(clampedLeft);
            verificationRight.value = "";
        } else {
            verificationRight.value = formatRatio(rightRatio);
            verificationLeft.value = "";
        }

        if (transform.primaryVertical === "top") {
            verificationTop.value = formatRatio(clampedTop);
            verificationBottom.value = "";
        } else {
            verificationBottom.value = formatRatio(bottomRatio);
            verificationTop.value = "";
        }
    } else {
        if (transform.primaryHorizontal === "left") {
            qrLeft.value = formatRatio(clampedLeft);
            qrRight.value = "";
        } else {
            qrRight.value = formatRatio(rightRatio);
            qrLeft.value = "";
        }

        if (transform.primaryVertical === "top") {
            qrTop.value = formatRatio(clampedTop);
            qrBottom.value = "";
        } else {
            qrBottom.value = formatRatio(bottomRatio);
            qrTop.value = "";
        }
    }
}

const verificationLeftRatio = computed(() => {
    const width = sanitizedWidthRatio.value;
    if (verificationLeft.value !== "") {
        const left = parseOptionalNumber(verificationLeft.value) ?? 0;
        return clamp(left, 0, 1 - width);
    }
    if (verificationRight.value !== "") {
        const right = parseOptionalNumber(verificationRight.value) ?? 0;
        return clamp(1 - width - right, 0, 1 - width);
    }
    return 0;
});

const verificationTopRatio = computed(() => {
    const height = sanitizedHeightRatio.value;
    if (verificationTop.value !== "") {
        const top = parseOptionalNumber(verificationTop.value) ?? 0;
        return clamp(top, 0, 1 - height);
    }
    if (verificationBottom.value !== "") {
        const bottom = parseOptionalNumber(verificationBottom.value) ?? 0;
        return clamp(1 - height - bottom, 0, 1 - height);
    }
    return 0;
});

const qrLeftRatio = computed(() => {
    const width = qrSanitizedWidthRatio.value;
    if (qrLeft.value !== "") {
        const left = parseOptionalNumber(qrLeft.value) ?? 0;
        return clamp(left, 0, 1 - width);
    }
    if (qrRight.value !== "") {
        const right = parseOptionalNumber(qrRight.value) ?? 0;
        return clamp(1 - width - right, 0, 1 - width);
    }
    return 0;
});

const qrTopRatio = computed(() => {
    const height = qrSanitizedHeightRatio.value;
    if (qrTop.value !== "") {
        const top = parseOptionalNumber(qrTop.value) ?? 0;
        return clamp(top, 0, 1 - height);
    }
    if (qrBottom.value !== "") {
        const bottom = parseOptionalNumber(qrBottom.value) ?? 0;
        return clamp(1 - height - bottom, 0, 1 - height);
    }
    return 0;
});

const verificationBoxStyle = computed(() => ({
    width: `${sanitizedWidthRatio.value * 100}%`,
    height: `${sanitizedHeightRatio.value * 100}%`,
    left: `${verificationLeftRatio.value * 100}%`,
    top: `${verificationTopRatio.value * 100}%`,
}));

const qrBoxStyle = computed(() => ({
    width: `${qrSanitizedWidthRatio.value * 100}%`,
    height: `${qrSanitizedHeightRatio.value * 100}%`,
    left: `${qrLeftRatio.value * 100}%`,
    top: `${qrTopRatio.value * 100}%`,
}));

const activeTransformOrigin = computed({
    get() {
        return activeLayer.value === "verification" ? verificationTransformOrigin.value : qrTransformOrigin.value;
    },
    set(value: TransformOption) {
        if (activeLayer.value === "verification") {
            verificationTransformOrigin.value = value;
            updatePositionFields(verificationLeftRatio.value, verificationTopRatio.value, "verification");
        } else {
            qrTransformOrigin.value = value;
            updatePositionFields(qrLeftRatio.value, qrTopRatio.value, "qr");
        }
    },
});

const selectedTransformId = computed(() => activeTransformOrigin.value.id);

function getLeftRatioByLayer(layer: LayerType) {
    return layer === "verification" ? verificationLeftRatio.value : qrLeftRatio.value;
}

function getTopRatioByLayer(layer: LayerType) {
    return layer === "verification" ? verificationTopRatio.value : qrTopRatio.value;
}

function switchActiveLayer(layer: LayerType) {
    activeLayer.value = layer;
}

watch([verificationWidth, verificationHeight, verificationTransformOrigin], () => {
    updatePositionFields(verificationLeftRatio.value, verificationTopRatio.value, "verification");
});

watch(qrWidth, () => {
    updatePositionFields(qrLeftRatio.value, qrTopRatio.value, "qr");
});
watch(qrTransformOrigin, () => {
    updatePositionFields(qrLeftRatio.value, qrTopRatio.value, "qr");
});

function setTransformOrigin(id: string) {
    const option = transformOriginOptions.find((item) => item.id === id);
    if (!option) {
        return;
    }
    activeTransformOrigin.value = option;
}

const isSubmitDisabled = computed(() => {
    if (!operationId.value) {
        console.log("operationId.value is empty");
        return true;
    }
    if (!verificationText.value.trim()) {
        console.log("verificationText.value is empty");
        return true;
    }
    if (!qrText.value.trim()) {
        console.log("qrText.value is empty");
        return true;
    }
    if (
        verificationHasLeftRightConflict.value ||
        verificationHasTopBottomConflict.value ||
        qrHasLeftRightConflict.value ||
        qrHasTopBottomConflict.value
    ) {
        console.log("has left right conflict or top bottom conflict");
        return true;
    }
    const width = parseRequiredNumber(verificationWidth.value);
    const height = parseRequiredNumber(verificationHeight.value);
    const qrWidthValue = parseRequiredNumber(qrWidth.value);
    if (width === null || width <= 0) {
        return true;
    }
    if (height === null || height <= 0) {
        return true;
    }
    if (qrWidthValue === null || qrWidthValue <= 0) {
        return true;
    }
    return false;
});

async function AddVerificationInfo() {
    if (isSubmitDisabled.value) {
        waitString.value = "Lütfen formu eksiksiz doldurunuz ve önce dosya yükleyiniz.";
        return;
    }

    const width = parseRequiredNumber(verificationWidth.value);
    const height = parseRequiredNumber(verificationHeight.value);
    const qrWidthValue = parseRequiredNumber(qrWidth.value);

    if (width === null || height === null) {
        waitString.value = "En ve boy alanları sayısal olmalıdır.";
        return;
    }

    if (qrWidthValue === null) {
        waitString.value = "QR genişlik alanı sayısal olmalıdır.";
        return;
    }

    if (qrWidthValue <= 0) {
        waitString.value = "QR genişliği 0'dan büyük olmalıdır.";
        return;
    }

    if (!qrText.value.trim()) {
        waitString.value = "QR kod metni gerekli.";
        return;
    }

    const request: ProxyAddVerificationInfoCoreRequest = {
        operationId: operationId.value,
        verificationInfo: {
            text: verificationText.value.replace(/\r?\n/g, "\r\n"),
            width,
            height,
            left: parseOptionalNumber(verificationLeft.value),
            right: parseOptionalNumber(verificationRight.value),
            top: parseOptionalNumber(verificationTop.value),
            bottom: parseOptionalNumber(verificationBottom.value),
            transformOrigin: verificationTransformOrigin.value.id,
        },
        qrCodeInfo: {
            text: qrText.value,
            width: qrWidthValue,
            left: parseOptionalNumber(qrLeft.value),
            right: parseOptionalNumber(qrRight.value),
            top: parseOptionalNumber(qrTop.value),
            bottom: parseOptionalNumber(qrBottom.value),
            transformOrigin: qrTransformOrigin.value.id,
        },
    };

    try {
        waitString.value = "Doğrulama cümlesi ekleniyor.";
        logs.value.push("Sizin sunucu katmanına AddVerificationInfo isteği gönderiliyor.");

        const response = await axios.post(store.API_URL + "/Onaylarim/AddLayersV2", request);
        const result = response.data as { isSuccess?: boolean; error?: string; message?: string };

        logs.value.push("Sizin sunucu katmanına AddVerificationInfo isteği gönderildi. Detaylar için console'a bakınız.");
        console.log("AddVerificationInfoV2 response", response);

        if (result?.error) {
            waitString.value = "Doğrulama cümlesi eklenemedi. Hata: " + result.error;
            isSuccess.value = false;
            return;
        }

        if (result?.isSuccess === false) {
            waitString.value = "Doğrulama cümlesi eklenemedi.";
            isSuccess.value = false;
            return;
        }

        waitString.value = result?.message || "Doğrulama cümlesi başarıyla eklendi.";
        isSuccess.value = true;
        logs.value.push("Doğrulama cümlesi başarıyla eklendi.");
    } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = HandleError(normalizedError);
        waitString.value = "Doğrulama cümlesi eklenemedi. " + errorMessage;
        logs.value.push("Sizin sunucu katmanına AddVerificationInfo isteği gönderilemedi. Mesaj: " + errorMessage);
        console.error("AddVerificationInfoV2 error", error);
        isSuccess.value = false;
    }
}

function DownloadFile() {
    axios
        .get(store.API_URL + "/Onaylarim/DownloadCoreV2?operationId=" + operationId.value, { responseType: "blob" })
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

function attachPointerListeners() {
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", stopInteraction);
}

function detachPointerListeners() {
    window.removeEventListener("mousemove", onPointerMove);
    window.removeEventListener("mouseup", stopInteraction);
}

function startMove(event: MouseEvent, layer: LayerType) {
    if (!previewRef.value || interactionMode) {
        return;
    }
    interactionMode = "move";
    interactionLayer = layer;
    activeLayer.value = layer;
    const boxElement = event.currentTarget as HTMLElement;
    const boxRect = boxElement.getBoundingClientRect();
    dragOffset.x = event.clientX - boxRect.left;
    dragOffset.y = event.clientY - boxRect.top;
    event.preventDefault();
    attachPointerListeners();
}

function startResize(event: MouseEvent, layer: LayerType) {
    if (!previewRef.value || interactionMode) {
        return;
    }
    interactionMode = "resize";
    interactionLayer = layer;
    activeLayer.value = layer;
    startPointer.x = event.clientX;
    startPointer.y = event.clientY;
    startRect.left = getLeftRatioByLayer(layer);
    startRect.top = getTopRatioByLayer(layer);
    startRect.width = getWidthRatioByLayer(layer);
    startRect.height = getHeightRatioByLayer(layer);
    event.preventDefault();
    event.stopPropagation();
    attachPointerListeners();
}

function onPointerMove(event: MouseEvent) {
    if (!previewRef.value || !interactionMode || !interactionLayer) {
        return;
    }
    const layer = interactionLayer;
    const containerRect = previewRef.value.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) {
        return;
    }
    if (interactionMode === "move") {
        const boxWidthPx = getWidthRatioByLayer(layer) * containerRect.width;
        const boxHeightPx = getHeightRatioByLayer(layer) * containerRect.height;

        let newLeftPx = event.clientX - containerRect.left - dragOffset.x;
        let newTopPx = event.clientY - containerRect.top - dragOffset.y;

        newLeftPx = clamp(newLeftPx, 0, containerRect.width - boxWidthPx);
        newTopPx = clamp(newTopPx, 0, containerRect.height - boxHeightPx);

        const newLeftRatio = containerRect.width ? newLeftPx / containerRect.width : 0;
        const newTopRatio = containerRect.height ? newTopPx / containerRect.height : 0;

        updatePositionFields(newLeftRatio, newTopRatio, layer);
    } else if (interactionMode === "resize") {
        const deltaXRatio = (event.clientX - startPointer.x) / containerRect.width;
        const deltaYRatio = (event.clientY - startPointer.y) / containerRect.height;

        let newWidthRatio = startRect.width + deltaXRatio;
        let newHeightRatio = startRect.height + deltaYRatio;

        if (layer === "verification") {
            newWidthRatio = clamp(newWidthRatio, 0.05, 1 - startRect.left);
            newHeightRatio = clamp(newHeightRatio, 0.05, 1 - startRect.top);
            verificationWidth.value = newWidthRatio.toFixed(3);
            verificationHeight.value = newHeightRatio.toFixed(3);
        } else {
            const widthCandidate = clamp(newWidthRatio, 0.05, 1 - startRect.left);
            const heightCandidateWidthRatio = clamp(newHeightRatio, 0.05, 1 - startRect.top) / PAGE_WIDTH_TO_HEIGHT_RATIO;
            const maxWidthFromHeight = (1 - startRect.top) / PAGE_WIDTH_TO_HEIGHT_RATIO;
            const allowedMax = Math.min(1 - startRect.left, maxWidthFromHeight);
            const newSizeRatio = clamp(Math.max(widthCandidate, heightCandidateWidthRatio), 0.05, allowedMax);
            qrWidth.value = newSizeRatio.toFixed(3);
        }
        updatePositionFields(startRect.left, startRect.top, layer);
    }
}

function stopInteraction() {
    if (!interactionMode) {
        return;
    }
    interactionMode = null;
    interactionLayer = null;
    detachPointerListeners();
}

onBeforeUnmount(() => {
    detachPointerListeners();
});
</script>

<template>
    <main class="space-y-4">
        <CardComponent title="Doğrulama Cümlesi Ekle">
            <template v-slot:icon>
                <DocumentTextIcon></DocumentTextIcon>
            </template>
            <template v-slot:content>
                <div class="flex items-end">
                    <div class="w-full max-w-3xl">
                        <div class="flex flex-col mt-2">
                          <div class="mt-2 max-w-sm">
                                <label for="uploadFile"
                                    class="block text-sm/6 font-medium text-gray-900 dark:text-white">Katman Eklenecek
                                    Dosya</label>
                                <div
                                    class="mt-1 flex items-center gap-3 rounded-md border-0  py-1.5 pl-0 pr-3 text-gray-900  ">
                                    <input id="uploadFile" name="uploadFile" type="file" accept="application/pdf" class="sr-only"
                                        @change="onFileSelected" />
                                    <label for="uploadFile"
                                        class="flex-shrink-0 rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                                        Dosya seç
                                    </label>
                                    <span class="text-sm text-gray-500 truncate"
                                        :class="{ 'text-gray-400': !selectedFileName }">
                                        {{ selectedFileName || "Seçili dosya yok" }}
                                    </span>


                                </div>
                            </div>
                        </div>

                        <div class="mt-4 flex gap-2 hidden">
                            <button
                                type="button"
                                @click="switchActiveLayer('verification')"
                                :class="activeLayer === 'verification' ? 'bg-yellow-600 text-white shadow-sm' : 'bg-gray-200 text-gray-700'"
                                class="rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-white transition"
                            >
                                Doğrulama Kutusu
                            </button>
                            <button
                                type="button"
                                @click="switchActiveLayer('qr')"
                                :class="activeLayer === 'qr' ? 'bg-yellow-600 text-white shadow-sm' : 'bg-gray-200 text-gray-700'"
                                class="rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-white transition"
                            >
                                QR Kodu
                            </button>
                        </div>

                        <div class="mt-6">
                            <p class="text-sm font-medium text-gray-900 dark:text-white">Önizleme</p>
                            <p class="text-xs text-gray-500">Kutucuğu sürükleyerek konumu değiştirebilir, sağ alt köşeden tutup boyutlandırabilirsiniz.</p>
                            <div
                                ref="previewRef"
                                class="relative overflow-visible mt-2 w-full max-w-md rounded-lg border border-gray-300 bg-white shadow-inner aspect-[1/1.4142]"
                            >
                                <div class="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_29px,#f3f4f6_30px)]"></div>
                                <div class="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_29px,#f3f4f6_30px)]"></div>
                                <button
                                    v-for="anchor in transformOriginAnchors"
                                    :key="anchor.id"
                                    type="button"
                                    class="absolute z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                    :class="[
                                        activeLayer === 'verification'
                                            ? (selectedTransformId === anchor.id
                                                ? 'bg-yellow-600 focus-visible:ring-yellow-600 focus-visible:ring-offset-white'
                                                : 'bg-gray-300 hover:bg-yellow-500 focus-visible:ring-gray-400 focus-visible:ring-offset-white')
                                            : (selectedTransformId === anchor.id
                                                ? 'bg-blue-600 focus-visible:ring-blue-600 focus-visible:ring-offset-white'
                                                : 'bg-gray-300 hover:bg-blue-500 focus-visible:ring-blue-400 focus-visible:ring-offset-white')
                                    ]"
                                    :style="{
                                        left: `${anchor.left * 100}%`,
                                        top: `${anchor.top * 100}%`,
                                    }"
                                    @click.stop="setTransformOrigin(anchor.id)"
                                ></button>
                                <div
                                    class="absolute z-10 flex cursor-move select-none items-start justify-start border-2 px-2 py-1 text-xs font-medium text-gray-900 text-center whitespace-pre-wrap transition"
                                    :class="activeLayer === 'verification' ? 'border-yellow-500 bg-yellow-200/70 shadow-md' : 'border-yellow-500/60 bg-yellow-200/40'"
                                    :style="verificationBoxStyle"
                                    @mousedown="(event) => startMove(event, 'verification')"
                                >
                                    <span class="pointer-events-none whitespace-pre-wrap leading-snug text-left">
                                        {{ verificationText || 'Önizleme' }}
                                    </span>
                                    <span
                                        class="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full border border-white bg-yellow-600"
                                        style="cursor: nwse-resize"
                                        @mousedown="(event) => startResize(event, 'verification')"
                                    ></span>
                                </div>
                                <div
                                    class="absolute z-10 flex cursor-move select-none items-center justify-center border-2 px-2 py-1 text-xs font-medium text-gray-900 text-center whitespace-pre-wrap transition"
                                    :class="activeLayer === 'qr' ? 'border-blue-500 bg-blue-200/70 shadow-md' : 'border-blue-500/60 bg-blue-200/40'"
                                    :style="qrBoxStyle"
                                    @mousedown="(event) => startMove(event, 'qr')"
                                >
                                    <span class="pointer-events-none leading-snug text-left">
                                        {{ qrText || 'QR' }}
                                    </span>
                                    <span
                                        class="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full border border-white bg-blue-600"
                                        style="cursor: nwse-resize"
                                        @mousedown="(event) => startResize(event, 'qr')"
                                    ></span>
                                </div>
                            </div>
                        </div>

                        <div class="mt-6">
                            <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <div class="space-y-4 rounded-lg border border-gray-200 p-4">
                                    <div>
                                        <p class="text-sm font-medium text-gray-900 dark:text-white">Doğrulama Kutusu Konumu</p>
                                        <p class="text-xs text-gray-500">Aşağıdaki değerler doğrulama cümlesi kutusu için geçerlidir.</p>
                                    </div>
                                    <div>
                                        <label for="verificationText" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Doğrulama cümlesi</label>
                                        <textarea
                                            id="verificationText"
                                            v-model="verificationText"
                                            rows="3"
                                            class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                            placeholder="Satır 1&#10;Satır 2"
                                        ></textarea>
                                        <p class="mt-1 text-xs text-gray-500">Yeni satır eklemek için Enter tuşunu kullanabilirsiniz. Sunucuya gönderilirken \r\n formatına dönüştürülecektir.</p>
                                    </div>
                                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label for="verificationWidth" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Genişlik oranı (width)</label>
                                            <input
                                                id="verificationWidth"
                                                v-model="verificationWidth"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                                placeholder="0.8"
                                            />
                                            <p class="mt-1 text-xs text-gray-500">0 ile 1 arasında bir değer önerilir.</p>
                                        </div>
                                        <div>
                                            <label for="verificationHeight" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Yükseklik oranı (height)</label>
                                            <input
                                                id="verificationHeight"
                                                v-model="verificationHeight"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                                placeholder="0.1"
                                            />
                                            <p class="mt-1 text-xs text-gray-500">0 ile 1 arasında bir değer önerilir.</p>
                                        </div>
                                        <div>
                                            <label for="verificationLeft" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Soldan uzaklık (left)</label>
                                            <input
                                                id="verificationLeft"
                                                v-model="verificationLeft"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                                placeholder="0.1"
                                            />
                                            <p class="mt-1 text-xs text-gray-500">Sol uzaklığı belirtmek istemiyorsanız boş bırakın.</p>
                                        </div>
                                        <div>
                                            <label for="verificationRight" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Sağdan uzaklık (right)</label>
                                            <input
                                                id="verificationRight"
                                                v-model="verificationRight"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                                placeholder="0.1"
                                            />
                                            <p class="mt-1 text-xs text-gray-500">Sol veya sağdan yalnızca birini kullanın.</p>
                                            <p v-if="verificationHasLeftRightConflict" class="mt-1 text-xs text-red-600">Sol ve sağ değerleri aynı anda girilemez.</p>
                                        </div>
                                        <div>
                                            <label for="verificationTop" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Üstten uzaklık (top)</label>
                                            <input
                                                id="verificationTop"
                                                v-model="verificationTop"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                                placeholder="0.1"
                                            />
                                            <p class="mt-1 text-xs text-gray-500">Üst uzaklığı belirtmek istemiyorsanız boş bırakın.</p>
                                        </div>
                                        <div>
                                            <label for="verificationBottom" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Alttan uzaklık (bottom)</label>
                                            <input
                                                id="verificationBottom"
                                                v-model="verificationBottom"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                                placeholder="0.1"
                                            />
                                            <p class="mt-1 text-xs text-gray-500">Üst veya alt uzaklıklardan yalnızca birini kullanın.</p>
                                            <p v-if="verificationHasTopBottomConflict" class="mt-1 text-xs text-red-600">Üst ve alt değerleri aynı anda girilemez.</p>
                                        </div>
                                    </div>
                                    <Listbox as="div" v-model="verificationTransformOrigin" class="max-w-sm">
                                        <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Transform origin</ListboxLabel>
                                        <div class="relative mt-0">
                                            <ListboxButton
                                                class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                            >
                                                <span class="block truncate">{{ verificationTransformOrigin.label }}</span>
                                                <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                    <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                                                </span>
                                            </ListboxButton>

                                            <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                                                <ListboxOptions
                                                    class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                                                >
                                                    <ListboxOption
                                                        as="template"
                                                        v-for="transformOption in transformOriginOptions"
                                                        :key="transformOption.id"
                                                        :value="transformOption"
                                                        v-slot="{ active, selected }"
                                                    >
                                                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                                                            <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ transformOption.label }}</span>
                                                            <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                                                <CheckIcon class="h-5 w-5" aria-hidden="true" />
                                                            </span>
                                                        </li>
                                                    </ListboxOption>
                                                </ListboxOptions>
                                            </transition>
                                        </div>
                                    </Listbox>
                                </div>
                                <div class="space-y-4 rounded-lg border border-gray-200 p-4">
                                    <div>
                                        <p class="text-sm font-medium text-gray-900 dark:text-white">QR Kod Bilgileri</p>
                                        <p class="text-xs text-gray-500">Aşağıdaki değerler karekod için geçerlidir.</p>
                                    </div>
                                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div class="sm:col-span-2">
                                            <label for="qrText" class="block text-sm/6 font-medium text-gray-900 dark:text-white">QR Kod Metni</label>
                                            <input
                                                id="qrText"
                                                v-model="qrText"
                                                type="text"
                                                class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                                placeholder="https://..."
                                            />
                                            <p class="mt-1 text-xs text-gray-500">QR kod içinde yer alacak URL ya da metni giriniz.</p>
                                        </div>
                                        <div>
                                            <label for="qrWidth" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Genişlik oranı (width)</label>
                                            <input
                                                id="qrWidth"
                                                v-model="qrWidth"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                                placeholder="0.2"
                                            />
                                            <p class="mt-1 text-xs text-gray-500">0 ile 1 arasında bir değer önerilir.</p>
                                        </div>
                                        <div>
                                            <label for="qrLeft" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Soldan uzaklık (left)</label>
                                            <input
                                                id="qrLeft"
                                                v-model="qrLeft"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                                placeholder="0.1"
                                            />
                                            <p class="mt-1 text-xs text-gray-500">Sol uzaklığı belirtmek istemiyorsanız boş bırakın.</p>
                                        </div>
                                        <div>
                                            <label for="qrRight" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Sağdan uzaklık (right)</label>
                                            <input
                                                id="qrRight"
                                                v-model="qrRight"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                                placeholder="0.1"
                                            />
                                            <p class="mt-1 text-xs text-gray-500">Sol veya sağdan yalnızca birini kullanın.</p>
                                            <p v-if="qrHasLeftRightConflict" class="mt-1 text-xs text-red-600">Sol ve sağ değerleri aynı anda girilemez.</p>
                                        </div>
                                        <div>
                                            <label for="qrTop" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Üstten uzaklık (top)</label>
                                            <input
                                                id="qrTop"
                                                v-model="qrTop"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                                placeholder="0.1"
                                            />
                                            <p class="mt-1 text-xs text-gray-500">Üst uzaklığı belirtmek istemiyorsanız boş bırakın.</p>
                                        </div>
                                        <div>
                                            <label for="qrBottom" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Alttan uzaklık (bottom)</label>
                                            <input
                                                id="qrBottom"
                                                v-model="qrBottom"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                                placeholder="0.1"
                                            />
                                            <p class="mt-1 text-xs text-gray-500">Üst veya alt uzaklıklardan yalnızca birini kullanın.</p>
                                            <p v-if="qrHasTopBottomConflict" class="mt-1 text-xs text-red-600">Üst ve alt değerleri aynı anda girilemez.</p>
                                        </div>
                                    </div>
                                    <Listbox as="div" v-model="qrTransformOrigin" class="max-w-sm">
                                        <ListboxLabel class="block text-sm/6 font-medium text-gray-900 dark:text-white">Transform origin</ListboxLabel>
                                        <div class="relative mt-0">
                                            <ListboxButton
                                                class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 sm:text-sm sm:leading-6"
                                            >
                                                <span class="block truncate">{{ qrTransformOrigin.label }}</span>
                                                <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                    <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                                                </span>
                                            </ListboxButton>

                                            <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                                                <ListboxOptions
                                                    class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                                                >
                                                    <ListboxOption
                                                        as="template"
                                                        v-for="transformOption in transformOriginOptions"
                                                        :key="transformOption.id"
                                                        :value="transformOption"
                                                        v-slot="{ active, selected }"
                                                    >
                                                        <li :class="[active ? 'bg-yellow-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                                                            <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ transformOption.label }}</span>
                                                            <span v-if="selected" :class="[active ? 'text-white' : 'text-yellow-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                                                                <CheckIcon class="h-5 w-5" aria-hidden="true" />
                                                            </span>
                                                        </li>
                                                    </ListboxOption>
                                                </ListboxOptions>
                                            </transition>
                                        </div>
                                    </Listbox>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex-grow"></div>
                    <div class="ml-6 mt-6">
                        <button
                            type="button"
                            @click="AddVerificationInfo()"
                            :disabled="isSubmitDisabled"
                            class="rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:bg-gray-300 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-800 focus:ring-offset-2 focus:ring-offset-yellow-200"
                        >
                            Doğrulama cümlesini ekle
                        </button>
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-200" v-if="waitString">
                    <p class="max-w-2xl text-sm leading-6 text-gray-500">{{ waitString }}</p>

                    <p
                        v-if="isSuccess"
                        @click="DownloadFile()"
                        class="max-w-2xl text-sm leading-6 text-orange-500 hover:underline cursor-pointer"
                    >
                        Dosyayı indir
                    </p>
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
