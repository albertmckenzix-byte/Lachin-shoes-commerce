import { strict as assert } from 'node:assert'
import { cmToSize, SIZE_FOOT_LENGTH_PADDING_CM } from './cmToSize.js'

function runTests() {
  let passed = 0
  let failed = 0

  function test(name, fn) {
    try {
      fn()
      console.log(`✓ ${name}`)
      passed++
    } catch (e) {
      console.log(`✗ ${name}: ${e.message}`)
      failed++
    }
  }

  function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message} Expected ${expected}, got ${actual}`)
    }
  }

  // min test
  test('min: returns smallest size (EU 35.5) for foot lengths below the range', () => {
    const result = cmToSize(15)
    assertEqual(result.eu, 35.5, 'eu: ')
    assertEqual(result.us, 3.5, 'us: ')
    assertEqual(result.cm, 22, 'cm: ')
    assertEqual(result.isBetweenSizes, false, 'isBetweenSizes: ')
  })

  // max test
  test('max: returns largest size (EU 48.5) for foot lengths above the range', () => {
    const result = cmToSize(35)
    assertEqual(result.eu, 48.5, 'eu: ')
    assertEqual(result.us, 14, 'us: ')
    assertEqual(result.cm, 32, 'cm: ')
    assertEqual(result.isBetweenSizes, false, 'isBetweenSizes: ')
  })

  // exact match 1
  test('exact match: returns size when padded foot length lands exactly on a boundary', () => {
    const result = cmToSize(21.5)
    assertEqual(result.eu, 35.5, 'eu: ')
    assertEqual(result.isBetweenSizes, false, 'isBetweenSizes: ')
  })

  // exact match 2
  test('exact match: foot length equals size boundary', () => {
    const result = cmToSize(22)
    assertEqual(result.eu, 36, 'eu: ')
    assertEqual(result.isBetweenSizes, false, 'isBetweenSizes: ')
  })

  // between sizes
  test('between sizes: returns larger size with isBetweenSizes true for a midpoint foot length', () => {
    const result = cmToSize(23.25)
    assertEqual(result.eu, 38, 'eu: ')
    assertEqual(result.us, 5.5, 'us: ')
    assertEqual(result.cm, 24, 'cm: ')
    assertEqual(result.isBetweenSizes, true, 'isBetweenSizes: ')
  })

  // below min
  test('below min: returns smallest size', () => {
    const result = cmToSize(10)
    assertEqual(result.eu, 35.5, 'eu: ')
    assertEqual(result.isBetweenSizes, false, 'isBetweenSizes: ')
  })

  // above max
  test('above max: returns largest size', () => {
    const result = cmToSize(50)
    assertEqual(result.eu, 48.5, 'eu: ')
    assertEqual(result.isBetweenSizes, false, 'isBetweenSizes: ')
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

runTests()