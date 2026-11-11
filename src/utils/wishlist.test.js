import { strict as assert } from 'node:assert'
import { test } from 'node:test'

function toggleItem(list, product) {
  const identifier = product.slug || product.id
  const exists = list.some((item) => item.id === product.id || item.slug === identifier)
  if (exists) {
    return list.filter((item) => item.id !== product.id && item.slug !== identifier)
  }
  return [product, ...list]
}

test('toggleItem adds new item to wishlist', () => {
  const p1 = { id: 1, slug: 'nike-air', name: 'Nike Air' }
  const result = toggleItem([], p1)
  assert.equal(result.length, 1)
  assert.equal(result[0].slug, 'nike-air')
})

test('toggleItem removes existing item from wishlist', () => {
  const p1 = { id: 1, slug: 'nike-air', name: 'Nike Air' }
  const p2 = { id: 2, slug: 'jordan-1', name: 'Jordan 1' }
  const initial = [p1, p2]
  const result = toggleItem(initial, p1)
  assert.equal(result.length, 1)
  assert.equal(result[0].slug, 'jordan-1')
})

test('toggleItem does not duplicate items', () => {
  const p1 = { id: 1, slug: 'nike-air', name: 'Nike Air' }
  const step1 = toggleItem([], p1)
  const step2 = toggleItem(step1, p1)
  assert.equal(step2.length, 0)
})
