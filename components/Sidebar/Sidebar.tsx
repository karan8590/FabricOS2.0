'use strict'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Users,
  UserCog,
  BookOpen,
  Scissors,
  X,
  Menu,
  Settings,
  LogOut,
  LucideIcon,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════

interface NavItem {
  label: string
  route: string
  icon: LucideIcon
  badge: number | null
}

export interface SidebarUser {
  name: string
  role: string
  email?: string
}

export interface SidebarProps {
  user: SidebarUser
  onLogout: () => void
  className?: string
}

interface SidebarContentProps {
  user: SidebarUser
  onLogout: () => void
  pathname: string
  onNavigate: (route: string) => void
  showCloseButton?: boolean
  onClose?: () => void
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════════════

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    route: '/dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    label: 'Orders',
    route: '/orders',
    icon: ShoppingBag,
    badge: null,
  },
  {
    label: 'Challans',
    route: '/challans',
    icon: FileText,
    badge: null,
  },
  {
    label: 'Invoices',
    route: '/invoices',
    icon: FileText,
    badge: null,
  },
  {
    label: 'Customers',
    route: '/customers',
    icon: Users,
    badge: null,
  },
  {
    label: 'Employees',
    route: '/employees',
    icon: UserCog,
    badge: null,
  },
  {
    label: 'Catalog',
    route: '/catalog',
    icon: BookOpen,
    badge: null,
  },
  {
    label: 'GST Report',
    route: '/gst-report',
    icon: FileText,
    badge: null,
  },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

function getAvatarGradient(name: string): string {
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-cyan-500 to-blue-600',
  ]
  const index = name.charCodeAt(0) % gradients.length
  return gradients[index]
}

// ═══════════════════════════════════════════════════════════════════════
// SUBCOMPONENT: SIDEBAR CONTENT
// ═══════════════════════════════════════════════════════════════════════

