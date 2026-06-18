<template>
  <div
    class="input-group"
    :class="`input-group-${props.variant} ${statusClass}`"
  >
    <textarea
      :id="props.id"
      class="form-control"
      :rows="props.rows"
      :name="props.name"
      :value="props.value"
      :placeholder="props.placeholder"
      :required="props.isRequired"
      :disabled="props.disabled"
      @input="handleInput"
    ></textarea>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue"
import setMaterialInput from "@/assets/js/material-input.js"

const props = defineProps({
  variant: {
    type: String,
    default: "outline",
  },
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: "",
  },
  value: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "Your text here...",
  },
  isRequired: Boolean,
  disabled: {
    type: Boolean,
    default: false,
  },
  rows: {
    type: Number,
    default: 5,
  },
  success: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["update:value"])

const statusClass = computed(() => {
  if (props.success) {
    return "is-valid"
  }

  if (props.error) {
    return "is-invalid"
  }

  return ""
})

const handleInput = (event) => {
  emit("update:value", event.target.value)
}

onMounted(() => {
  setMaterialInput()
})
</script>
