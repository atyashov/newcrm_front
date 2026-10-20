<script setup>
import AppList from "@/components/AppList.vue"
import ListActions from "@/components/ListActions.vue"
import { computed, onMounted, ref, useCssModule } from "vue"
import TableSummary from "@/components/TableSummary.vue"
import { apiDelete } from "@/api"
import MaterialButton from "@/components/MaterialButton.vue"
import CreateExpenseGroupModal from "@/components/CreateExpenseGroupModal.vue"
import { useDataList } from "@/views/components/useDataList"
import { useModal } from "@/views/components/useModal"
import {
  createExpenseGroup,
  fetchExpenseGroups,
  updateExpenseGroup,
} from "@/services/expenseGroupsService"

const styles = useCssModule()

const isSaving = ref(false)

const {
  items: expenseGroups,
  isLoading,
  requestError,
  requestSuccess,
  loadData,
  showSuccess,
  showError,
  clearMessages,
} = useDataList(fetchExpenseGroups)
const groupCount = computed(() => expenseGroups.value.reduce((count, group) => count + 1 + (group.children?.length ?? 0), 0))
const {
  isOpen: isModalVisible,
  editingId,
  editingData,
  open: openModal,
  close: closeModal,
} = useModal()

const refresh = async () => {
  await loadData()
}

const handleOpenCreateModal = () => {
  clearMessages()
  openModal()
}

const handleEdit = (group) => {
  clearMessages()
  openModal(group.id, group)
}

const handleDelete = async (group) => {
  if (!confirm(`Удалить группу расходов «${group.title}»?`)) {
    return
  }

  try {
    isLoading.value = true
    clearMessages()
    const response = await apiDelete(`admin/expense-groups/${group.id}`)

    if (response?.status === true) {
      await refresh()
      showSuccess(`Группа расходов «${group.title}» удалена.`)
      return
    }

    showError(response?.message ?? "Не удалось удалить группу расходов.")
  } catch (error) {
    console.error("Ошибка при удалении группы расходов", error)
    showError(
      error?.response?.data?.message ?? "Не удалось удалить группу расходов.",
    )
  } finally {
    isLoading.value = false
  }
}

const handleModalSubmit = async ({ mode, payload, id }) => {
  if (isSaving.value) {
    return
  }

  try {
    isSaving.value = true
    clearMessages()

    const isEditMode = mode === "edit" && id
    const response = isEditMode
      ? await updateExpenseGroup(id, payload)
      : await createExpenseGroup(payload)

    if (
      response?.status === true ||
      response?.success === true ||
      response?.data?.status === true
    ) {
      await refresh()
      closeModal()
      return
    }

    showError(
      response?.message ??
        `Не удалось ${isEditMode ? "обновить" : "создать"} группу расходов.`,
    )
  } catch (error) {
    console.error("Ошибка при сохранении группы расходов", error)
    showError(
      error?.response?.data?.message ?? "Не удалось сохранить группу расходов.",
    )
  } finally {
    isSaving.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <section class="expense-groups-page" :class="styles.wrapper">
    <header :class="styles.header">
      <div>
        <h1 :class="styles.title">Группы расходов</h1>
        <p :class="styles.subtitle">Управление группами расходов</p>
      </div>
      <MaterialButton color="success" @click="handleOpenCreateModal">
        Создать группу
      </MaterialButton>
    </header>

    <div v-if="requestError" class="alert alert-danger" role="alert">
      {{ requestError }}
    </div>
    <div v-if="requestSuccess" class="alert alert-success" role="alert">
      {{ requestSuccess }}
    </div>

    <div v-if="isLoading" class="text-center py-4">
      <span
        class="spinner-border text-success"
        role="status"
        aria-hidden="true"
      ></span>
    </div>

    <div v-else class="app-list" :class="styles.groupsList">
      <TableSummary :pagination="{ total: groupCount, per_page: Math.max(1, groupCount), current_page: 1 }" />
      <p v-if="!expenseGroups.length" class="text-muted">
        Группы расходов не найдены.
      </p>

      <details
        v-for="group in expenseGroups"
        v-else
        :key="group.id"
        class="app-list-frame"
      >
        <summary :class="[styles.groupSummary, 'app-list-row']">
          <span :class="styles.groupTitle">{{ group.title }}</span>
          <ListActions @edit="handleEdit(group)" @delete="handleDelete(group)" />
        </summary>

        <div :class="styles.children">
          <p v-if="!group.children?.length" class="text-muted small mb-0">
            Дочерних групп нет.
          </p>

          <AppList v-if="group.children?.length" :items="group.children" :columns="[{ key: 'title', label: 'Название' }]" @edit="handleEdit" @delete="handleDelete" />
        </div>
      </details>
    </div>

    <CreateExpenseGroupModal
      :is-open="isModalVisible"
      :is-saving="isSaving"
      :expense-group-id="editingId"
      :initial-data="editingData"
      :parent-groups="expenseGroups"
      @close="closeModal"
      @submit="handleModalSubmit"
    />
  </section>
</template>

<style module lang="scss">
.wrapper {
  padding: 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: var(--expense-groups-muted-color);
}

.groupsList {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.groupSummary { cursor: pointer; }
.groupTitle { flex: 1; }
.children { padding: .25rem .5rem .25rem 1rem; border-top: 1px solid var(--app-list-border); }

@media (max-width: 575.98px) {
  .header {
    align-items: flex-start;
    flex-direction: column;
  }

  .children {
    padding-left: 1rem;
  }
}
</style>
