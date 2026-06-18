<template>
  <div class="notifications-container">
    <MaterialSnackbar
      v-if="notification.visible"
      :title="notification.title"
      :description="notification.message"
      :icon="notification.icon"
      :color="notification.color"
      @close="clearNotification"
    />
  </div>
</template>

<script setup>
import MaterialSnackbar from "./MaterialSnackbar.vue"
import { notification, clearNotification as clear } from "@/utils/notification"

const clearNotification = clear
</script>

<style scoped>
.notifications-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}
</style>
