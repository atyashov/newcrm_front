<script setup>
import { assignmentGroups, staffLabel, userLabel, displayDateTime } from '@/views/components/outlayTabs'
defineProps({ item: { type: Object, required: true }, counterparty: { type: Object, default: null } })
</script>
<template>
  <dl class="staff-facts">
    <div><dt>Контрагент</dt><dd>{{ counterparty?.name || 'Не указан' }}<p v-if="counterparty?.contact_name && counterparty.contact_name !== counterparty.name">{{ counterparty.contact_name }}</p><p>{{ counterparty?.phone }}</p></dd></div>
    <div><dt>Статус</dt><dd>{{ item.status?.title || 'Не указан' }}</dd></div>
    <div><dt>Создатель</dt><dd>{{ item.creator ? userLabel(item.creator) : 'Не указан' }}</dd></div>
    <div v-for="group in assignmentGroups" :key="group.field"><dt>{{ group.label }}</dt><dd>{{ staffLabel(item[group.relation]) }}</dd></div>
    <div><dt>Ответственные</dt><dd>{{ (item.responsible_workers || []).map(user => typeof user === 'object' ? userLabel(user) : `ID ${user}`).join(', ') || 'Не назначены' }}</dd></div>
    <div><dt>Касса предоплаты</dt><dd>{{ item.prepayment_cash_box?.title || 'Не указана' }}<p>{{ displayDateTime(item.prepayment_date) }}</p></dd></div>
    <div><dt>Касса окончательной оплаты</dt><dd>{{ item.payment_cash_box?.title || 'Не указана' }}<p>{{ displayDateTime(item.date_of_paid) }}</p></dd></div>
  </dl>
</template>
<style scoped>
.staff-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; color: var(--outlay-text); }
.staff-facts :is(dt, dd, p) { color: inherit; }
dt { font-size: .75rem; } dd { font-size: .875rem; overflow-wrap: anywhere; } dd p { margin: 0; }
@media(max-width: 767px) { .staff-facts { grid-template-columns: 1fr; } }
</style>
