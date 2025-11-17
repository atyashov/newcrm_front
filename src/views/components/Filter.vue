<script setup>
import { reactive, watch, useCssModule } from "vue"
import MaterialInput from "@/components/MaterialInput.vue"

const props = defineProps({
  inputOptions: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(["change"])

const styles = useCssModule()

// Создаем реактивное состояние для всех значений фильтра
const filterValues = reactive({})

// Инициализируем значения из props
const initializeValues = () => {
  props.inputOptions.forEach((input) => {
    if (input.name && !(input.name in filterValues)) {
      filterValues[input.name] = input.value ?? ""
    }
  })
}

// Инициализация при монтировании
initializeValues()

// Синхронизируем значения при изменении props
watch(
  () => props.inputOptions,
  () => {
    initializeValues()
  },
  { deep: true }
)

// Функция для обновления значения и передачи всего объекта
const handleFieldChange = (fieldName, value) => {
  filterValues[fieldName] = value
}

const handleEmitValues = () => {
  emit("change", { ...filterValues })
}
</script>

<template>
  <div :class="styles.filter">
    <template v-for="input in inputOptions" :key="input.name">
      <MaterialInput
        v-if="input.type === 'text'"
        :id="input.name"
        :value="filterValues[input.name] ?? ''"
        :label="input.placeholder"
        :type="input.type"
        @update:value="(value) => handleFieldChange(input.name, value)"
        @change="handleEmitValues"
      />
      <select
        v-else-if="input.type === 'select'"
        :id="input.name"
        :value="filterValues[input.name] ?? ''"
        :placeholder="input.placeholder"
        class="form-select"
        @change="(e) => handleFieldChange(input.name, e.target.value)"
      >
        <option value="">{{ input.placeholder || "Выберите..." }}</option>
        <option
          v-for="option in input.options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </template>
  </div>
</template>
<style module lang="scss">
.filter {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
</style>
