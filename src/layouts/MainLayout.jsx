import AnnouncementBar from '../components/AnnouncementBar'
import Header from '../components/Header'
import MenuDrawer from '../components/MenuDrawer'
import ContactFooter from '../components/ContactFooter'
import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
    <div dir="rtl">
      <AnnouncementBar />
      <Header />
      <MenuDrawer />
      <Outlet />
      <ContactFooter />
    </div>
  )
}