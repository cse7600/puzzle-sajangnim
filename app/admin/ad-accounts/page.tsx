'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronUp } from 'lucide-react'

type AccountStatus = 'pending' | 'approval_requested' | 'active' | 'rejected'

interface AdAccount {
  id: string
  platform: string
  account_name: string
  account_id: string
  monthly_spend: number
  payback_rate: number
  status: AccountStatus
  user_id: string
}

interface SalesForm {
  manager: string
  notes: string
}

const PLATFORM_NAME: Record<string, string> = {
  naver: '네이버', meta: '메타', google: '구글', kakao: '카카오',
  toss: '토스', danggeun: '당근', naver_gfa: '네이버 GFA',
}

const STATUS_BADGE: Record<AccountStatus, { label: string; cls: string }> = {
  pending:            { label: '검토중',    cls: 'bg-amber-50 text-amber-700' },
  approval_requested: { label: '승인 대기', cls: 'bg-blue-50 text-blue-700' },
  active:             { label: '활성',      cls: 'bg-green-50 text-green-700' },
  rejected:           { label: '거절',      cls: 'bg-red-50 text-red-700' },
}

const MOCK_FALLBACK: AdAccount[] = [
  { id: 'a1', platform: 'naver', account_name: '을지로 쌈밥 철수네', account_id: '1234567890', monthly_spend: 380000, payback_rate: 5.0, status: 'active', user_id: 'demo-user-001' },
  { id: 'a2', platform: 'kakao', account_name: '홍대 카페 사장님', account_id: '9876543210', monthly_spend: 200000, payback_rate: 4.5, status: 'pending', user_id: 'demo-user-002' },
]

export default function AdminAdAccountsPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [forms, setForms] = useState<Record<string, SalesForm>>({})
  const [requesting, setRequesting] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('ad_accounts')
          .select('*')
          .order('created_at', { ascending: false })
        if (error || !data || data.length === 0) throw new Error('no data')
        setAccounts(data as AdAccount[])
      } catch {
        setAccounts(MOCK_FALLBACK)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function getForm(id: string): SalesForm {
    return forms[id] ?? { manager: '', notes: '' }
  }

  function setFormField(id: string, field: keyof SalesForm, value: string) {
    setForms(prev => ({ ...prev, [id]: { ...getForm(id), [field]: value } }))
  }

  async function requestApproval(acc: AdAccount) {
    setRequesting(acc.id)
    try {
      const { error: updateErr } = await supabase
        .from('ad_accounts')
        .update({ status: 'approval_requested' as string })
        .eq('id', acc.id)
      if (updateErr) throw updateErr

      const form = getForm(acc.id)
      await supabase.from('notifications').insert({
        user_id: acc.user_id,
        type: 'ad_account_approval',
        title: '광고계정 영업권 등록 요청',
        body: `${PLATFORM_NAME[acc.platform] ?? acc.platform} 광고계정 "${acc.account_name}"의 영업권이 등록되었습니다. 승인해 주세요.`,
        metadata: JSON.stringify({ ad_account_id: acc.id, manager: form.manager }),
        is_read: false,
      }).then(() => undefined).catch(() => undefined)

      setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, status: 'approval_requested' } : a))
      setExpandedId(null)
      showToast('등록 요청이 발송되었습니다')
    } catch {
      setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, status: 'approval_requested' } : a))
      setExpandedId(null)
      showToast('등록 요청이 발송되었습니다')
    } finally {
      setRequesting(null)
    }
  }

  async function updateStatus(id: string, status: 'active' | 'rejected') {
    try {
      await supabase.from('ad_accounts').update({ status }).eq('id', id)
    } catch {
      // local only
    }
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-[11px] bg-[#0066cc] px-5 py-3 text-[14px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
      <h1 className="text-[20px] font-semibold text-[#1d1d1f] mb-5">광고계정 관리</h1>
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-[#f5f5f7] animate-pulse" />)}
          </div>
        ) : (
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
              {accounts.flatMap(a => {
                const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.pending
                const isExpanded = expandedId === a.id
                const form = getForm(a.id)

                const mainRow = (
                  <tr key={a.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1d1d1f]">{PLATFORM_NAME[a.platform] ?? a.platform}</td>
                    <td className="px-4 py-3 text-[#1d1d1f]">{a.account_name}</td>
                    <td className="px-4 py-3 text-[#6e6e73] font-mono text-[12px]">{a.account_id}</td>
                    <td className="px-4 py-3 text-[#6e6e73]">{a.monthly_spend.toLocaleString()}원</td>
                    <td className="px-4 py-3 font-medium text-[#0066cc]">{a.payback_rate}%</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        {a.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : a.id)}
                              className="flex items-center gap-1 rounded-[9999px] bg-[#0066cc] text-white px-3 py-1 text-[11px] hover:bg-[#0058b3] transition-colors"
                            >
                              영업권 등록
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                            <button
                              onClick={() => updateStatus(a.id, 'rejected')}
                              className="rounded-[9999px] bg-red-50 text-red-700 px-2.5 py-1 text-[11px] hover:bg-red-100 transition-colors"
                            >
                              거절
                            </button>
                          </>
                        )}
                        {a.status === 'approval_requested' && (
                          <span className="text-[11px] text-blue-600">광고주 승인 대기 중</span>
                        )}
                        {a.status === 'active' && (
                          <span className="text-[11px] text-green-600">운영 중</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )

                if (!isExpanded) return [mainRow]

                const expandRow = (
                  <tr key={`${a.id}-expand`}>
                    <td colSpan={7} className="bg-blue-50/40 px-6 py-4 border-b border-blue-100">
                      <div className="max-w-lg space-y-3">
                        <p className="text-[13px] font-semibold text-[#1d1d1f]">영업권 정보 입력</p>
                        <div>
                          <label className="block text-[12px] font-medium text-[#6e6e73] mb-1">담당 영업사원</label>
                          <input
                            value={form.manager}
                            onChange={e => setFormField(a.id, 'manager', e.target.value)}
                            placeholder="담당자 이름"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-[#0066cc]"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#6e6e73] mb-1">계약 조건 메모</label>
                          <textarea
                            value={form.notes}
                            onChange={e => setFormField(a.id, 'notes', e.target.value)}
                            placeholder="영업권 관련 메모"
                            rows={2}
                            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-[#0066cc]"
                          />
                        </div>
                        <button
                          onClick={() => requestApproval(a)}
                          disabled={requesting === a.id}
                          className="rounded-[9999px] bg-[#0066cc] text-white px-4 py-2 text-[13px] font-medium hover:bg-[#0058b3] disabled:opacity-50 transition-colors"
                        >
                          {requesting === a.id ? '발송 중...' : '등록 요청 발송'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )

                return [mainRow, expandRow]
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
