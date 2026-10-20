const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const read = file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')

test('outlay user references return all paginated users as an array', async () => {
  const directorySource = read('utils/directoryList.js')
  const { directoryList, collectDirectoryPages } = await import(`data:text/javascript;base64,${Buffer.from(directorySource).toString('base64')}`)
  const source = read('services/outlaysService.js').replace(/^import .*$/gm, '').replace(/export const /g, 'const ')
  const make = fetchUsers => new Function('fetchUsers', 'collectDirectoryPages', `${source}; return fetchUsersForOutlays`)(fetchUsers, collectDirectoryPages)
  const calls = []
  const fetchAll = make(async params => {
    calls.push(params)
    return { data: [{ id: params.page }], pagination: { last_page: 2 } }
  })
  assert.deepEqual(await fetchAll(), [{ id: 1 }, { id: 2 }])
  assert.deepEqual(calls.map(params => params.page), [1, 2])
  assert.ok(calls.every(params => params.page_size === 100))
  const legacyUsers = Array.from({ length: 105 }, (_, index) => ({ id: index + 1 }))
  assert.deepEqual(await make(async params => directoryList(legacyUsers, params))(), legacyUsers)
})
