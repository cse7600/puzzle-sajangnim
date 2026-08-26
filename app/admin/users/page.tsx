'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type VerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'

interface AdminUserListItem {
  id: string
  business_name: string
  email: string
  verification_status: VerificationStatus
  created_at: string
}

const STATUS_BADGE: Record<VerificationStatus, { label: string; className: string }> = {
  not_submitted: { label: '미등록', className: 'bg-gray-100 text-gray-500' },
  pending: { label: '심사중', className: 'bg-blue-50 text-blue-600' },
  approved: { label: '승인', className: 'bg-green-50 text-green-600' },
  rejected: { label: '반려', className: 'bg-red-50 text-red-600' },
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function UsersTableSkeleton() {
  return (
    <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-4 animate-pulse space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 w-full bg-[#f0f0f2] rounded" />
      ))}
    </div>
  )
}

async function describeFetchFailure(res: Response | null, thrown: unknown): Promise<string> {
  if (!res) {
    const reason = thrown instanceof Error ? thrown.message : String(thrown)
    return `사용자 목록을 불러오지 못했습니다 (네트워크 오류: ${reason})`
  }
  const body = await res.text().catch(() => '')
  return `사용자 목록을 불러오지 못했습니다 (HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ''})`
}

function useAdminUsers(router: ReturnType<typeof useRouter>) {
  const [users, setUsers] = useState<AdminUserListItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let res: Response | null = null
      try {
        res = await fetch('/api/admin/users')
        if (res.status === 401 || res.status === 403) {
          // 관리자 세션 만료(또는 QA 쿠키 잔여 등 인가 실패) — 데이터 문제로 오해하지 않도록 재로그인으로 보낸다.
          router.replace('/admin/login?next=%2Fadmin%2Fusers')
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as AdminUserListItem[]
        if (!cancelled) setUsers(data)
      } catch (thrown) {
        if (!cancelled) setLoadError(await describeFetchFailure(res, thrown))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  return { users, loadError }
}

function UserRow({ user, onClick }: { user: AdminUserListItem; onClick: () => void }) {
  const badge = STATUS_BADGE[user.verification_status]
  return (
    <tr onClick={onClick} className="hover:bg-[#f5f5f7] transition-colors cursor-pointer">
      <td className="px-4 py-3 font-mono text-[12px] text-[#6e6e73]">{shortId(user.id)}</td>
      <td className="px-4 py-3 font-medium text-[#1d1d1f]">{user.business_name}</td>
      <td className="px-4 py-3">
        <span className={`inline-block rounded-full px-2.5 py-1 text-[12px] font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </td>
      <td className="px-4 py-3 text-[#6e6e73]">{new Date(user.created_at).toLocaleDateString('ko-KR')}</td>
    </tr>
  )
}

function UsersTable({ users, onSelect }: { users: AdminUserListItem[]; onSelect: (id: string) => void }) {
  return (
    <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
      <table className="w-full text-[13px]">
        <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">ID</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">사업장명 / 이메일</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">사업자 등록 상태</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">가입일</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e0e0e0]">
          {users.map(u => (
            <UserRow key={u.id} user={u} onClick={() => onSelect(u.id)} />
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-[#6e6e73]">
                등록된 사용자가 없습니다
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { users, loadError } = useAdminUsers(router)

  return (
    <div>
      <h1 className="text-[20px] font-semibold text-[#1d1d1f] mb-5">사용자 관리</h1>

      {loadError ? (
        <div className="rounded-[11px] bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
          {loadError}
        </div>
      ) : !users ? (
        <UsersTableSkeleton />
      ) : (
        <UsersTable users={users} onSelect={id => router.push(`/admin/users/${id}`)} />
      )}
    </div>
  )
}
