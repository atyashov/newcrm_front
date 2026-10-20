# Stores in outlay lists

Frontend route: `/stores`. Stores are global, not scoped to subdivisions.
Products submit the optional `store_id` (integer or null).

The outlays list currently does not load stores or product relations. To populate
the new Stores column without per-product/per-outlay HTTP requests, each outlay
in `POST /api/admin/outlays` should include:

```json
{
  "id": 123,
  "stores": [{ "id": 1, "title": "Main" }, { "id": 2, "title": "Extra" }]
}
```

Return unique stores by ID for products in all groups of that outlay; exclude
products without a store. For no stores, return `stores: []`. Use batch/eager
loading over the page, not a separate SQL query per item. The frontend also accepts
embedded `groups[].items[].product.store`, but the compact `stores` array is
preferred for the 500-outlay dashboard.

Stores read access currently requires STORE_ACCESS (or SUPER_ADMINISTRATOR),
including when opening the product store selector. Users managing products need
that permission too, or backend policy must explicitly allow the intended roles.
