'use client'
import { useState, useEffect } from 'react'
import { Platform, PLATFORM_INFO, ConnectionStatus } from '@/lib/hub'
import AccountStatusBadges from '@/components/hub/AccountStatusBadges'
import TransferGuide from '@/components/hub/TransferGuide'
import SettlementTable, { PaybackLineItem } from '@/components/hub/SettlementTable'
import NaverCredentialsModal from '@/components/hub/NaverCredentialsModal'

interface AdAccount {
  id: string
  platform: Platform
  account_name: string
  account_id: string
  monthly_spend: number
  payback_rate: number
  transfer_status: 'waiting' | 'transfer_needed' | 'verifying' | 'completed'
  connection_status: ConnectionStatus
  cost_verification_status: 'not_configured' | 'configured' | 'verified' | 'failed'
}

type Tab = 'accounts' | 'statements' | 'guide'

export default function HubPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [paybacks, setPaybacks] = useState<PaybackLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(false)
  const [form, setForm] = useState<{ platform: Platform; account_id: string; account_name: string; monthly_spend: string }>({
    platform: 'naver', account_id: '', account_name: '', monthly_spend: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<Tab>('accounts')
  const [guidePlatform, setGuidePlatform] = useState<Platform>('naver')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [credentialAccountId, setCredentialAccountId] = useState<string | null>(null)

  function loadData() {
    setLoading(true)
    Promise.all([
      fetch('/api/ad-accounts').then(r => r.json()),
      fetch('/api/paybacks').then(r => r.json()),
    ]).then(([accs, pbs]) => {
      setAccounts(Array.isArray(accs) ? accs : [])
      setPaybacks(Array.isArray(pbs) ? pbs : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(loadData, [])

  const totalPayback = paybacks
    .filter(p => p.status !== 'paid')
    .reduce((sum, p) => sum + p.amount, 0)
  const confirmedPayback = paybacks.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/ad-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: form.platform,
          account_id: form.account_id,
          account_name: form.account_name,
          monthly_spend: Number(form.monthly_spend.replace(/,/g, '')),
        }),
      })
      if (!res.ok) return
      const newAccount = await res.json() as AdAccount & { duplicateWarning: boolean }
      setAccounts(prev => [newAccount, ...prev])
      setDuplicateWarning(newAccount.duplicateWarning)
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmTransfer(id: string) {
    setConfirmingId(id)
    try {
      const res = await fetch(`/api/ad-accounts/${id}/confirm-transfer`, { method: 'POST' })
      if (res.ok) {
        setAccounts(prev => prev.map(a => a.id === id ? { ...a, transfer_status: 'verifying' } : a))
      }
    } finally {
      setConfirmingId(null)
    }
  }

  async function handleCancelTransfer(id: string) {
    setCancelingId(id)
    try {
      const res = await fetch(`/api/ad-accounts/${id}/cancel-transfer`, { method: 'POST' })
      if (res.ok) {
        setAccounts(prev => prev.map(a => a.id === id ? { ...a, transfer_status: 'transfer_needed' } : a))
      }
    } finally {
      setCancelingId(null)
    }
  }

  function openGuideFor(platform: Platform) {
    setGuidePlatform(platform)
    setTab('guide')
  }

  function closeAddModal() {
    setShowAddModal(false)
    setSubmitted(false)
    setDuplicateWarning(false)
    setForm({ platform: 'naver', account_id: '', account_name: '', monthly_spend: '' })
  }

  const selectedPlatformInfo = PLATFORM_INFO[form.platform]
  const estimatedModalPayback = form.monthly_spend
    ? Math.round(Number(form.monthly_spend.replace(/,/g, '')) * selectedPlatformInfo.paybackRate / 100)
    : 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-5">
          <p className="text-[13px] text-[#6e6e73] mb-1">연동 광고계정</p>
          <p className="text-[28px] font-semibold text-[#1d1d1f]">{accounts.length}개</p>
        </div>
        <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-5">
          <p className="text-[13px] text-[#6e6e73] mb-1">정산 예정 페이백</p>
          <p className="text-[28px] font-semibold text-[#0066cc]">{totalPayback.toLocaleString()}P</p>
        </div>
        <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-5">
          <p className="text-[13px] text-[#6e6e73] mb-1">확정 페이백</p>
          <p className="text-[28px] font-semibold text-green-600">{confirmedPayback.toLocaleString()}P</p>
        </div>
      </div>

      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        <div className="flex border-b border-[#e0e0e0]">
          {([
            ['accounts', '광고계정 관리'],
            ['statements', '정산 내역'],
            ['guide', '이관 가이드'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-4 text-[14px] font-medium transition-colors ${tab === key ? 'text-[#0066cc] border-b-2 border-[#0066cc]' : 'text-[#6e6e73]'}`}
            >
              {label}
            </button>
          ))}
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
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#0066cc] text-white rounded-[9999px] px-4 py-2 text-[14px] font-medium hover:bg-[#0058b3] transition-colors"
                >
                  계정 추가
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {(Object.entries(PLATFORM_INFO) as [Platform, typeof PLATFORM_INFO[Platform]][]).map(([key, info]) => (
                  <div key={key} className="rounded-[11px] border border-[#e0e0e0] p-3 text-center">
                    <p className="text-[12px] text-[#6e6e73]">{info.name}</p>
                    <p className="text-[18px] font-semibold text-[#0066cc] mt-0.5">{info.paybackRate}%</p>
                    <p className="text-[11px] text-[#6e6e73]">페이백</p>
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-24 rounded-[11px] bg-[#f5f5f7] animate-pulse" />)}
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-12 text-[#6e6e73]">
                  <p className="text-[15px] mb-2">등록된 광고계정이 없습니다</p>
                  <p className="text-[13px]">계정을 추가하면 광고비의 최대 5%를 페이백 받을 수 있어요</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map(acc => {
                    const info = PLATFORM_INFO[acc.platform] ?? { name: acc.platform, color: '#6e6e73', paybackRate: 0 }
                    const estimatedPayback = Math.round(acc.monthly_spend * acc.payback_rate / 100)
                    return (
                      <div key={acc.id} className="rounded-[11px] border border-[#e0e0e0] p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-[8px] flex items-center justify-center text-[11px] font-bold text-white"
                              style={{ backgroundColor: info.color }}
                            >
                              {info.name[0]}
                            </div>
                            <div>
                              <p className="text-[14px] font-medium text-[#1d1d1f]">{acc.account_name}</p>
                              <p className="text-[12px] text-[#6e6e73]">ID: {acc.account_id} · 월 {acc.monthly_spend.toLocaleString()}원(제출값)</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-[13px] font-semibold text-[#0066cc]">월 {estimatedPayback.toLocaleString()}P</p>
                              <p className="text-[11px] text-[#6e6e73]">예상 페이백</p>
                            </div>
                            <AccountStatusBadges transferStatus={acc.transfer_status} connectionStatus={acc.connection_status} />
                          </div>
                        </div>

                        {acc.connection_status === 'duplicate' && (
                          <p className="mt-2 text-[12px] text-red-600">
                            이미 등록된 계정과 동일하게 감지되어 검토가 필요해요. 퍼즐팀이 확인 후 연락드려요.
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {(acc.transfer_status === 'transfer_needed' || acc.transfer_status === 'waiting') && (
                            <>
                              <button
                                onClick={() => openGuideFor(acc.platform)}
                                className="rounded-[9999px] bg-[#0066cc] text-white px-3.5 py-1.5 text-[12px] font-medium hover:bg-[#0058b3] transition-colors"
                              >
                                이관 진행하기
                              </button>
                              <button
                                onClick={() => handleConfirmTransfer(acc.id)}
                                disabled={confirmingId === acc.id}
                                className="rounded-[9999px] border border-[#e0e0e0] px-3.5 py-1.5 text-[12px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50 transition-colors"
                              >
                                {confirmingId === acc.id ? '요청 중...' : '이관 완료, 확인 요청'}
                              </button>
                            </>
                          )}
                          {acc.transfer_status === 'verifying' && (
                            <>
                              <span className="text-[12px] text-blue-600">퍼즐팀이 연동을 확인하고 있어요</span>
                              <button
                                onClick={() => handleCancelTransfer(acc.id)}
                                disabled={cancelingId === acc.id}
                                className="rounded-[9999px] px-3 py-1 text-[12px] text-[#6e6e73] underline decoration-dotted underline-offset-2 hover:text-[#1d1d1f] disabled:opacity-50 transition-colors"
                              >
                                {cancelingId === acc.id ? '취소 중...' : '취소'}
                              </button>
                            </>
                          )}
                          {acc.platform === 'naver' && acc.transfer_status === 'completed' && acc.cost_verification_status === 'not_configured' && (
                            <button
                              onClick={() => setCredentialAccountId(acc.id)}
                              className="rounded-[9999px] border border-[#0066cc] text-[#0066cc] px-3.5 py-1.5 text-[12px] font-medium hover:bg-[#0066cc]/5 transition-colors"
                            >
                              비용 자동 확인용 API 키 등록
                            </button>
                          )}
                          {acc.cost_verification_status === 'configured' && (
                            <span className="text-[12px] text-[#6e6e73]">API 키 등록됨 · 비용 확인 대기 중</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'statements' && (
            <>
              <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-1">정산 내역</h3>
              <p className="text-[13px] text-[#6e6e73] mb-5">퍼즐코퍼레이션이 발행하는 월별 정산내역서예요. PDF로도 받아보실 수 있어요.</p>
              <SettlementTable paybacks={paybacks} />
            </>
          )}

          {tab === 'guide' && (
            <>
              <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-1">영업권 이관 가이드</h3>
              <p className="text-[13px] text-[#6e6e73] mb-5">플랫폼별로 담당자 계정을 초대하는 방법을 순서대로 안내해드려요.</p>
              <TransferGuide initialPlatform={guidePlatform} />
            </>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeAddModal}>
          <div className="bg-white rounded-[18px] w-full max-w-[520px] mx-4 p-6" onClick={e => e.stopPropagation()}>
            {submitted ? (
              <div className="py-4 text-center">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-[18px] font-semibold text-[#1d1d1f] mb-2">
                  {duplicateWarning ? '등록되었지만 확인이 필요해요' : '광고계정이 등록되었습니다'}
                </h3>
                <p className="text-[14px] text-[#6e6e73] leading-relaxed">
                  {duplicateWarning
                    ? '동일한 계정이 이미 등록돼 있어 퍼즐팀이 확인 후 연락드려요.'
                    : <>영업권 이관 가이드를 따라 진행해주시면{'\n'}이관 완료 후 페이백 대상이 됩니다.</>}
                </p>
                <button
                  onClick={() => { closeAddModal(); setTab('accounts') }}
                  className="mt-6 w-full rounded-[9999px] bg-[#0066cc] py-3 text-[15px] font-medium text-white hover:bg-[#0058b3] transition-colors"
                >
                  확인
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-[18px] font-semibold text-[#1d1d1f] mb-1">광고계정 추가</h3>
                <p className="text-[13px] text-[#6e6e73] mb-5">등록 후 영업권 이관을 완료해야 페이백 대상이 됩니다</p>

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
                          <p className="text-[11px] text-[#0066cc]">{info.paybackRate}%</p>
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
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">월 광고 예산(제출값)</label>
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
                        예상 월 페이백: +{estimatedModalPayback.toLocaleString()}P (연동 완료 후 실비용 기준으로 재계산돼요)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={closeAddModal} className="flex-1 rounded-[9999px] border border-[#e0e0e0] py-3 text-[15px] text-[#6e6e73] hover:bg-[#f5f5f7] transition-colors">
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

      {credentialAccountId && (
        <NaverCredentialsModal
          accountId={credentialAccountId}
          onClose={() => setCredentialAccountId(null)}
          onSaved={() => { setCredentialAccountId(null); loadData() }}
        />
      )}
    </div>
  )
}
