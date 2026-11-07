import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'

const PAYMENT_METHODS = {
  CARD: 'card',
  PAYPAL: 'paypal',
  APPLEPAY: 'applepay',
}

const paymentMethods = [
  { id: PAYMENT_METHODS.CARD, label: 'checkout.creditCard', hasFields: true },
  { id: PAYMENT_METHODS.PAYPAL, label: 'checkout.paypal', hasFields: false },
  { id: PAYMENT_METHODS.APPLEPAY, label: 'checkout.applePay', hasFields: false },
]

const visaBadge = (
  <span className="text-[14px] font-bold italic text-[#1A1F71]" aria-hidden="true">VISA</span>
)

const mastercardBadge = (
  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="4" cy="8" r="5" fill="#EB001B" opacity="0.8"/>
    <circle cx="12" cy="8" r="5" fill="#F79E1B" opacity="0.8"/>
    <circle cx="20" cy="8" r="5" fill="#EB001B" opacity="0.8"/>
  </svg>
)

export default function PaymentOptions({ selectedMethod, setSelectedMethod, formData, setFormData, errors, setErrors, onSubmit, isPayDisabled, total, itemsCount }) {
  const { t } = useTranslation()
  const [touched, setTouched] = useState({})

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    validateField(field, value)
  }

  const validateField = (field, value) => {
    switch (field) {
      case 'cardNumber':
        if (!value.trim()) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.requiredField') }))
          return false
        }
        const digits = value.replace(/\s/g, '')
        if (!/^\d{16}$/.test(digits)) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.invalidCardNumber') }))
          return false
        }
        break
      case 'cardholderName':
        if (!value.trim()) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.requiredField') }))
          return false
        }
        break
      case 'expiry':
        if (!value.trim()) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.requiredField') }))
          return false
        }
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(value)) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.invalidExpiry') }))
          return false
        }
        break
      case 'cvv':
        if (!value.trim()) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.requiredField') }))
          return false
        }
        if (!/^\d{3,4}$/.test(value)) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.invalidCvv') }))
          return false
        }
        break
      case 'agreeDataProcessingPayment':
        if (!value) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.requiredField') }))
          return false
        }
        break
    }
    return true
  }

  const validateCardFields = () => {
    let valid = true
    ;['cardNumber', 'cardholderName', 'expiry', 'cvv', 'agreeDataProcessingPayment'].forEach((field) => {
      setTouched((prev) => ({ ...prev, [field]: true }))
      if (!validateField(field, formData[field])) {
        valid = false
      }
    })
    return valid
  }

  const isCardFieldsValid = () => {
    return (
      formData.cardNumber.replace(/\s/g, '').length === 16 &&
      formData.cardholderName.trim().length > 0 &&
      /^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.expiry) &&
      formData.cvv.replace(/\D/g, '').length >= 3 &&
      formData.agreeDataProcessingPayment
    )
  }

  const isFormValid = () => {
    if (selectedMethod === PAYMENT_METHODS.CARD) {
      return isCardFieldsValid()
    }
    return formData.agreeDataProcessingPayment
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (selectedMethod === PAYMENT_METHODS.CARD) {
      if (validateCardFields()) {
        onSubmit()
      }
    } else {
      if (validateField('agreeDataProcessingPayment', formData.agreeDataProcessingPayment)) {
        onSubmit()
      }
    }
  }

  const Input = ({ id, label, type = 'text', value, onChange, onBlur, placeholder, inputMode, dir = 'rtl', error, errorId, maxLength, style, ...props }) => (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={(e) => onBlur(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        dir={dir}
        style={style}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        className="w-full h-10 bg-transparent border-0 border-b-[1px] border-[#BDBDBD] text-[13px] text-black placeholder-[#8a8a8a] focus:border-black focus:outline-none"
        {...props}
      />
      {error && <p id={errorId} className="absolute bottom-[-18px] start-0 text-[11px] text-red-600" role="alert">{error}</p>}
    </div>
  )

  return (
    <form onSubmit={handleFormSubmit} className="mt-14" noValidate>
      <h2 className="text-[24px] font-normal text-black leading-[1.3] mb-5">{t('checkout.payment')}</h2>

      <div role="radiogroup" aria-label={t('checkout.payment')} className="space-y-4">
        {paymentMethods.map((method, index) => (
          <label
            key={method.id}
            className="flex items-center justify-between py-4 border-b-[1px] border-[#BDBDBD] cursor-pointer gap-4"
          >
            <input
              type="radio"
              name="payment"
              value={method.id}
              checked={selectedMethod === method.id}
              onChange={() => setSelectedMethod(method.id)}
              className="w-4 h-4 border-[#BDBDBD] text-black focus:ring-0 focus:border-black appearance-none rounded-full border-[2px] checked:border-black checked:bg-black checked:bg-[radial-gradient(circle_at_center,_white_4px,_transparent_5px)] flex-shrink-0 ms-4"
            />
            <div className="flex-1 text-start flex items-center gap-3 min-w-0">
              <span className="text-[13px] font-medium text-black leading-[1.3]">{t(method.label)}</span>
              {method.id === PAYMENT_METHODS.CARD && (
                <div className="flex items-center gap-2 ms-auto" aria-hidden="true">
                  {visaBadge}
                  {mastercardBadge}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>

      {selectedMethod === PAYMENT_METHODS.CARD && (
        <div className="mt-4 pt-4 pb-6 border-t-[1px] border-[#BDBDBD] space-y-6" role="group" aria-labelledby="card-fields-heading">
          <h3 id="card-fields-heading" className="sr-only">{t('checkout.creditCard')} details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-2">
            <Input
              id="cardNumber"
              label={t('checkout.cardNumber')}
              value={formData.cardNumber}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, '')
                val = val.replace(/(\d{4})(?=\d)/g, '$1 ')
                handleChange('cardNumber', val)
              }}
              onBlur={handleBlur}
              placeholder={t('checkout.cardNumber')}
              inputMode="numeric"
              maxLength={19}
              dir="ltr"
              style={{ textAlign: 'start' }}
              error={touched.cardNumber ? errors.cardNumber : ''}
              errorId="cardNumber-error"
            />
            <Input
              id="cardholderName"
              label={t('checkout.cardholderName')}
              value={formData.cardholderName}
              onChange={(e) => handleChange('cardholderName', e.target.value.toUpperCase())}
              onBlur={handleBlur}
              placeholder={t('checkout.cardholderName')}
              dir="ltr"
              style={{ textAlign: 'start', textTransform: 'uppercase' }}
              error={touched.cardholderName ? errors.cardholderName : ''}
              errorId="cardholderName-error"
            />
            <Input
              id="expiry"
              label={t('checkout.expirationDate')}
              value={formData.expiry}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, '')
                if (val.length >= 2) {
                  val = val.slice(0, 2) + '/' + val.slice(2, 4)
                }
                handleChange('expiry', val)
              }}
              onBlur={handleBlur}
              placeholder={t('checkout.expirationDate')}
              inputMode="numeric"
              maxLength={5}
              dir="ltr"
              style={{ textAlign: 'start' }}
              error={touched.expiry ? errors.expiry : ''}
              errorId="expiry-error"
            />
            <Input
              id="cvv"
              label={t('checkout.cvv')}
              value={formData.cvv}
              onChange={(e) => handleChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
              onBlur={handleBlur}
              placeholder={t('checkout.cvv')}
              inputMode="numeric"
              maxLength={4}
              dir="ltr"
              style={{ textAlign: 'start' }}
              error={touched.cvv ? errors.cvv : ''}
              errorId="cvv-error"
            />
          </div>

          <div className="flex items-center gap-2 relative">
            <input
              type="checkbox"
              id="agreeDataProcessingPayment"
              name="agreeDataProcessingPayment"
              checked={formData.agreeDataProcessingPayment}
              onChange={(e) => handleChange('agreeDataProcessingPayment', e.target.checked)}
              onBlur={(e) => handleBlur('agreeDataProcessingPayment', e.target.checked)}
              className="w-[14px] h-[14px] border-[#BDBDBD] text-black focus:ring-0 focus:border-black rounded-[2px] flex-shrink-0"
              aria-invalid={touched.agreeDataProcessingPayment && errors.agreeDataProcessingPayment ? 'true' : 'false'}
              aria-describedby={touched.agreeDataProcessingPayment && errors.agreeDataProcessingPayment ? 'agreeDataProcessingPayment-error' : undefined}
            />
            <Trans i18nKey="checkout.agreeToDataProcessing" components={{ 1: <a href="#" className="underline text-black hover:text-black" /> }}>
              {t('checkout.agreeToDataProcessing')}
            </Trans>
            {touched.agreeDataProcessingPayment && errors.agreeDataProcessingPayment && (
              <p id="agreeDataProcessingPayment-error" className="absolute bottom-[-18px] start-0 text-[11px] text-red-600" role="alert">{errors.agreeDataProcessingPayment}</p>
            )}
          </div>
        </div>
      )}

      {selectedMethod !== PAYMENT_METHODS.CARD && (
        <div className="mt-4 pt-4 pb-6 border-t-[1px] border-[#BDBDBD] space-y-6">
          <div className="flex items-center gap-2 relative">
            <input
              type="checkbox"
              id="agreeDataProcessingPayment2"
              name="agreeDataProcessingPayment"
              checked={formData.agreeDataProcessingPayment}
              onChange={(e) => handleChange('agreeDataProcessingPayment', e.target.checked)}
              onBlur={(e) => handleBlur('agreeDataProcessingPayment', e.target.checked)}
              className="w-[14px] h-[14px] border-[#BDBDBD] text-black focus:ring-0 focus:border-black rounded-[2px] flex-shrink-0"
              aria-invalid={touched.agreeDataProcessingPayment && errors.agreeDataProcessingPayment ? 'true' : 'false'}
              aria-describedby={touched.agreeDataProcessingPayment && errors.agreeDataProcessingPayment ? 'agreeDataProcessingPayment2-error' : undefined}
            />
            <Trans i18nKey="checkout.agreeToDataProcessing" components={{ 1: <a href="#" className="underline text-black hover:text-black" /> }}>
              {t('checkout.agreeToDataProcessing')}
            </Trans>
            {touched.agreeDataProcessingPayment && errors.agreeDataProcessingPayment && (
              <p id="agreeDataProcessingPayment2-error" className="absolute bottom-[-18px] start-0 text-[11px] text-red-600" role="alert">{errors.agreeDataProcessingPayment}</p>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPayDisabled || !isFormValid()}
        className="w-full h-11 bg-black text-white text-[12px] font-semibold hover:bg-[#222] transition-colors rounded-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
      >
        {t('checkout.payAndPlaceOrder')}
      </button>
      {(isPayDisabled || !isFormValid()) && (
        <p className="mt-2 text-[11px] text-gray-500 text-center">
          {itemsCount === 0 ? t('checkout.bagEmpty') : t('checkout.fillRequiredFields')}
        </p>
      )}
    </form>
  )
}