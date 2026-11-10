import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  formatOrderDateTime,
  normalizeOrderForExport,
  generateOrdersCsv,
  generateOrdersExcelHtml,
  EXPORT_COLUMNS,
} from './exportOrders.js'

const MOCK_ORDER = {
  id: 1,
  number: 1041,
  orderNumber: '#۱۰۴۱',
  customer: {
    name: 'علی محمدی',
    phone: '09121234567',
    province: 'تهران',
    city: 'تهران',
    postal_code: '0123456789',
    address: 'خیابان ولیعصر، بالاتر از میدان ونک، پلاک ۲۴',
  },
  items: [
    {
      name: 'Reebok DMX 1200',
      size: 'US 10',
      qty: 2,
      price: 11000000,
    },
    {
      name: 'Air Jordan 1',
      size_us: '9.5',
      quantity: 1,
      price: 15000000,
    },
  ],
  deliveryMethod: 'express',
  subtotal: 37000000,
  shippingFee: 500000,
  discountTotal: 2000000,
  total: 35500000,
  paymentStatus: 'paid',
  status: 'processing',
  note: 'لطفاً زنگ درب دوم فشرده شود',
  createdAt: '2026-10-28T10:15:00Z',
}

test('formatOrderDateTime formats ISO date to Jalali date and time', () => {
  const result = formatOrderDateTime('2026-10-28T10:15:00Z')
  assert.ok(typeof result === 'string')
  assert.ok(result.includes('۱۴۰۵'))
  assert.equal(formatOrderDateTime(null), '-')
})

test('normalizeOrderForExport handles full order cleanly', () => {
  const row = normalizeOrderForExport(MOCK_ORDER, 0)
  assert.equal(row.index, 1)
  assert.equal(row.orderNumber, '#۱۰۴۱')
  assert.equal(row.customerName, 'علی محمدی')
  assert.equal(row.phone, '09121234567')
  assert.equal(row.province, 'تهران')
  assert.equal(row.city, 'تهران')
  assert.equal(row.postalCode, '0123456789')
  assert.equal(row.address, 'خیابان ولیعصر، بالاتر از میدان ونک، پلاک ۲۴')
  assert.ok(row.items.includes('Reebok DMX 1200 (سایز: US 10) × 2'))
  assert.ok(row.items.includes('Air Jordan 1 (سایز: US 9.5) × 1'))
  assert.equal(row.totalQty, 3)
  assert.equal(row.deliveryMethod, 'ارسال اکسپرس')
  assert.equal(row.total, 35500000)
  assert.equal(row.paymentStatus, 'پرداخت شده')
  assert.equal(row.orderStatus, 'در حال آماده‌سازی')
  assert.equal(row.note, 'لطفاً زنگ درب دوم فشرده شود')
})

test('normalizeOrderForExport handles empty or missing customer/items without crashing', () => {
  const emptyOrder = {
    id: 99,
    total: 0,
    createdAt: null,
  }
  const row = normalizeOrderForExport(emptyOrder, 5)
  assert.equal(row.index, 6)
  assert.equal(row.orderNumber, '#99')
  assert.equal(row.customerName, 'مشتری بدون نام')
  assert.equal(row.phone, '')
  assert.equal(row.items, '-')
  assert.equal(row.totalQty, 0)
  assert.equal(row.deliveryMethod, 'ارسال عادی')
})

test('generateOrdersCsv produces valid UTF-8 BOM CSV with RFC 4180 escaping', () => {
  const csv = generateOrdersCsv([MOCK_ORDER])
  assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM')

  // Headers check
  const headerLine = csv.split('\r\n')[0]
  assert.ok(headerLine.includes('"شماره سفارش"'))
  assert.ok(headerLine.includes('"نام گیرنده"'))
  assert.ok(headerLine.includes('"آدرس کامل پستی"'))

  // Data check
  const dataLine = csv.split('\r\n')[1]
  assert.ok(dataLine.includes('"#۱۰۴۱"'))
  assert.ok(dataLine.includes('"علی محمدی"'))
  // Leading zero check
  assert.ok(dataLine.includes('"\t09121234567"'))
  assert.ok(dataLine.includes('"\t0123456789"'))
})

test('generateOrdersExcelHtml produces valid spreadsheet HTML with RTL', () => {
  const html = generateOrdersExcelHtml([MOCK_ORDER])
  assert.ok(html.includes('<x:DisplayRightToLeft/>'), 'Must contain DisplayRightToLeft')
  assert.ok(html.includes('علی محمدی'))
  assert.ok(html.includes('09121234567'))
  assert.ok(html.includes('mso-number-format'))
})
