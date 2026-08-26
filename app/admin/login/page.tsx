import AdminLoginForm from './AdminLoginForm'

function sanitizeNext(next?: string): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next
  return '/admin'
}

// 이 페이지는 middleware.ts의 admin 게이트에서 명시적으로 제외되어 있다.
// 제외하지 않으면 관리자 증명이 없는 사용자가 /admin/login 자체에서 다시
// /admin/login으로 리다이렉트되는 루프에 빠진다.
export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  const next = sanitizeNext(searchParams.next)

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <span className="text-[28px] font-bold text-[#1d1d1f]">퍼즐 어드민</span>
          <p className="mt-2 text-[15px] text-[#6e6e73]">관리자 전용 진입</p>
        </div>
        <AdminLoginForm next={next} />
      </div>
    </div>
  )
}
