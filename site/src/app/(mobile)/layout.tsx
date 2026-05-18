'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Route, MapPin, LogOut } from 'lucide-react'

const mobileNav = [
  { name: 'Rota do Dia', href: '/rota/hoje', icon: Route },
]

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-[#0d0d24]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">RotaFácil</span>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-gray-400 hover:text-red-400 p-2 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-20">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0d0d24]/95 backdrop-blur-xl border-t border-white/5 z-30">
        <div className="flex justify-around py-2">
          {mobileNav.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
                  isActive
                    ? 'text-blue-400'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
