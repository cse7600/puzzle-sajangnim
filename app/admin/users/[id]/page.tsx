'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  PLATFORM_INFO,
  TRANSFER_STATUS_LABEL,
  CONNECTION_STATUS_LABEL,
  PAYBACK_STATUSES,
  PAYBACK_STATUS_LABEL,
} from '@/lib/hub'
import type { AdAccount, BusinessVerification } from '@/types/database'

interface VerificationDetail extends BusinessVerification {
  certificate_url: string | null
  bankbook_copy_url: string | null
}

interface PaybackSummary {
  draft: number
  review_1: number
  review_2: number
  confirmed: number
  paid: number
  total: number
}

interface UserDetailResponse {
  user: { id: string; email: string; business_name: string; created_at: string }
  verification: VerificationDetail | null
  ad_accounts: AdAccount[]
  paybacks: PaybackSummary
  budget: { total_monthly_spend: number }
}

interface BusinessInfoFormValues {
  tax_invoice_email: string
  business_address: string
  naver_place_url: string
  bank_name: string
  account_number: string
  account_holder: string
}

interface BusinessInfoResponse {
  tax_invoice_email: string | null
  business_address: string | null
  naver_place_url: string | null
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
}

const CONNECTION_LABEL_FALLBACK: Record<string, string> = {
  duplicate: '중복 계정',
  reviewing: '검토 중',
  connected: '연동 완료',
}

function money(amount: number) {
  return `${amount.toLocaleString('ko-KR')}원`
}

function platformLabel(platform: string) {
  return PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO]?.name ?? platform
}

function connectionLabel(status: string) {
  const known = Object.prototype.hasOwnProperty.call(CONNECTION_STATUS_LABEL, status)
  return known ? CONNECTION_STATUS_LABEL[status as keyof typeof CONNECTION_STATUS_LABEL] : CONNECTION_LABEL_FALLBACK[status] ?? status
}

function previousMonthPeriod(): string {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
}

