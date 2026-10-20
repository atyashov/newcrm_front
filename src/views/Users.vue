<script setup>
import DirectoryList from "@/components/DirectoryList.vue"
import CreateUserModal from "@/components/CreateUserModal.vue"
import { fetchUsers, createUser, updateUser, deleteUser } from "@/services/usersService"
const columns = [
  { key: "id", label: "ID", sortable: true },
  { key: "firstname", label: "Имя", sortable: true },
  { key: "lastname", label: "Фамилия", sortable: true },
  { key: "login", label: "Логин", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "phone", label: "Телефон", sortable: true },
  { key: "roles", label: "Роль", format: (item) => item.roles?.map((role) => role.title).join(", ") || item.rolename || "—" },
  { key: "subdivisions", label: "Подразделения", format: (item) => item.subdivisions?.map((entry) => entry.title).join(", ") || "—" },
  { key: "status", label: "Статус", sortable: true, format: (item) => Number(item.status) === 1 ? "Активен" : "Отключён" },
]
const filters = ["firstname", "lastname", "login", "email", "phone"].map((key) => ({ name: key, placeholder: columns.find((column) => column.key === key).label, type: "text" }))
filters.push({ name: "status", placeholder: "Статус", type: "select", options: [{ value: "1", label: "Активен" }, { value: "0", label: "Отключён" }] })
</script>
<template>
  <DirectoryList title="Пользователи" create-label="Создать пользователя" :columns="columns" :filters="filters" :fetch-items="fetchUsers" :create-item="createUser" :update-item="updateUser" :delete-item="deleteUser" :form-component="CreateUserModal" />
</template>
