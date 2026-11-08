// Mock orders data – follows the same conventions as src/data/products.js
// Fields: id, orderNumber, customer, items, total, paymentStatus, status, createdAt

export const ORDERS = [
  {
    id: 1,
    orderNumber: '#۱۰۴۱',
    customer: { name: 'علی محمدی', city: 'تهران', phone: '0912***4521' },
    items: [
      {
        productId: 'reebok-dmx-1200-grey-blue',
        name: 'Reebok DMX 1200 Grey Blue',
        size: 'US 10',
        qty: 1,
        price: 11000000,
      },
    ],
    total: 11000000,
    paymentStatus: 'paid',
    status: 'delivered',
    createdAt: '2026-10-28T10:15:00+03:30',
  },
  {
    id: 2,
    orderNumber: '#۱۰۴۲',
    customer: { name: 'سارا رضایی', city: 'اصفهان', phone: '0912***7832' },
    items: [
      {
        productId: 'jordan-4-retro-oxidized-green',
        name: 'Jordan 4 Retro Oxidized Green',
        size: 'US 9',
        qty: 1,
        price: 21000000,
      },
    ],
    total: 21000000,
    paymentStatus: 'paid',
    status: 'shipped',
    createdAt: '2026-11-01T14:22:00+03:30',
  },
  {
    id: 3,
    orderNumber: '#۱۰۴۳',
    customer: { name: 'رضا کریمی', city: 'شیراز', phone: '0935***1104' },
    items: [
      {
        productId: 'air-jordan-1-mid-linen',
        name: 'Air Jordan 1 Mid Linen',
        size: 'US 11',
        qty: 1,
        price: 12500000,
      },
      {
        productId: 'nike-air-force-1-lv8',
        name: 'Nike Sportswear Older Kids Air Force 1 LV8',
        size: 'US 9.5',
        qty: 1,
        price: 9500000,
      },
    ],
    total: 22000000,
    paymentStatus: 'pending',
    status: 'new',
    createdAt: '2026-11-06T09:05:00+03:30',
  },
  {
    id: 4,
    orderNumber: '#۱۰۴۴',
    customer: { name: 'مریم حسینی', city: 'مشهد', phone: '0916***9900' },
    items: [
      {
        productId: 'nike-air-force-1-lv8',
        name: 'Nike Sportswear Older Kids Air Force 1 LV8',
        size: 'US 8',
        qty: 2,
        price: 9500000,
      },
    ],
    total: 19000000,
    paymentStatus: 'paid',
    status: 'processing',
    createdAt: '2026-11-05T16:40:00+03:30',
  },
  {
    id: 5,
    orderNumber: '#۱۰۴۵',
    customer: { name: 'امیر نجفی', city: 'تبریز', phone: '0914***3367' },
    items: [
      {
        productId: 'jordan-4-retro-oxidized-green',
        name: 'Jordan 4 Retro Oxidized Green',
        size: 'US 10.5',
        qty: 1,
        price: 21000000,
      },
    ],
    total: 21000000,
    paymentStatus: 'refunded',
    status: 'cancelled',
    createdAt: '2026-10-30T11:00:00+03:30',
  },
  {
    id: 6,
    orderNumber: '#۱۰۴۶',
    customer: { name: 'نگار صادقی', city: 'کرج', phone: '0911***5588' },
    items: [
      {
        productId: 'reebok-dmx-1200-grey-blue',
        name: 'Reebok DMX 1200 Grey Blue',
        size: 'US 7.5',
        qty: 1,
        price: 11000000,
      },
    ],
    total: 11000000,
    paymentStatus: 'paid',
    status: 'new',
    createdAt: '2026-11-07T07:30:00+03:30',
  },
  {
    id: 7,
    orderNumber: '#۱۰۴۷',
    customer: { name: 'حسین ملایی', city: 'قم', phone: '0912***2278' },
    items: [
      {
        productId: 'air-jordan-1-mid-linen',
        name: 'Air Jordan 1 Mid Linen',
        size: 'US 8.5',
        qty: 1,
        price: 12500000,
      },
    ],
    total: 12500000,
    paymentStatus: 'paid',
    status: 'processing',
    createdAt: '2026-11-04T13:10:00+03:30',
  },
  {
    id: 8,
    orderNumber: '#۱۰۴۸',
    customer: { name: 'زهرا عباسی', city: 'رشت', phone: '0913***8812' },
    items: [
      {
        productId: 'reebok-dmx-1200-grey-blue',
        name: 'Reebok DMX 1200 Grey Blue',
        size: 'US 9',
        qty: 1,
        price: 11000000,
      },
      {
        productId: 'jordan-4-retro-oxidized-green',
        name: 'Jordan 4 Retro Oxidized Green',
        size: 'US 8.5',
        qty: 1,
        price: 21000000,
      },
    ],
    total: 32000000,
    paymentStatus: 'paid',
    status: 'new',
    createdAt: '2026-11-07T02:45:00+03:30',
  },
  {
    id: 9,
    orderNumber: '#۱۰۴۹',
    customer: { name: 'داریوش کمالی', city: 'اهواز', phone: '0917***4451' },
    items: [
      {
        productId: 'nike-air-force-1-lv8',
        name: 'Nike Sportswear Older Kids Air Force 1 LV8',
        size: 'US 11',
        qty: 1,
        price: 9500000,
      },
    ],
    total: 9500000,
    paymentStatus: 'paid',
    status: 'shipped',
    createdAt: '2026-11-02T18:20:00+03:30',
  },
  {
    id: 10,
    orderNumber: '#۱۰۵۰',
    customer: { name: 'فاطمه مرادی', city: 'ارومیه', phone: '0914***7723' },
    items: [
      {
        productId: 'air-jordan-1-mid-linen',
        name: 'Air Jordan 1 Mid Linen',
        size: 'US 7',
        qty: 1,
        price: 12500000,
      },
    ],
    total: 12500000,
    paymentStatus: 'pending',
    status: 'new',
    createdAt: '2026-11-07T01:10:00+03:30',
  },
  {
    id: 11,
    orderNumber: '#۱۰۵۱',
    customer: { name: 'محمد تقوی', city: 'کرمانشاه', phone: '0918***6690' },
    items: [
      {
        productId: 'reebok-dmx-1200-grey-blue',
        name: 'Reebok DMX 1200 Grey Blue',
        size: 'US 12',
        qty: 1,
        price: 11000000,
      },
    ],
    total: 11000000,
    paymentStatus: 'paid',
    status: 'delivered',
    createdAt: '2026-10-25T09:00:00+03:30',
  },
  {
    id: 12,
    orderNumber: '#۱۰۵۲',
    customer: { name: 'الهه قاسمی', city: 'سمنان', phone: '0912***1133' },
    items: [
      {
        productId: 'jordan-4-retro-oxidized-green',
        name: 'Jordan 4 Retro Oxidized Green',
        size: 'US 9.5',
        qty: 1,
        price: 21000000,
      },
    ],
    total: 21000000,
    paymentStatus: 'paid',
    status: 'processing',
    createdAt: '2026-11-03T12:45:00+03:30',
  },
  {
    id: 13,
    orderNumber: '#۱۰۵۳',
    customer: { name: 'بهنام صالحی', city: 'بابل', phone: '0911***9944' },
    items: [
      {
        productId: 'nike-air-force-1-lv8',
        name: 'Nike Sportswear Older Kids Air Force 1 LV8',
        size: 'US 10',
        qty: 1,
        price: 9500000,
      },
    ],
    total: 9500000,
    paymentStatus: 'pending',
    status: 'new',
    createdAt: '2026-11-07T00:05:00+03:30',
  },
  {
    id: 14,
    orderNumber: '#۱۰۵۴',
    customer: { name: 'شیوا احمدی', city: 'زاهدان', phone: '0912***7756' },
    items: [
      {
        productId: 'air-jordan-1-mid-linen',
        name: 'Air Jordan 1 Mid Linen',
        size: 'US 9',
        qty: 1,
        price: 12500000,
      },
    ],
    total: 12500000,
    paymentStatus: 'refunded',
    status: 'cancelled',
    createdAt: '2026-10-20T15:30:00+03:30',
  },
  {
    id: 15,
    orderNumber: '#۱۰۵۵',
    customer: { name: 'کامران ولی‌پور', city: 'بوشهر', phone: '0917***0022' },
    items: [
      {
        productId: 'reebok-dmx-1200-grey-blue',
        name: 'Reebok DMX 1200 Grey Blue',
        size: 'US 10.5',
        qty: 1,
        price: 11000000,
      },
    ],
    total: 11000000,
    paymentStatus: 'paid',
    status: 'shipped',
    createdAt: '2026-11-01T08:00:00+03:30',
  },
  {
    id: 16,
    orderNumber: '#۱۰۵۶',
    customer: { name: 'آناهیتا پور', city: 'خرم‌آباد', phone: '0916***4411' },
    items: [
      {
        productId: 'jordan-4-retro-oxidized-green',
        name: 'Jordan 4 Retro Oxidized Green',
        size: 'US 8',
        qty: 1,
        price: 21000000,
      },
    ],
    total: 21000000,
    paymentStatus: 'paid',
    status: 'delivered',
    createdAt: '2026-10-22T14:20:00+03:30',
  },
  {
    id: 17,
    orderNumber: '#۱۰۵۷',
    customer: { name: 'سیامک بهرامی', city: 'گرگان', phone: '0917***3399' },
    items: [
      {
        productId: 'nike-air-force-1-lv8',
        name: 'Nike Sportswear Older Kids Air Force 1 LV8',
        size: 'US 9',
        qty: 1,
        price: 9500000,
      },
    ],
    total: 9500000,
    paymentStatus: 'paid',
    status: 'processing',
    createdAt: '2026-11-06T17:00:00+03:30',
  },
  {
    id: 18,
    orderNumber: '#۱۰۵۸',
    customer: { name: 'مهسا توکلی', city: 'بندرعباس', phone: '0919***5570' },
    items: [
      {
        productId: 'air-jordan-1-mid-linen',
        name: 'Air Jordan 1 Mid Linen',
        size: 'US 8',
        qty: 1,
        price: 12500000,
      },
      {
        productId: 'reebok-dmx-1200-grey-blue',
        name: 'Reebok DMX 1200 Grey Blue',
        size: 'US 7.5',
        qty: 1,
        price: 11000000,
      },
    ],
    total: 23500000,
    paymentStatus: 'paid',
    status: 'new',
    createdAt: '2026-11-07T03:00:00+03:30',
  },
]