function SidebarContent({
  user,
  onLogout,
  pathname,
  onNavigate,
  showCloseButton,
  onClose,
}: SidebarContentProps) {
  const isActive = (route: string): boolean => {
    if (route === '/dashboard') return pathname === route
    return pathname.startsWith(route)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* SECTION 6 — LOGO / BRAND AREA */}
      <div className="h-16 h-16 flex items-center justify-between px-4 border-b border-[#1f1f1f] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-[30px] h-[30px] rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
              boxShadow: '0 0 0 1px rgba(37,99,235,0.4), 0 2px 8px rgba(37,99,235,0.3)',
            }}
          >
            <Scissors size={15} className="text-white" aria-hidden="true" />
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">FabricOS</span>
        </div>

        {showCloseButton && (
          <button
            onClick={onClose}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-white hover:bg-bg-surface/10 transition-colors duration-150"
            aria-label="Close navigation"
          >
            <X size={17} />
          </button>
        )}
      </div>

      {/* SECTION 7 — NAV SECTION LABEL */}
      <div className="px-5 pt-5 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-600">
          MENU
        </span>
      </div>

      {/* SECTION 8 — NAV ITEMS */}
      <nav className="flex-1 flex flex-col gap-1 px-0 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.route)
          const Icon = item.icon

          return (
            <div key={item.route} className="relative flex items-center">
              {active && (
                <span
                  className="absolute left-0 w-[3px] h-[22px] bg-blue-500 rounded-r-full transition-all duration-200 z-10"
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                onClick={() => onNavigate(item.route)}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? "w-full flex items-center gap-3 px-3 py-[10px] mx-2 rounded-xl text-white bg-accent transition-all duration-150 ease-in-out cursor-pointer relative overflow-hidden active:scale-[0.98] active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0f0f0f]"
                    : "w-full flex items-center gap-3 px-3 py-[10px] mx-2 rounded-xl text-gray-400 hover:text-white hover:bg-bg-surface/[0.05] transition-all duration-150 ease-in-out cursor-pointer group active:scale-[0.98] active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0f0f0f]"
                }
                style={{
                  width: 'calc(100% - 16px)',
                  boxShadow: active
                    ? '0 0 0 1px rgba(37,99,235,0.5), 0 4px 12px rgba(37,99,235,0.25)'
                    : 'none',
                }}
              >
                <Icon size={18} className="flex-shrink-0 transition-colors duration-150" aria-hidden="true" />
                <span className="text-sm font-medium flex-1 text-left transition-colors duration-150 truncate">
                  {item.label}
                </span>
                {item.badge !== null && item.badge > 0 && (
                  <span
                    className={
                      active
                        ? "ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-bg-surface text-accent text-[10px] font-bold leading-none"
                        : "ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold leading-none"
                    }
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </nav>

      {/* SECTION 9 — DIVIDER */}
      <div className="mx-3 my-2 h-px bg-[#1f1f1f] flex-shrink-0" />

      {/* SECTION 10 — BOTTOM USER SECTION */}
      <div className="mt-auto px-3 pb-4 pt-3 border-t border-[#1f1f1f] flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-2 px-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${getAvatarGradient(
              user.name
            )}`}
          >
            <span className="text-[11px] font-bold text-white">{getInitials(user.name)}</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[13px] font-semibold text-white truncate leading-tight">
              {user.name}
            </span>
            <span className="text-[11px] text-text-tertiary capitalize truncate leading-tight mt-0.5">
              {user.role}
            </span>
          </div>
          <button
            type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 hover:bg-bg-surface/10 transition-colors duration-150 flex-shrink-0"
            aria-label="Settings"
          >
            <Settings size={15} />
          </button>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/[0.08] transition-all duration-150 cursor-pointer"
        >
          <LogOut size={15} className="flex-shrink-0" aria-hidden="true" />
          <span className="text-[13px] font-medium">Log out</span>
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: SIDEBAR
// ═══════════════════════════════════════════════════════════════════════

export default function Sidebar({ user, onLogout, className = '' }: SidebarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleNavigate = (route: string) => {
    router.push(route)
    setIsDrawerOpen(false)
  }

  // Body scroll lock
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen])

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close on route change (for browser back/forward)
  useEffect(() => {
    setIsDrawerOpen(false)
  }, [pathname])

  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 h-screen w-[220px] border-r border-[#1f1f1f] z-40 overflow-y-auto [&::-webkit-scrollbar]:hidden ${className}`}
        style={{
          background: 'linear-gradient(180deg, #131313 0%, #0c0c0c 100%)',
          scrollbarWidth: 'none',
        }}
      >
        <SidebarContent
          user={user}
          onLogout={onLogout}
          pathname={pathname}
          onNavigate={handleNavigate}
          showCloseButton={false}
        />
      </aside>

      {/* 2. Mobile Hamburger Button */}
      <button
        type="button"
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-xl bg-[#1a1a1a] border border-[#262626] hover:bg-[#242424] hover:border-[#333333] active:scale-95 transition-all duration-150 cursor-pointer shadow-lg"
        onClick={() => setIsDrawerOpen((prev) => !prev)}
        aria-label={isDrawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isDrawerOpen}
        aria-controls="mobile-sidebar-drawer"
      >
        <span className={`transition-all duration-200 transform ${isDrawerOpen ? 'scale-100 opacity-100' : 'scale-100 opacity-100'}`}>
          {isDrawerOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
        </span>
      </button>

      {/* 3. Mobile Overlay */}
      <div
        className={`md:hidden fixed inset-0 z-30 bg-black/[0.65] backdrop-blur-[2px] transition-opacity duration-300 ease-in-out ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* 4. Mobile Drawer */}
      <aside
        id="mobile-sidebar-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`md:hidden fixed top-0 left-0 h-full w-[268px] z-40 flex flex-col border-r border-[#1f1f1f] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, #131313 0%, #0c0c0c 100%)',
          boxShadow: isDrawerOpen ? '8px 0 32px rgba(0,0,0,0.6)' : 'none',
        }}
      >
        <SidebarContent
          user={user}
          onLogout={onLogout}
          pathname={pathname}
          onNavigate={handleNavigate}
          showCloseButton={true}
          onClose={() => setIsDrawerOpen(false)}
        />
      </aside>
    </>
  )
}
