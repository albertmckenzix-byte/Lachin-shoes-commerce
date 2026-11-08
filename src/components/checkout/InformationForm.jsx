import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'

export default function InformationForm({ formData, setFormData, errors, setErrors }) {
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
      case 'firstName':
      case 'lastName':
      case 'city':
      case 'address':
        if (!value.trim()) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.requiredField') }))
          return false
        }
        break
      case 'phone':
        if (!value.trim()) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.requiredField') }))
          return false
        }
        if (!/^[\d\s\-+()]{10,}$/.test(value)) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.invalidPhone') }))
          return false
        }
        break
      case 'email':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.invalidEmail') }))
          return false
        }
        break
      case 'country':
        if (!value.trim()) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.requiredField') }))
          return false
        }
        break
      case 'postalCode':
        // Optional field, validate only if provided
        if (value.trim() && !/^\d{10}$/.test(value)) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.invalidPostalCode') }))
          return false
        }
        break
      case 'agreeDataProcessing':
        if (!value) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.requiredField') }))
          return false
        }
        break
    }
    return true
  }

  const validateAll = () => {
    let valid = true
    const fields = ['firstName', 'lastName', 'phone', 'country', 'city', 'address', 'agreeDataProcessing']
    fields.forEach((field) => {
      setTouched((prev) => ({ ...prev, [field]: true }))
      if (!validateField(field, formData[field])) {
        valid = false
      }
    })
    // Validate optional fields only if they have values
    if (formData.email.trim()) {
      setTouched((prev) => ({ ...prev, email: true }))
      if (!validateField('email', formData.email)) {
        valid = false
      }
    }
    if (formData.postalCode.trim()) {
      setTouched((prev) => ({ ...prev, postalCode: true }))
      if (!validateField('postalCode', formData.postalCode)) {
        valid = false
      }
    }
    return valid
  }

  const Input = ({ id, label, type = 'text', value, onChange, onBlur, placeholder, inputMode, dir = 'rtl', error, errorId, ...props }) => (
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
        style={{ textAlign: dir === 'ltr' ? 'start' : 'start' }}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        className="w-full h-10 bg-transparent border-0 border-b-[1px] border-[#BDBDBD] text-[13px] text-black placeholder-[#8a8a8a] focus:border-black focus:outline-none"
        {...props}
      />
      {error && <p id={errorId} className="absolute bottom-[-18px] start-0 text-[11px] text-red-600" role="alert">{error}</p>}
    </div>
  )

  const Select = ({ id, label, value, onChange, onBlur, error, errorId, children, ...props }) => (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        onBlur={(e) => onBlur(e.target.value)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        className="w-full h-10 bg-transparent border-0 border-b-[1px] border-[#BDBDBD] text-[13px] text-black focus:border-black focus:outline-none appearance-none"
        dir="rtl"
        {...props}
      >
        {children}
      </select>
      {error && <p id={errorId} className="absolute bottom-[-18px] start-0 text-[11px] text-red-600" role="alert">{error}</p>}
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[24px] font-normal text-black leading-[1.3]">{t('checkout.information')}</h2>
        <Trans i18nKey="checkout.loginPrompt" components={{ 1: <a href="#" className="underline text-black hover:text-black" /> }}>
          {t('checkout.loginPrompt')}
        </Trans>
      </div>

      <h3 className="text-[14px] font-semibold text-black leading-[1.3] mt-7 mb-2">{t('checkout.personalInfo')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-2">
        <Input
          id="firstName"
          label={t('checkout.firstName')}
          value={formData.firstName}
          onChange={(e) => handleChange('firstName', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('checkout.firstName')}
          error={touched.firstName ? errors.firstName : ''}
          errorId="firstName-error"
        />
        <Input
          id="lastName"
          label={t('checkout.lastName')}
          value={formData.lastName}
          onChange={(e) => handleChange('lastName', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('checkout.lastName')}
          error={touched.lastName ? errors.lastName : ''}
          errorId="lastName-error"
        />
        <Input
          id="phone"
          label={t('checkout.phoneNumber')}
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('checkout.phoneNumber')}
          inputMode="tel"
          dir="ltr"
          error={touched.phone ? errors.phone : ''}
          errorId="phone-error"
        />
        <Input
          id="email"
          label={t('checkout.email')}
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('checkout.email')}
          inputMode="email"
          dir="ltr"
          error={touched.email ? errors.email : ''}
          errorId="email-error"
        />
      </div>

      <h3 className="text-[14px] font-semibold text-black leading-[1.3] mt-7 mb-2">{t('checkout.shippingInfo')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-2">
        <Select
          id="country"
          label={t('checkout.countryRegion')}
          value={formData.country}
          onChange={(e) => handleChange('country', e.target.value)}
          onBlur={handleBlur}
          error={touched.country ? errors.country : ''}
          errorId="country-error"
        >
          <option value="" disabled>{t('checkout.countryRegion')}</option>
          <option value="IR">Iran</option>
          <option value="US">United States</option>
          <option value="AE">United Arab Emirates</option>
          <option value="TR">Turkey</option>
        </Select>
        <Input
          id="city"
          label={t('checkout.city')}
          value={formData.city}
          onChange={(e) => handleChange('city', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('checkout.city')}
          error={touched.city ? errors.city : ''}
          errorId="city-error"
        />
        <div className="sm:col-span-2">
          <Input
            id="address"
            label={t('checkout.address')}
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            onBlur={handleBlur}
            placeholder={t('checkout.address')}
            error={touched.address ? errors.address : ''}
            errorId="address-error"
          />
        </div>
        <Input
          id="postalCode"
          label={t('checkout.zipPostalCode')}
          value={formData.postalCode}
          onChange={(e) => handleChange('postalCode', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('checkout.zipPostalCode')}
          dir="ltr"
          error={touched.postalCode ? errors.postalCode : ''}
          errorId="postalCode-error"
        />
      </div>

      <div className="flex items-center gap-2 mt-6 relative">
        <input
          type="checkbox"
          id="agreeDataProcessing"
          name="agreeDataProcessing"
          checked={formData.agreeDataProcessing}
          onChange={(e) => handleChange('agreeDataProcessing', e.target.checked)}
          onBlur={(e) => handleBlur('agreeDataProcessing', e.target.checked)}
          className="w-[14px] h-[14px] border-[#BDBDBD] text-black focus:ring-0 focus:border-black rounded-[2px] flex-shrink-0"
          aria-invalid={touched.agreeDataProcessing && errors.agreeDataProcessing ? 'true' : 'false'}
          aria-describedby={touched.agreeDataProcessing && errors.agreeDataProcessing ? 'agreeDataProcessing-error' : undefined}
        />
        <Trans i18nKey="checkout.consent" components={{ 1: <a href="#" className="underline text-black hover:text-black" /> }}>
          {t('checkout.consent')}
        </Trans>
        {touched.agreeDataProcessing && errors.agreeDataProcessing && (
          <p id="agreeDataProcessing-error" className="absolute bottom-[-18px] start-0 text-[11px] text-red-600" role="alert">{errors.agreeDataProcessing}</p>
        )}
      </div>
    </div>
  )
}