import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { CartProvider } from './contexts/CartContext'
import { MenuProvider } from './contexts/MenuContext'
import MainLayout from './layouts/MainLayout'
import { AuthProvider, useAuth } from './admin/AuthContext'
import { ProductsProvider } from './context/ProductsContext'
import AdminLoginPage from './admin/AdminLoginPage'
import AdminLayout from './admin/AdminLayout'
import ProductsList from './admin/ProductsList'
import ProductEdit from './admin/ProductEdit'
import OrdersList from './admin/OrdersList'
import OrderCreate from './admin/OrderCreate'
import CustomersList from './admin/CustomersList'
import CouponsList from './admin/CouponsList'
import StoreSettings from './admin/StoreSettings'
import Dashboard from './admin/Dashboard'
import Home from './pages/Home'
import AllProducts from './pages/AllProducts'
import About from './pages/About'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import PaymentSimulator from './pages/PaymentSimulator'
import ProductDetail from './pages/ProductDetail'
import ScrollToTop from './components/ScrollToTop'
import ErrorBoundary from './components/ErrorBoundary'
import FootSizeFinderTest from './pages/FootSizeFinderTest'

function AdminGate() {
  const { token } = useAuth()
  return token ? <Outlet /> : <Navigate to="/admin/login" replace />
}

function App() {
  return (
    <ProductsProvider>
      <CartProvider>
        <MenuProvider>
          <ScrollToTop />
          <ErrorBoundary>
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/all-products" element={<AllProducts />} />
                <Route path="/about" element={<About />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-success/:number" element={<OrderSuccess />} />
                <Route path="/payment/simulator" element={<PaymentSimulator />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/foot-size-finder" element={<FootSizeFinderTest />} />
              </Route>
              <Route element={<AuthProvider><Outlet /></AuthProvider>}>
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route element={<AdminGate />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/admin/dashboard" element={<Dashboard />} />
                    <Route path="/admin/products" element={<ProductsList />} />
                    <Route path="/admin/products/new" element={<ProductEdit />} />
                    <Route path="/admin/products/:id" element={<ProductEdit />} />
                    <Route path="/admin/orders" element={<OrdersList />} />
                    <Route path="/admin/orders/new" element={<OrderCreate />} />
                    <Route path="/admin/customers" element={<CustomersList />} />
                    <Route path="/admin/coupons" element={<CouponsList />} />
                    <Route path="/admin/settings" element={<StoreSettings />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </ErrorBoundary>
        </MenuProvider>
      </CartProvider>
    </ProductsProvider>
  )
}

export default App
