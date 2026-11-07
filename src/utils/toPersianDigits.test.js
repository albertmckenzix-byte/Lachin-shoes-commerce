import { strict as assert } from 'node:assert'
import { toPersianDigits } from './toPersianDigits.js'

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

  // integer test
  test('converts integer to Persian digits', () => {
    const result = toPersianDigits(1234)
    assertEqual(result, '۱۲۳۴', 'convert: ')
  })

  // decimal test
  test('converts decimal to Persian digits with Persian decimal separator', () => {
    const result = toPersianDigits(26.5)
    assertEqual(result, '۲۶٫۵', 'convert: ')
  })

  // half-decimal
  test('converts half-decimal correctly', () => {
    const result = toPersianDigits(23.5)
    assertEqual(result, '۲۳٫۵', 'convert: ')
  })

  // float with multiple decimals
  test('converts float with multiple decimals', () => {
    const result = toPersianDigits(26.75)
    assertEqual(result, '۲۶٫۷۵', 'convert: ')
  })

  // size values
  test('converts integer size values (EU/US/cm)', () => {
    const result = toPersianDigits(37.5)
    assertEqual(result, '۳۷٫۵', 'convert: ')
  })

  // size cm
  test('converts size cm values (e.g. 32)', () => {
    const result = toPersianDigits(32)
    assertEqual(result, '۳۲', 'convert: ')
  })

  // null/undefined/NaN
  test('returns null/undefined/NaN strings unchanged', () => {
    assertEqual(toPersianDigits(null), 'null', 'null: ')
    assertEqual(toPersianDigits(undefined), 'undefined', 'undefined: ')
    assertEqual(toPersianDigits(NaN), 'NaN', 'NaN: ')
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

runTests()