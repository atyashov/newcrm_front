const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const read = file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')
const moduleFrom = file => import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`)

test('legacy directory arrays filter, sort, paginate and preserve the source', async () => {
  const { directoryList } = await moduleFrom('utils/directoryList.js')
  const items = Array.from({ length: 45 }, (_, id) => ({ id: id + 1, title: `Item ${id + 1}`, status: '1' }))
  const result = directoryList(items, { page: 2, page_size: 20, sort: '-id', title: 'Item' })
  assert.equal(result.data.length, 20)
  assert.equal(result.data[0].id, 25)
  assert.equal(result.pagination.from, 21)
  assert.equal(result.pagination.to, 40)
  assert.equal(result.pagination.total, 45)
  assert.equal(items[0].id, 1)
  assert.equal(directoryList(items, { title: 'unknown' }).pagination.total, 0)
})

test('server paginator is not filtered or paginated twice', async () => {
  const { directoryList } = await moduleFrom('utils/directoryList.js')
  const items = { data: [{ id: 21 }], current_page: 2, total: 21, per_page: 20, last_page: 2 }
  const result = directoryList(items, { page: 2, page_size: 20, title: 'ignored locally' })
  assert.deepEqual(result.data, items.data)
  assert.equal(result.pagination, items)
})

test('header and selection lists load every page with the original filters', async () => {
  const { collectDirectoryPages } = await moduleFrom('utils/directoryList.js')
  const calls = []
  const items = await collectDirectoryPages(async params => {
    calls.push(params)
    return { data: [{ id: params.page }], pagination: { last_page: 3 } }
  }, { subdivision_id: 5 })
  assert.deepEqual(items.map(item => item.id), [1, 2, 3])
  assert.deepEqual(calls.map(params => params.page_size), [100, 100, 100])
  assert.ok(calls.every(params => params.subdivision_id === 5))
})

test('password and confirmation are sent together only when filled; unknown access is preserved', async () => {
  const { userPayload, invalidUserFields } = await moduleFrom('utils/userForm.js')
  const form = { firstname: ' Name ', lastname: 'Surname', login: 'admin', email: 'a@b.test', phone: '123', status: '1', role_id: '3', subdivision_ids: ['5', 5, 6], password: 'secret', password_confirmation: 'secret' }
  const creation = userPayload(form, false)
  assert.equal(creation.firstname, 'Name')
  assert.equal(creation.role_id, 3)
  assert.deepEqual(creation.subdivision_ids, [5, 6])
  assert.equal(creation.password, 'secret')
  assert.equal(creation.password_confirmation, 'secret')
  assert.equal(creation.status, '1')
  assert.equal(userPayload({ ...form, status: '0' }, true).status, '0')
  const editing = userPayload({ ...form, password: '' }, true, false)
  assert.equal('password' in editing, false)
  assert.equal('password_confirmation' in editing, false)
  assert.equal('subdivision_ids' in editing, false)
  assert.deepEqual(userPayload({ ...form, subdivision_ids: [] }, true).subdivision_ids, [])
  assert.equal(invalidUserFields(form, false).size, 0)
  assert.ok(invalidUserFields({ ...form, password_confirmation: 'wrong' }, false).has('password_confirmation'))
  assert.equal(invalidUserFields({ ...form, password: '', password_confirmation: '' }, true).size, 0)
  assert.equal(userPayload(form, true).password, 'secret')
  assert.equal(userPayload(form, true).password_confirmation, 'secret')
  assert.ok(invalidUserFields({ ...form, password_confirmation: 'wrong' }, true).has('password_confirmation'))
  assert.ok(invalidUserFields({ ...form, password: '' }, false).has('password'))
  assert.equal('password' in userPayload({ ...form, password: '' }, false), false)
  assert.equal(invalidUserFields({ ...form, password: '', password_confirmation: 'ignored' }, true).size, 0)
})

test('subdivision service keeps the header unpaginated and uses REST endpoints', async () => {
  const { directoryList, collectDirectoryPages } = await moduleFrom('utils/directoryList.js')
  const calls = []
  const source = read('services/subdivisionsService.js').replace(/^import .*$/gm, '').replace(/export const /g, 'const ')
  const service = new Function('apiGet', 'apiPost', 'apiPut', 'apiDelete', 'directoryList', 'collectDirectoryPages', `${source}; return { fetchSubdivisions, createSubdivision, updateSubdivision, deleteSubdivision }`)(
    async () => ({ status: true, data: { items: Array.from({ length: 110 }, (_, i) => ({ id: i + 1 })) } }),
    (...args) => calls.push(args), (...args) => calls.push(args), (...args) => calls.push(args), directoryList, collectDirectoryPages,
  )
  assert.equal((await service.fetchSubdivisions()).data.length, 110)
  const payload = { title: 'Main', logo: 'logos/image.png', site_link: 'example.com' }
  service.createSubdivision(payload)
  service.updateSubdivision(5, payload)
  service.deleteSubdivision(5)
  assert.deepEqual(calls, [['admin/subdivisions', payload], ['admin/subdivisions/5', payload], ['admin/subdivisions/5']])
})

test('login accepts plain text and submits login rather than email', () => {
  for (const file of ['pages/auth/SignIn.vue', 'pages/auth/Login.vue']) {
    const source = read(file)
    assert.ok(source.includes('login: login.value.trim()'))
    assert.equal(source.includes('email: email.value'), false)
    assert.equal(source.includes('type="email"'), false)
    assert.ok(source.includes('Логин'))
  }
})
