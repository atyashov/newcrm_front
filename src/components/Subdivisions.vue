<script setup>
import DropdownMenu from "./DropdownMenu.vue"
import { computed } from "vue"
import { useStore } from "vuex"

const store = useStore()
const subdivision = computed(() => store.getters["subdivisions/subdivision"])
const subdivisions = computed(() => [
  {
    id: null,
    title: "Общий режим",
  },
  ...store.getters["subdivisions/subdivisions"],
])

const subdivisionPrompt = computed(() => {
  if (subdivision.value) {
    const sub = subdivisions.value.find((sub) => sub.id === subdivision.value)
    return sub ? sub.title : "Подразделения"
  }
  return "Общий режим"
})

const setSubdivision = (value) => {
  store.dispatch("subdivisions/setSubdivision", value)
}
</script>
<template>
  <DropdownMenu
    :prompt="subdivisionPrompt"
    :items="subdivisions"
    @itemID="setSubdivision"
  ></DropdownMenu>
</template>