function toBusinessInfoFormValues(verification: VerificationDetail): BusinessInfoFormValues {
  return {
    tax_invoice_email: verification.tax_invoice_email ?? '',
    business_address: verification.business_address ?? '',
    naver_place_url: verification.naver_place_url ?? '',
    bank_name: verification.bank_name ?? '',
    account_number: verification.account_number ?? '',
    account_holder: verification.account_holder ?? '',
  }
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-48 bg-[#e5e5ea] rounded" />
      <div className="h-40 w-full bg-[#e5e5ea] rounded-[18px]" />
      <div className="h-40 w-full bg-[#e5e5ea] rounded-[18px]" />
      <div className="h-40 w-full bg-[#e5e5ea] rounded-[18px]" />
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[18px] border border-[#e0e0e0] p-6">
      <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">{title}</h2>
      {children}
    </section>
  )
}

function VerificationDecisionControls({
  onDecide,
  deciding,
}: {
  onDecide: (decision: 'approved' | 'rejected', reviewerNote?: string) => void
  deciding: boolean
}) {
  const [rejectNote, setRejectNote] = useState('')
  return (
    <div className="space-y-3 border-t border-[#e0e0e0] pt-4">
      <p className="text-[12px] text-muted-light">사업자 인증 승인/반려 — 아래 부가 정보 수정과는 별개로 처리됩니다.</p>
      <button
        type="button"
        disabled={deciding}
        onClick={() => onDecide('approved')}
        className="rounded-full bg-[#0066cc] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
      >
        승인
      </button>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="반려 사유를 입력하세요"
          value={rejectNote}
          onChange={e => setRejectNote(e.target.value)}
          className="flex-1 rounded-[9px] border border-[#e0e0e0] px-3 py-2 text-[13px] outline-none focus:border-red-400"
        />
        <button
          type="button"
          disabled={deciding || !rejectNote.trim()}
          onClick={() => onDecide('rejected', rejectNote)}
          className="rounded-full bg-red-500 px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
        >
          반려
        </button>
      </div>
    </div>
  )
}

function VerificationInfo({ verification }: { verification: VerificationDetail }) {
  return (
    <div className="space-y-2 text-[13px] text-[#1d1d1f] mb-4">
      <div>사업자 번호: <span className="font-medium">{verification.business_number}</span></div>
      <div>제출일: {new Date(verification.submitted_at).toLocaleString('ko-KR')}</div>
      {verification.certificate_url && (
        <a
          href={verification.certificate_url}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-[#0066cc] underline"
        >
          사업자 등록증 보기
        </a>
      )}
      {verification.bankbook_copy_url && (
        <div>
          <a
            href={verification.bankbook_copy_url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-[#0066cc] underline"
          >
            통장사본 보기
          </a>
        </div>
      )}
      {verification.status === 'rejected' && (
        <div className="text-red-600">반려 사유: {verification.reviewer_note ?? '(없음)'}</div>
      )}
    </div>
  )
}

function BusinessInfoReadonly({ verification }: { verification: VerificationDetail }) {
  return (
    <dl className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-3">
      <div>
        <dt className="text-muted-light mb-0.5">세금계산서 이메일</dt>
        <dd className="text-ink">{verification.tax_invoice_email ?? '미입력'}</dd>
      </div>
      <div>
        <dt className="text-muted-light mb-0.5">사업장 주소</dt>
        <dd className="text-ink">{verification.business_address ?? '미입력'}</dd>
      </div>
      <div>
        <dt className="text-muted-light mb-0.5">네이버 플레이스</dt>
        <dd className="text-ink">
          {verification.naver_place_url ? (
            <a
              href={verification.naver_place_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-text underline"
            >
              {verification.naver_place_url}
            </a>
          ) : (
            '미입력'
          )}
        </dd>
      </div>
      <div>
        <dt className="text-muted-light mb-0.5">정산 계좌</dt>
        <dd className="text-ink">
          {verification.bank_name || verification.account_number
            ? `${verification.bank_name ?? ''} ${verification.account_number ?? ''}`.trim()
            : '미입력'}
        </dd>
      </div>
      <div>
        <dt className="text-muted-light mb-0.5">예금주</dt>
        <dd className="text-ink">{verification.account_holder ?? '미입력'}</dd>
      </div>
    </dl>
  )
}

function BusinessInfoForm({
  fields,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
}: {
  fields: BusinessInfoFormValues
  onChange: (fields: BusinessInfoFormValues) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  error: string | null
}) {
  return (
    <div className="space-y-2">
      <input
        type="email"
        value={fields.tax_invoice_email}
        onChange={e => onChange({ ...fields, tax_invoice_email: e.target.value })}
        placeholder="세금계산서 이메일"
        disabled={saving}
        className="w-full rounded-md border border-hairline px-3 py-2 text-[13px] outline-none focus:border-primary"
      />
      <input
        type="text"
        value={fields.business_address}
        onChange={e => onChange({ ...fields, business_address: e.target.value })}
        placeholder="사업장 주소"
        maxLength={200}
        disabled={saving}
        className="w-full rounded-md border border-hairline px-3 py-2 text-[13px] outline-none focus:border-primary"
      />
      <input
        type="url"
        value={fields.naver_place_url}
        onChange={e => onChange({ ...fields, naver_place_url: e.target.value })}
        placeholder="https://naver.me/... 또는 https://m.place.naver.com/..."
        disabled={saving}
        className="w-full rounded-md border border-hairline px-3 py-2 text-[13px] outline-none focus:border-primary"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={fields.bank_name}
          onChange={e => onChange({ ...fields, bank_name: e.target.value })}
          placeholder="은행명 (예: 국민은행)"
          maxLength={30}
          disabled={saving}
          className="w-1/2 rounded-md border border-hairline px-3 py-2 text-[13px] outline-none focus:border-primary"
        />
        <input
          type="text"
          value={fields.account_number}
          onChange={e => onChange({ ...fields, account_number: e.target.value })}
          placeholder="계좌번호"
          disabled={saving}
          className="w-1/2 rounded-md border border-hairline px-3 py-2 text-[13px] outline-none focus:border-primary"
        />
      </div>
      <input
        type="text"
        value={fields.account_holder}
        onChange={e => onChange({ ...fields, account_holder: e.target.value })}
        placeholder="예금주"
        maxLength={50}
        disabled={saving}
        className="w-full rounded-md border border-hairline px-3 py-2 text-[13px] outline-none focus:border-primary"
      />
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-pill bg-primary px-4 py-2 text-[13px] font-medium text-ink disabled:opacity-40"
        >
          {saving ? '저장 중' : '저장'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-pill border border-hairline px-4 py-2 text-[13px] text-muted"
        >
          취소
        </button>
      </div>
    </div>
  )
}

async function saveBusinessInfo(userId: string, fields: BusinessInfoFormValues): Promise<{ data: BusinessInfoResponse | null; error: string | null }> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
  const body = await res.json()
  if (!res.ok) {
    return { data: null, error: body.error ?? '사업자 부가 정보 저장에 실패했습니다' }
  }
  return { data: body as BusinessInfoResponse, error: null }
}

function BusinessInfoCard({
  userId,
  verification,
  onSaved,
}: {
  userId: string
  verification: VerificationDetail
  onSaved: (fields: BusinessInfoResponse) => void
}) {
  const [editing, setEditing] = useState(false)
  const [fields, setFields] = useState<BusinessInfoFormValues>(() => toBusinessInfoFormValues(verification))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit() {
    setFields(toBusinessInfoFormValues(verification))
    setError(null)
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const { data, error: saveError } = await saveBusinessInfo(userId, fields)
      if (saveError || !data) {
        setError(saveError)
        return
      }
      onSaved(data)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-hairline pt-4 mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-ink">세금계산서 · 사업장 부가 정보 (대납/대리 입력용)</h3>
        {!editing && (
          <button type="button" onClick={startEdit} className="text-[12px] text-muted underline">
            수정
          </button>
        )}
      </div>
      {editing ? (
        <BusinessInfoForm
          fields={fields}
          onChange={setFields}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          saving={saving}
          error={error}
        />
      ) : (
        <BusinessInfoReadonly verification={verification} />
      )}
    </div>
  )
}

function VerificationCard({
  userId,
  verification,
  onDecide,
  deciding,
  onBusinessInfoSaved,
}: {
  userId: string
  verification: VerificationDetail | null
  onDecide: (decision: 'approved' | 'rejected', reviewerNote?: string) => void
  deciding: boolean
  onBusinessInfoSaved: (fields: BusinessInfoResponse) => void
}) {
  if (!verification) {
    return (
      <Card title="사업자 등록 현황">
        <p className="text-[13px] text-[#6e6e73]">아직 사업자 정보를 제출하지 않았습니다</p>
      </Card>
    )
  }

  return (
    <Card title="사업자 등록 현황">
      <VerificationInfo verification={verification} />
      <BusinessInfoCard userId={userId} verification={verification} onSaved={onBusinessInfoSaved} />
      {verification.status === 'pending' && (
        <VerificationDecisionControls onDecide={onDecide} deciding={deciding} />
      )}
    </Card>
  )
}

function PaybackRateEditor({ account, onSaved }: { account: AdAccount; onSaved: (updated: AdAccount) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(account.payback_rate))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit() {
    setValue(String(account.payback_rate))
    setError(null)
    setEditing(true)
  }

  async function save() {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setError('0~100 사이 숫자를 입력하세요')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/ad-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payback_rate: parsed }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? '수수료율 저장에 실패했습니다')
        return
      }
      onSaved(body as AdAccount)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className="text-ink underline decoration-dotted underline-offset-2"
      >
        {account.payback_rate}%
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={saving}
          className="w-16 rounded-md border border-hairline px-2 py-1 text-[12px] outline-none focus:border-primary"
        />
        <span className="text-muted-light">%</span>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-pill bg-primary px-2 py-1 text-[11px] font-medium text-ink disabled:opacity-40"
        >
          {saving ? '저장 중' : '저장'}
        </button>
        <button type="button" onClick={() => setEditing(false)} disabled={saving} className="text-[11px] text-muted-light">
          취소
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}

function AdAccountRow({
  account,
  onAccountUpdate,
}: {
  account: AdAccount
  onAccountUpdate: (updated: AdAccount) => void
}) {
  return (
    <tr>
      <td className="py-2 font-medium">{platformLabel(account.platform)}</td>
      <td className="py-2">{account.account_name}</td>
      <td className="py-2">{money(account.monthly_spend)}</td>
      <td className="py-2">
        <PaybackRateEditor account={account} onSaved={onAccountUpdate} />
      </td>
      <td className="py-2">{connectionLabel(account.connection_status)}</td>
      <td className="py-2">{TRANSFER_STATUS_LABEL[account.transfer_status] ?? account.transfer_status}</td>
    </tr>
  )
}

function AdAccountsCard({
  accounts,
  onAccountUpdate,
}: {
  accounts: AdAccount[]
  onAccountUpdate: (updated: AdAccount) => void
}) {
  if (accounts.length === 0) {
    return (
      <Card title="연동현황">
        <p className="text-[13px] text-[#6e6e73]">연동된 광고 계정이 없습니다</p>
      </Card>
    )
  }
  return (
    <Card title="연동현황">
      <table className="w-full text-[13px]">
        <thead className="text-left text-[#6e6e73]">
          <tr>
            <th className="pb-2">매체</th>
            <th className="pb-2">계정명</th>
            <th className="pb-2">월 광고비(신고값)</th>
            <th className="pb-2">수수료율</th>
            <th className="pb-2">연동 상태</th>
            <th className="pb-2">이관 상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f0f2]">
          {accounts.map(a => (
            <AdAccountRow key={a.id} account={a} onAccountUpdate={onAccountUpdate} />
          ))}
        </tbody>
      </table>
    </Card>
  )
}

interface AdvertiserSpendAccount {
  id: string
  account_name: string
  platform: string
}

interface AdvertiserSpendEntry {
  id: string
  ad_account_id: string
  account_name: string
  platform: string
  period: string
  spend_vat_excluded: number
  updated_at: string
}

function useSpendHistoryMatrix(userId: string) {
  const [accounts, setAccounts] = useState<AdvertiserSpendAccount[]>([])
  const [entries, setEntries] = useState<AdvertiserSpendEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/users/${userId}/monthly-spend`)
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then((body: { accounts: AdvertiserSpendAccount[]; entries: AdvertiserSpendEntry[] }) => {
        if (cancelled) return
        setAccounts(body.accounts)
        setEntries(body.entries)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setError('월별 소진액 이력을 불러오지 못했습니다')
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  function upsertEntry(next: AdvertiserSpendEntry) {
    setEntries(prev => [next, ...prev.filter(e => !(e.ad_account_id === next.ad_account_id && e.period === next.period))])
  }

  return { accounts, entries, upsertEntry, loaded, error }
}

function SpendCell({
  account,
  period,
  entry,
  onSaved,
}: {
  account: AdvertiserSpendAccount
  period: string
  entry: AdvertiserSpendEntry | undefined
  onSaved: (entry: AdvertiserSpendEntry) => void
}) {
  const [value, setValue] = useState(entry ? String(entry.spend_vat_excluded) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValue(entry ? String(entry.spend_vat_excluded) : '')
  }, [entry])

  async function save() {
    if (value === '' && !entry) return
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError('0 이상 정수')
      return
    }
    if (entry && parsed === entry.spend_vat_excluded) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/ad-accounts/${account.id}/monthly-spend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, spend_vat_excluded: parsed }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? '저장 실패')
        return
      }
      const saved = body.entry as { id: string; ad_account_id: string; period: string; spend_vat_excluded: number; updated_at: string }
      onSaved({ ...saved, account_name: account.account_name, platform: account.platform })
    } finally {
      setSaving(false)
    }
  }

  return (
    <td className="px-2 py-1.5 border-l border-hairline">
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        disabled={saving}
        placeholder="미입력"
        className={`w-24 rounded-md border px-2 py-1 text-[12px] outline-none focus:border-primary disabled:opacity-50 ${error ? 'border-red-400' : 'border-hairline'} ${entry ? 'text-ink' : 'text-muted-light'}`}
      />
      {error && <p className="text-[10px] text-red-600 mt-0.5">{error}</p>}
    </td>
  )
}

function SpendHistoryMatrix({ userId }: { userId: string }) {
  const { accounts, entries, upsertEntry, loaded, error } = useSpendHistoryMatrix(userId)
  const [newPeriod, setNewPeriod] = useState(previousMonthPeriod())
  const [extraPeriods, setExtraPeriods] = useState<string[]>([])

  if (error) return <p className="text-[13px] text-red-600">{error}</p>
  if (!loaded) return <p className="text-[13px] text-muted-light">불러오는 중...</p>
  if (accounts.length === 0) return <p className="text-[13px] text-[#6e6e73]">연동된 광고 계정이 없어 이력을 관리할 수 없습니다</p>

  const periods = Array.from(new Set([...entries.map(e => e.period), ...extraPeriods])).sort((a, b) => b.localeCompare(a))
  const entryByKey = new Map(entries.map(e => [`${e.ad_account_id}:${e.period}`, e]))

  function addPeriodRow() {
    if (!periods.includes(newPeriod)) setExtraPeriods(prev => [...prev, newPeriod])
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-[11px] text-muted">
          월 추가
          <input
            type="month"
            value={newPeriod}
            onChange={e => setNewPeriod(e.target.value)}
            className="rounded-md border border-hairline px-2 py-1 text-[12px]"
          />
        </label>
        <button
          type="button"
          onClick={addPeriodRow}
          className="rounded-pill border border-hairline px-3 py-1.5 text-[12px] text-muted hover:text-ink"
        >
          + 이번 달 행 추가
        </button>
      </div>

      {periods.length === 0 ? (
        <p className="text-[12px] text-muted-light">입력된 월별 실 소진액이 없습니다. 위에서 월을 추가해 입력을 시작하세요.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-hairline">
          <table className="text-[12px]">
            <thead>
              <tr className="bg-[#fafafa] text-left text-muted">
                <th className="px-2 py-2 sticky left-0 bg-[#fafafa]">월</th>
                {accounts.map(a => (
                  <th key={a.id} className="px-2 py-2 border-l border-hairline whitespace-nowrap">
                    {platformLabel(a.platform)} · {a.account_name}
                  </th>
                ))}
                <th className="px-2 py-2 border-l border-hairline">합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f2]">
              {periods.map(period => {
                const rowTotal = accounts.reduce((sum, a) => sum + (entryByKey.get(`${a.id}:${period}`)?.spend_vat_excluded ?? 0), 0)
                return (
                  <tr key={period}>
                    <td className="px-2 py-1.5 font-medium text-ink sticky left-0 bg-white">{period}</td>
                    {accounts.map(a => (
                      <SpendCell
                        key={a.id}
                        account={a}
                        period={period}
                        entry={entryByKey.get(`${a.id}:${period}`)}
                        onSaved={upsertEntry}
                      />
                    ))}
                    <td className="px-2 py-1.5 border-l border-hairline font-medium text-ink">{money(rowTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-muted-light">VAT 제외 실 소진액입니다. 이 값이 입력된 (계정, 월) 조합만 정산 생성 대상이 됩니다 — 사장님이 등록 시 제출한 신고값으로는 정산이 생성되지 않습니다.</p>
    </div>
  )
}

function SpendHistoryCard({ userId }: { userId: string }) {
  return (
    <Card title="이력관리 — 월별 실 소진액">
      <SpendHistoryMatrix userId={userId} />
    </Card>
  )
}

function PaybacksCard({ paybacks }: { paybacks: PaybackSummary }) {
  return (
    <Card title="수익 현황">
      <div className="grid grid-cols-3 gap-3 text-[13px] sm:grid-cols-6">
        {PAYBACK_STATUSES.map(status => (
          <div key={status}>
            <p className="text-muted-light mb-1">{PAYBACK_STATUS_LABEL[status]}</p>
            <p className="font-semibold text-ink">{money(paybacks[status])}</p>
          </div>
        ))}
        <div>
          <p className="text-muted-light mb-1">합계</p>
          <p className="font-semibold text-accent-text">{money(paybacks.total)}</p>
        </div>
      </div>
    </Card>
  )
}

function BudgetCard({ accounts, totalMonthlySpend }: { accounts: AdAccount[]; totalMonthlySpend: number }) {
  const totalVerifiedSpend = accounts.reduce((sum, a) => sum + (a.verified_spend ?? 0), 0)
  const hasVerified = accounts.some(a => a.verified_spend !== null)
  return (
    <Card title="예산 현황">
      <div className="flex gap-8 text-[13px]">
        <div><p className="text-[#6e6e73] mb-1">신고 월 광고비 합계</p><p className="font-semibold">{money(totalMonthlySpend)}</p></div>
        {hasVerified && (
          <div><p className="text-[#6e6e73] mb-1">검증된 광고비 합계</p><p className="font-semibold">{money(totalVerifiedSpend)}</p></div>
        )}
      </div>
    </Card>
  )
}

function useUserDetail(userId: string) {
  const [detail, setDetail] = useState<UserDetailResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/users/${userId}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: UserDetailResponse) => !cancelled && setDetail(data))
      .catch(async (res: Response | Error) => {
        if (cancelled) return
        const message = res instanceof Response && res.status === 404
          ? '존재하지 않는 사용자입니다'
          : '사용자 정보를 불러오지 못했습니다'
        setLoadError(message)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  return { detail, setDetail, loadError }
}

async function decideVerification(userId: string, verificationId: string, decision: 'approved' | 'rejected', reviewerNote?: string) {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verification_id: verificationId, decision, reviewer_note: reviewerNote }),
  })
  if (!res.ok) return null
  return fetch(`/api/admin/users/${userId}`).then(r => r.json() as Promise<UserDetailResponse>)
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { detail, setDetail, loadError } = useUserDetail(params.id)
  const [deciding, setDeciding] = useState(false)

  async function handleDecide(decision: 'approved' | 'rejected', reviewerNote?: string) {
    if (!detail?.verification) return
    setDeciding(true)
    try {
      const updated = await decideVerification(params.id, detail.verification.id, decision, reviewerNote)
      if (updated) setDetail(updated)
    } finally {
      setDeciding(false)
    }
  }

  function handleAccountUpdate(updated: AdAccount) {
    setDetail(prev => prev ? { ...prev, ad_accounts: prev.ad_accounts.map(a => a.id === updated.id ? updated : a) } : prev)
  }

  function handleBusinessInfoSaved(fields: BusinessInfoResponse) {
    setDetail(prev => (prev && prev.verification ? { ...prev, verification: { ...prev.verification, ...fields } } : prev))
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push('/admin/users')}
        className="mb-4 text-[13px] text-[#6e6e73] hover:text-[#1d1d1f]"
      >
        ← 사용자 목록으로
      </button>

      {loadError ? (
        <div className="rounded-[11px] bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
          {loadError}
        </div>
      ) : !detail ? (
        <DetailSkeleton />
      ) : (
        <div className="space-y-4">
          <h1 className="text-[20px] font-semibold text-[#1d1d1f]">{detail.user.business_name}</h1>
          <p className="text-[13px] text-[#6e6e73] -mt-3">{detail.user.email}</p>
          <VerificationCard
            userId={detail.user.id}
            verification={detail.verification}
            onDecide={handleDecide}
            deciding={deciding}
            onBusinessInfoSaved={handleBusinessInfoSaved}
          />
          <AdAccountsCard accounts={detail.ad_accounts} onAccountUpdate={handleAccountUpdate} />
          <SpendHistoryCard userId={detail.user.id} />
          <PaybacksCard paybacks={detail.paybacks} />
          <BudgetCard accounts={detail.ad_accounts} totalMonthlySpend={detail.budget.total_monthly_spend} />
        </div>
      )}
    </div>
  )
}
