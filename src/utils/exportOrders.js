/**
 * Order export utilities for Lachin Admin.
 * Supports exporting filtered orders to Excel (.xls) and CSV (.csv),
 * specifically formatted for postal services and warehouse fulfillment.
 */

const ORDER_STATUS_LABELS = {
  new: 'ثبت جدید',
  processing: 'در حال آماده‌سازی',
  shipped: 'ارسال شده',
  delivered: 'تحویل داده شده',
  cancelled: 'لغو شده',
}

const PAYMENT_STATUS_LABELS = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت شده',
  refunded: 'مرجوع شده',
}

/**
 * Formats ISO date to Shamsi (Jalali) date and time.
 * e.g. "۱۴۰۵/۰۸/۲۰ - ۱۸:۳۰"
 */
export function formatOrderDateTime(isoDate) {
  if (!isoDate) return '-'
  try {
    const d = new Date(isoDate)
    const dateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const timeFormatter = new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return `${dateFormatter.format(d)} - ${timeFormatter.format(d)}`
  } catch {
    return String(isoDate)
  }
}

/**
 * Normalizes customer details from both API orders and mock orders.
 */
function extractCustomer(order) {
  const cust = order.customer || {}
  const name =
    cust.name ||
    [cust.first_name, cust.last_name].filter(Boolean).join(' ') ||
    [order.first_name, order.last_name].filter(Boolean).join(' ') ||
    'مشتری بدون نام'

  const phone = cust.phone || order.phone || ''
  const province = cust.province || order.province || 'ایران'
  const city = cust.city || order.city || '-'
  const postalCode = cust.postal_code || cust.zipCode || order.postal_code || ''
  const address = cust.address || order.address || city

  return { name, phone, province, city, postalCode, address }
}

/**
 * Formats order items into a single human-readable string suitable for packing slips.
 * e.g. "Air Jordan 1 Mid Linen (سایز: US 8.5) × ۱ | Nike Air Force 1 × ۲"
 */
function extractItemsSummary(order) {
  const items = Array.isArray(order.items) ? order.items : []
  if (items.length === 0) return '-'

  return items
    .map((item) => {
      const name = item.name || item.product_name || 'کفش'
      const size =
        item.size ||
        (item.size_eu ? `EU ${item.size_eu}` : '') ||
        (item.size_us ? `US ${item.size_us}` : '')
      const qty = Number(item.qty || item.quantity || 1)
      const sizePart = size ? ` (سایز: ${size})` : ''
      return `${name}${sizePart} × ${qty}`
    })
    .join(' | ')
}

/**
 * Calculates total item count across all line items.
 */
function extractTotalQuantity(order) {
  const items = Array.isArray(order.items) ? order.items : []
  return items.reduce((sum, item) => sum + Number(item.qty || item.quantity || 1), 0)
}

/**
 * Table column definitions for warehouse / post export.
 */
export const EXPORT_COLUMNS = [
  { key: 'index', label: 'ردیف' },
  { key: 'orderNumber', label: 'شماره سفارش' },
  { key: 'date', label: 'تاریخ و ساعت ثبت' },
  { key: 'customerName', label: 'نام گیرنده' },
  { key: 'phone', label: 'شماره تماس' },
  { key: 'province', label: 'استان' },
  { key: 'city', label: 'شهر' },
  { key: 'postalCode', label: 'کد پستی' },
  { key: 'address', label: 'آدرس کامل پستی' },
  { key: 'items', label: 'اقلام سفارش (نام، سایز، تعداد)' },
  { key: 'totalQty', label: 'تعداد کل کالاها' },
  { key: 'deliveryMethod', label: 'روش ارسال' },
  { key: 'subtotal', label: 'مبلغ اقلام (تومان)' },
  { key: 'shippingFee', label: 'هزینه ارسال (تومان)' },
  { key: 'discount', label: 'مبلغ تخفیف (تومان)' },
  { key: 'total', label: 'مبلغ کل سفارش (تومان)' },
  { key: 'paymentStatus', label: 'وضعیت پرداخت' },
  { key: 'orderStatus', label: 'وضعیت سفارش' },
  { key: 'trackingCode', label: 'کد رهگیری / مرسوله' },
  { key: 'note', label: 'یادداشت مشتری' },
]

/**
 * Normalizes an order into a clean row object.
 */
