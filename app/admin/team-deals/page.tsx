'use client'

interface TeamDeal {
  id: string
  title: string
  current: number
  target: number
  status: '모집중' | '마감' | '완료'
  deadline: string
}

const MOCK: TeamDeal[] = [
  { id: 'd1', title: '네이버 광고 공동 구매 6월', current: 4, target: 10, status: '모집중', deadline: '2026.06.30' },
  { id: 'd2', title: '카카오 플러스친구 홍보 패키지', current: 8, target: 8, status: '마감', deadline: '2026.06.20' },
  { id: 'd3', title: '인스타그램 릴스 광고 공동', current: 10, target: 10, status: '완료', deadline: '2026.06.10' },
]

const STATUS_STYLE: Record<TeamDeal['status'], string> = {
  '모집중': 'bg-amber-50 text-amber-700',
  '마감': 'bg-blue-50 text-blue-700',
  '완료': 'bg-green-50 text-green-700',
}

export default function AdminTeamDealsPage() {
  return (
    <div>
      <h1 className="text-[20px] font-semibold text-[#1d1d1f] mb-5">팀 구매 관리</h1>
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">제목</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">모집 현황</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상태</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">마감일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {MOCK.map(d => (
              <tr key={d.id} className="hover:bg-[#f5f5f7] transition-colors">
                <td className="px-4 py-3 font-medium text-[#1d1d1f]">{d.title}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[#1d1d1f] font-medium">{d.current}/{d.target}명</span>
                    <div className="w-20 h-1.5 rounded-full bg-[#e0e0e0] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0066cc]"
                        style={{ width: `${Math.round((d.current / d.target) * 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[d.status]}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#6e6e73]">{d.deadline}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
