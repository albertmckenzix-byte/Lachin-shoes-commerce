import { useState, useEffect, useRef } from 'react'
import { X, ArrowRight, Check, ShieldCheck, Zap, Lock, RefreshCw, AlertCircle } from 'lucide-react'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    sendOtp,
    loginWithOtpCode,
    registerNewCustomer,
    loginWithPass,
    toastMessage,
  } = useCustomerAuth()

  const [tab, setTab] = useState('otp') // 'otp' | 'register' | 'password'
  const [otpStep, setOtpStep] = useState('phone') // 'phone' | 'verify'
  const [phone, setPhone] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', ''])
  const [countdown, setCountdown] = useState(120)
  const [canResend, setCanResend] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Register form fields
  const [regFirstName, setRegFirstName] = useState('')
  const [regLastName, setRegLastName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regTerms, setRegTerms] = useState(true)

  // Password login fields
  const [passPhone, setPassPhone] = useState('')
  const [password, setPassword] = useState('')

  const otpInputsRef = useRef([])

  // Reset or initialize when modal opens or initial tab changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setTab(authModalTab || 'otp')
      setOtpStep('phone')
      setError('')
      setOtpDigits(['', '', '', '', ''])
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isAuthModalOpen, authModalTab])

  // Countdown timer for OTP
  useEffect(() => {
    let timer = null
    if (isAuthModalOpen && otpStep === 'verify' && countdown > 0) {
      setCanResend(false)
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isAuthModalOpen, otpStep, countdown])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAuthModalOpen, closeAuthModal])

  if (!isAuthModalOpen && !toastMessage) return null

  // Format countdown mm:ss
  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Handle Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendOtp(phone)
      setOtpStep('verify')
      setCountdown(120)
      setCanResend(false)
      setTimeout(() => {
        if (otpInputsRef.current[0]) {
          otpInputsRef.current[0].focus()
        }
      }, 100)
    } catch (err) {
      setError(err.message || 'خطا در ارسال کد تأیید')
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return
    setError('')
    setLoading(true)
    try {
      await sendOtp(phone)
      setCountdown(120)
      setCanResend(false)
      setOtpDigits(['', '', '', '', ''])
      if (otpInputsRef.current[0]) {
        otpInputsRef.current[0].focus()
      }
    } catch (err) {
      setError(err.message || 'خطا در ارسال مجدد کد')
    } finally {
      setLoading(false)
    }
  }

  // Handle OTP digit changes
  const handleDigitChange = (index, value) => {
    if (value.length > 1) {
      // Pasted full code or multiple digits
      const digitsOnly = value.replace(/\D/g, '').slice(0, 5).split('')
      const nextDigits = [...otpDigits]
      digitsOnly.forEach((d, i) => {
        if (i < 5) nextDigits[i] = d
      })
      setOtpDigits(nextDigits)
      const nextFocus = Math.min(digitsOnly.length, 4)
      if (otpInputsRef.current[nextFocus]) {
        otpInputsRef.current[nextFocus].focus()
      }
      return
    }

    const nextDigits = [...otpDigits]
    nextDigits[index] = value.replace(/\D/g, '')
    setOtpDigits(nextDigits)

    if (value && index < 4) {
      otpInputsRef.current[index + 1]?.focus()
    }
  }

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    }
  }

  // Handle Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const code = otpDigits.join('')
    if (code.length < 5) {
      setError('لطفاً کد تأیید ۵ رقمی را کامل وارد کنید.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await loginWithOtpCode(phone, code)
    } catch (err) {
      setError(err.message || 'کد تأیید اشتباه است یا منقضی شده است')
    } finally {
      setLoading(false)
    }
  }

  // Handle Register
  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regTerms) {
      setError('لطفاً قوانین و مقررات را تایید نمایید.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await registerNewCustomer({
        phone: regPhone,
        first_name: regFirstName,
        last_name: regLastName,
        password: regPassword,
      })
    } catch (err) {
      setError(err.message || 'خطا در ثبت‌نام')
    } finally {
      setLoading(false)
    }
  }

  // Handle Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginWithPass(passPhone, password)
    } catch (err) {
      setError(err.message || 'شماره موبایل یا کلمه عبور اشتباه است')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          dir="rtl"
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2.5 z-50 animate-bounce"
        >
          <span className="w-2 h-2 rounded-full bg-[#FFC83D]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Pop-up Window (Modal) */}
      {isAuthModalOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          {/* Backdrop blur */}
          <div
            onClick={closeAuthModal}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Modal Card */}
          <div
            className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-[#EBEBEB] overflow-hidden z-10 my-auto transition-all transform scale-100"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-neutral-100">
              <button
                type="button"
                onClick={closeAuthModal}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-black flex items-center justify-center transition-colors"
                title="بستن پنجره"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 cursor-default select-none">
                <span className="font-brand font-black text-lg tracking-tight text-black">
                  LACHIN
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFC83D]" />
              </div>

              <div className="w-8" />
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Tab Navigation */}
              <div className="flex items-center p-1 bg-[#F4F4F5] rounded-full mb-6 border border-neutral-200 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setTab('otp')
                    setError('')
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${
                    tab === 'otp'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  ورود سریع (پیامک)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('register')
                    setError('')
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${
                    tab === 'register'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  ثبت‌نام
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('password')
                    setError('')
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${
                    tab === 'password'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  ورود با رمز
                </button>
              </div>

              {/* Error Message Alert */}
              {error && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              {/* 1. OTP TAB */}
              {tab === 'otp' && otpStep === 'phone' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-lg font-black text-black tracking-tight mb-1">
                      ورود به حساب لاچین
                    </h2>
                    <p className="text-xs text-neutral-500">
                      شماره موبایل خود را وارد کنید تا کد تأیید ارسال شود.
                    </p>
                  </div>

                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 mb-1.5 text-start">
                        شماره موبایل
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="tel"
                          dir="ltr"
                          placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          autoFocus
                          className="w-full h-11 bg-transparent border border-neutral-300 rounded-xl px-3 pl-16 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-mono"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-mono font-medium text-neutral-500 border-r border-neutral-200 pr-2 select-none">
                          <span>+۹۸</span>
                          <span className="text-sm">🇮🇷</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !phone}
                      className="w-full h-11 rounded-full bg-black text-white text-xs sm:text-sm font-semibold hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      {loading ? (
                        <span>در حال ارسال...</span>
                      ) : (
                        <>
                          <span>دریافت کد تایید</span>
                          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
                    <Zap className="w-3.5 h-3.5 text-[#FFC83D]" />
                    <span>ورود سریع و امن بدون نیاز به حفظ رمز عبور</span>
                  </div>
                </div>
              )}

              {/* 1.5 OTP VERIFY STEP */}
              {tab === 'otp' && otpStep === 'verify' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep('phone')
                        setError('')
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-black mb-1 transition-colors"
                    >
                      <ArrowRight className="w-3 h-3" />
                      <span>ویرایش شماره ({phone})</span>
                    </button>
                    <h2 className="text-lg font-black text-black tracking-tight mb-1">
                      کد ۵ رقمی را وارد کنید
                    </h2>
                    <p className="text-xs text-neutral-500">
                      کد پیامک‌شده به شماره شما را وارد نمایید.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    {/* 5 Digit Inputs */}
                    <div className="flex justify-center gap-2" dir="ltr">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpInputsRef.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={5}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                          className="w-11 h-12 text-center text-lg font-bold font-mono border border-neutral-300 rounded-xl bg-neutral-50 focus:bg-white focus:border-black outline-none transition-all"
                        />
                      ))}
                    </div>

                    {/* Resend timer */}
                    <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
                      {canResend ? (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={loading}
                          className="text-black font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>ارسال مجدد کد</span>
                        </button>
                      ) : (
                        <span>ارسال مجدد کد پس از:</span>
                      )}
                      {!canResend && (
                        <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                          {formatTimer(countdown)}
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otpDigits.join('').length < 5}
                      className="w-full h-11 rounded-full bg-black text-white text-xs sm:text-sm font-semibold hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      {loading ? (
                        <span>در حال بررسی...</span>
                      ) : (
                        <>
                          <span>تأیید و ورود</span>
                          <Check className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* 2. REGISTER TAB */}
              {tab === 'register' && (
                <div className="space-y-3">
                  <div className="text-center">
                    <h2 className="text-lg font-black text-black tracking-tight mb-0.5">
                      عضویت در لاچین
                    </h2>
                    <p className="text-xs text-neutral-500">
                      برای ثبت سفارش و پیگیری خریدها ثبت‌نام کنید.
                    </p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-3 text-start">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-800 mb-1">
                          نام
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="علی"
                          value={regFirstName}
                          onChange={(e) => setRegFirstName(e.target.value)}
                          className="w-full h-10 bg-transparent border border-neutral-300 rounded-xl px-3 text-xs focus:border-black outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-800 mb-1">
                          نام خانوادگی
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="اکبری"
                          value={regLastName}
                          onChange={(e) => setRegLastName(e.target.value)}
                          className="w-full h-10 bg-transparent border border-neutral-300 rounded-xl px-3 text-xs focus:border-black outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 mb-1">
                        شماره موبایل
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        required
                        placeholder="۰۹۱۲..."
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full h-10 bg-transparent border border-neutral-300 rounded-xl px-3 text-xs font-mono text-left focus:border-black outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 mb-1">
                        کلمه عبور (اختیاری)
                      </label>
                      <input
                        type="password"
                        dir="ltr"
                        placeholder="حداقل ۶ نویسه"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full h-10 bg-transparent border border-neutral-300 rounded-xl px-3 text-xs focus:border-black outline-none"
                      />
                    </div>

                    <div className="flex items-start gap-2 pt-1 text-[11px] text-neutral-600">
                      <input
                        type="checkbox"
                        id="reg-terms"
                        required
                        checked={regTerms}
                        onChange={(e) => setRegTerms(e.target.checked)}
                        className="mt-0.5 rounded border-neutral-300 text-black focus:ring-black"
                      />
                      <label htmlFor="reg-terms" className="cursor-pointer leading-tight">
                        با ثبت‌نام، تمام قوانین و حریم خصوصی لاچین را می‌پذیرم.
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !regPhone || !regFirstName}
                      className="w-full h-11 rounded-full bg-black text-white text-xs sm:text-sm font-semibold hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm mt-2"
                    >
                      {loading ? <span>در حال ثبت...</span> : <span>تکمیل ثبت‌نام</span>}
                    </button>
                  </form>
                </div>
              )}

              {/* 3. PASSWORD LOGIN TAB */}
              {tab === 'password' && (
                <div className="space-y-3">
                  <div className="text-center">
                    <h2 className="text-lg font-black text-black tracking-tight mb-0.5">
                      ورود با کلمه عبور
                    </h2>
                    <p className="text-xs text-neutral-500">
                      شماره موبایل و رمز عبور خود را وارد نمایید.
                    </p>
                  </div>

                  <form onSubmit={handlePasswordLogin} className="space-y-3 text-start">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 mb-1">
                        شماره موبایل
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        required
                        placeholder="۰۹۱۲..."
                        value={passPhone}
                        onChange={(e) => setPassPhone(e.target.value)}
                        className="w-full h-10 bg-transparent border border-neutral-300 rounded-xl px-3 text-xs font-mono text-left focus:border-black outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 mb-1">
                        کلمه عبور
                      </label>
                      <input
                        type="password"
                        dir="ltr"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-10 bg-transparent border border-neutral-300 rounded-xl px-3 text-xs focus:border-black outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !passPhone || !password}
                      className="w-full h-11 rounded-full bg-black text-white text-xs sm:text-sm font-semibold hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm mt-3"
                    >
                      {loading ? <span>در حال بررسی...</span> : <span>ورود به حساب</span>}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-100 text-center">
              <p className="text-[11px] text-neutral-400">
                با ورود به لاچین از تخفیف‌های ویژه باشگاه مشتریان بهره‌مند شوید.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
