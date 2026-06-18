'use client'

interface User {
  id: string
  business_name: string
  points: number
  joined_at: string
}

const MOCK: User[] = [
  { id: 'u1', business_name: '을지로 쌈밥 철수네', points: 1240, joined_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 'u2', business_name: '망원 수제버거하우스', points: 580, joined_at: new Date(Date.now() - 1296000000).toISOString() },
  { id: 'u3', business_name: '연남동 베이글베이커리', points: 320, joined_at: new Date(Date.now() - 432000000).toISOString() },
]

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="text-[20px] font-semibold text-[#1d1d1f] mb-5">사용자 관리</h1>
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">ID</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">사업장명</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">보유 포인트</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">가입일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {MOCK.map(u => (
              <tr key={u.id} className="hover:bg-[#f5f5f7] transition-colors">
                <td className="px-4 py-3 font-mono text-[12px] text-[#6e6e73]">{shortId(u.id)}</td>
                <td className="px-4 py-3 font-medium text-[#1d1d1f]">{u.business_name}</td>
                <td className="px-4 py-3 font-medium text-[#0066cc]">{u.points.toLocaleString()}P</td>
                <td className="px-4 py-3 text-[#6e6e73]">{new Date(u.joined_at).toLocaleDateString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
