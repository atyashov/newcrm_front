<script setup>
import ListActions from "./ListActions.vue"
defineProps({
  items: { type: Array, required: true },
  columns: { type: Array, required: true },
  getSortIcon: { type: Function, default: () => "" },
  view: Boolean,
  edit: { type: Boolean, default: true },
  remove: { type: Boolean, default: true },
  disabled: Boolean,
  editDisabled: Boolean,
  deleteDisabled: Boolean,
})
const emit = defineEmits(["sort", "view", "edit", "delete"])
</script>
<template>
  <div class="app-list app-list-frame" :style="{ '--app-list-column-count': columns.length }">
    <div class="app-list-scroll">
      <table class="app-list-table">
        <thead><tr>
          <th v-for="column in columns" :key="column.key" scope="col">
            <button v-if="column.sortable" type="button" class="app-list-sort" :disabled="disabled" @click="emit('sort', column.key)">
              {{ column.label }}<i v-if="getSortIcon(column.key)" class="material-icons" aria-hidden="true">{{ getSortIcon(column.key) }}</i>
            </button>
            <template v-else>{{ column.label }}</template>
          </th>
          <th v-if="view || edit || remove" scope="col" class="app-list-action-cell"><span class="visually-hidden">Действия</span></th>
        </tr></thead>
        <tbody><tr v-for="(item, index) in items" :key="item.id ?? index">
          <td v-for="column in columns" :key="column.key">
            <slot :name="'cell-' + column.key" :item="item">
              {{ column.format ? column.format(item) : item[column.key] ?? column.fallback ?? '—' }}
            </slot>
          </td>
          <td v-if="view || edit || remove" class="app-list-action-cell">
            <ListActions :view="view" :edit="edit" :remove="remove" :disabled="disabled" :edit-disabled="editDisabled" :delete-disabled="deleteDisabled" @view="emit('view', item)" @edit="emit('edit', item)" @delete="emit('delete', item)" />
          </td>
        </tr></tbody>
      </table>
    </div>
  </div>
</template>
