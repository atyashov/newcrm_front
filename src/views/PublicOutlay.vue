<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import OutlaySnapshot from '@/components/OutlaySnapshot.vue'
import { fetchPublicOutlay, fetchOutlayViewer } from '@/services/outlayDocumentsService'
import OutlayStaffDetails from '@/components/OutlayStaffDetails.vue'
import { privateOutlayPath } from '@/utils/outlayDocuments'
const route = useRoute()
const item = ref(null), loading = ref(false), error = ref('')
const staff = ref(null), checkingStaff = ref(false)
let request = 0
onBeforeUnmount(() => { request++ })
const load = async () => {
  const revision = ++request
  document.title = 'Просмотр сметы'
  item.value = null; staff.value = null; checkingStaff.value = false; loading.value = true; error.value = ''
  try {
    const value = await fetchPublicOutlay(route.params.uuid)
    if (revision === request) {
      item.value = value; loading.value = false; document.title = `Смета №${value.id}`
      checkingStaff.value = true
      const viewer = await fetchOutlayViewer(value.id)
      if (revision === request) staff.value = viewer
    }
  } catch (e) {
    if (revision === request) error.value = e.response?.status === 404
      ? 'Смета не найдена. Возможно, ссылка устарела. Запросите новую ссылку у менеджера.'
      : e.response?.status === 429 ? 'Слишком много запросов. Попробуйте немного позже.' : 'Не удалось загрузить смету. Попробуйте снова позже.'
  } finally { if (revision === request) { loading.value = false; checkingStaff.value = false } }
}
const print = () => window.print()
watch(() => route.params.uuid, load, { immediate: true })
</script>
<template>
  <main class="public-outlay-page">
    <p v-if="loading" role="status">Загружаем вашу смету...</p>
    <section v-else-if="error" role="alert"><h1>Просмотр сметы</h1><p>{{ error }}</p><button type="button" class="btn btn-outline-secondary" @click="load">Повторить</button></section>
    <template v-else-if="item">
      <OutlaySnapshot :item="item" />
      <div class="public-actions no-print">
        <button type="button" class="btn btn-outline-info mb-0" @click="print">Печать</button>
        <template v-if="staff">
          <a :href="privateOutlayPath(item.id, 'edit')" class="btn btn-outline-success mb-0">Редактировать</a>
          <a :href="privateOutlayPath(item.id, 'info')" class="btn btn-outline-info mb-0">Инфо</a>
          <a :href="privateOutlayPath(item.id, 'copy')" class="btn btn-outline-info mb-0">Копировать</a>
        </template>
      </div>
      <section v-if="staff" class="public-staff no-print"><h2>Информация для сотрудников</h2><OutlayStaffDetails :item="staff.item" :counterparty="staff.counterparty" /></section>
      <p v-if="checkingStaff" class="no-print text-sm">Проверка доступа сотрудника...</p>
      <p class="public-link-notice no-print">Ссылка предназначена получателю сметы. Не передавайте её посторонним.</p>
    </template>
  </main>
</template>
<style scoped>
.public-outlay-page { max-width: 1080px; margin: 2rem auto; padding: 2rem; background: var(--outlay-surface); color: var(--outlay-text); border-radius: .75rem; }
.public-outlay-page :deep(h1), .public-outlay-page :deep(h2), .public-outlay-page :deep(h3), .public-outlay-page :deep(p), .public-outlay-page :deep(strong) { color: inherit; }
.public-link-notice { margin: 2rem 0 0; font-size: .75rem; opacity: .75; }
.public-actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1.5rem; }
.public-staff { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--outlay-border); }
.public-staff h2 { font-size: 1.125rem; }
@media(max-width: 767px) { .public-outlay-page { margin: 0; padding: 1rem; border-radius: 0; } }
@media print {
  .public-outlay-page { --outlay-text: #000; --outlay-border: #bbb; margin: 0; padding: 0; max-width: none; background: #fff !important; color: #000 !important; }
  .public-outlay-page :deep(*) { color: #000 !important; }
  .no-print { display: none !important; }
}
</style>
