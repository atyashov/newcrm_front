<template>
  <div class="input-group" :class="groupClasses">
    <label :class="labelClass">{{ props.label }}</label>
    <input
      :id="props.id"
      :type="props.type"
      class="form-control"
      :class="inputClasses"
      :name="props.name"
      :value="props.value"
      :placeholder="props.placeholder"
      :required="props.isRequired"
      :disabled="props.disabled"
      @input="handleInput"
    />
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
  label: {
    type: String,
    default: "",
  },
  size: {
    type: String,
    default: "default",
  },
  success: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    default: "",
  },
  id: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "text",
  },
  isRequired: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["update:value"])

const autoFloatTypes = ["date", "datetime-local", "month", "time"]

const isValuePresent = computed(
  () => props.value !== undefined && props.value !== null && props.value !== ""
)

const shouldForceFilled = computed(() =>
  autoFloatTypes.includes(props.type.toLowerCase())
)

const groupClasses = computed(() => {
  const statusClass = props.success
    ? "is-valid"
    : props.error
    ? "is-invalid"
    : ""

  return [
    `input-group-${props.variant}`,
    statusClass,
    shouldForceFilled.value || isValuePresent.value ? "is-filled" : "",
    shouldForceFilled.value ? "input-group-native-date" : "",
  ]
    .filter(Boolean)
    .join(" ")
})

const labelClass = computed(() =>
  props.variant === "static" ? "" : "form-label"
)

const inputClasses = computed(() =>
  props.size && props.size !== "default" ? `form-control-${props.size}` : ""
)

const handleInput = (event) => {
  emit("update:value", event.target.value)
}

onMounted(() => {
  setMaterialInput()
})
</script>

<style lang="scss">
.input-group.input-group-outline.is-focused .form-label:before,
.input-group.input-group-outline.is-focused .form-label:after,
.input-group.input-group-outline.is-filled .form-label:before,
.input-group.input-group-outline.is-filled .form-label:after {
  box-shadow: none !important;
}
</style>
