import { ORDERS, toJalali } from './orders'

// Derive customers from orders, then add mock customers to reach 14 total
const CITIES = [
  'تهران', 'شیراز', 'اصفهان', 'مشهد', 'تبریز', 'کرج', 'قم', 'رشت',
  'اهواز', 'ارومیه', 'کرمانشاه', 'سمنان', 'بابل', 'زاهدان', 'بوشهر',
  'خرم‌آباد', 'گرگان', 'بندرعباس',
]

// Map customer name to phone for consistent identity
const CUSTOMER_PHONES = {
  'سارا احمدی': '09123456789',
  'محمد رضایی': '09351234567',
  'نگین کریمی': '09167890123',
  'علی حسینی': '09123457890',
  'مریم صادقی': '09134567890',
  'رضا نوری': '09115678901',
  'زهرا عباسی': '09137890123',
  'علی محمدی': '09129012345',
  'سارا رضایی': '09129123456',
  'رضا کریمی': '09358901234',
  'مریم حسینی': '09167891234',
  'امیر نجفی': '09145678901',
  'نگار صادقی': '09117890567',
}

// Customers derived from orders
const orderCustomers = ORDERS.map((order) => ({
  id: order.id * 1000,
  name: order.customer.name,
  phone: CUSTOMER_PHONES[order.customer.name] || order.customer.phone.replace(/\*/g, '0'),
  city: order.customer.city,
  address: `${order.customer.city}، خیابان اصلی، پلاک ${order.id}`,
  note: '',
  createdAt: order.createdAt,
}))

// Additional mock customers to reach 14 total
const mockCustomers = [
  {
    id: 1001,
    name: 'سارا احمدی',
    phone: '09123456789',
    city: 'تهران',
    address: 'تهران، خیابان ولیعصر، کوچه گل، پلاک ۱۲',
    note: 'مشتری وفادار، کیفیت را بالاتر از قیمت می‌پسندد.',
    createdAt: '2026-10-01T10:00:00+03:30',
  },
  {
    id: 1002,
    name: 'محمد رضایی',
    phone: '09351234567',
    city: 'شیراز',
    address: 'شیراز، خیابان حافظ، نبش خیابان سعدی، پلاک ۴۵',
    note: '',
    createdAt: '2026-10-05T14:30:00+03:30',
  },
  {
    id: 1003,
    name: 'نگین کریمی',
    phone: '09167890123',
    city: 'اصفهان',
    address: 'اصفهان، خیابان چهارباغ، پلاک ۱۲۲',
    note: 'ترجیح می‌دهد کالا در شب ارسال شود.',
    createdAt: '2026-10-10T09:15:00+03:30',
  },
  {
    id: 1004,
    name: 'علی حسینی',
    phone: '09123457890',
    city: 'مشهد',
    address: 'مشهد، بلوار وکیل‌آباد، خیابان رضا، پلاک ۸۸',
    note: '',
    createdAt: '2026-10-15T16:45:00+03:30',
  },
  {
    id: 1005,
    name: 'مریم صادقی',
    phone: '09134567890',
    city: 'تبریز',
    address: 'تبریز، خیابان استاد شهریار، کوچه گلستان، پلاک ۲۳',
    note: 'مشتری تکراری، کیفیت را بالا می‌داند.',
    createdAt: '2026-10-20T11:20:00+03:30',
  },
  {
    id: 1006,
    name: 'رضا نوری',
    phone: '09115678901',
    city: 'کرج',
    address: 'کرج، میدان نبوت، خیابان پیروزی، پلاک ۱۲۵',
    note: '',
    createdAt: '2026-10-25T13:00:00+03:30',
  },
]

// Merge and deduplicate by name
const allCustomers = [...mockCustomers]
const existingNames = new Set(mockCustomers.map((c) => c.name))

for (const oc of orderCustomers) {
  if (!existingNames.has(oc.name)) {
    allCustomers.push(oc)
    existingNames.add(oc.name)
  }
}

// Ensure exactly 14 customers
export const CUSTOMERS = allCustomers.slice(0, 14)

// Order type badges - reuse from orders.js
export const ORDER_STATUS_LABELS = {
  new: 'جدید',
  processing: 'در حال پردازش',
  shipped: 'ارسال شده',
  delivered: 'تحویل شده',
  cancelled: 'لغو شده',
}

export const ORDER_STATUS_STYLES = {
  new: 'bg-[#111] text-white',
  processing: 'bg-[#fcc934] text-[#2b2100]',
  shipped: 'bg-[#e2ecfb] text-[#1d4a99]',
  delivered: 'bg-[#e3f3e6] text-[#1f6b34]',
  cancelled: 'bg-[#fde7e5] text-[#a52a22]',
}

export const CUSTOMER_TYPE_STYLES = {
  new: 'bg-[#e2ecfb] text-[#1d4a99]',
  returning: 'bg-[#e3f3e6] text-[#1f6b35]',
}

export const CUSTOMER_TYPE_LABELS = {
  new: 'جدید',
  returning: 'تکراری',
}

export function toJalaliShort(isoDate) {
  try {
    const d = new Date(isoDate)
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'persian',
    }).format(d)
  } catch {
    return isoDate
  }
}

/** Mask phone number like ۰۹۱۲ ••• ••۶۷ */
export function maskPhone(phone) {
  if (!phone || phone.length < 11) return phone
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 11) return phone
  const prefix = digits.slice(0, 4)
  const suffix = digits.slice(-2)
  return `${prefix} ••• ••${suffix}`
}

/** Get orders for a customer by name */
export function getCustomerOrders(customerName) {
  return ORDERS.filter((o) => o.customer.name === customerName)
}

/** Get customer stats from orders */
export function getCustomerStats(customerName) {
  const orders = getCustomerOrders(customerName)
  const orderCount = orders.length
  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0)
  const lastOrder = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
  return {
    orderCount,
    totalSpent,
    lastOrderDate: lastOrder ? lastOrder.createdAt : null,
    lastOrderNumber: lastOrder ? lastOrder.orderNumber : null,
  }
}
