import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

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

export default function ContactFooter() {
  const { t } = useTranslation()
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
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.agreed) newErrors.agreed = 'You must agree to the privacy policy'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSubmitStatus('success')
      setFormData({ name: '', phone: '', agreed: false })
      setErrors({})
    } catch {
      setSubmitStatus('error')
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
  }

  // Read arrays from translation files with returnObjects: true
  const addressLines = Array.isArray(t('contact.address.lines', { returnObjects: true })) ? t('contact.address.lines', { returnObjects: true }) : []
  const hoursLines = Array.isArray(t('contact.workingHours.lines', { returnObjects: true })) ? t('contact.workingHours.lines', { returnObjects: true }) : []
  const phoneValue = t('contact.phone.value')
  const emailValue = t('contact.email.value')
  const infoText = t('contact.info.text')
  const titleText = t('contact.title')

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 900

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
          className="grid"
          style={{
            gridTemplateColumns: 'minmax(0,45fr) minmax(0,18fr) minmax(0,20fr) minmax(0,17fr)',
            gridTemplateAreas: `
              "info . address phone"
              "info . hours   email"
              ".    . .       ."
              "para . form    form"
            `,
            gridTemplateRows: 'auto auto minmax(80px, 1fr) auto',
            columnGap: 0,
            paddingTop: '22px',
            minHeight: '520px',
            alignItems: 'start',
          }}
        >
          {/* INFO label - row 1-2, col 1 (rightmost) */}
          <div style={{ gridArea: 'info' }}>
            <span style={labelStyle}>{t('contact.info.label')}</span>
          </div>

          {/* ADDRESS block - row 1, col 3 */}
          <div style={{ gridArea: 'address', minWidth: '220px' }}>
            <span style={labelStyle}>{t('contact.address.label')}</span>
            {addressLines.map((line, i) => (
              <div key={i} style={{ ...valueStyle, marginTop: '4px' }}>
                {line}
              </div>
            ))}
          </div>

          {/* PHONE block - row 1, col 4 (far left) */}
          <div style={{ gridArea: 'phone', minWidth: '200px' }}>
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

          {/* Paragraph - row 4, col 1 (rightmost), aligned to bottom */}
          <div style={{ gridArea: 'para', alignSelf: 'end' }}>
            <div style={{ maxWidth: '490px' }}>
              <p
                style={{
                  fontSize: '18px',
                  fontWeight: 500,
                  letterSpacing: '-0.03em',
                  lineHeight: '1.05',
                  color: '#000',
                }}
              >
                {infoText}
              </p>
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
              <div className="relative" style={{ height: '32px', borderTop: '1px solid #777' }}>
                <input
                  type="text"
                  name="name"
                  placeholder={t('contact.form.namePlaceholder')}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="absolute inset-0 w-full h-full bg-transparent border-none outline-none pe-[16px] text-black placeholder:text-[#9a9a9a] text-end"
                  style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    letterSpacing: '-0.03em',
                    lineHeight: '1.05',
                  }}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                <div className="absolute start-0 top-1/2 -translate-y-1/2 w-[8px] h-[8px] bg-black" aria-hidden="true" />
                {errors.name && (
                  <p id="name-error" className="absolute -bottom-5 start-0 text-red-600 text-xs" style={{ fontSize: '11px' }}>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Phone field - dir="ltr" with text-start */}
              <div className="relative" style={{ height: '32px', borderTop: '1px solid #777', borderBottom: '1px solid #777' }}>
                <input
                  type="tel"
                  name="phone"
                  placeholder={t('contact.form.phonePlaceholder')}
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="absolute inset-0 w-full h-full bg-transparent border-none outline-none pe-[16px] text-black placeholder:text-[#9a9a9a] text-start"
                  style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    letterSpacing: '-0.03em',
                    lineHeight: '1.05',
                  }}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                  dir="ltr"
                />
                <div className="absolute start-0 top-1/2 -translate-y-1/2 w-[8px] h-[8px] bg-black" aria-hidden="true" />
                {errors.phone && (
                  <p id="phone-error" className="absolute -bottom-5 start-0 text-red-600 text-xs" style={{ fontSize: '11px' }}>
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Checkbox + Privacy Policy */}
              <label className="flex items-start gap-[8px] flex-row-reverse" style={{ marginTop: '14px', cursor: 'pointer' }}>
                <span style={{ fontSize: '10px', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: '1.3', color: '#000' }}>
                  {t('contact.form.agree')}
                  {' '}
                  <a href="#" className="font-bold underline" style={{ fontWeight: 700 }}>
                    {t('contact.form.privacyPolicy')}
                  </a>
                </span>
                <input
                  type="checkbox"
                  checked={formData.agreed}
                  onChange={(e) => handleChange('agreed', e.target.checked)}
                  className="w-[14px] h-[14px] mt-[1px] flex-shrink-0 border border-black bg-transparent appearance-none cursor-pointer"
                  style={{ borderRadius: 0 }}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.agreed}
                />
              </label>
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
                {isSubmitting ? 'Sending...' : t('contact.form.sendRequest')}
              </button>

              {submitStatus === 'success' && (
                <p className="mt-[12px] text-green-700 text-[13px] text-end">Your message has been sent successfully!</p>
              )}
              {submitStatus === 'error' && (
                <p className="mt-[12px] text-red-600 text-[13px] text-end">Something went wrong. Please try again.</p>
              )}
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 899px) {
          .grid {
            display: flex !important;
            flex-direction: column !important;
            min-height: auto !important;
            padding-top: 0 !important;
          }
          .grid > div {
            margin-top: 28px !important;
            grid-column: auto !important;
            grid-row: auto !important;
            align-self: auto !important;
            max-width: none !important;
            width: 100% !important;
          }
          .grid > div:first-child {
            margin-top: 0 !important;
          }
          .grid > div:nth-child(2) {
            margin-top: 28px !important;
          }
          .grid > div:nth-child(3) {
            margin-top: 28px !important;
          }
          .grid > div:nth-child(4) {
            margin-top: 28px !important;
          }
          .grid > div:nth-child(5) {
            margin-top: 28px !important;
          }
          .grid > div:nth-child(6) {
            margin-top: 28px !important;
          }
          .grid > div:nth-child(7) {
            margin-top: 28px !important;
          }
        }
      `}</style>
    </footer>
  )
}