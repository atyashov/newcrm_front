<script setup>
import { computed } from "vue"

const props = defineProps({
  label: {
    type: String,
    default: "",
  },
  active: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  prev: {
    type: Boolean,
    default: false,
  },
  next: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["click"])

const itemClasses = computed(() =>
  [props.active ? "active" : "", props.disabled ? "disabled" : ""]
    .filter(Boolean)
    .join(" ")
)

const handleClick = (event) => {
  if (props.disabled) {
    event.preventDefault()
    return
  }

  emit("click", event)
}
</script>

<template>
  <li class="page-item" :class="itemClasses">
    <a class="page-link" href="#" :aria-current="active ? 'page' : undefined" :aria-disabled="disabled || undefined" :tabindex="disabled ? -1 : 0" :aria-label="prev ? 'Предыдущая страница' : next ? 'Следующая страница' : undefined" @click.prevent="handleClick">
      <span v-if="!(prev || next)">{{ props.label }}</span>
      <i v-else-if="props.prev" class="fa fa-angle-left"></i>
      <i v-else class="fa fa-angle-right"></i>
    </a>
  </li>
</template>
