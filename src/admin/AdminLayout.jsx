import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from './AuthContext'
import { ORDERS } from '../data/orders'

// Count orders with status "new" for the sidebar badge
const NEW_ORDERS_COUNT = ORDERS.filter((o) => o.status === 'new').length

const NAV_ITEMS = [
  { label: 'داشبورد', to: '/admin/dashboard' },
  { label: 'محصولات', to: '/admin/products' },
  { label: 'سفارش‌ها', to: '/admin/orders', badge: NEW_ORDERS_COUNT },
  { label: 'مشتریان', to: '/admin/customers' },
  { label: 'نظرات و امتیازها', to: '/admin/reviews' },
  { label: 'کدهای تخفیف', to: '/admin/coupons' },
  { label: 'تنظیمات', to: '/admin/settings' },
]

function NavItems({ onNavigate }) {
  const location = useLocation()
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        if (!item.to) {
          return (
            <span
              key={item.label}
              className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-[#C9C9C9] opacity-60"
            >
              {item.label}
              <span className="text-[10px] text-[#8a8a8a]">به‌زودی</span>
            </span>
          )
        }
        const active = location.pathname.startsWith(item.to)
        return (
          <NavLink
            key={item.label}
            to={item.to}
            onClick={onNavigate}
            className={
              active
                ? 'flex items-center justify-between rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-[#111]'
                : 'flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-[#C9C9C9] hover:bg-white/10 hover:text-white'
            }
          >
            <span>{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span
                className={`min-w-[20px] rounded-full px-1.5 py-px text-center text-[11px] font-bold leading-5 ${
                  active ? 'bg-[#111] text-white' : 'bg-white text-[#111]'
                }`}
                aria-label={`${item.badge} سفارش جدید`}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export default function AdminLayout() {
  const { username, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]')
    const created = !meta
    const previous = meta ? meta.getAttribute('content') : null
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex')
    return () => {
      if (created) {
        meta.remove()
      } else if (previous !== null) {
        meta.setAttribute('content', previous)
      }
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col bg-[#F6F6F4] text-[#111] min-[900px]:flex-row"
      style={{ fontFamily: "'Vazirmatn Variable', 'Inter', system-ui, sans-serif" }}
    >
      <aside className="flex w-full flex-col gap-4 bg-[#111] px-3.5 py-6 min-[900px]:h-screen min-[900px]:w-[220px] min-[900px]:sticky min-[900px]:top-0">
        <div className="flex items-center justify-between px-1">
          <div className="text-xl font-bold text-white">
            <bdi dir="ltr">Lachin.</bdi> مدیریت
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-1.5 text-[#C9C9C9] hover:bg-white/10 hover:text-white min-[900px]:hidden"
            aria-label="منو"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <div className={menuOpen ? 'block' : 'hidden min-[900px]:block'}>
          <NavItems onNavigate={() => setMenuOpen(false)} />
          <div className="mt-4 flex items-center justify-between border-t border-white/10 px-1 pt-4 min-[900px]:hidden">
            <span className="truncate text-sm text-[#C9C9C9]">{username}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-[#C9C9C9] hover:text-white"
            >
              خروج
            </button>
          </div>
        </div>
        <div className="mt-auto hidden items-center justify-between border-t border-white/10 px-1 pt-4 min-[900px]:flex">
          <span className="truncate text-sm text-[#C9C9C9]">{username}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-[#C9C9C9] hover:text-white"
          >
            خروج
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-9 sm:py-7">
        <Outlet />
      </main>
    </div>
  )
}
