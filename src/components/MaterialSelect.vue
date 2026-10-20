<script setup>
import { computed, ref } from "vue"

const props = defineProps({
  id: { type: String, required: true },
  modelValue: { type: [String, Number, Boolean], default: null },
  label: { type: String, default: "" },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  name: { type: String, default: "" },
})
const emit = defineEmits(["update:modelValue"])
const focused = ref(false)
const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
})
const filled = computed(() =>
  Boolean(props.placeholder) || (props.modelValue !== null && props.modelValue !== ""),
)
</script>

<template>
  <div
    class="input-group input-group-outline material-select"
    :class="{ 'is-filled': filled, 'is-focused': focused && !disabled, 'is-invalid': error }"
  >
    <label v-if="label" :for="id" class="form-label">{{ label }}</label>
    <select
      :id="id"
      v-model="selected"
      :name="name"
      class="form-control"
      :disabled="disabled"
      :aria-invalid="error || undefined"
      @focus="focused = true"
      @blur="focused = false"
    >
      <option v-if="placeholder || modelValue === null" :value="null">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<style scoped lang="scss">
.material-select select.form-control {
  width: 100%;
  min-width: 0;
  margin-left: 0;
  appearance: auto;
  padding-right: 1.5rem !important;
  cursor: pointer;
}
.material-select .form-label {
  pointer-events: none;
}
.material-select select:disabled {
  cursor: not-allowed;
}
</style>
