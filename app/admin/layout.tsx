'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Wallet,
  Receipt,
  ShoppingBag,
  Coins,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

const NAV = [
  { label: '대시보드', href: '/admin', icon: LayoutDashboard },
  { label: '사용자', href: '/admin/users', icon: Users },
  { label: '광고계정', href: '/admin/ad-accounts', icon: Megaphone },
  { label: '정산 관리', href: '/admin/settlement', icon: Wallet },
  { label: '영수증 검토', href: '/admin/receipts', icon: Receipt },
  { label: '팀 구매', href: '/admin/team-deals', icon: ShoppingBag },
  { label: '포인트', href: '/admin/points', icon: Coins },
]

const COLLAPSE_STORAGE_KEY = 'puzzle-admin-sidebar-collapsed'

async function enterQaMode() {
  const res = await fetch('/api/admin/qa-mode', { method: 'POST' })
  if (res.ok) window.location.assign('/hub')
}

async function logoutAdmin() {
  await fetch('/api/admin/login', { method: 'DELETE' })
  window.location.assign('/admin/login')
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY)
    setCollapsed(stored === 'true')
    setHydrated(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next))
      return next
    })
  }

  const asideWidth = collapsed ? 'w-[64px]' : 'w-[220px]'

  return (
    <div className="flex h-screen bg-[#f5f5f7]">
      <aside
        className={`${asideWidth} bg-[#1d1d1f] flex flex-col shrink-0 transition-[width] duration-200 ${hydrated ? '' : 'invisible'}`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          {!collapsed && (
            <div>
              <p className="text-[16px] font-bold text-white">퍼즐 어드민</p>
              <p className="text-[11px] text-gray-500 mt-0.5">관리자 전용</p>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
            className="text-gray-400 hover:text-white transition-colors shrink-0"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  pathname === item.href
                    ? 'bg-[#0066cc]/20 text-[#60a5fa]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
        <div className={`p-4 border-t border-white/10 space-y-2 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          <button
            type="button"
            onClick={enterQaMode}
            title="사용자 대시보드로 넘어가기"
            className={`text-[12px] font-medium text-[#60a5fa] hover:text-[#93c5fd] transition-colors ${collapsed ? '' : 'block w-full text-left'}`}
          >
            {collapsed ? '→' : '사용자 대시보드로 넘어가기 →'}
          </button>
          <button
            type="button"
            onClick={logoutAdmin}
            title="로그아웃"
            className={`text-[12px] text-gray-500 hover:text-gray-300 transition-colors ${collapsed ? '' : 'block w-full text-left'}`}
          >
            {collapsed ? '⎋' : '로그아웃'}
          </button>
          <Link
            href="/"
            title="사이트로 돌아가기"
            className={`text-[12px] text-gray-500 hover:text-gray-300 ${collapsed ? 'flex justify-center' : 'block'}`}
          >
            {collapsed ? '←' : '← 사이트로 돌아가기'}
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
