import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import Footer from './Footer'

const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} ml-0`}>
        <Header />
        <main className="flex-1 p-4 sm:p-5 md:p-6 overflow-x-hidden overflow-y-auto min-w-0">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}

export default Layout
