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

function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserListItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/users')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('불러오기 실패'))))
      .then((data: AdminUserListItem[]) => !cancelled && setUsers(data))
      .catch(() => !cancelled && setLoadError('사용자 목록을 불러오지 못했습니다'))
    return () => {
      cancelled = true
    }
  }, [])

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
  const { users, loadError } = useAdminUsers()

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