export function normalizeOrderForExport(order, index = 0) {
  const customer = extractCustomer(order)
  const itemsSummary = extractItemsSummary(order)
  const totalQty = extractTotalQuantity(order)

  const orderNum =
    order.orderNumber ||
    (order.number != null ? `#${order.number}` : `#${order.id || index + 1}`)

  const deliveryMethod =
    order.deliveryMethod === 'express' || order.delivery_method === 'express'
      ? 'ارسال اکسپرس'
      : 'ارسال عادی'

  const subtotal = order.subtotal ?? (order.total ?? 0)
  const shippingFee = order.shippingFee ?? (order.shipping_fee ?? 0)
  const discount = order.discountTotal ?? (order.discount_total ?? 0)
  const total = order.total ?? subtotal + shippingFee - discount

  const paymentStatus =
    PAYMENT_STATUS_LABELS[order.paymentStatus || order.payment_status] ||
    order.paymentStatus ||
    order.payment_status ||
    '-'

  const orderStatus =
    ORDER_STATUS_LABELS[order.status] || order.status || '-'

  const trackingCode =
    order.shipping_tracking_code ||
    order.shippingTrackingCode ||
    order.transactionId ||
    order.transaction_id ||
    '-'

  return {
    index: index + 1,
    orderNumber: orderNum,
    date: formatOrderDateTime(order.createdAt),
    customerName: customer.name,
    phone: customer.phone,
    province: customer.province,
    city: customer.city,
    postalCode: customer.postalCode,
    address: customer.address,
    items: itemsSummary,
    totalQty,
    deliveryMethod,
    subtotal,
    shippingFee,
    discount,
    total,
    paymentStatus,
    orderStatus,
    trackingCode,
    note: order.note || '-',
  }
}

/**
 * Generates an RFC 4180 compliant CSV string with UTF-8 BOM.
 */
export function generateOrdersCsv(orders) {
  const headers = EXPORT_COLUMNS.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',')

  const rows = orders.map((order, idx) => {
    const row = normalizeOrderForExport(order, idx)
    return EXPORT_COLUMNS.map((col) => {
      let val = row[col.key]
      if (val === null || val === undefined) val = ''

      // For phone and postalCode in CSV, prefix with \t so Excel preserves leading zeros
      if ((col.key === 'phone' || col.key === 'postalCode') && String(val).startsWith('0')) {
        return `"\t${String(val).replace(/"/g, '""')}"`
      }

      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  })

  // Prepend UTF-8 BOM (\uFEFF) for native Excel compatibility in Windows/macOS
  return '\uFEFF' + [headers, ...rows].join('\r\n')
}

/**
 * Generates an Excel-compatible HTML Spreadsheet (.xls) with full RTL styling,
 * dark headers, borders, and preserved text formats for phone and postal codes.
 */
export function generateOrdersExcelHtml(orders) {
  const rows = orders.map((order, idx) => normalizeOrderForExport(order, idx))

  const theadHtml = EXPORT_COLUMNS.map(
    (col) => `<th style="background-color: #111111; color: #ffffff; padding: 10px; font-weight: bold; border: 1px solid #333333; text-align: center;">${col.label}</th>`
  ).join('')

  const tbodyHtml = rows
    .map((row, idx) => {
      const bgColor = idx % 2 === 0 ? '#ffffff' : '#fcfcfc'
      const cells = EXPORT_COLUMNS.map((col) => {
        const val = row[col.key] ?? ''

        // Numbers formatted with thousand separators
        if (['subtotal', 'shippingFee', 'discount', 'total'].includes(col.key)) {
          return `<td style="border: 1px solid #e0e0e0; padding: 8px; text-align: left; mso-number-format: '#,##0';">${Number(val) || 0}</td>`
        }

        // Text cells where leading zeros must be preserved
        if (['phone', 'postalCode', 'orderNumber'].includes(col.key)) {
          return `<td style="border: 1px solid #e0e0e0; padding: 8px; text-align: center; mso-number-format: '\\@';">${val}</td>`
        }

        if (col.key === 'index' || col.key === 'totalQty' || col.key === 'date') {
          return `<td style="border: 1px solid #e0e0e0; padding: 8px; text-align: center;">${val}</td>`
        }

        return `<td style="border: 1px solid #e0e0e0; padding: 8px; text-align: right;">${val}</td>`
      }).join('')

      return `<tr style="background-color: ${bgColor};">${cells}</tr>`
    })
    .join('')

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>سفارشات لاچین</x:Name>
              <x:WorksheetOptions>
                <x:DisplayRightToLeft/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Tahoma, 'B Nazanin', Arial, sans-serif; direction: rtl; }
        table { border-collapse: collapse; width: 100%; direction: rtl; }
        th, td { font-size: 11pt; }
      </style>
    </head>
    <body dir="rtl">
      <table>
        <thead>
          <tr>${theadHtml}</tr>
        </thead>
        <tbody>
          ${tbodyHtml}
        </tbody>
      </table>
    </body>
    </html>
  `.trim()
}

/**
 * Triggers a browser download of the exported file.
 * @param {Array} orders - Array of order objects.
 * @param {string} format - 'excel' (.xls) or 'csv' (.csv).
 * @param {string} baseFilename - Base name for downloaded file.
 */
export function exportOrders(orders, format = 'excel', baseFilename = 'lachin-orders') {
  if (!Array.isArray(orders) || orders.length === 0) {
    throw new Error('سفارشی برای خروجی گرفتن وجود ندارد.')
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const isCsv = format === 'csv'
  const filename = `${baseFilename}-${dateStr}.${isCsv ? 'csv' : 'xls'}`

  let content = ''
  let mimeType = ''

  if (isCsv) {
    content = generateOrdersCsv(orders)
    mimeType = 'text/csv;charset=utf-8;'
  } else {
    content = generateOrdersExcelHtml(orders)
    mimeType = 'application/vnd.ms-excel;charset=utf-8;'
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return { filename, count: orders.length }
}
