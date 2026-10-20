const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '../src/views/components/outlayComposition.js'), 'utf8')
const helpers = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('new product uses catalog price, edited price is serialized independently', async () => {
  const h = await helpers
  const product = h.productOption({ id: 15, title: 'Chair', price: '125.50', quantity: 12 })
  const row = h.newItem(product)
  assert.equal(row.price, '125.50')
  row.price = '100.25'
  row.quantity = '2'
  const group = { ...h.newGroup(), name: { value: 4 }, items: [row] }
  assert.equal(h.compositionError([group]), '')
  assert.deepEqual(h.serializeGroups([group]), [{ outlay_group_name_id: 4, items: [{ product_id: 15, price: '100.25', quantity: '2' }] }])
  assert.equal(product.price, '125.50')
  assert.equal(h.lineCents(row), 20050n)
})

test('editing preserves row IDs, snapshots, descriptions and images; removed rows are omitted', async () => {
  const h = await helpers
  const groups = h.normalizeGroups([{ id: 9, outlay_group_name_id: 4, group_name: { name: 'Furniture' }, items: [
    { id: 21, product_id: 15, product_title_snapshot: 'Old chair', price: '80.00', quantity: '2.000', description: 'Keep', images: [{ path: 'chair.jpg' }] },
    { id: 22, product_id: 16, product_title_snapshot: 'Table', price: '90.00', quantity: '1.000' },
  ] }])
  assert.equal(groups[0].items[0].product.label, 'Old chair')
  groups[0].items.pop()
  const payload = h.serializeGroups(groups)
  assert.equal(payload[0].id, 9)
  assert.deepEqual(payload[0].items, [{ id: 21, product_id: 15, price: '80.00', quantity: '2', description: 'Keep', images: ['chair.jpg'] }])
  assert.deepEqual(h.serializeGroups([]), [])
})

test('whole quantities stay exact and existing fractional values are never silently rounded', async () => {
  const h = await helpers
  assert.equal(h.quantityForRequest('190.000'), '190')
  assert.equal(h.quantityForRequest('190'), '190')
  assert.equal(h.validQuantity('189.999'), false)
  assert.equal(h.validQuantity('2.5'), false)
  assert.throws(() => h.quantityForRequest('189.999'), /целым/)
  const groups = h.normalizeGroups([{outlay_group_name_id:4,items:[{product_id:15,price:'10',quantity:'189.999'}]}])
  assert.equal(groups[0].items[0].quantity, '189.999')
  assert.ok(h.compositionError(groups))
  assert.throws(() => h.serializeGroups(groups), /целым/)
})

test('copy creates new row identities and resets payments without modifying the original', async () => {
  const h = await helpers
  const original = {id:10,public_uuid:'old',creator_id:1,is_paid:true,prepayment:true,prepayment_amount:'300',groups:[{id:2,items:[{id:3,product_id:5,stages:{assembled:true}}]}]}
  const copy = h.copyOutlayForCreate(original, 9)
  assert.equal(copy.id, null)
  assert.equal(copy.creator_id, 9)
  assert.equal(copy.public_uuid, undefined)
  assert.equal(copy.is_paid, false)
  assert.equal(copy.prepayment, false)
  assert.equal(copy.groups[0].id, null)
  assert.equal(copy.groups[0].items[0].id, null)
  assert.equal(copy.groups[0].items[0].stages, undefined)
  assert.equal(original.groups[0].items[0].id, 3)
  assert.equal(original.is_paid, true)
})

test('rounding and explicit discount priority match backend calculations', async () => {
  const h = await helpers
  const groups = [{ items: [{ price: '0.05', quantity: '0.1' }, { price: '100.00', quantity: '1' }] }]
  assert.deepEqual(h.discountedCents(groups, '10', ''), { subtotal: 10001n, discount: 1000n, total: 9001n })
  assert.deepEqual(h.discountedCents(groups, '10', '20.00'), { subtotal: 10001n, discount: 2000n, total: 8001n })
  assert.equal(h.discountedCents(groups, '10', '0').discount, 0n)
  assert.equal(h.discountedCents([], '', '').total, 0n)
})

test('invalid quantities, prices and unnamed groups cannot be saved', async () => {
  const h = await helpers
  assert.ok(h.compositionError([h.newGroup()]))
  for (const [price, quantity] of [['1', '0'], ['-1', '1'], ['1.001', '1'], ['1', '0.0001'], ['', '1'], ['1e2', '1']]) {
    assert.ok(h.compositionError([{ name: { value: 4 }, items: [{ product: { value: 15 }, price, quantity }] }]))
  }
  assert.equal(h.productOption({ id: 1, unlimited: '0' }).unlimited, false)
  assert.equal(h.productOption({ id: 1, unlimited: 1 }).unlimited, true)
})
