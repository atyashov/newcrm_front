# Product list relations

The product table displays category, price, quantity and store. No per-product
requests are made to hydrate category names.

`GET /api/admin/products` currently serializes products without loading
`categories` or adding `category_id`. The frontend therefore cannot determine
the category for these rows and shows a dash until the list includes the relation.

Recommended backend change in `ProductsService::getProducts`: eager load
`categories:id,title` and `store:id,title` on the paginated query. Each product
should include `categories: [{ id, title }]` and `store: { id, title } | null`.
Keep price, quantity and store_id in the existing response.

The frontend supports those relations, as well as category_id/category_title
and store_id/store_title. Store IDs are currently resolved against one shared
store-list load, not a separate request for every product.
