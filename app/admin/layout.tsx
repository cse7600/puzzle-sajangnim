'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: '대시보드', href: '/admin' },
  { label: '사용자', href: '/admin/users' },
  { label: '광고계정', href: '/admin/ad-accounts' },
  { label: '영수증 검토', href: '/admin/receipts' },
  { label: '팀 구매', href: '/admin/team-deals' },
  { label: '포인트', href: '/admin/points' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex h-screen bg-[#f5f5f7]">
      <aside className="w-[220px] bg-[#1d1d1f] flex flex-col shrink-0">
        <div className="p-5 border-b border-white/10">
          <p className="text-[16px] font-bold text-white">퍼즐 어드민</p>
          <p className="text-[11px] text-gray-500 mt-0.5">관리자 전용</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-[8px] px-3 py-2 text-[13px] transition-colors ${
                pathname === item.href
                  ? 'bg-[#0066cc]/20 text-[#60a5fa]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <Link href="/" className="text-[12px] text-gray-500 hover:text-gray-300">← 사이트로 돌아가기</Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
