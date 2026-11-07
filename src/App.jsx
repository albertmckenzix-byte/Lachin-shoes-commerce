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
import Home from './pages/Home'
import AllProducts from './pages/AllProducts'
import About from './pages/About'
import Checkout from './pages/Checkout'
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
              <Route path="/product/:slug" element={<ProductDetail />} />
              <Route path="/foot-size-finder" element={<FootSizeFinderTest />} />
            </Route>
            <Route element={<AuthProvider><Outlet /></AuthProvider>}>
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route element={<AdminGate />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<Navigate to="/admin/products" replace />} />
                  <Route path="/admin/products" element={<ProductsList />} />
                  <Route path="/admin/products/new" element={<ProductEdit />} />
                  <Route path="/admin/products/:id" element={<ProductEdit />} />
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