<template>
  <button class="btn mb-0" :class="resolvedClasses">
    <slot />
  </button>
</template>

<script setup>
import { computed } from "vue"

const props = defineProps({
  color: {
    type: String,
    default: "success",
  },
  size: {
    type: String,
    default: "md",
  },
  variant: {
    type: String,
    default: "fill",
  },
  fullWidth: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: false,
  },
})

const resolvedClasses = computed(() => {
  const baseVariant =
    props.variant === "gradient"
      ? `bg-gradient-${props.color}`
      : props.variant === "outline"
      ? `btn-outline-${props.color}`
      : `btn-${props.color}`

  const sizeClass = props.size ? `btn-${props.size}` : ""
  const widthClass = props.fullWidth ? "w-100" : ""
  const activeClass = props.active ? "active" : ""

  return [baseVariant, sizeClass, widthClass, activeClass]
    .filter(Boolean)
    .join(" ")
})
</script>
