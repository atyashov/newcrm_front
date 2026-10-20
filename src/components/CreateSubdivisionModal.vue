<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref } from "vue"
import DirectoryModal from "./DirectoryModal.vue"
import MaterialInput from "./MaterialInput.vue"
import MaterialSelect from "./MaterialSelect.vue"
import MaterialButton from "./MaterialButton.vue"
import RichTextEditor from "./RichTextEditor.vue"
import FileManagerModal from "./FileManagerModal.vue"
import { fetchSubdivisionById, fetchSubdivisions } from "@/services/subdivisionsService"
import { fetchOutlayGroupNames } from "@/services/outlayGroupNamesService"
import { collectDirectoryPages } from "@/utils/directoryList"
import { subdivisionLogoUrl, imageUrl as serverImageUrl } from "@/utils/outlayDocuments"

const props = defineProps({ item: { type: Object, default: null }, isSaving: Boolean, error: String,
  serverErrors: { type: Object, default: () => ({}) } })
const emit = defineEmits(["close", "submit"])
const form = reactive({ title: "", amo_ids: "", logo: "", description: "", default_product_group_id_for_amo: null, sms_sender_name: "", site_link: "" })
const editing = computed(() => Boolean(props.item?.id))
const loading = ref(true)
const loadError = ref("")
const groupsError = ref("")
const imageError = ref("")
const invalid = ref(false)
const managerOpen = ref(false)
const groupOptions = ref([])
let alive = true
onBeforeUnmount(() => { alive = false })
const logoPreviewUrl = ref("")
const imageUrl = computed(() => form.logo ? logoPreviewUrl.value : "")
onMounted(async () => {
  try {
    const item = editing.value ? await fetchSubdivisionById(props.item.id) : {}
    if (!alive) return
    Object.keys(form).forEach((key) => { form[key] = item[key] ?? props.item?.[key] ?? form[key] })
    logoPreviewUrl.value = subdivisionLogoUrl({ ...props.item, ...item })
    form.default_product_group_id_for_amo = Number(form.default_product_group_id_for_amo) || null
    // Group names are subdivision-scoped; collect all pages for every accessible subdivision.
    try {
      const available = await fetchSubdivisions()
      const lists = await Promise.all(available.data.map(async (subdivision) => {
        const groups = await collectDirectoryPages(fetchOutlayGroupNames, { subdivision_id: subdivision.id })
        return groups.map((group) => ({ value: Number(group.id), label: `${group.name} (${subdivision.title})` }))
      }))
      if (alive) groupOptions.value = Array.from(new Map(lists.flat().map((group) => [group.value, group])).values())
    } catch (error) { if (alive) groupsError.value = error.response?.data?.message || "Не удалось загрузить группы смет. Сохранённое значение не изменено." }
    if (alive && form.default_product_group_id_for_amo && !groupOptions.value.some((group) => group.value === form.default_product_group_id_for_amo)) {
      groupOptions.value.push({ value: form.default_product_group_id_for_amo, label: `Группа №${form.default_product_group_id_for_amo}` })
    }
  } catch (error) { if (alive) loadError.value = error.response?.data?.message || error.message }
  finally { if (alive) loading.value = false }
})
const selectImage = (file) => {
  managerOpen.value = false
  if (!file.path || !/\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(file.path)) {
    imageError.value = "Выберите изображение."
    return
  }
  form.logo = file.path
  logoPreviewUrl.value = serverImageUrl(file.url)
  imageError.value = ""
}
const submit = () => {
  if (loading.value || props.isSaving || loadError.value || managerOpen.value) return
  invalid.value = !form.title.trim()
  if (invalid.value) return
  emit("submit", { ...form, title: form.title.trim(), logo: form.logo || null,
    default_product_group_id_for_amo: form.default_product_group_id_for_amo ? Number(form.default_product_group_id_for_amo) : null })
}
</script>
<template>
  <DirectoryModal :title="editing ? 'Редактирование подразделения' : 'Создание подразделения'" :loading="loading" :is-saving="isSaving" :error="error" :load-error="loadError" @close="!managerOpen && emit('close')" @submit="submit">
    <div class="row g-3">
      <div class="col-12"><MaterialInput id="subdivision-title" v-model:value="form.title" label="Название *" isRequired :error="invalid || Boolean(serverErrors.title)" /><p v-if="invalid" class="text-danger text-sm mt-1">Введите название.</p></div>
      <div class="col-12"><MaterialInput id="subdivision-amo" v-model:value="form.amo_ids" label="ID связанных воронок из AMO (через запятую)" /></div>
      <div class="col-12">
        <label class="text-sm d-block mb-2">Логотип в шапке просмотра сметы</label>
        <img v-if="imageUrl" :src="imageUrl" class="subdivision-logo mb-2" alt="Логотип подразделения" />
        <p v-if="form.logo" class="text-sm text-break">{{ form.logo }}</p>
        <div class="d-flex gap-2"><MaterialButton type="button" color="info" variant="outline" :disabled="loading || isSaving" @click="managerOpen = true">Выбрать</MaterialButton><MaterialButton v-if="form.logo" type="button" color="secondary" variant="outline" @click="form.logo = ''">Убрать</MaterialButton></div>
        <p v-if="imageError" class="text-danger text-sm">{{ imageError }}</p>
      </div>
      <div class="col-12"><label class="text-sm mb-2">Правой части шапки сметы подразделения</label><RichTextEditor v-model="form.description" placeholder="Правой части шапки сметы подразделения" :disabled="loading || isSaving" :error="Boolean(serverErrors.description)" /></div>
      <div class="col-12"><label class="text-sm mb-2" for="subdivision-group">Группа товаров по умолчанию для импортированных сделок из AMO CRM</label><MaterialSelect id="subdivision-group" v-model="form.default_product_group_id_for_amo" placeholder="Не выбрана" :options="groupOptions" :disabled="loading || isSaving || Boolean(groupsError)" :error="Boolean(serverErrors.default_product_group_id_for_amo)" /><p v-if="groupsError" class="text-warning text-sm mt-2">{{ groupsError }}</p></div>
      <div class="col-12"><MaterialInput id="subdivision-sms" v-model:value="form.sms_sender_name" label="Имя отправителя при отправке SMS" /></div>
      <div class="col-12"><MaterialInput id="subdivision-site" v-model:value="form.site_link" label="Ссылка на сайт" /></div>
    </div>
  </DirectoryModal>
  <FileManagerModal v-if="managerOpen" :is-open="managerOpen" @close="managerOpen = false" @select="selectImage" />
</template>
<style scoped>
.subdivision-logo { display: block; max-width: 240px; max-height: 100px; object-fit: contain; }
</style>
