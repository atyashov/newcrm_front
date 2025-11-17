<script setup>
import {watch} from "vue";

// const emit = defineEmits(['reload', 'close', 'remove']);
let props = defineProps([
  'showEdit', 'id', 'confirmRemoveTitle'
]);
// let outlay = ref({});
watch(() => [props.id, props.showEdit], () => {
  loading();
})

async function loading() {
  return;
}
</script>

<template>
    <h1 v-if="props.showEdit">Новая смета</h1>
</template>