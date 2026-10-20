<script setup>
import { computed, reactive, ref, watch } from "vue"
import Multiselect from "@vueform/multiselect"
import "@vueform/multiselect/themes/default.css"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import { fetchExpenseGroupById } from "@/services/expenseGroupsService"

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  expenseGroupId: {
    type: [Number, String],
    default: null,
  },
  initialData: {
    type: Object,
    default: null,
  },
  parentGroups: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(["close", "submit"])

const formState = reactive({
  title: "",
  parent_id: null,
})
const invalidFields = ref(new Set())
const isLoading = ref(false)
const loadError = ref("")
const itemHasChildren = ref(false)

const isEditMode = computed(
  () => props.expenseGroupId !== null && props.expenseGroupId !== undefined,
)
const isFormDisabled = computed(() => props.isSaving || isLoading.value)
const parentOptions = computed(() =>
  props.parentGroups
    .filter((group) => group.id !== props.expenseGroupId)
    .map((group) => ({
      value: group.id,
      label: group.title ?? "Без названия",
    })),
)

const applyData = (payload = {}) => {
  const item = payload?.item ?? payload
  formState.title = item?.title ?? ""
  formState.parent_id = item?.parent_id ?? null
  itemHasChildren.value = Array.isArray(item?.children) && item.children.length > 0
}

const resetForm = () => {
  formState.title = ""
  formState.parent_id = null
  invalidFields.value = new Set()
  loadError.value = ""
  itemHasChildren.value = false
}

const loadExpenseGroup = async () => {
  if (!isEditMode.value || !props.expenseGroupId || !props.isOpen) {
    return
  }

  try {
    isLoading.value = true
    loadError.value = ""
    applyData(await fetchExpenseGroupById(props.expenseGroupId))
  } catch (error) {
    console.error("Не удалось загрузить группу расходов", error)
    loadError.value = "Не удалось загрузить группу расходов."
  } finally {
    isLoading.value = false
  }
}

const handleClose = () => {
  emit("close")
  resetForm()
}

const handleSubmit = () => {
  if (isFormDisabled.value) {
    return
  }

  if (!formState.title.trim()) {
    invalidFields.value = new Set(["title"])
    return
  }

  invalidFields.value = new Set()
  emit("submit", {
    mode: isEditMode.value ? "edit" : "create",
    id: isEditMode.value ? props.expenseGroupId : null,
    payload: {
      title: formState.title.trim(),
      parent_id: itemHasChildren.value ? null : formState.parent_id ?? null,
    },
  })
}

const handleClickOutside = () => {
  if (confirm("Вы уверены, что хотите закрыть окно?")) {
    handleClose()
  }
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      resetForm()
      return
    }

    invalidFields.value = new Set()

    if (isEditMode.value) {
      if (props.initialData) {
        applyData(props.initialData)
      }
      loadExpenseGroup()
    } else {
      resetForm()
    }
  },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.isOpen"
      class="modal fade show d-block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expenseGroupModalTitle"
      tabindex="-1"
      @keydown.esc="handleClose"
    >
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="expenseGroupModalTitle" class="modal-title">
              {{
                isEditMode
                  ? "Редактирование группы расходов"
                  : "Создание группы расходов"
              }}
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Закрыть"
              @click="handleClose"
            ></button>
          </div>

          <div class="modal-body" @click.stop>
            <p v-if="loadError" class="text-danger small mb-3">
              {{ loadError }}
            </p>

            <form class="d-flex flex-column gap-3" @submit.prevent="handleSubmit">
              <MaterialInput
                id="expense-group-title"
                v-model:value="formState.title"
                label="Название"
                isRequired
                :disabled="isFormDisabled"
                :error="invalidFields.has('title')"
              />

              <div>
                <Multiselect
                  v-model="formState.parent_id"
                  placeholder="Родительская группа"
                  :options="parentOptions"
                  :searchable="true"
                  :can-clear="true"
                  :can-deselect="true"
                  value-prop="value"
                  label="label"
                  track-by="label"
                  no-options-text="Нет доступных родительских групп"
                  no-results-text="Ничего не найдено"
                  :disabled="isFormDisabled || itemHasChildren"
                />
                <p v-if="itemHasChildren" class="text-muted text-xs mt-1 mb-0">
                  Группу с дочерними элементами нельзя сделать дочерней.
                </p>
              </div>
            </form>
          </div>

          <div class="modal-footer">
            <MaterialButton
              type="button"
              color="secondary"
              variant="outline"
              @click="handleClose"
            >
              Закрыть
            </MaterialButton>
            <MaterialButton
              type="button"
              color="success"
              :disabled="isFormDisabled"
              @click="handleSubmit"
            >
              {{ props.isSaving ? "Сохранение..." : isEditMode ? "Сохранить" : "Создать" }}
            </MaterialButton>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="handleClickOutside"></div>
    </div>
  </Teleport>
</template>
