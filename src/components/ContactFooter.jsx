import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, ExternalLink, Check } from 'lucide-react'
import { submitContactMessage } from '../api/contact'

// Default shop location coordinates / query - easily customizable
const SHOP_LOCATION = {
  query: 'Tehran, Valiasr St',
  directUrl: 'https://www.google.com/maps/search/?api=1&query=Tehran+Valiasr+St',
  zoom: 15,
}

let footerBgImg = null
try {
  // eslint-disable-next-line import/no-unresolved
  footerBgImg = require('../assets/images/footer-bg.jpg').default
} catch {
  footerBgImg = null
}

const noiseDataUri = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E`

const smudgeStyle = (left, top, size, opacity = 0.06) => ({
  position: 'absolute',
  left: `${left}%`,
  top: `${top}%`,
  width: `${size}%`,
  height: `${size}%`,
  borderRadius: '50%',
  background: `radial-gradient(circle at center, rgba(80,80,70,${opacity}) 0%, transparent 70%)`,
  pointerEvents: 'none',
  filter: 'blur(60px)',
  transform: 'translate(-50%, -50%)',
  zIndex: 1,
})

export default function ContactFooter({ mapConfig = SHOP_LOCATION }) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    agreed: false,
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)
  const formRef = useRef(null)

  useEffect(() => {
    return () => {
      setFormData({ name: '', phone: '', agreed: false })
      setErrors({})
      setSubmitStatus(null)
    }
  }, [])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = isRTL ? 'لطفاً نام خود را وارد کنید' : 'Name is required'
    if (!formData.phone.trim()) newErrors.phone = isRTL ? 'لطفاً شماره تلفن خود را وارد کنید' : 'Phone number is required'
    if (!formData.agreed) newErrors.agreed = isRTL ? 'لطفاً با ذخیره شدن اطلاعات موافقت کنید' : 'You must agree to the privacy policy'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      await submitContactMessage({
        name: formData.name,
        phone: formData.phone,
      })
      setSubmitStatus('success')
      setFormData({ name: '', phone: '', agreed: false })
      setErrors({})
    } catch (err) {
      setSubmitStatus('error')
      setErrors((prev) => ({ ...prev, submit: err.message }))
    } finally {
      setIsSubmitting(false)
    }
  }

const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }))
    }
  }

  const labelStyle = {
    fontSize: '16px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: '1.05',
    color: '#000',
    textTransform: 'uppercase',
  }

  const valueStyle = {
    fontSize: '16px',
    fontWeight: 400,
    letterSpacing: '-0.03em',
    lineHeight: '1.05',
    color: '#666',
  }

  const emailValueStyle = {
    ...valueStyle,
    color: '#000',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  }

  // Read arrays from translation files with returnObjects: true
  const addressLines = Array.isArray(t('contact.address.lines', { returnObjects: true })) ? t('contact.address.lines', { returnObjects: true }) : []
  const hoursLines = Array.isArray(t('contact.workingHours.lines', { returnObjects: true })) ? t('contact.workingHours.lines', { returnObjects: true }) : []
  const phoneValue = t('contact.phone.value')
  const emailValue = t('contact.email.value')
  const infoText = t('contact.info.text')
  const titleText = t('contact.title')

  return (
    <footer
      className="relative z-10 w-full min-h-[680px] overflow-hidden"
      style={{
        backgroundColor: '#E4E4E1',
        padding: '95px 30px 60px',
        minHeight: '680px',
      }}
      dir="rtl"
    >
      {/* Optional background image */}
      {footerBgImg && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${footerBgImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 1,
          }}
          aria-hidden="true"
        />
      )}

      {/* Paper grain texture */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          backgroundImage: `url(${noiseDataUri})`,
          backgroundSize: '300px 300px',
          opacity: 0.18,
          mixBlendMode: 'multiply',
        }}
        aria-hidden="true"
      />

      {/* Faint smudges */}
      <div className="absolute inset-0 z-[2] pointer-events-none" aria-hidden="true">
        <div style={smudgeStyle(15, 20, 45, 0.06)} />
        <div style={smudgeStyle(85, 70, 55, 0.05)} />
        <div style={smudgeStyle(50, 90, 40, 0.04)} />
      </div>

      <div className="relative z-10 max-w-full mx-auto">
        {/* Heading - right aligned, letter-spacing 0, line-height 1.2 */}
        <div className="mb-[22px]">
          <h2
            className="uppercase text-black text-end"
            style={{
              fontSize: 'clamp(48px, 8.4vw, 170px)',
              fontWeight: 900,
              letterSpacing: '0',
              lineHeight: '1.2',
            }}
          >
            {titleText}
          </h2>
          <hr className="mt-[14px] border-none h-[4px] bg-black w-full" />
        </div>

        {/* Grid Layout - uses logical flow with dir="rtl" */}
        <div
          className="grid contact-grid"
          style={{
            gridTemplateColumns: 'minmax(0,48fr) minmax(0,15fr) minmax(0,20fr) minmax(0,17fr)',
            gridTemplateAreas: `
              "info . address phone"
              "info . hours   email"
              "info . .       ."
              "info . form    form"
            `,
            gridTemplateRows: 'auto auto minmax(30px, 1fr) auto',
            columnGap: 0,
            paddingTop: '22px',
            minHeight: '560px',
            alignItems: 'start',
          }}
        >
          {/* INFO & MAP column - row 1-4, col 1 (rightmost in RTL) */}
          <div
            style={{
              gridArea: 'info',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              maxWidth: '640px',
            }}
          >
            {/* Top: Google Map */}
            <div className="contact-map-block w-full">
              <div className="flex items-center justify-between mb-[10px] gap-2">
                <span style={labelStyle} className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-black inline-block flex-shrink-0" />
                  {t('contact.map.label')}
                </span>
                <a
                  href={mapConfig.directUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapConfig.query)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-medium text-black/70 hover:text-black underline flex items-center gap-1 transition-colors"
                  title={t('contact.map.openInMaps')}
                >
                  <span>{t('contact.map.openInMaps')}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>

              <div
                className="relative w-full border border-black bg-[#dcdcd9] overflow-hidden group shadow-sm"
                style={{
                  height: '380px',
                }}
              >
                <iframe
                  title={t('contact.map.label')}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(mapConfig.query)}&t=&z=${mapConfig.zoom || 15}&ie=UTF8&iwloc=&output=embed`}
                  width="100%"
                  height="100%"
                  style={{
                    border: 0,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    filter: 'grayscale(25%) contrast(1.02)',
                    transition: 'filter 0.3s ease',
                  }}
                  className="group-hover:filter-none"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <p
                className="text-[12px] text-[#666] mt-1.5 flex items-center justify-between"
                style={{ letterSpacing: '-0.02em' }}
              >
                <span>{t('contact.map.addressHint')}</span>
                <span className="text-[11px] text-[#888]">Google Maps</span>
              </p>
            </div>

            {/* Bottom: Paragraph text */}
            <div style={{ marginTop: '24px', maxWidth: '490px' }}>
              <p
                style={{
                  fontSize: '18px',
                  fontWeight: 500,
                  letterSpacing: '-0.03em',
                  lineHeight: '1.25',
                  color: '#000',
                }}
              >
                {infoText}
              </p>
            </div>
          </div>

          {/* ADDRESS block - row 1, col 3 */}
          <div style={{ gridArea: 'address', minWidth: '220px', marginTop: '34px' }}>
            <span style={labelStyle}>{t('contact.address.label')}</span>
            {addressLines.map((line, i) => (
              <div key={i} style={{ ...valueStyle, marginTop: '4px' }}>
                {line}
              </div>
            ))}
          </div>

          {/* PHONE block - row 1, col 4 (far left) */}
          <div style={{ gridArea: 'phone', minWidth: '200px', marginTop: '34px' }}>
            <span style={labelStyle}>{t('contact.phone.label')}</span>
            <div style={{ ...valueStyle, marginTop: '4px' }}>
              {phoneValue}
            </div>
          </div>

          {/* WORKING HOURS block - row 2, col 3 */}
          <div style={{ gridArea: 'hours', minWidth: '220px', marginTop: '40px' }}>
            <span style={labelStyle}>{t('contact.workingHours.label')}</span>
            {hoursLines.map((line, i) => (
              <div key={i} style={{ ...valueStyle, marginTop: '4px' }}>
                {line}
              </div>
            ))}
          </div>

          {/* EMAIL block - row 2, col 4 */}
          <div style={{ gridArea: 'email', minWidth: '200px', marginTop: '40px' }}>
            <span style={labelStyle}>{t('contact.email.label')}</span>
            <div style={{ ...emailValueStyle, marginTop: '4px' }}>
              {emailValue}
            </div>
          </div>

          {/* Contact Form - row 4, col 3-4 (spans two left columns) */}
          <div
            style={{
              gridArea: 'form',
              alignSelf: 'start',
              marginTop: '80px',
              width: '100%',
            }}
          >
            <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col" noValidate style={{ width: '100%' }}>
              {/* Name field */}
              <div style={{ borderBottom: '1px solid #999', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, direction: 'rtl' }}>
                <div className="w-2 h-2 bg-black flex-shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  name="name"
                  placeholder={t('contact.form.namePlaceholder')}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full h-full bg-transparent border-none outline-none placeholder:text-[#9a9a9a] placeholder:text-right text-right"
                  style={{
                    flex: 1,
                    fontSize: '16px',
                    fontWeight: 400,
                    letterSpacing: '-0.03em',
                    lineHeight: '1.05',
                    paddingRight: 0,
                    direction: 'rtl',
                    textAlign: 'right',
                  }}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  dir="rtl"
                />
                {errors.name && (
                  <p id="name-error" className="absolute -bottom-5 start-0 text-red-600 text-xs" style={{ fontSize: '11px' }}>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Phone field - dir="rtl" with text-right */}
              <div style={{ borderBottom: '1px solid #999', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, direction: 'rtl' }}>
                <div className="w-2 h-2 bg-black flex-shrink-0" aria-hidden="true" />
                <input
                  type="tel"
                  name="phone"
                  placeholder={t('contact.form.phonePlaceholder')}
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full h-full bg-transparent border-none outline-none placeholder:text-[#9a9a9a] placeholder:text-right text-right"
                  style={{
                    flex: 1,
                    fontSize: '16px',
                    fontWeight: 400,
                    letterSpacing: '-0.03em',
                    lineHeight: '1.05',
                    paddingRight: 0,
                    direction: 'rtl',
                    textAlign: 'right',
                  }}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                  dir="rtl"
                />
                {errors.phone && (
                  <p id="phone-error" className="absolute -bottom-5 start-0 text-red-600 text-xs" style={{ fontSize: '11px' }}>
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Checkbox + Privacy Policy */}
              <div
                className="flex items-center justify-start gap-2.5 mt-[14px] cursor-pointer select-none"
                style={{ direction: 'rtl' }}
                onClick={() => handleChange('agreed', !formData.agreed)}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={formData.agreed}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleChange('agreed', !formData.agreed)
                  }}
                  className={`w-[16px] h-[16px] flex-shrink-0 border border-black flex items-center justify-center transition-colors cursor-pointer ${
                    formData.agreed ? 'bg-black text-white' : 'bg-transparent hover:bg-black/5'
                  }`}
                  style={{ borderRadius: 0 }}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.agreed}
                >
                  {formData.agreed && <Check size={12} strokeWidth={3} className="text-white" />}
                </button>
                <input
                  type="checkbox"
                  id="contact-agreed"
                  checked={formData.agreed}
                  onChange={(e) => handleChange('agreed', e.target.checked)}
                  className="sr-only"
                  tabIndex={-1}
                />
                <span style={{ fontSize: '12px', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: '1.3', color: '#000' }}>
                  {t('contact.form.agree')}
                  {' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="font-bold underline hover:text-[#444] transition-colors"
                    style={{ fontWeight: 700 }}
                  >
                    {t('contact.form.privacyPolicy')}
                  </a>
                </span>
              </div>
              {errors.agreed && (
                <p className="text-red-600 text-xs mt-1 text-end" style={{ fontSize: '11px' }}>
                  {errors.agreed}
                </p>
              )}

              {/* Submit button - full width */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-[16px] w-full h-[38px] bg-black text-white border-none cursor-pointer transition-colors"
                style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  letterSpacing: '-0.03em',
                  lineHeight: '1.05',
                  borderRadius: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#222' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#000' }}
              >
                {isSubmitting ? (isRTL ? 'در حال ارسال...' : 'Sending...') : t('contact.form.sendRequest')}
              </button>

              {submitStatus === 'success' && (
                <p className="mt-[12px] text-green-700 text-[13px] text-end font-medium">
                  {isRTL ? 'درخواست شما ثبت شد و به باشگاه مشتریان اضافه شدید!' : 'Your message has been sent successfully!'}
                </p>
              )}
              {submitStatus === 'error' && (
                <p className="mt-[12px] text-red-600 text-[13px] text-end">
                  {errors.submit || (isRTL ? 'خطایی رخ داد. لطفاً دوباره تلاش کنید.' : 'Something went wrong. Please try again.')}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 899px) {
          .contact-grid {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
            grid-template-areas:
              "info    info"
              "address phone"
              "hours   email"
              "form    form" !important;
            grid-template-rows: auto auto auto auto !important;
            column-gap: 20px !important;
            row-gap: 24px !important;
            min-height: auto !important;
            padding-top: 0 !important;
          }
          .contact-grid > div {
            margin-top: 0 !important;
            grid-column: auto !important;
            grid-row: auto !important;
            align-self: auto !important;
            max-width: none !important;
            min-width: 0 !important;
            width: 100% !important;
            word-break: break-word;
          }
          .contact-grid > div:first-child {
            grid-area: info !important;
          }
          .contact-grid > div:nth-child(2) {
            grid-area: address !important;
            margin-top: 8px !important;
          }
          .contact-grid > div:nth-child(3) {
            grid-area: phone !important;
            margin-top: 8px !important;
          }
          .contact-grid > div:nth-child(4) {
            grid-area: hours !important;
          }
          .contact-grid > div:nth-child(5) {
            grid-area: email !important;
          }
          .contact-grid > div:nth-child(6) {
            grid-area: form !important;
            margin-top: 14px !important;
          }
          .contact-map-block > div:nth-child(2) {
            height: 240px !important;
          }
        }
      `}</style>
    </footer>
  )
}
