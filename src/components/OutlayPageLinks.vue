<script setup>
import { ref } from 'vue'
import { fetchOutlayInfo } from '@/services/outlayDocumentsService'
import { serverMessage } from '@/services/outlayTabsService'
import { publicOutlayUrl } from '@/utils/outlayDocuments'
const props = defineProps({ item: { type: Object, required: true } })
const busy = ref(false), error = ref('')
const publicView = async () => {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    const data = await fetchOutlayInfo(props.item.outlay_id ?? props.item.id)
    const uuid = data.item.public_uuid || (data.public_api_url || '').split('/').pop()
    if (!uuid) throw new Error('Ссылка клиента отсутствует. Откройте информацию о смете и перевыпустите ссылку.')
    window.location.assign(publicOutlayUrl(uuid))
  } catch (e) { error.value = serverMessage(e) }
  finally { busy.value = false }
}
</script>
<template>
  <router-link :to="`/outlays/${item.outlay_id ?? item.id}/info`" class="btn btn-outline-info btn-sm mb-0" title="Информация о смете" aria-label="Информация о смете"><i class="material-icons">info</i></router-link>
  <a v-if="item.public_uuid" :href="publicOutlayUrl(item.public_uuid)" class="btn btn-outline-secondary btn-sm mb-0" target="_blank" rel="noopener noreferrer" title="Просмотр для клиента" aria-label="Просмотр для клиента"><i class="material-icons">open_in_new</i></a>
  <button v-else type="button" class="btn btn-outline-secondary btn-sm mb-0" :disabled="busy" title="Просмотр для клиента" aria-label="Просмотр для клиента" @click="publicView"><i class="material-icons">open_in_new</i></button>
  <p v-if="error" class="text-danger text-xs" role="alert">{{ error }}</p>
</template>
