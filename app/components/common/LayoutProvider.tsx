'use client'

import { useAuth } from '../../lib/hooks/useAuth'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { cn } from '../../lib/utils'
import { Menu } from 'lucide-react'

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!loading && !user && pathname !== '/sign-in') {
      router.push('/sign-in')
    }
  }, [user, loading, pathname, router])

  if (pathname === '/sign-in') return <>{children}</>
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex h-screen bg-white">
        <Sidebar
          onCollapse={setSidebarCollapsed}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <div
          className={cn(
            'flex-1 flex flex-col min-h-screen',
            'transition-[margin] duration-200 ease-in-out',
            'lg:ml-0',
            sidebarCollapsed && 'lg:ml-0',
          )}
        >
          <TopBar
            onMenuClick={() => setIsMobileMenuOpen(true)}
            showMobileMenu={!isMobileMenuOpen}
          />
          <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    )
  }

  return null
}
