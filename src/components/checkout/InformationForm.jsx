import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import {
  ChevronDown,
  Lock,
  Search,
  Check,
  UserCheck,
  LogIn,
  MapPin,
  Plus,
  Trash2,
  Home,
  Briefcase,
  Loader2,
} from 'lucide-react'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'
import { fetchAddresses, createAddress, deleteAddress } from '../../api/addresses'
import { toPersianDigits } from '../../utils/toPersianDigits'

export const IRAN_PROVINCES = [
  'آذربایجان شرقی',
  'آذربایجان غربی',
  'اردبیل',
  'اصفهان',
  'البرز',
  'ایلام',
  'بوشهر',
  'تهران',
  'چهارمحال و بختیاری',
  'خراسان جنوبی',
  'خراسان رضوی',
  'خراسان شمالی',
  'خوزستان',
  'زنجان',
  'سمنان',
  'سیستان و بلوچستان',
  'فارس',
  'قزوین',
  'قم',
  'کردستان',
  'کرمان',
  'کرمانشاه',
  'کهگیلویه و بویراحمد',
  'گلستان',
  'گیلان',
  'لرستان',
  'مازندران',
  'مرکزی',
  'هرمزگان',
  'همدان',
  'یزد',
]

function FormInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  inputMode,
  dir = 'rtl',
  error,
  errorId,
  ...props
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={(e) => onBlur && onBlur(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        dir={dir}
        style={{ textAlign: 'right' }}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        className="w-full h-10 bg-transparent border-0 border-b-[1px] border-[#BDBDBD] text-[13px] text-black placeholder-[#8a8a8a] text-right placeholder:text-right focus:border-black focus:outline-none transition-colors"
        {...props}
      />
      {error && (
        <p id={errorId} className="absolute bottom-[-18px] start-0 text-[11px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function CountryLockedField() {
  return (
    <div className="relative">
      <label className="sr-only">کشور / منطقه</label>
      <div
        className="w-full h-10 border-0 border-b-[1px] border-[#BDBDBD] text-[13px] flex items-center justify-between select-none cursor-not-allowed bg-transparent"
        dir="rtl"
        title="ارسال سفارش فقط در محدوده کشور ایران امکان‌پذیر است"
      >
        <div className="flex items-center gap-2">
          <span className="text-black font-medium">ایران</span>
          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
            کشور مبدأ و مقصد
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-400">
          <Lock className="w-3.5 h-3.5 text-gray-400" />
          <span>پیش‌فرض (قفل‌شده)</span>
        </div>
      </div>
    </div>
  )
}

function ProvinceSelectDropdown({ value, onChange, onBlur, error, errorId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        if (onBlur) onBlur(value)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen, onBlur, value])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  const filteredProvinces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return IRAN_PROVINCES
    return IRAN_PROVINCES.filter((prov) => prov.toLowerCase().includes(q))
  }, [searchQuery])

  const handleSelect = (province) => {
    onChange(province)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="sr-only">استان</label>

      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false)
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        className={`w-full h-10 bg-transparent border-0 border-b-[1px] text-[13px] text-right flex items-center justify-between transition-colors focus:outline-none ${
          error
            ? 'border-red-500'
            : isOpen
            ? 'border-black'
            : 'border-[#BDBDBD] hover:border-black'
        }`}
        dir="rtl"
      >
        <span className={value ? 'text-black font-medium' : 'text-[#8a8a8a]'}>
          {value || 'انتخاب استان'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ms-2 ${
            isOpen ? 'rotate-180 text-black' : ''
          }`}
        />
      </button>

      {/* Dropdown Floating Popover */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="فهرست استان‌های ایران"
          className="absolute top-full start-0 end-0 z-50 mt-1 bg-white border border-[#E5E5E5] rounded-md shadow-2xl overflow-hidden flex flex-col text-right animate-in fade-in duration-100"
          dir="rtl"
        >
          {/* Quick Search */}
          <div className="p-2 border-b border-gray-100 bg-neutral-50 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی سریع استان..."
              className="w-full bg-transparent text-[12px] text-black placeholder:text-gray-400 focus:outline-none text-right"
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-gray-400 hover:text-black px-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* List of 31 Provinces */}
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
            {filteredProvinces.length > 0 ? (
              filteredProvinces.map((prov) => {
                const isSelected = value === prov
                return (
                  <button
                    key={prov}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(prov)}
                    className={`w-full px-3.5 py-2.5 text-[13px] text-right flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-neutral-100 font-semibold text-black'
                        : 'hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <span>{prov}</span>
                    {isSelected && <Check className="w-4 h-4 text-black flex-shrink-0" />}
                  </button>
                )
              })
            ) : (
              <div className="py-4 text-center text-[12px] text-gray-400">
                استانی با این نام یافت نشد
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p id={errorId} className="absolute bottom-[-18px] start-0 text-[11px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default function InformationForm({
  formData,
  setFormData,
  errors,
  setErrors,
  setSubmitted,
}) {
  const { t } = useTranslation()
  const { customer, isAuthenticated, openAuthModal, token } = useCustomerAuth()
  const [touched, setTouched] = useState({})

  // Saved addresses state
  const [addresses, setAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [saveToBook, setSaveToBook] = useState(false)
  const [newAddressTitle, setNewAddressTitle] = useState('خانه')
  const [isSavingNewAddress, setIsSavingNewAddress] = useState(false)
  const [addressSaveSuccess, setAddressSaveSuccess] = useState('')
  const [addressSaveError, setAddressSaveError] = useState('')

  // Pre-fill personal info if customer is logged in
  useEffect(() => {
    if (isAuthenticated && customer) {
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || customer.firstName || '',
        lastName: prev.lastName || customer.lastName || '',
        phone: prev.phone || customer.phone || '',
        email: prev.email || customer.email || '',
        city: prev.city || customer.city || '',
      }))
    }
  }, [isAuthenticated, customer, setFormData])

  // Load saved addresses for authenticated customer
  useEffect(() => {
    if (!token) {
      setAddresses([])
      setSelectedAddressId(null)
      return
    }
    setLoadingAddresses(true)
    fetchAddresses(token)
      .then((res) => {
        const list = res.results || []
        setAddresses(list)
        if (list.length > 0) {
          const def = list.find((a) => a.isDefault || a.is_default) || list[0]
          setSelectedAddressId(def.id)
          applyAddressToForm(def)
        }
      })
      .catch((err) => {
        console.warn('Could not load addresses:', err)
      })
      .finally(() => {
        setLoadingAddresses(false)
      })
  }, [token])

  const applyAddressToForm = (addr) => {
    if (!addr) return
    let street = addr.address || ''
    if (addr.buildingNumber || addr.building_number) {
      street += `، پلاک ${addr.buildingNumber || addr.building_number}`
    }
    if (addr.unit) {
      street += `، واحد ${addr.unit}`
    }

    setFormData((prev) => {
      let firstName = prev.firstName
      let lastName = prev.lastName
      const recName = addr.recipientName || addr.recipient_name
      if (recName) {
        const parts = recName.trim().split(' ')
        if (parts.length > 1) {
          firstName = parts[0]
          lastName = parts.slice(1).join(' ')
        } else if (parts[0]) {
          firstName = parts[0]
        }
      }
      return {
        ...prev,
        province: addr.province || prev.province,
        city: addr.city || prev.city,
        address: street,
        zipCode: addr.postalCode || addr.postal_code || prev.zipCode,
        phone: addr.recipientPhone || addr.recipient_phone || prev.phone,
        firstName,
        lastName,
      }
    })

    setErrors((prev) => ({
      ...prev,
      province: '',
      city: '',
      address: '',
      zipCode: '',
    }))
  }

  const handleSelectAddress = (addr) => {
    setSelectedAddressId(addr.id)
    applyAddressToForm(addr)
  }

  const handleSelectNewAddress = () => {
    setSelectedAddressId('new')
    setFormData((prev) => ({
      ...prev,
      province: '',
      city: '',
      address: '',
      zipCode: '',
    }))
  }

  const handleSaveCurrentAddress = async () => {
    if (!token) return
    setAddressSaveError('')
    setAddressSaveSuccess('')

    if (!formData.province || !formData.city || !formData.address) {
      setAddressSaveError('لطفاً استان، شهر و نشانی پستی را کامل وارد کنید.')
      return
    }

    setIsSavingNewAddress(true)
    try {
      const recipientName =
        `${formData.firstName || ''} ${formData.lastName || ''}`.trim() ||
        customer?.phone ||
        'مشتری'
      const recipientPhone = formData.phone || customer?.phone || ''
      const res = await createAddress(
        {
          title: newAddressTitle.trim() || 'خانه',
          recipientName,
          recipientPhone,
          province: formData.province,
          city: formData.city,
          address: formData.address,
          postalCode: formData.zipCode,
          isDefault: addresses.length === 0,
        },
        token
      )
      setAddresses((prev) => [res, ...prev])
      setSelectedAddressId(res.id)
      setSaveToBook(false)
      setAddressSaveSuccess('آدرس با موفقیت در دفترچه آدرس‌های شما ذخیره شد.')
      setTimeout(() => setAddressSaveSuccess(''), 4000)
    } catch (err) {
      setAddressSaveError(err.message || 'خطا در ثبت آدرس')
    } finally {
      setIsSavingNewAddress(false)
    }
  }

  const handleDeleteAddress = async (e, id) => {
    e.stopPropagation()
    if (!token) return
    if (!window.confirm('آیا از حذف این آدرس اطمینان دارید؟')) return
    try {
      await deleteAddress(id, token)
      setAddresses((prev) => {
        const remaining = prev.filter((a) => a.id !== id)
        if (selectedAddressId === id) {
          if (remaining.length > 0) {
            setSelectedAddressId(remaining[0].id)
            applyAddressToForm(remaining[0])
          } else {
            setSelectedAddressId('new')
          }
        }
        return remaining
      })
    } catch (err) {
      alert(err.message || 'خطا در حذف آدرس')
    }
  }

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
      case 'province':
        if (!value || !value.trim()) {
          setErrors((prev) => ({ ...prev, [field]: 'لطفاً استان خود را انتخاب کنید' }))
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
        if (!value.trim()) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.requiredField') }))
          return false
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.invalidEmail') }))
          return false
        }
        break
      case 'zipCode':
        if (!value.trim()) {
          setErrors((prev) => ({ ...prev, [field]: t('checkout.requiredField') }))
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
    const fields = [
      'firstName',
      'lastName',
      'phone',
      'email',
      'province',
      'city',
      'address',
      'zipCode',
      'agreeDataProcessing',
    ]
    fields.forEach((field) => {
      setTouched((prev) => ({ ...prev, [field]: true }))
      if (!validateField(field, formData[field])) {
        valid = false
      }
    })
    return valid
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateAll()) {
      setSubmitted(true)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Header with auth status */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h2 className="text-[24px] font-normal text-black leading-[1.3]">{t('checkout.information')}</h2>
        {isAuthenticated ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>اطلاعات حساب {customer?.firstName || customer?.phone}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openAuthModal('otp')}
            className="text-xs text-neutral-600 hover:text-black flex items-center gap-1 underline underline-offset-4"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>حساب کاربری دارید؟ ورود سریع</span>
          </button>
        )}
      </div>

      {/* Saved Addresses Section (Only if authenticated and has addresses) */}
      {isAuthenticated && addresses.length > 0 && (
        <div className="mb-6 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-black" />
              <span className="text-[13px] font-bold text-black">دفترچه آدرس‌های من</span>
              <span className="text-[11px] bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full font-medium">
                {toPersianDigits(addresses.length)} آدرس
              </span>
            </div>
            <button
              type="button"
              onClick={handleSelectNewAddress}
              className={`text-[12px] flex items-center gap-1 transition-colors ${
                selectedAddressId === 'new'
                  ? 'text-black font-bold underline'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>استفاده از آدرس دیگر</span>
            </button>
          </div>

          {/* Grid of Saved Address Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addresses.map((addr) => {
              const isSelected = selectedAddressId === addr.id
              return (
                <div
                  key={addr.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectAddress(addr)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSelectAddress(addr)
                    }
                  }}
                  className={`text-right p-3 rounded-lg border transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-black bg-white shadow-sm ring-1 ring-black'
                      : 'border-neutral-200 bg-white hover:border-neutral-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {addr.title === 'محل کار' || addr.title === 'کار' ? (
                          <Briefcase className="w-3.5 h-3.5 text-neutral-700" />
                        ) : (
                          <Home className="w-3.5 h-3.5 text-neutral-700" />
                        )}
                        <span className="text-[12px] font-bold text-black">{addr.title || 'خانه'}</span>
                        {(addr.isDefault || addr.is_default) && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-medium">
                            پیش‌فرض
                          </span>
                        )}
                      </div>
                      <div className="w-4 h-4 rounded-full border flex items-center justify-center transition-colors border-neutral-400">
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
                      </div>
                    </div>

                    <div className="text-[11px] text-neutral-700 font-medium mb-1">
                      {addr.recipientName || addr.recipient_name}
                      <span className="text-neutral-400 mx-1">|</span>
                      <span dir="ltr" className="inline-block">
                        {toPersianDigits(addr.recipientPhone || addr.recipient_phone)}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-600 leading-snug line-clamp-2">
                      {addr.province}، {addr.city}، {addr.address}
                      {addr.buildingNumber ? `، پلاک ${addr.buildingNumber}` : ''}
                      {addr.unit ? `، واحد ${addr.unit}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-neutral-100 text-[10px] text-neutral-400">
                    <span>کد پستی: {toPersianDigits(addr.postalCode || addr.postal_code || '—')}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteAddress(e, addr.id)}
                      className="text-neutral-400 hover:text-red-600 transition-colors p-1"
                      title="حذف آدرس"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Personal Info */}
      <h3 className="text-[14px] font-semibold text-black leading-[1.3] mt-7 mb-2">
        {t('checkout.personalInfo')}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-2">
        <FormInput
          id="firstName"
          label={t('checkout.firstName')}
          value={formData.firstName}
          onChange={(e) => handleChange('firstName', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('checkout.firstName')}
          error={touched.firstName ? errors.firstName : ''}
          errorId="firstName-error"
        />
        <FormInput
          id="lastName"
          label={t('checkout.lastName')}
          value={formData.lastName}
          onChange={(e) => handleChange('lastName', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('checkout.lastName')}
          error={touched.lastName ? errors.lastName : ''}
          errorId="lastName-error"
        />
        <FormInput
          id="phone"
          label={t('checkout.phoneNumber')}
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('checkout.phoneNumber')}
          inputMode="tel"
          error={touched.phone ? errors.phone : ''}
          errorId="phone-error"
        />
        <FormInput
          id="email"
          label={t('checkout.email')}
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('checkout.email')}
          inputMode="email"
          error={touched.email ? errors.email : ''}
          errorId="email-error"
        />
      </div>

      {/* Shipping Info */}
      <div className="flex items-center justify-between mt-7 mb-2">
        <h3 className="text-[14px] font-semibold text-black leading-[1.3]">
          {t('checkout.shippingInfo')}
        </h3>
        {selectedAddressId && selectedAddressId !== 'new' && (
          <span className="text-[11px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
            انتخاب‌شده از دفترچه آدرس
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-2">
        {/* Country locked on Iran */}
        <CountryLockedField />

        {/* Province custom dropdown */}
        <ProvinceSelectDropdown
          value={formData.province}
          onChange={(val) => {
            handleChange('province', val)
          }}
          onBlur={(val) => handleBlur('province', val)}
          error={touched.province ? errors.province : ''}
          errorId="province-error"
        />

        {/* City input */}
        <FormInput
          id="city"
          label={t('checkout.city')}
          value={formData.city}
          onChange={(e) => handleChange('city', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('checkout.city')}
          error={touched.city ? errors.city : ''}
          errorId="city-error"
        />

        {/* Postal Code input */}
        <FormInput
          id="zipCode"
          label={t('checkout.zipPostalCode')}
          value={formData.zipCode}
          onChange={(e) => handleChange('zipCode', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('checkout.zipPostalCode')}
          error={touched.zipCode ? errors.zipCode : ''}
          errorId="zipCode-error"
        />

        {/* Full Street Address taking full row */}
        <div className="sm:col-span-2">
          <FormInput
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

        {/* Save to address book option if entering a new address and authenticated */}
        {isAuthenticated && (selectedAddressId === 'new' || addresses.length === 0) && (
          <div className="sm:col-span-2 mt-2 pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="saveToBook"
                checked={saveToBook}
                onChange={(e) => setSaveToBook(e.target.checked)}
                className="w-[14px] h-[14px] border-[#BDBDBD] text-black focus:ring-0 focus:border-black rounded-[2px] cursor-pointer"
              />
              <label htmlFor="saveToBook" className="text-[12px] text-neutral-700 cursor-pointer select-none">
                ذخیره این نشانی در دفترچه آدرس‌های من برای سفارش‌های آینده
              </label>
            </div>

            {saveToBook && (
              <div className="mt-3 flex items-center gap-3 animate-in fade-in flex-wrap">
                <input
                  type="text"
                  value={newAddressTitle}
                  onChange={(e) => setNewAddressTitle(e.target.value)}
                  placeholder="عنوان آدرس (مثلاً: خانه، محل کار)"
                  className="h-9 px-3 border border-neutral-300 rounded text-[12px] text-black placeholder-neutral-400 focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={handleSaveCurrentAddress}
                  disabled={isSavingNewAddress}
                  className="h-9 px-4 bg-black text-white text-[12px] font-medium rounded hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {isSavingNewAddress ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال ذخیره...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>ذخیره در دفترچه</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {addressSaveSuccess && (
              <p className="text-[11px] text-emerald-600 mt-2 font-medium">{addressSaveSuccess}</p>
            )}
            {addressSaveError && (
              <p className="text-[11px] text-red-600 mt-2">{addressSaveError}</p>
            )}
          </div>
        )}
      </div>

      {/* Consent checkbox */}
      <div className="flex items-center gap-2 mt-6 relative">
        <input
          type="checkbox"
          id="agreeDataProcessing"
          name="agreeDataProcessing"
          checked={formData.agreeDataProcessing}
          onChange={(e) => handleChange('agreeDataProcessing', e.target.checked)}
          onBlur={(e) => handleBlur('agreeDataProcessing', e.target.checked)}
          className="w-[14px] h-[14px] border-[#BDBDBD] text-black focus:ring-0 focus:border-black rounded-[2px] flex-shrink-0 cursor-pointer"
          aria-invalid={touched.agreeDataProcessing && errors.agreeDataProcessing ? 'true' : 'false'}
          aria-describedby={
            touched.agreeDataProcessing && errors.agreeDataProcessing
              ? 'agreeDataProcessing-error'
              : undefined
          }
        />
        <label htmlFor="agreeDataProcessing" className="cursor-pointer select-none text-[12px] text-gray-700">
          <Trans
            i18nKey="checkout.consent"
            components={{ 1: <a href="#" className="underline text-black hover:text-black font-medium" /> }}
          >
            {t('checkout.consent')}
          </Trans>
        </label>
        {touched.agreeDataProcessing && errors.agreeDataProcessing && (
          <p id="agreeDataProcessing-error" className="absolute bottom-[-18px] start-0 text-[11px] text-red-600" role="alert">
            {errors.agreeDataProcessing}
          </p>
        )}
      </div>
    </form>
  )
}
