const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('login displays server messages and validation errors without object coercion', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/utils/authError.js'), 'utf8')
  const { authErrorMessage } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  assert.equal(authErrorMessage({ message: 'Invalid credentials' }), 'Invalid credentials')
  assert.equal(authErrorMessage({ status: false, errors: { login: ['Unknown login'], password: ['Invalid password'] } }), 'Unknown login\nInvalid password')
  assert.equal(authErrorMessage({ error: 'Access denied' }), 'Access denied')
  assert.equal(authErrorMessage({ errors: ['Duplicate', 'Duplicate'] }), 'Duplicate')
  assert.ok(authErrorMessage(null).includes('Не удалось войти'))
})
