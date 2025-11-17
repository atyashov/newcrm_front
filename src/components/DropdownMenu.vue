<script setup>
import MaterialButton from './MaterialButton.vue';
const props = defineProps([
    'prompt',
    'items'
])
const emit = defineEmits([
    'itemID'
])

const buttonClick = (id) => {
  emit("itemID", id);
};
</script>

<template>
<div class="dropdown">
  <MaterialButton 
    class="btn btn-success dropdown-toggle mx-3" 
    type="button" 
    data-bs-toggle="dropdown" 
    aria-expanded="false"
  >
    {{ prompt }}
  </MaterialButton>
  <ul class="dropdown-menu">
    <li v-for="item in props.items" :key="item.id" @click="buttonClick(item.id)">
      <a class="dropdown-item" href="#">{{ item.title }}</a>
    </li>
  </ul>
</div>
</template>