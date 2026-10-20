<script setup>
import { computed } from 'vue'
import { displayDateTime, displayMoney } from '@/views/components/outlayTabs'
import { descriptionText, imageUrl, subdivisionLogoUrl, safeWebUrl } from '@/utils/outlayDocuments'
const props = defineProps({ item: { type: Object, required: true } })
const groups = computed(() => props.item.groups ?? [])
const groupTitle = group => group.name || group.group_name?.name || group.groupName?.name || 'Группа товаров'
</script>
<template>
  <article class="outlay-snapshot">
    <header class="snapshot-heading">
      <img v-if="subdivisionLogoUrl(item.subdivision)" :src="subdivisionLogoUrl(item.subdivision)" :alt="item.subdivision?.title || 'Логотип'" class="subdivision-logo" referrerpolicy="no-referrer" />
      <div class="snapshot-heading-content"><h1>Смета №{{ item.id }}</h1><h2>{{ item.title }}</h2>
        <p v-if="item.subdivision?.description" class="subdivision-description">{{ descriptionText(item.subdivision.description) }}</p>
      </div>
      <a v-if="safeWebUrl(item.subdivision?.site_link)" :href="safeWebUrl(item.subdivision.site_link)" target="_blank" rel="noopener noreferrer">Открыть сайт</a>
    </header>
    <dl class="snapshot-facts">
      <div><dt>Дата заказа</dt><dd>{{ displayDateTime(item.execution_date) }}<p v-if="item.date_comment">{{ item.date_comment }}</p></dd></div>
      <div><dt>Дата возврата</dt><dd>{{ displayDateTime(item.return_date) }}<p v-if="item.return_date_comment">{{ item.return_date_comment }}</p></dd></div>
      <div><dt>Адрес</dt><dd>{{ item.address || 'Не указан' }}</dd></div>
      <div><dt>Получатель</dt><dd>{{ item.recipient_name || 'Не указан' }}<p>{{ item.recipient_phone }}</p></dd></div>
      <div><dt>Самовывоз</dt><dd>{{ item.self_pickup ? 'Да' : 'Нет' }}</dd></div>
      <div><dt>Самовозврат</dt><dd>{{ item.self_return ? 'Да' : 'Нет' }}</dd></div>
    </dl>
    <slot name="composition" :groups="groups">
    <section v-for="group in groups" :key="group.id" class="snapshot-group">
      <h3>{{ groupTitle(group) }}</h3>
      <div class="snapshot-scroll"><table class="snapshot-table">
        <thead><tr><th>Товар</th><th>Цена</th><th>Количество</th><th>Сумма</th><th v-if="$slots['item-stages']">Обработка позиции</th></tr></thead>
        <tbody><tr v-for="position in group.items || []" :key="position.id">
          <td><strong>{{ position.product_title_snapshot }}</strong><p v-if="position.description" class="item-description">{{ descriptionText(position.description) }}</p><div class="item-images"><template v-for="(entry,index) in position.images || []" :key="index"><img v-if="imageUrl(entry.url)" :src="imageUrl(entry.url)" :alt="position.product_title_snapshot || 'Изображение товара'" loading="lazy" referrerpolicy="no-referrer" /></template></div></td>
          <td>{{ displayMoney(position.price) }}</td><td>{{ Number(position.quantity) }}</td><td>{{ displayMoney(position.total_cost) }}</td>
          <td v-if="$slots['item-stages']" class="snapshot-stage-cell"><slot name="item-stages" :position="position" /></td>
        </tr></tbody>
      </table></div>
    </section>
    <p v-if="!groups.length" class="text-muted">В смете нет товарных групп.</p>
    </slot>
    <div class="snapshot-totals"><p>Скидка: {{ displayMoney(item.discount_amount) }} <span v-if="Number(item.percent_discount)">({{ Number(item.percent_discount) }}%)</span></p><p>Предоплата: {{ displayMoney(item.prepayment ? item.prepayment_amount : 0) }}</p><strong>Итого: {{ displayMoney(item.total_cost) }}</strong><p>{{ item.is_paid ? 'Оплачено полностью' : 'Не оплачено полностью' }}</p></div>
  </article>
</template>
<style scoped lang="scss">
.outlay-snapshot { color: var(--outlay-text, #344767); }
.outlay-snapshot :is(h1, h2, h3, p, strong, dt, dd, th, td) { color: inherit; }
.snapshot-heading .subdivision-description { margin: .75rem 0 0; white-space: pre-line; font-size: .625rem; line-height: .5rem; }
.snapshot-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--outlay-border, #dee2e6); }
.snapshot-heading-content { flex: 1; min-width: 0; }
.snapshot-heading h1 { margin: 0; font-size: 1.75rem; }
.snapshot-heading h2 { margin: .35rem 0 0; font-size: 1.125rem; }
.snapshot-heading p, dd p { margin: 0; }
.subdivision-logo { flex: 0 0 auto; width: 180px; max-width: 100%; max-height: 100px; object-fit: contain; }
.snapshot-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin: 1.25rem 0; }
dt { font-size: .75rem; opacity: .8; } dd { margin: 0; font-size: .875rem; overflow-wrap: anywhere; }
.snapshot-group { margin: 1.25rem 0; break-inside: avoid; }
.snapshot-group h3 { font-size: 1rem; }
.snapshot-scroll { overflow-x: auto; }
.snapshot-table { width: 100%; font-size: .875rem; }
.snapshot-table td, .snapshot-table th { padding: .5rem; border: 1px solid var(--outlay-border, #dee2e6); vertical-align: top; }
.snapshot-table th { font-size: .75rem; }
.snapshot-table td:not(:first-child) { white-space: nowrap; width: 1%; }
.snapshot-table td.snapshot-stage-cell { white-space: normal; width: auto; }
.item-description { white-space: pre-line; overflow-wrap: anywhere; margin: .35rem 0; font-size: .8125rem; }
.item-images { display: flex; flex-wrap: wrap; gap: .5rem; }
.item-images img { width: 90px; height: 75px; object-fit: contain; }
.snapshot-totals { text-align: right; } .snapshot-totals p { margin: .25rem 0; }
@media(max-width: 767px) { .snapshot-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media(max-width: 450px) { .snapshot-facts { grid-template-columns: 1fr; } }
@media print { .snapshot-scroll { overflow: visible; } .snapshot-heading a { display: none; } }
</style>
