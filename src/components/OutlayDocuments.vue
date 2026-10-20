<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import MaterialButton from './MaterialButton.vue'
import { fetchOutlayDocuments, downloadOutlayDocument } from '@/services/outlayDocumentsService'
import { serverMessage } from '@/services/outlayTabsService'
const props = defineProps({ outlayId: { type: [Number, String], required: true } })
const documents = ref([]), loading = ref(false), busy = ref(''), error = ref('')
let request = 0
onBeforeUnmount(() => { request++ })
const load = async () => {
  const revision = ++request
  documents.value = []; loading.value = true; error.value = ''
  try { const result = await fetchOutlayDocuments(props.outlayId); if (revision === request) documents.value = result }
  catch (e) { if (revision === request) error.value = serverMessage(e) }
  finally { if (revision === request) loading.value = false }
}
watch(() => props.outlayId, load, { immediate: true })
const download = async type => {
  if (busy.value) return
  const revision = request
  busy.value = type; error.value = ''
  try { await downloadOutlayDocument(props.outlayId, type) }
  catch (e) { if (revision === request) error.value = serverMessage(e) }
  finally { busy.value = '' }
}
</script>
<template>
  <section class="outlay-documents">
    <h2>Документы</h2>
    <p class="text-sm text-muted">Документы формируются по сохранённой смете. Изменения формы сначала нужно сохранить.</p>
    <p v-if="loading" role="status">Загрузка документов...</p>
    <p v-if="error" class="text-danger" role="alert">{{ error }}</p>
    <div class="document-buttons">
      <MaterialButton v-for="entry in documents" :key="entry.type" type="button" color="info" variant="outline" :disabled="Boolean(busy)" @click="download(entry.type)">{{ busy === entry.type ? 'Подготовка...' : entry.title }} <span class="document-format">{{ entry.format }}</span></MaterialButton>
      <MaterialButton v-if="!loading && !documents.length" type="button" color="secondary" variant="outline" @click="load">Повторить загрузку</MaterialButton>
    </div>
  </section>
</template>
<style scoped>
.outlay-documents { margin-top: 1.5rem; }
h2 { font-size: 1.125rem; }
.document-buttons { display: flex; flex-wrap: wrap; gap: .5rem; }
.document-format { opacity: .75; font-size: .7rem; }
</style>
