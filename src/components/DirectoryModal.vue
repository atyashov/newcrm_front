<script setup>
import MaterialButton from "./MaterialButton.vue"
defineProps({ title: String, loading: Boolean, isSaving: Boolean, error: String, loadError: String })
const emit = defineEmits(["close", "submit"])
</script>
<template>
  <Teleport to="body">
    <div class="modal fade show d-block" role="dialog" aria-modal="true" aria-labelledby="directory-modal-title" tabindex="-1" @keydown.esc="!isSaving && emit('close')">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <form class="modal-content" novalidate @submit.prevent="emit('submit')">
          <div class="modal-header"><h5 id="directory-modal-title" class="modal-title">{{ title }}</h5><button type="button" class="btn-close" aria-label="Закрыть" :disabled="isSaving" @click="emit('close')"></button></div>
          <div class="modal-body directory-form">
            <p v-if="loading" role="status">Загрузка...</p>
            <p v-if="loadError || error" class="text-danger" role="alert">{{ loadError || error }}</p>
            <fieldset :disabled="loading || isSaving || Boolean(loadError)"><slot /></fieldset>
          </div>
          <div class="modal-footer"><MaterialButton type="button" color="secondary" variant="outline" :disabled="isSaving" @click="emit('close')">Закрыть</MaterialButton><MaterialButton type="submit" color="success" :disabled="loading || isSaving || Boolean(loadError)">{{ isSaving ? 'Сохранение...' : 'Сохранить' }}</MaterialButton></div>
        </form>
      </div>
      <div class="modal-backdrop fade show" @click="!isSaving && emit('close')"></div>
    </div>
  </Teleport>
</template>
