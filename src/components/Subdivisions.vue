<script setup>
import DropdownMenu from './DropdownMenu.vue';
// import { apiGet } from '../api';
import { useStore } from 'vuex';
import { computed, watch } from 'vue';

const store = useStore();
const subdivision = computed(() => store.getters['user/subdivision']) || store.getters['user/subdivision'];
const subdivisionPrompt = computed(() => {
  if (subdivision.value) {
    const sub = subdivisions.find(sub => sub.id === subdivision.value);
    return sub ? sub.title : "Подразделения";
  }
  return "Подразделения";
});

const setSubdivision = (value) => {
  store.dispatch('user/setSubdivision', value);
};

watch(() => [store.state.user.subdivision], () => {
    subdivision.value = store.state.user.subdivision;
})

// function getSubdivision()
// {
//   return subdivision;
// }

// let subdivisions = await apiGet('/admin/subdivisions');

let subdivisions = [{
  id: 1,
  title: "Wprokat",
},
{
  id: 2,
  title: "Flowersgift"
},
{
  id: 3,
  title: "Words"
}
];

// onMounted(getSubdivision)
</script>
<template>
<DropdownMenu 
    :prompt="subdivisionPrompt"
    :items="subdivisions"
    @itemID="setSubdivision"
></DropdownMenu>
</template>