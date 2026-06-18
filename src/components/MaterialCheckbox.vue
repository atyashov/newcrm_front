<script setup>
const props = defineProps({
  name: {
    type: String,
    default: "",
  },
  id: {
    type: String,
    default: "",
  },
  modelValue: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["update:modelValue"])

const handleChange = (event) => {
  emit("update:modelValue", event.target.checked)
}
</script>
<template>
  <div class="form-check p-0">
    <input
      :id="id"
      class="form-check-input"
      type="checkbox"
      :name="name"
      :checked="modelValue"
      :disabled="disabled"
      @change="handleChange"
    />
    <label :for="id" class="custom-control-label">
      <slot />
    </label>
  </div>
</template>
