import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  toEnglishDigits,
  jalaliToGregorian,
  validateJalaliDate,
  parseJalaliDateToISO,
  formatJalaliDate,
} from './jalali.js'

test('toEnglishDigits converts Persian digits to English', () => {
  assert.equal(toEnglishDigits('۱۴۰۵/۱۰/۱۵'), '1405/10/15')
  assert.equal(toEnglishDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789')
})

test('jalaliToGregorian converts 1403/1/1 to 2024/3/20', () => {
  const [gy, gm, gd] = jalaliToGregorian(1403, 1, 1)
  assert.equal(gy, 2024)
  assert.equal(gm, 3)
  assert.equal(gd, 20)
})

test('validateJalaliDate correctly validates dates', () => {
  assert.equal(validateJalaliDate('۱۴۰۵/۱۰/۱۵'), true)
  assert.equal(validateJalaliDate('1405/10/15'), true)
  assert.equal(validateJalaliDate('1405/13/15'), false)
  assert.equal(validateJalaliDate('1405/01/32'), false)
  assert.equal(validateJalaliDate('1405/07/31'), false)
  assert.equal(validateJalaliDate('invalid'), false)
})

test('parseJalaliDateToISO produces end-of-day ISO string in Asia/Tehran', () => {
  const iso = parseJalaliDateToISO('1405/10/10')
  assert.ok(iso)
  assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
})

test('formatJalaliDate formats an ISO date string to Jalali', () => {
  const formatted = formatJalaliDate('2026-12-31T20:29:59.000Z')
  assert.ok(formatted.includes('۱۴۰۵') || formatted.includes('1405'))
})
