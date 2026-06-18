<template>
  <div class="toast fade show p-2 mt-2" :class="getColor(color)">
    <div class="toast-header bg-transparent border-0">
      <i class="material-icons me-2" :class="getIcon(icon.color)">{{
        icon.component
      }}</i>
      <span class="me-auto font-weight-bold" :class="getTextColor(color)">{{
        title
      }}</span>
      <i
        class="fas fa-times text-md ms-3 cursor-pointer"
        :class="getTextColor(color)"
        @click="$emit('close')"
      />
    </div>
    <hr class="horizontal dark m-0" :class="getHrColor(color)" />
    <div class="toast-body" :class="getTextColor(color)">{{ description }}</div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue"

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  icon: {
    type: Object,
    default: () => ({}),
  },
  color: {
    type: String,
    default: "success",
  },
})

defineEmits(["close"])

const getColor = (color) => {
  return color === "white" ? "bg-white" : `bg-gradient-${color}`
}

const getIcon = (iconColor) => (iconColor ? `text-${iconColor}` : null)

const getTextColor = (color) => (color === "white" ? "text-dark" : "text-white")

const getHrColor = (color) => (color === "white" ? "dark" : "light")
</script>