// Status transition map: each status → next status when "شروع آمادهسازی" is pressed
export const NEXT_STATUS = {
  new: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
  delivered: null,
  cancelled: null,
}

export const STATUS_LABELS = {
  new: 'جدید',
  processing: 'در حال پردازش',
  shipped: 'ارسال شده',
  delivered: 'تحویل شده',
  cancelled: 'لغو شده',
}

export const PAYMENT_STATUS_LABELS = {
  paid: 'پرداخت‌شده',
  pending: 'در انتظار پرداخت',
  refunded: 'برگشت‌خورده',
}

/** Convert ISO date string to Jalali date label (pure arithmetic, no external lib) */
export function toJalali(isoDate) {
  // We use Intl.DateTimeFormat with the Persian calendar
  try {
    const d = new Date(isoDate)
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: 'persian',
    }).format(d)
  } catch {
    return isoDate
  }
}

/** Generate next order number in Persian (e.g., #۱۰۵۹) */
export function generateNextOrderNumber() {
  const maxId = Math.max(...ORDERS.map((o) => o.id), 0)
  const nextId = maxId + 1
  // Convert to Persian digits: 1059 -> ۱۰۵۹
  const persianDigits = String(nextId).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])
  return `#${persianDigits}`
}

/** Add a new order to the ORDERS array (in-memory for mock) */
export function addOrder(orderData) {
  const newOrder = {
    id: Math.max(...ORDERS.map((o) => o.id), 0) + 1,
    orderNumber: generateNextOrderNumber(),
    customer: orderData.customer,
    items: orderData.items,
    total: orderData.total,
    paymentStatus: orderData.paymentStatus || 'pending',
    status: orderData.status || 'new',
    createdAt: new Date().toISOString(),
  }
  ORDERS.push(newOrder)
  return newOrder
}
