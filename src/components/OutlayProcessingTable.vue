<script setup>
import OutlayItemStages from './OutlayItemStages.vue'
import OutlayWorkText from './OutlayWorkText.vue'
import { descriptionText, imageUrl } from '@/utils/outlayDocuments'
defineProps({ outlayId: { type: [Number, String], required: true }, groups: { type: Array, default: () => [] } })
const emit = defineEmits(['stages', 'comments'])
const comments = [
  { field: 'assembly_comment', label: 'Комментарий по сборке' },
  { field: 'retrieve_comment', label: 'Комментарий по забору' },
]
const headings = ['Сборка', 'Погрузка', 'Забрали', 'Проверили', 'Утеря', 'Дефект']
const storeTitle = position => position.store?.title || position.product?.store?.title || position.store_title || '—'
const placeTitle = position => position.place || position.product?.place || '—'
</script>
<template>
  <div class="processing-groups">
    <section v-for="group in groups" :key="group.id" class="processing-group">
      <div class="processing-scroll"><table class="processing-table">
        <caption>{{ group.name || group.group_name?.name || 'Группа товаров' }}</caption>
        <colgroup><col class="product-col" /><col class="quantity-col" /><col class="store-col" /><col class="place-col" /><col v-for="heading in headings" :key="heading" class="stage-col" /></colgroup>
        <thead><tr><th scope="col">Товар</th><th scope="col">Кол-во</th><th scope="col">Склад</th><th scope="col">Место</th><th v-for="heading in headings" :key="heading" scope="col">{{ heading }}</th></tr></thead>
        <tbody>
          <template v-for="position in group.items || []" :key="position.id">
            <tr class="processing-main">
              <td class="processing-name"><strong>{{ position.product_title_snapshot }}</strong></td>
              <td class="processing-quantity"><strong>{{ Number(position.quantity) }}</strong></td>
              <td class="processing-location"><strong>{{ storeTitle(position) }}</strong></td>
              <td class="processing-location">{{ placeTitle(position) }}</td>
              <td colspan="6" class="processing-stages"><OutlayItemStages :outlay-id="outlayId" :item="position" columns @updated="emit('stages', $event)" /></td>
            </tr>
            <tr class="processing-details">
              <td colspan="4" class="processing-description">{{ descriptionText(position.description) || 'Описание не указано' }}</td>
              <td colspan="3" class="processing-comments"><OutlayWorkText v-for="entry in comments" :key="entry.field" :outlay-id="outlayId" :item-id="position.id" :field="entry.field" :label="entry.label" :value="position.comments?.[entry.field] || ''" :editor="position.comments?.editors?.[entry.field]" @updated="updated => emit('comments', updated, entry.field)" /></td>
              <td colspan="3"><div class="processing-images"><template v-for="(image,index) in position.images || []" :key="index"><img v-if="imageUrl(image.url)" :src="imageUrl(image.url)" :alt="position.product_title_snapshot || 'Фото товара'" loading="lazy" referrerpolicy="no-referrer" /></template></div></td>
            </tr>
          </template>
        </tbody>
      </table></div>
    </section>
    <p v-if="!groups.length" class="text-muted">В смете нет товарных групп.</p>
  </div>
</template>
<style scoped lang="scss">
.processing-group { margin: 1.25rem 0; color: var(--outlay-text); }
.processing-scroll { overflow-x: auto; border: 1px solid var(--outlay-border); }
.processing-table { width: 100%; min-width: 850px; table-layout: fixed; border-collapse: collapse; color: inherit; }
caption { caption-side: top; padding: .45rem; text-align: center; color: inherit; font-size: 1.125rem; font-weight: 700; border-bottom: 1px solid var(--outlay-border); }
.product-col { width: 25%; } .quantity-col { width: 7%; } .store-col, .place-col { width: 6%; } .stage-col { width: 9.3333%; }
th, td { border-right: 1px solid var(--outlay-border); border-bottom: 1px solid var(--outlay-border); padding: .35rem; color: inherit; }
th:last-child, td:last-child { border-right: 0; }
th { font-size: .75rem; font-weight: 700; background: var(--outlay-heading); text-align: center; }
th:first-child { text-align: left; }
.processing-main td { vertical-align: middle; }
.processing-name { font-size: .9375rem; line-height: 1.2; overflow-wrap: anywhere; }
.processing-name strong, .processing-quantity strong, .processing-location strong { color: inherit; }
.processing-quantity, .processing-location { font-size: .9375rem; text-align: center; overflow-wrap: anywhere; }
td.processing-stages { padding: 0; }
.processing-details td { background: var(--outlay-heading); vertical-align: top; font-size: .8125rem; }
.processing-description { white-space: pre-line; overflow-wrap: anywhere; }
.processing-comments :deep(.outlay-work-text:first-child) { margin-top: 0; }
.processing-images { display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem; }
.processing-images img { max-width: 100%; width: 100px; height: 100px; object-fit: contain; }
tbody > tr:last-child td { border-bottom: 0; }
</style>
