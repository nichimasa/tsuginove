'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Bell, User, BookOpen } from 'lucide-react'

const navItems = [
  { href: '/', icon: Home, label: 'ホーム' },
  { href: '/notifications', icon: Bell, label: '通知' },
  { href: '/profile', icon: User, label: 'マイページ' },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 h-14 flex items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          <span className="text-xl font-bold text-indigo-600">つぎノベ</span>
        </Link>
      </header>

      {/* Bottom nav for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex sm:hidden">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors
                ${active ? 'text-indigo-600' : 'text-gray-400'}`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Side nav for desktop */}
      <aside className="hidden sm:flex fixed left-0 top-14 bottom-0 w-56 border-r border-gray-100 bg-white flex-col gap-1 p-3 z-30">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </aside>
    </>
  )
}
