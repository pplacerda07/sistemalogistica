'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Route,
  LogOut,
  Menu,
  X,
  MapPin,
  UserCog,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Rotas', href: '/rotas', icon: Route },
  { name: 'Usuários', href: '/usuarios', icon: UserCog },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0d0d24]/95 backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              RotaFácil
            </span>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/15 to-indigo-500/15 text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/5">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center px-4 lg:px-8 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-xl sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
