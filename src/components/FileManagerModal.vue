<script setup>
import { computed } from "vue"
import { useStore } from "vuex"
import MaterialButton from "@/components/MaterialButton.vue"
import { API, TOKEN_USER_NAME } from "@/api"

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["close", "select"])

const store = useStore()

const selectedItems = computed(() => store.getters["fm/selectedItems"] ?? [])
const selectedDisk = computed(() => store.getters["fm/selectedDisk"] ?? null)
const selectedFile = computed(() => {
  const firstItem = selectedItems.value[0] ?? null

  if (!firstItem || firstItem.type !== "file") {
    return null
  }

  return firstItem
})

const settings = computed(() => ({
  baseUrl: `${API}/admin/file-manager/`,
  windowsConfig: 2,
  lang: "ru",
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Authorization: `Bearer ${localStorage.getItem(TOKEN_USER_NAME)}`,
  },
}))

const resolveFileUrl = async (file) => {
  if (!file || !selectedDisk.value) {
    return null
  }

  try {
    const response = await store.dispatch("fm/url", {
      disk: selectedDisk.value,
      path: file.path,
    })

    return (
      response?.data?.url ??
      response?.data?.result?.url ??
      response?.data?.result?.message ??
      null
    )
  } catch (error) {
    console.error("Не удалось получить URL файла", error)
    return null
  }
}

const handleSelect = async () => {
  if (!selectedFile.value) {
    return
  }

  const fileUrl = await resolveFileUrl(selectedFile.value)

  emit("select", {
    id: selectedFile.value.path ?? selectedFile.value.basename,
    path: selectedFile.value.path ?? null,
    url: fileUrl,
    name: selectedFile.value.basename ?? selectedFile.value.path ?? "Файл",
    basename: selectedFile.value.basename ?? null,
    raw: selectedFile.value,
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.isOpen"
      class="modal fade show d-block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fileManagerModalTitle"
      tabindex="-1"
      style="z-index: 1070"
    >
      <div class="modal-dialog modal-xl modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="fileManagerModalTitle" class="modal-title">
              Выбор изображения
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Закрыть"
              @click="emit('close')"
            ></button>
          </div>

          <div class="modal-body file-manager-modal-body">
            <file-manager :settings="settings" />
          </div>

          <div class="modal-footer">
            <div class="text-sm text-muted me-auto">
              <span v-if="selectedFile">
                Выбран файл: {{ selectedFile.basename ?? selectedFile.path }}
              </span>
              <span v-else>Выберите один файл в менеджере.</span>
            </div>
            <MaterialButton
              type="button"
              color="secondary"
              variant="outline"
              @click="emit('close')"
            >
              Закрыть
            </MaterialButton>
            <MaterialButton
              type="button"
              color="success"
              :disabled="!selectedFile"
              @click="handleSelect"
            >
              Выбрать
            </MaterialButton>
          </div>
        </div>
      </div>
      <div
        class="modal-backdrop fade show"
        style="z-index: 1065"
        @click="emit('close')"
      ></div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.file-manager-modal-body {
  min-height: 70vh;
  padding: 0;
}

:deep(.fm) {
  height: 70vh;
  padding: 0;
}

:deep(.fm .fm-body) {
  border-top: 0;
  border-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
