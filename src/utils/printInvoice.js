import { formatPrice, formatNumber } from './format'
import { toJalali } from '../data/orders'
import { toPersianDigits } from './toPersianDigits'

const STATUS_LABELS = {
  new: 'ثبت جدید',
  processing: 'در حال آماده‌سازی',
  shipped: 'ارسال شده',
  delivered: 'تحویل مشتری',
  cancelled: 'لغو شده',
}

const PAYMENT_STATUS_LABELS = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت شده',
  refunded: 'مسترد شده',
}

/**
 * Generates an official, print-ready Persian A4 invoice and opens the print dialog.
 * @param {object} order
 */
export function printOrderInvoice(order) {
  if (!order) return

  const items = Array.isArray(order.items) ? order.items : []
  const subtotal = order.subtotal ?? items.reduce((s, i) => s + (Number(i.price || i.unit_price || 0) * Number(i.qty || i.quantity || 1)), 0)
  const shippingFee = order.shippingFee ?? (order.shipping_fee ?? 0)
  const discountTotal = order.discountTotal ?? (order.discount_total ?? 0)
  const total = order.total ?? Math.max(0, subtotal + shippingFee - discountTotal)

  const orderNumStr = order.orderNumber || (order.number ? `#${toPersianDigits(order.number)}` : `#${order.id}`)
  const orderDateStr = order.createdAt ? toJalali(order.createdAt) : 'امروز'
  const custName = order.customer?.name || `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'مشتری محترم'
  const custPhone = order.customer?.phone || '-'
  const custCity = order.customer?.city || '-'
  const custAddress = order.customer?.address || `${custCity}`
  const paymentStatusStr = PAYMENT_STATUS_LABELS[order.paymentStatus || order.payment_status] || order.paymentStatus || 'نامشخص'
  const orderStatusStr = STATUS_LABELS[order.status] || order.status || 'ثبت شده'
  const deliveryStr = order.deliveryMethod === 'express' || order.delivery_method === 'express' ? 'پست پیشتاز (اکسپرس)' : 'ارسال استاندارد'
  const trackingCode = order.transactionId || order.transaction_id || '-'
  const postalCode = order.customer?.postal_code || order.customer?.zipCode || '-'

  const rowsHtml = items.map((item, idx) => {
    const name = item.name || item.product_name || 'کفش'
    const size = item.size || (item.size_eu ? `EU ${toPersianDigits(item.size_eu)}` : '') || (item.size_us ? `US ${toPersianDigits(item.size_us)}` : '-')
    const qty = Number(item.qty || item.quantity || 1)
    const unitPrice = Number(item.price || item.unit_price || 0)
    const lineTotal = Number(item.lineTotal || item.line_total || (unitPrice * qty))

    return `
      <tr>
        <td style="text-align: center; width: 40px;">${toPersianDigits(idx + 1)}</td>
        <td style="font-weight: 500;">${name}</td>
        <td style="text-align: center; width: 100px;">${toPersianDigits(size)}</td>
        <td style="text-align: center; width: 60px;">${formatNumber(qty)}</td>
        <td style="text-align: left; width: 130px;">${formatPrice(unitPrice)}</td>
        <td style="text-align: left; width: 140px; font-weight: 600;">${formatPrice(lineTotal)}</td>
      </tr>
    `
  }).join('')

  const invoiceHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="utf-8">
      <title>فاکتور فروش ${orderNumStr}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          font-family: 'Vazirmatn', Tahoma, 'B Nazanin', Arial, sans-serif;
        }
        body {
          margin: 0;
          padding: 10px;
          color: #111;
          font-size: 12px;
          line-height: 1.5;
          background: #fff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #111;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .logo-area h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.5px;
        }
        .logo-area p {
          margin: 2px 0 0;
          color: #555;
          font-size: 11px;
        }
        .invoice-title {
          text-align: center;
        }
        .invoice-title h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0;
        }
        .invoice-meta {
          text-align: left;
          font-size: 11px;
        }
        .invoice-meta p {
          margin: 2px 0;
        }
        .parties-grid {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }
        .party-box {
          flex: 1;
          border: 1px solid #d4d4d0;
          border-radius: 6px;
          padding: 10px 14px;
          background: #fbfbf9;
        }
        .party-box h3 {
          margin: 0 0 8px 0;
          font-size: 12px;
          font-weight: 700;
          border-bottom: 1px solid #e5e5e0;
          padding-bottom: 4px;
          color: #111;
        }
        .party-box p {
          margin: 3px 0;
          font-size: 11px;
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #f2f2ef;
          border: 1px solid #ccc;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 700;
          text-align: right;
        }
        td {
          border: 1px solid #dcdcd8;
          padding: 8px 10px;
          font-size: 11px;
        }
        .totals-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 20px;
        }
        .payment-info {
          flex: 1;
          border: 1px dashed #bbb;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 11px;
          background: #fafaf8;
        }
        .payment-info p {
          margin: 3px 0;
        }
        .totals-table {
          width: 300px;
          border-collapse: collapse;
        }
        .totals-table td {
          padding: 6px 10px;
          border: 1px solid #ddd;
        }
        .totals-table .grand-total {
          background: #f4f4f2;
          font-weight: bold;
          font-size: 13px;
        }
        .footer-signatures {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          padding-top: 15px;
          border-top: 1px solid #e0e0dc;
        }
        .sig-box {
          text-align: center;
          width: 180px;
        }
        .sig-box .line {
          height: 45px;
        }
        .sig-box p {
          margin: 0;
          font-size: 11px;
          font-weight: 600;
          color: #555;
        }
        @media print {
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-area">
          <h1>LACHIN SHOES</h1>
          <p>فروشگاه تخصصی کفش و کتانی لاچین</p>
        </div>
        <div class="invoice-title">
          <h2>فاکتور رسمی فروش</h2>
          <span style="font-size: 11px; color: #555;">نسخه بایگانی و مشتری</span>
        </div>
        <div class="invoice-meta">
          <p><strong>شماره فاکتور:</strong> ${orderNumStr}</p>
          <p><strong>تاریخ صدور:</strong> ${orderDateStr}</p>
          <p><strong>وضعیت سفارش:</strong> ${orderStatusStr}</p>
        </div>
      </div>

      <div class="parties-grid">
        <div class="party-box">
          <h3>مشخصات فروشنده</h3>
          <p><strong>نام فروشگاه:</strong> کفش و کتانی لاچین (Lachin Shoes)</p>
          <p><strong>نشانی اینترنتی:</strong> lachinshoes.com</p>
          <p><strong>تلفن پشتیبانی:</strong> ۰۲۱-۸۸۸۸۴۳۲۱</p>
          <p><strong>استان / شهر:</strong> تهران - دفتر مرکزی</p>
        </div>
        <div class="party-box">
          <h3>مشخصات خریدار</h3>
          <p><strong>نام و نام خانوادگی:</strong> ${custName}</p>
          <p><strong>شماره تماس:</strong> <span dir="ltr">${custPhone}</span></p>
          <p><strong>استان / شهر:</strong> ${custCity}</p>
          <p><strong>نشانی تحویل:</strong> ${custAddress}</p>
          ${postalCode !== '-' ? `<p><strong>کد پستی:</strong> ${postalCode}</p>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: center;">#</th>
            <th>شرح کالا یا خدمات</th>
            <th style="text-align: center;">سایز</th>
            <th style="text-align: center;">تعداد</th>
            <th style="text-align: left;">مبلغ واحد (تومان)</th>
            <th style="text-align: left;">مبلغ کل (تومان)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="totals-section">
        <div class="payment-info">
          <p><strong>روش ارسال:</strong> ${deliveryStr}</p>
          <p><strong>وضعیت پرداخت:</strong> ${paymentStatusStr}</p>
          ${trackingCode !== '-' ? `<p><strong>شناسه تراکنش بانکی:</strong> ${trackingCode}</p>` : ''}
          <p style="color: #666; margin-top: 6px; font-size: 10px;">
            * اصالت و سلامت فیزیکی کلیه کالاهای خریداری شده تا ۷ روز تضمین می‌گردد.
          </p>
        </div>

        <table class="totals-table">
          <tr>
            <td>جمع کل کالاها:</td>
            <td style="text-align: left;">${formatPrice(subtotal)}</td>
          </tr>
          <tr>
            <td>هزینه بسته‌بندی و ارسال:</td>
            <td style="text-align: left;">${shippingFee === 0 ? 'رایگان' : formatPrice(shippingFee)}</td>
          </tr>
          ${discountTotal > 0 ? `
          <tr>
            <td style="color: #15803d;">تخفیف اعمال شده:</td>
            <td style="text-align: left; color: #15803d;">-${formatPrice(discountTotal)}</td>
          </tr>
          ` : ''}
          <tr class="grand-total">
            <td>مبلغ کل فاکتور:</td>
            <td style="text-align: left;">${formatPrice(total)}</td>
          </tr>
        </table>
      </div>

      <div class="footer-signatures">
        <div class="sig-box">
          <div class="line"></div>
          <p>مهر و امضای فروشنده</p>
        </div>
        <div class="sig-box">
          <div class="line"></div>
          <p>امضای تحویل‌گیرنده</p>
        </div>
      </div>
    </body>
    </html>
  `

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(invoiceHtml)
  doc.close()

  iframe.contentWindow.focus()
  setTimeout(() => {
    iframe.contentWindow.print()
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }, 2000)
  }, 350)
}
