'use client'
import { useState, useEffect } from 'react'

type Platform = 'naver' | 'toss' | 'google' | 'kakao' | 'danggeun' | 'naver_gfa'

interface AdAccount {
  id: string
  platform: Platform
  account_name: string
  account_id: string
  monthly_spend: number
  payback_rate: number
  status: 'pending' | 'active' | 'rejected'
  verified_at: string | null
}

interface Payback {
  id: string
  amount: number
  period: string
  status: 'pending' | 'confirmed' | 'paid'
  ad_accounts: {
    platform: string
    account_name: string
    monthly_spend: number
    payback_rate: number
  }
}

const PLATFORM_INFO: Record<Platform, { name: string; color: string; payback: string }> = {
  naver:     { name: '네이버',     color: '#03C75A', payback: '5.0%' },
  toss:      { name: '토스',       color: '#0066FF', payback: '3.0%' },
  google:    { name: '구글',       color: '#EA4335', payback: '3.5%' },
  kakao:     { name: '카카오',     color: '#FEE500', payback: '4.5%' },
  danggeun:  { name: '당근',       color: '#FF6F0F', payback: '2.5%' },
  naver_gfa: { name: '네이버 GFA', color: '#03C75A', payback: '4.0%' },
}

const PLATFORM_STATUS_LABEL = {
  pending:  { text: '검토중', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  active:   { text: '활성',   class: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { text: '거절',   class: 'bg-red-50 text-red-700 border-red-200' },
}

export default function HubPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [paybacks, setPaybacks] = useState<Payback[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState<{ platform: Platform; account_id: string; account_name: string; monthly_spend: string }>({
    platform: 'naver', account_id: '', account_name: '', monthly_spend: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'accounts' | 'paybacks'>('accounts')

  useEffect(() => {
    Promise.all([
      fetch('/api/ad-accounts').then(r => r.json()),
      fetch('/api/paybacks').then(r => r.json()),
    ]).then(([accs, pbs]) => {
      setAccounts(accs)
      setPaybacks(pbs)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const totalPayback = paybacks.reduce((sum, p) => sum + p.amount, 0)
  const confirmedPayback = paybacks.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await fetch('/api/ad-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: form.platform,
          account_id: form.account_id,
          account_name: form.account_name,
          monthly_spend: Number(form.monthly_spend.replace(/,/g, '')),
        }),
      })
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  function closeModal() {
    setShowModal(false)
    setSubmitted(false)
    setForm({ platform: 'naver', account_id: '', account_name: '', monthly_spend: '' })
    fetch('/api/ad-accounts').then(r => r.json()).then(setAccounts).catch(() => {})
  }

  const selectedPlatformInfo = PLATFORM_INFO[form.platform]
  const estimatedModalPayback = form.monthly_spend
    ? Math.round(Number(form.monthly_spend.replace(/,/g, '')) * parseFloat(selectedPlatformInfo.payback) / 100)
    : 0

  return (
    <div className="max-w-4xl mx-auto">
      {/* 상단 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-5">
          <p className="text-[13px] text-[#6e6e73] mb-1">연동 광고계정</p>
          <p className="text-[28px] font-semibold text-[#1d1d1f]">{accounts.length}개</p>
        </div>
        <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-5">
          <p className="text-[13px] text-[#6e6e73] mb-1">이번 달 페이백 예정</p>
          <p className="text-[28px] font-semibold text-[#0066cc]">{totalPayback.toLocaleString()}원</p>
        </div>
        <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-5">
          <p className="text-[13px] text-[#6e6e73] mb-1">확정 페이백</p>
          <p className="text-[28px] font-semibold text-green-600">{confirmedPayback.toLocaleString()}원</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        <div className="flex border-b border-[#e0e0e0]">
          <button
            onClick={() => setTab('accounts')}
            className={`flex-1 py-4 text-[14px] font-medium transition-colors ${tab === 'accounts' ? 'text-[#0066cc] border-b-2 border-[#0066cc]' : 'text-[#6e6e73]'}`}
          >
            광고계정 관리
          </button>
          <button
            onClick={() => setTab('paybacks')}
            className={`flex-1 py-4 text-[14px] font-medium transition-colors ${tab === 'paybacks' ? 'text-[#0066cc] border-b-2 border-[#0066cc]' : 'text-[#6e6e73]'}`}
          >
            페이백 내역
          </button>
        </div>

        <div className="p-6">
          {tab === 'accounts' && (
            <>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[16px] font-semibold text-[#1d1d1f]">광고계정 등록</h3>
                  <p className="text-[13px] text-[#6e6e73] mt-0.5">네이버·토스·구글·카카오·당근·네이버 GFA 광고계정을 연결하고 페이백 받기</p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-[#0066cc] text-white rounded-[9999px] px-4 py-2 text-[14px] font-medium hover:bg-[#0058b3] transition-colors"
                >
                  계정 추가
                </button>
              </div>

              {/* 페이백 요율 안내 */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {(Object.entries(PLATFORM_INFO) as [Platform, typeof PLATFORM_INFO[Platform]][]).map(([key, info]) => (
                  <div key={key} className="rounded-[11px] border border-[#e0e0e0] p-3 text-center">
                    <p className="text-[12px] text-[#6e6e73]">{info.name}</p>
                    <p className="text-[18px] font-semibold text-[#0066cc] mt-0.5">{info.payback}</p>
                    <p className="text-[11px] text-[#6e6e73]">페이백</p>
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-20 rounded-[11px] bg-[#f5f5f7] animate-pulse" />)}
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-12 text-[#6e6e73]">
                  <p className="text-[15px] mb-2">등록된 광고계정이 없습니다</p>
                  <p className="text-[13px]">계정을 추가하면 광고비의 최대 5%를 페이백 받을 수 있어요</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map(acc => {
                    const info = PLATFORM_INFO[acc.platform as Platform] ?? { name: acc.platform, color: '#6e6e73', payback: '0%' }
                    const status = PLATFORM_STATUS_LABEL[acc.status]
                    const estimatedPayback = Math.round(acc.monthly_spend * acc.payback_rate / 100)
                    return (
                      <div key={acc.id} className="flex items-center justify-between rounded-[11px] border border-[#e0e0e0] p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-[8px] flex items-center justify-center text-[11px] font-bold text-white"
                            style={{ backgroundColor: info.color === '#FEE500' ? '#191919' : info.color }}
                          >
                            {info.name[0]}
                          </div>
                          <div>
                            <p className="text-[14px] font-medium text-[#1d1d1f]">{acc.account_name}</p>
                            <p className="text-[12px] text-[#6e6e73]">ID: {acc.account_id} · 월 {acc.monthly_spend.toLocaleString()}원</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-[13px] font-semibold text-[#0066cc]">월 {estimatedPayback.toLocaleString()}원</p>
                            <p className="text-[11px] text-[#6e6e73]">예상 페이백</p>
                          </div>
                          <span className={`rounded-[9999px] border px-2.5 py-1 text-[11px] font-medium ${status.class}`}>
                            {status.text}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'paybacks' && (
            <>
              <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-5">페이백 내역</h3>
              <div className="space-y-3">
                {paybacks.map(pb => {
                  const statusMap = {
                    pending:   { text: '처리중',   class: 'text-amber-600 bg-amber-50 border-amber-200' },
                    confirmed: { text: '확정',     class: 'text-green-600 bg-green-50 border-green-200' },
                    paid:      { text: '지급완료', class: 'text-[#6e6e73] bg-[#f5f5f7] border-[#e0e0e0]' },
                  }
                  const s = statusMap[pb.status]
                  return (
                    <div key={pb.id} className="flex items-center justify-between rounded-[11px] border border-[#e0e0e0] p-4">
                      <div>
                        <p className="text-[14px] font-medium text-[#1d1d1f]">{pb.ad_accounts.account_name}</p>
                        <p className="text-[12px] text-[#6e6e73]">{pb.period} · {pb.ad_accounts.payback_rate}% 페이백</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-[16px] font-semibold text-[#0066cc]">+{pb.amount.toLocaleString()}원</p>
                        <span className={`rounded-[9999px] border px-2.5 py-1 text-[11px] font-medium ${s.class}`}>{s.text}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 광고계정 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeModal}>
          <div className="bg-white rounded-[18px] w-full max-w-[520px] mx-4 p-6" onClick={e => e.stopPropagation()}>
            {submitted ? (
              <div className="py-4 text-center">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-[18px] font-semibold text-[#1d1d1f] mb-2">영업권 신청이 완료되었습니다</h3>
                <p className="text-[14px] text-[#6e6e73] leading-relaxed">
                  영업일 기준 2일 이내에 영업권이 등록되고 나서<br />페이백 받을 수 있습니다.
                </p>
                <button
                  onClick={closeModal}
                  className="mt-6 w-full rounded-[9999px] bg-[#0066cc] py-3 text-[15px] font-medium text-white hover:bg-[#0058b3] transition-colors"
                >
                  확인
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-[18px] font-semibold text-[#1d1d1f] mb-1">광고계정 추가</h3>
                <p className="text-[13px] text-[#6e6e73] mb-5">광고계정 정보를 입력하면 퍼즐팀이 확인 후 영업권을 등록합니다</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">광고 플랫폼</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.entries(PLATFORM_INFO) as [Platform, typeof PLATFORM_INFO[Platform]][]).map(([key, info]) => (
                        <button
                          key={key}
                          onClick={() => setForm(f => ({ ...f, platform: key }))}
                          className={`rounded-[11px] border p-2.5 text-center transition-colors ${form.platform === key ? 'border-[#0066cc] bg-[#0066cc]/5' : 'border-[#e0e0e0]'}`}
                        >
                          <p className={`text-[12px] font-medium ${form.platform === key ? 'text-[#0066cc]' : 'text-[#1d1d1f]'}`}>{info.name}</p>
                          <p className="text-[11px] text-[#0066cc]">{info.payback}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">계정 명</label>
                    <input
                      type="text"
                      placeholder="광고계정 이름 또는 캠페인명"
                      value={form.account_name}
                      onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))}
                      className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">광고 계정 ID</label>
                    <input
                      type="text"
                      placeholder="예: 1234567890"
                      value={form.account_id}
                      onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
                      className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">월 광고 예산</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="예: 500,000"
                        value={form.monthly_spend}
                        onChange={e => setForm(f => ({ ...f, monthly_spend: e.target.value }))}
                        className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors pr-8"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#6e6e73]">원</span>
                    </div>
                    {form.monthly_spend && (
                      <p className="mt-1.5 text-[12px] text-[#0066cc]">
                        예상 월 페이백: {estimatedModalPayback.toLocaleString()}원
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={closeModal} className="flex-1 rounded-[9999px] border border-[#e0e0e0] py-3 text-[15px] text-[#6e6e73] hover:bg-[#f5f5f7] transition-colors">
                    취소
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !form.account_name || !form.account_id || !form.monthly_spend}
                    className="flex-1 rounded-[9999px] bg-[#0066cc] py-3 text-[15px] font-medium text-white hover:bg-[#0058b3] disabled:opacity-40 transition-colors"
                  >
                    {submitting ? '등록 중...' : '등록하기'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
