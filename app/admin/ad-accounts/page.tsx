'use client'
import { useState, useEffect } from 'react'
import {
  Platform,
  PLATFORM_INFO,
  TransferStatus,
  TRANSFER_STATUSES,
  TRANSFER_STATUS_LABEL,
  ConnectionStatus,
  CONNECTION_STATUSES,
  CONNECTION_STATUS_LABEL,
} from '@/lib/hub'

interface AdAccount {
  id: string
  platform: Platform
  account_name: string
  account_id: string
  created_at: string
  user_id: string
  business_number: string | null
  contact_email: string | null
  contact_phone: string | null
  tax_invoice_direct: boolean
  transfer_status: TransferStatus
  connection_status: ConnectionStatus
}

type PatchPayload = Partial<Pick<AdAccount, 'contact_email' | 'contact_phone' | 'tax_invoice_direct' | 'transfer_status' | 'connection_status'>>

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

interface ToastState { message: string; isError: boolean }

function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  function showToast(message: string, isError: boolean) {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 3000)
  }

  return { toast, showToast }
}

function useAdAccountsAdmin() {
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const { toast, showToast } = useToast()

  function load() {
    setLoading(true)
    fetch('/api/ad-accounts?scope=all')
      .then(r => r.json())
      .then((data: AdAccount[]) => setAccounts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function patchAccount(id: string, payload: PatchPayload) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/ad-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) {
        showToast(body.error ?? '저장에 실패했습니다', true)
        return
      }
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...payload } : a))
    } finally {
      setSavingId(null)
    }
  }

  function saveIfChanged(acc: AdAccount, field: 'contact_email' | 'contact_phone', value: string) {
    const current = acc[field] ?? ''
    if (value === current) return
    patchAccount(acc.id, { [field]: value })
  }

  return { accounts, loading, savingId, toast, patchAccount, saveIfChanged }
}

export default function AdminAdAccountsPage() {
  const { accounts, loading, savingId, toast, patchAccount, saveIfChanged } = useAdAccountsAdmin()

  return (
    <div>
      {toast && <AdminToast toast={toast} />}
      <h1 className="text-[20px] font-semibold text-[#1d1d1f] mb-1">광고계정 관리</h1>
      <p className="text-[13px] text-[#6e6e73] mb-5">사장님이 이관 완료를 요청하면 &quot;연동 확인 중&quot;으로 넘어와요 — 실제 권한이 들어왔는지 확인 후 &quot;연동 완료&quot;로 넘겨주세요.</p>
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        <AdAccountsPanel accounts={accounts} loading={loading} savingId={savingId} onPatch={patchAccount} onSaveIfChanged={saveIfChanged} />
      </div>
    </div>
  )
}

function AdminToast({ toast }: { toast: ToastState }) {
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-[11px] px-5 py-3 text-[14px] font-medium text-white shadow-lg ${toast.isError ? 'bg-red-600' : 'bg-[#0066cc]'}`}>
      {toast.message}
    </div>
  )
}

function AdAccountsPanel({
  accounts,
  loading,
  savingId,
  onPatch,
  onSaveIfChanged,
}: {
  accounts: AdAccount[]
  loading: boolean
  savingId: string | null
  onPatch: (id: string, payload: PatchPayload) => void
  onSaveIfChanged: (acc: AdAccount, field: 'contact_email' | 'contact_phone', value: string) => void
}) {
  if (loading) {
    return (
      <div className="p-8 space-y-3">
        {[1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-[#f5f5f7] animate-pulse" />)}
      </div>
    )
  }
  if (accounts.length === 0) {
    return <div className="p-8 text-center text-[#6e6e73] text-[14px]">등록된 광고계정이 없습니다</div>
  }
  return (
    <div className="overflow-x-auto">
      <AdAccountsTable accounts={accounts} savingId={savingId} onPatch={onPatch} onSaveIfChanged={onSaveIfChanged} />
    </div>
  )
}

function AdAccountsTable({
  accounts,
  savingId,
  onPatch,
  onSaveIfChanged,
}: {
  accounts: AdAccount[]
  savingId: string | null
  onPatch: (id: string, payload: PatchPayload) => void
  onSaveIfChanged: (acc: AdAccount, field: 'contact_email' | 'contact_phone', value: string) => void
}) {
  return (
    <table className="w-full text-[13px] min-w-[1180px]">
      <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
        <tr>
          <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">플랫폼</th>
          <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">접수일자</th>
          <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">계정명 / 아이디</th>
          <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">담당자 이메일 / 연락처</th>
          <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">신청자(아이디) / 사업자 등록번호</th>
          <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">세금계산서 직발행</th>
          <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">이관 상태</th>
          <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">연결 상태</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#e0e0e0]">
        {accounts.map(acc => (
          <AdAccountRow key={acc.id} acc={acc} saving={savingId === acc.id} onPatch={onPatch} onSaveIfChanged={onSaveIfChanged} />
        ))}
      </tbody>
    </table>
  )
}

function AdAccountRow({
  acc,
  saving,
  onPatch,
  onSaveIfChanged,
}: {
  acc: AdAccount
  saving: boolean
  onPatch: (id: string, payload: PatchPayload) => void
  onSaveIfChanged: (acc: AdAccount, field: 'contact_email' | 'contact_phone', value: string) => void
}) {
  return (
    <tr className={`hover:bg-[#f5f5f7] transition-colors ${acc.connection_status === 'duplicate' ? 'bg-red-50/40' : ''}`}>
      <PlatformCell platform={acc.platform} />
      <td className="px-4 py-3 text-[#6e6e73] whitespace-nowrap">{formatDate(acc.created_at)}</td>
      <td className="px-4 py-3 text-[#1d1d1f]">
        {acc.account_name}
        <p className="text-[11px] text-[#6e6e73] font-mono">{acc.account_id}</p>
      </td>
      <ContactCell acc={acc} saving={saving} onSaveIfChanged={onSaveIfChanged} />
      <ApplicantCell userId={acc.user_id} businessNumber={acc.business_number} />
      <TaxInvoiceCell checked={acc.tax_invoice_direct} saving={saving} onChange={checked => onPatch(acc.id, { tax_invoice_direct: checked })} />
      <StatusSelectCell
        value={acc.transfer_status}
        options={TRANSFER_STATUSES}
        labels={TRANSFER_STATUS_LABEL}
        saving={saving}
        onChange={value => onPatch(acc.id, { transfer_status: value })}
      />
      <StatusSelectCell
        value={acc.connection_status}
        options={CONNECTION_STATUSES}
        labels={CONNECTION_STATUS_LABEL}
        saving={saving}
        onChange={value => onPatch(acc.id, { connection_status: value })}
      />
    </tr>
  )
}

