<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref } from "vue"
import Multiselect from "@vueform/multiselect"
import "@vueform/multiselect/themes/default.css"
import DirectoryModal from "./DirectoryModal.vue"
import MaterialInput from "./MaterialInput.vue"
import MaterialSelect from "./MaterialSelect.vue"
import MaterialCheckbox from "./MaterialCheckbox.vue"
import { fetchUserById } from "@/services/usersService"
import { fetchSubdivisions } from "@/services/subdivisionsService"
import { apiGet } from "@/api"
import { collectDirectoryPages, directoryList } from "@/utils/directoryList"
import { userFields, userPayload, invalidUserFields } from "@/utils/userForm"

const props = defineProps({ item: { type: Object, default: null }, isSaving: Boolean, error: String,
  serverErrors: { type: Object, default: () => ({}) } })
const emit = defineEmits(["close", "submit"])
const editing = computed(() => Boolean(props.item?.id))
const form = reactive({ firstname: "", lastname: "", email: "", login: "", phone: "", status: "1",
  role_id: null, subdivision_ids: [], password: "", password_confirmation: "" })
const roles = ref([])
const isActive = computed({
  get: () => form.status === "1",
  set: (value) => { form.status = value ? "1" : "0" },
})
const subdivisions = ref([])
const loading = ref(true)
const loadError = ref("")
const invalid = ref(new Set())
const subdivisionsKnown = ref(false)
const subdivisionsTouched = ref(false)
const passwordVisible = reactive({ password: false, password_confirmation: false })
const passwordFields = [
  { key: "password", label: "Пароль" },
  { key: "password_confirmation", label: "Повторите пароль" },
]
let alive = true
onBeforeUnmount(() => { alive = false })
const hasError = (key) => invalid.value.has(key) || Boolean(props.serverErrors[key])
onMounted(async () => {
  try {
    const [item, available, roleItems] = await Promise.all([
      editing.value ? fetchUserById(props.item.id) : null,
      fetchSubdivisions(),
      collectDirectoryPages(async (params) => {
        const response = await apiGet("admin/roles", params)
        if (response?.status !== true) throw new Error("Не удалось загрузить роли.")
        return directoryList(response.data?.items ?? [], params)
      }),
    ])
    if (!alive) return
    subdivisions.value = available.data.map((entry) => ({ value: Number(entry.id), label: entry.title }))
    roles.value = roleItems.map((role) => ({ value: Number(role.id), label: role.title }))
    const data = { ...props.item, ...item }
    userFields.forEach(({ key }) => { form[key] = String(data[key] ?? form[key]) })
    form.status = String(data.status ?? form.status)
    form.role_id = Number(data.role_id ?? data.roles?.[0]?.id) || null
    subdivisionsKnown.value = Array.isArray(data.subdivision_ids) || Array.isArray(data.subdivisions)
    form.subdivision_ids = (data.subdivision_ids ?? data.subdivisions?.map((entry) => entry.id) ?? []).map(Number)
  } catch (error) { if (alive) loadError.value = error.response?.data?.message || error.message }
  finally { if (alive) loading.value = false }
})
const submit = () => {
  if (loading.value || props.isSaving || loadError.value) return
  invalid.value = invalidUserFields(form, editing.value)
  if (invalid.value.size) return
  // Do not accidentally clear access when the legacy detail endpoint omits the relation.
  emit("submit", userPayload(form, editing.value, !editing.value || subdivisionsKnown.value || subdivisionsTouched.value))
}
</script>
<template>
  <DirectoryModal :title="editing ? 'Редактирование пользователя' : 'Создание пользователя'" :loading="loading" :is-saving="isSaving" :error="error" :load-error="loadError" @close="emit('close')" @submit="submit">
    <p class="text-sm">Поля со звёздочкой обязательны.</p>
    <p v-if="invalid.size" class="text-danger" role="alert">Заполните выделенные поля. Пароли должны совпадать.</p>
    <div class="row g-3">
      <div v-for="field in userFields" :key="field.key" class="col-md-6"><MaterialInput :id="'user-' + field.key" v-model:value="form[field.key]" :label="field.label + ' *'" :error="hasError(field.key)" :isRequired="field.required" /></div>
      <div class="col-md-6 d-flex flex-column justify-content-center">
        <MaterialCheckbox id="user-status" v-model="isActive" :disabled="loading || isSaving">Активен</MaterialCheckbox>
        <p v-if="hasError('status')" class="text-danger text-sm mt-1 mb-0">Некорректный статус пользователя.</p>
      </div>
      <div v-for="field in passwordFields" :key="field.key" class="col-md-6">
        <div class="user-password-field">
          <MaterialInput :id="'user-' + field.key" v-model:value="form[field.key]" :type="passwordVisible[field.key] ? 'text' : 'password'" :label="field.label + (!editing || (field.key === 'password_confirmation' && form.password) ? ' *' : '')" :isRequired="!editing || (field.key === 'password_confirmation' && Boolean(form.password))" :error="hasError(field.key)" />
          <button type="button" class="user-password-toggle" :aria-label="(passwordVisible[field.key] ? 'Скрыть: ' : 'Показать: ') + field.label" :aria-pressed="passwordVisible[field.key]" :aria-controls="'user-' + field.key" :disabled="loading || isSaving" @click="passwordVisible[field.key] = !passwordVisible[field.key]">
            <i class="material-icons" aria-hidden="true">{{ passwordVisible[field.key] ? 'visibility_off' : 'visibility' }}</i>
          </button>
        </div>
        <p v-if="field.key === 'password_confirmation' && invalid.has(field.key)" class="text-danger text-sm mt-1 mb-0">Пароли должны совпадать.</p>
      </div>
      <p v-if="editing" class="text-muted text-sm mb-0">Оставьте пароль пустым, чтобы сохранить текущий.</p>
      <div class="col-12"><MaterialSelect id="user-role" v-model="form.role_id" label="Роль *" placeholder="Выберите роль" :options="roles" :disabled="loading || isSaving" :error="hasError('role_id')" /></div>
      <div class="col-12">
        <label class="text-sm mb-2">Подразделения</label>
        <Multiselect v-model="form.subdivision_ids" mode="tags" :options="subdivisions" value-prop="value" label="label" track-by="label" searchable :close-on-select="false" :disabled="loading || isSaving" placeholder="Выберите подразделения" :class="{ 'is-invalid': hasError('subdivision_ids') }" @change="subdivisionsTouched = true" />
        <p v-if="editing && !subdivisionsKnown" class="text-warning text-sm mt-2">Сервер не вернул подразделения пользователя. Без изменения этого поля доступ не перезаписывается.</p>
      </div>
    </div>
  </DirectoryModal>
</template>

<style scoped lang="scss">
.user-password-field { position: relative; }
.user-password-field :deep(input.form-control) { padding-right: 2.75rem !important; }
.user-password-toggle { position: absolute; right: .5rem; top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center; padding: .25rem; border: 0; background: transparent; color: inherit; }
.user-password-toggle .material-icons { font-size: 1.25rem; }
.user-password-toggle:disabled { opacity: .5; }
</style>
