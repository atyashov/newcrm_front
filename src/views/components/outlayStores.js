export const outlayStores = (outlay) => {
  const stores = Array.isArray(outlay.stores) ? outlay.stores :
    (outlay.groups ?? []).flatMap((group) => (group.items ?? []).map((item) => item.product?.store).filter(Boolean))
  const unique = new Map()
  stores.forEach((store) => {
    if (store?.title) unique.set(String(store.id ?? store.title), store)
  })
  return [...unique.values()]
}
