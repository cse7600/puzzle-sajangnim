'use client'
import { useState } from 'react'

interface AdAccount {
  id: string
  platform: string
  account_name: string
  account_id: string
  monthly_spend: number
  payback_rate: number
  status: 'pending' | 'active' | 'rejected'
}

const MOCK: AdAccount[] = [
  { id: 'a1', platform: 'naver', account_name: '을지로 쌈밥 철수네', account_id: '1234567890', monthly_spend: 380000, payback_rate: 5.0, status: 'active' },
]

const PLATFORM_NAME: Record<string, string> = { naver: '네이버', meta: '메타', google: '구글', kakao: '카카오' }

export default function AdminAdAccountsPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>(MOCK)

  function updateStatus(id: string, status: 'active' | 'rejected') {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  return (
    <div>
      <h1 className="text-[20px] font-semibold text-[#1d1d1f] mb-5">광고계정 관리</h1>
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">플랫폼</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">계정명</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">계정 ID</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">월 예산</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">페이백율</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상태</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {accounts.map(a => (
              <tr key={a.id} className="hover:bg-[#f5f5f7] transition-colors">
                <td className="px-4 py-3 font-medium text-[#1d1d1f]">{PLATFORM_NAME[a.platform] ?? a.platform}</td>
                <td className="px-4 py-3 text-[#1d1d1f]">{a.account_name}</td>
                <td className="px-4 py-3 text-[#6e6e73] font-mono text-[12px]">{a.account_id}</td>
                <td className="px-4 py-3 text-[#6e6e73]">{a.monthly_spend.toLocaleString()}원</td>
                <td className="px-4 py-3 font-medium text-[#0066cc]">{a.payback_rate}%</td>
                <td className="px-4 py-3">
                  <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${
                    a.status === 'active' ? 'bg-green-50 text-green-700' :
                    a.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {a.status === 'active' ? '활성' : a.status === 'pending' ? '검토중' : '거절'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(a.id, 'active')} className="rounded-[9999px] bg-green-50 text-green-700 px-2.5 py-1 text-[11px] hover:bg-green-100 transition-colors">승인</button>
                      <button onClick={() => updateStatus(a.id, 'rejected')} className="rounded-[9999px] bg-red-50 text-red-700 px-2.5 py-1 text-[11px] hover:bg-red-100 transition-colors">거절</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