function ContactCell({
  acc,
  saving,
  onSaveIfChanged,
}: {
  acc: AdAccount
  saving: boolean
  onSaveIfChanged: (acc: AdAccount, field: 'contact_email' | 'contact_phone', value: string) => void
}) {
  return (
    <td className="px-4 py-3">
      <input
        defaultValue={acc.contact_email ?? ''}
        placeholder="이메일 미등록"
        onBlur={e => onSaveIfChanged(acc, 'contact_email', e.target.value)}
        disabled={saving}
        className="w-[160px] rounded-[6px] border border-transparent px-1.5 py-1 text-[12px] hover:border-[#e0e0e0] focus:border-[#0066cc] outline-none transition-colors disabled:opacity-50"
      />
      <input
        defaultValue={acc.contact_phone ?? ''}
        placeholder="연락처 미등록"
        onBlur={e => onSaveIfChanged(acc, 'contact_phone', e.target.value)}
        disabled={saving}
        className="w-[160px] rounded-[6px] border border-transparent px-1.5 py-1 text-[12px] text-[#6e6e73] hover:border-[#e0e0e0] focus:border-[#0066cc] outline-none transition-colors disabled:opacity-50"
      />
    </td>
  )
}

function PlatformCell({ platform }: { platform: Platform }) {
  const info = PLATFORM_INFO[platform] ?? { name: platform, color: '#6e6e73' }
  return (
    <td className="px-4 py-3">
      <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: info.color }}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
        {info.name}
      </span>
    </td>
  )
}

function ApplicantCell({ userId, businessNumber }: { userId: string; businessNumber: string | null }) {
  return (
    <td className="px-4 py-3">
      <p className="font-mono text-[11px] text-[#6e6e73]">{userId.slice(0, 8)}…</p>
      <p className="text-[12px] text-[#1d1d1f]">{businessNumber ?? '미등록'}</p>
    </td>
  )
}

function TaxInvoiceCell({
  checked,
  saving,
  onChange,
}: {
  checked: boolean
  saving: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <td className="px-4 py-3 text-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={saving}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#0066cc] disabled:opacity-50"
      />
    </td>
  )
}

function StatusSelectCell<T extends string>({
  value,
  options,
  labels,
  saving,
  onChange,
}: {
  value: T
  options: T[]
  labels: Record<T, string>
  saving: boolean
  onChange: (value: T) => void
}) {
  return (
    <td className="px-4 py-3">
      <select
        value={value}
        disabled={saving}
        onChange={e => onChange(e.target.value as T)}
        className="rounded-[8px] border border-[#e0e0e0] px-2 py-1.5 text-[12px] disabled:opacity-50"
      >
        {options.map(o => <option key={o} value={o}>{labels[o]}</option>)}
      </select>
    </td>
  )
}
