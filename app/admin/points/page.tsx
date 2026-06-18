'use client'

type PointSource = '영수증' | '팀구매' | '광고'

interface PointRecord {
  id: string
  user: string
  amount: number
  source: PointSource
  created_at: string
}

const MOCK: PointRecord[] = [
  { id: 'p1', user: '을지로 쌈밥 철수네', amount: 200, source: '영수증', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'p2', user: '망원 수제버거하우스', amount: 500, source: '팀구매', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'p3', user: '연남동 베이글베이커리', amount: -100, source: '광고', created_at: new Date(Date.now() - 14400000).toISOString() },
  { id: 'p4', user: '을지로 쌈밥 철수네', amount: 300, source: '팀구매', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'p5', user: '망원 수제버거하우스', amount: -200, source: '광고', created_at: new Date(Date.now() - 172800000).toISOString() },
]

const SOURCE_STYLE: Record<PointSource, string> = {
  '영수증': 'bg-blue-50 text-blue-700',
  '팀구매': 'bg-violet-50 text-violet-700',
  '광고': 'bg-amber-50 text-amber-700',
}

export default function AdminPointsPage() {
  return (
    <div>
      <h1 className="text-[20px] font-semibold text-[#1d1d1f] mb-5">포인트 내역</h1>
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">사용자</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">포인트</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">출처</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">일시</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {MOCK.map(p => (
              <tr key={p.id} className="hover:bg-[#f5f5f7] transition-colors">
                <td className="px-4 py-3 font-medium text-[#1d1d1f]">{p.user}</td>
                <td className={`px-4 py-3 font-medium tabular-nums ${p.amount > 0 ? 'text-[#0066cc]' : 'text-red-600'}`}>
                  {p.amount > 0 ? `+${p.amount}` : p.amount}P
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${SOURCE_STYLE[p.source]}`}>
                    {p.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#6e6e73]">
                  {new Date(p.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
