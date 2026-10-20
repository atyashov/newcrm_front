const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vue = require('vue')
const { renderToString } = require('@vue/server-renderer')
const { parse, compileScript } = require('@vue/compiler-sfc')
const babel = require('@babel/core')
const root = path.join(__dirname, '..')
const cache = new Map()

// Compile only the components under test, not the application bundle.
const loadComponent = relative => {
  const file = path.resolve(root, relative)
  if (cache.has(file)) return cache.get(file)
  const { descriptor } = parse(fs.readFileSync(file, 'utf8'), { filename: file })
  const source = compileScript(descriptor, { id: file, inlineTemplate: true }).content
  const { code } = babel.transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'vue') return vue
    if (name.endsWith('.vue')) return loadComponent(path.resolve(path.dirname(file), name))
    throw new Error(`Unexpected dependency: ${name}`)
  }, module, module.exports)
  cache.set(file, module.exports.default)
  return module.exports.default
}
const AppList = loadComponent('src/components/AppList.vue')
const ListActions = loadComponent('src/components/ListActions.vue')
const descendants = vnode => [vnode, ...(Array.isArray(vnode?.children) ? vnode.children.flatMap(descendants) : [])]

test('common list renders formatted/escaped cells, scoped slots and consistent action buttons', async () => {
  const html = await renderToString(vue.createSSRApp({ render: () => vue.h(AppList, {
    items: [{ id: 1, title: '<unsafe>', price: 12.5 }],
    columns: [{ key: 'title', label: 'Title', sortable: true }, { key: 'price', label: 'Price', format: item => item.price.toFixed(2) }, { key: 'custom', label: 'Custom' }],
    getSortIcon: () => 'arrow_upward', view: true,
  }, { 'cell-custom': ({ item }) => vue.h('span', `Row ${item.id}`) }) }))
  assert.ok(html.includes('&lt;unsafe&gt;'))
  assert.ok(html.includes('12.50'))
  assert.ok(html.includes('Row 1'))
  assert.ok(html.includes('arrow_upward'))
  assert.equal((html.match(/class="btn /g) ?? []).length, 3)
  assert.ok(html.includes('app-list-actions'))
  assert.equal(html.includes('class="table '), false)
})

test('list sorting and action events preserve the field and original row', async () => {
  const item = { id: 7, title: 'Row' }
  const events = []
  let tree
  const CapturedList = { ...AppList, setup(props, context) {
    const render = AppList.setup(props, context)
    return (...args) => { tree = render(...args); return tree }
  } }
  await renderToString(vue.createSSRApp({ render: () => vue.h(CapturedList, {
    items: [item], columns: [{ key: 'title', label: 'Title', sortable: true }], view: true,
    onSort: value => events.push(['sort', value]), onView: value => events.push(['view', value]),
    onEdit: value => events.push(['edit', value]), onDelete: value => events.push(['delete', value]),
  }) }))
  const nodes = descendants(tree)
  nodes.find(node => node.type === 'button').props.onClick()
  const actions = nodes.find(node => node.type === ListActions)
  actions.props.onView()
  actions.props.onEdit()
  actions.props.onDelete()
  assert.deepEqual(events, [['sort', 'title'], ['view', item], ['edit', item], ['delete', item]])
})

test('action controls retain disabled state and do not toggle parent details', async () => {
  const html = await renderToString(vue.createSSRApp({ render: () => vue.h(ListActions, { view: true, editDisabled: true, deleteDisabled: true }) }))
  assert.equal((html.match(/ disabled/g) ?? []).length, 2)
  const events = []
  const render = ListActions.setup({ view: true, edit: true, remove: true, disabled: false }, { emit: (...args) => events.push(args), expose() {} })
  const actions = descendants(render({}, [])).filter(node => node.props?.onClick)
  let stopped = 0
  let prevented = 0
  for (const button of actions) button.props.onClick({ stopPropagation() { stopped++ }, preventDefault() { prevented++ } })
  assert.deepEqual(events, [['view'], ['edit'], ['delete']])
  assert.equal(stopped, 3)
  assert.equal(prevented, 3)
})

test('all business directory lists use AppList, while dashboard stays independent', () => {
  for (const file of ['Individuals', 'LegalEntities', 'Roles', 'Menus', 'PaymentMethods', 'Stores', 'OutlayStatuses', 'OutlayGroupNames', 'Cashes', 'ExpenseGroups']) {
    const source = fs.readFileSync(path.join(root, 'src/views', file + '.vue'), 'utf8')
    assert.ok(source.includes('<AppList'), file)
  }
  for (const file of ['ProductsTabs', 'CategoriesTabs', 'ExpensesTab', 'BorrowingsTab']) {
    assert.ok(fs.readFileSync(path.join(root, 'src/views/components', file + '.vue'), 'utf8').includes('<AppList'), file)
  }
  for (const file of ['Dashboard', 'Outlays']) {
    const source = fs.readFileSync(path.join(root, 'src/views', file + '.vue'), 'utf8')
    assert.equal(source.includes('AppList'), false, file)
    assert.equal(source.includes('ListActions'), false, file)
  }
})
