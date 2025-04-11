'use client'

import {
  LayoutDashboard,
  Mail,
  FileText,
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ClipboardList,
  Inbox,
} from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { Button } from './button'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { useAuth } from '../../lib/hooks/useAuth'
import Image from 'next/image'

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({
  onCollapse,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()
  const isAdminUser = user?.email === 'curranvw@gmail.com'

  const handleCollapse = (newCollapsed: boolean) => {
    setCollapsed(newCollapsed)
    onCollapse?.(newCollapsed)
  }

  const isPathActive = (path: string) => {
    if (!pathname) return false
    return pathname === path
  }

  const isPathStartsWith = (path: string) => {
    if (!pathname) return false
    return pathname.startsWith(path)
  }

  return (
    <div
      className={cn(
        'fixed lg:sticky lg:top-0 flex flex-col bg-zinc-900 text-white h-screen',
        'transition-all duration-200 ease-in-out z-50',
        'lg:block',
        collapsed ? 'lg:w-16' : 'lg:w-64',
        'w-64 left-0 top-0',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <Link
          href="/dashboard"
          className={cn(
            'font-medium tracking-wide',
            'transition-[width,opacity] duration-200 ease-in-out',
            collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto',
          )}
        >
          <Image
            src="/WA-Sidebar-logo.webp"
            alt="Welcome Agent"
            width={40}
            height={40}
          />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={onMobileClose}
            className="lg:hidden text-zinc-400 hover:text-white"
          >
            ✕
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCollapse(!collapsed)}
            className="hidden lg:flex text-zinc-400 hover:text-white hover:bg-zinc-800 z-50 relative"
          >
            {collapsed ? (
              <ChevronLast className="h-4 w-4" />
            ) : (
              <ChevronFirst className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        <NavItem
          icon={LayoutDashboard}
          label="Dashboard"
          href="/dashboard"
          active={isPathActive('/dashboard')}
          collapsed={collapsed}
        />
        <NavItemWithChildren
          icon={Mail}
          label="Welcome Agent"
          collapsed={collapsed}
          active={isPathStartsWith('/welcome-agent')}
          href="/welcome-agent"
          items={[
            { label: 'Add New Agent', href: '/welcome-agent/new' },
            { label: 'View All Agents', href: '/welcome-agent' },
          ]}
        />
        <NavItem
          icon={Inbox}
          label="Email History"
          href="/email-history"
          active={isPathActive('/email-history')}
          collapsed={collapsed}
        />
        {isAdminUser && (
          <NavItem
            icon={ClipboardList}
            label="Logs"
            href="/logs"
            active={isPathActive('/logs')}
            collapsed={collapsed}
          />
        )}
      </nav>
    </div>
  )
}

interface NavItemProps {
  icon: React.ElementType
  label: string
  href: string
  active?: boolean
  collapsed?: boolean
}

function NavItem({ icon: Icon, label, href, active, collapsed }: NavItemProps) {
  return (
    <Link href={href}>
      <Button
        variant="ghost"
        className={cn(
          'w-full justify-start gap-3 min-h-[40px]',
          'hover:bg-zinc-800 hover:text-white transition-colors',
          'text-zinc-400 text-sm',
          active && 'bg-zinc-800 text-white',
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span
          className={cn(
            'transition-[width,opacity] duration-200 ease-in-out',
            collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto',
          )}
        >
          {label}
        </span>
      </Button>
    </Link>
  )
}

interface NavItemWithChildrenProps extends Omit<NavItemProps, 'href'> {
  items: Array<{
    label: string
    href: string
  }>
  href: string
}

function NavItemWithChildren({
  icon: Icon,
  label,
  collapsed,
  active,
  href,
  items,
}: NavItemWithChildrenProps) {
  const [isOpen, setIsOpen] = useState(true)
  const router = useRouter()
  const pathname = usePathname() || ''

  const handleClick = () => {
    if (collapsed) {
      router.push(href)
    } else {
      setIsOpen(!isOpen)
    }
  }

  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        onClick={handleClick}
        className={cn(
          'w-full justify-start items-center gap-3 min-h-[40px]',
          'hover:bg-zinc-800 hover:text-white transition-colors',
          'text-zinc-400 text-sm group',
          active && 'bg-zinc-800 text-white',
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span
          className={cn(
            'flex-1 -ml-[42px]',
            'transition-[width,opacity] duration-200 ease-in-out',
            collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto',
          )}
        >
          {label}
        </span>
        {!collapsed && (
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        )}
      </Button>

      {!collapsed && isOpen && (
        <div className="ml-6 pl-3 border-l border-zinc-800 space-y-1">
          {items.map((item) => (
            <Link key={item.label} href={item.href}>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 min-h-[32px]"
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
