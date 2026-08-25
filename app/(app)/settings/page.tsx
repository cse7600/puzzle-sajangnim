'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, Building2, FileText, Clock, XCircle } from 'lucide-react'

type VerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'

type VerificationResponse = {
  status: VerificationStatus
  business_number?: string
  reviewer_note?: string | null
  submitted_at?: string
  reviewed_at?: string | null
}

function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      <div className="h-5 w-32 bg-[#e5e5ea] rounded mb-2" />
      <div className="h-4 w-64 bg-[#e5e5ea] rounded mb-6" />
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-6">
        <div className="h-10 w-10 rounded-[10px] bg-[#e5e5ea] mb-5" />
        <div className="h-11 w-full bg-[#e5e5ea] rounded-[11px] mb-4" />
        <div className="h-28 w-full bg-[#e5e5ea] rounded-[11px] mb-4" />
        <div className="h-11 w-full bg-[#e5e5ea] rounded-full" />
      </div>
    </div>
  )
}

async function fetchVerification(): Promise<VerificationResponse> {
  const res = await fetch('/api/business-verification')
  if (!res.ok) throw new Error('사업자 인증 상태를 불러오지 못했습니다')
  return res.json()
}

function useVerification() {
  const [verification, setVerification] = useState<VerificationResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setVerification(null)
    setLoadError(null)
    fetchVerification()
      .then(data => !cancelled && setVerification(data))
      .catch((err: Error) => !cancelled && setLoadError(err.message))
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return { verification, loadError, reload: () => setReloadKey(k => k + 1) }
}

function StatusBanner({ icon, tone, title, description }: {
  icon: React.ReactNode
  tone: 'blue' | 'red' | 'green'
  title: string
  description: string
}) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
  }[tone]
  return (
    <div className="text-center py-6">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${toneClass}`}>
        {icon}
      </div>
      <p className="text-[15px] font-semibold text-[#1d1d1f] mb-1">{title}</p>
      <p className="text-[13px] text-[#6e6e73]">{description}</p>
    </div>
  )
}

function CertificateFileInput({ file, onSelect }: { file: File | null; onSelect: (file: File | null) => void }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
        사업자 등록증 <span className="text-red-500">*</span>
      </label>
      <div className="border-2 border-dashed border-[#e0e0e0] rounded-[11px] p-6 text-center hover:border-[#0066cc]/40 transition-colors">
        <FileText className="h-8 w-8 text-[#c0c0c0] mx-auto mb-2" />
        <p className="text-[13px] text-[#6e6e73] mb-2">사업자 등록증 이미지 또는 PDF를 첨부해주세요</p>
        <label className="inline-block cursor-pointer rounded-[9999px] border border-[#e0e0e0] px-4 py-1.5 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors">
          파일 선택
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={e => onSelect(e.target.files?.[0] ?? null)}
          />
        </label>
        {file && <p className="mt-2 text-[12px] text-[#0066cc]">{file.name}</p>}
      </div>
    </div>
  )
}

async function submitVerification(businessNumber: string, file: File): Promise<{ error?: string }> {
  const formData = new FormData()
  formData.append('business_number', businessNumber)
  formData.append('certificate', file)
  const res = await fetch('/api/business-verification', { method: 'POST', body: formData })
  const body = await res.json()
  return res.ok ? {} : { error: body.error ?? '사업자 정보 등록에 실패했습니다' }
}

function BusinessVerificationForm({ onSubmitted, submitLabel }: {
  onSubmitted: () => void
  submitLabel: string
}) {
  const [businessNumber, setBusinessNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessNumber || !file) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitVerification(businessNumber, file)
      if (result.error) setError(result.error)
      else onSubmitted()
    } catch {
      setError('네트워크 오류로 사업자 정보 등록에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-[11px] bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}
      <div>
        <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
          사업자 번호 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="000-00-00000"
          value={businessNumber}
          onChange={e => setBusinessNumber(e.target.value)}
          className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors"
        />
      </div>

      <CertificateFileInput file={file} onSelect={setFile} />

      <button
        type="submit"
        disabled={submitting || !businessNumber || !file}
        className="w-full rounded-[9999px] bg-[#0066cc] py-3 text-[15px] font-medium text-white hover:bg-[#0058b3] disabled:opacity-40 transition-colors"
      >
        {submitting ? '등록 중...' : submitLabel}
      </button>
    </form>
  )
}

function VerificationCardBody({ verification, onSubmitted }: { verification: VerificationResponse; onSubmitted: () => void }) {
  if (verification.status === 'approved') {
    return (
      <StatusBanner
        icon={<CheckCircle2 className="h-6 w-6" />}
        tone="green"
        title="사업자 정보가 승인되었습니다"
        description="모든 서비스를 자유롭게 이용하실 수 있습니다"
      />
    )
  }
  if (verification.status === 'pending') {
    return (
      <StatusBanner
        icon={<Clock className="h-6 w-6" />}
        tone="blue"
        title="사업자 정보 심사 중입니다"
        description={`제출한 사업자 번호(${verification.business_number}) 심사가 완료되면 안내드립니다`}
      />
    )
  }
  if (verification.status === 'rejected') {
    return (
      <>
        <StatusBanner
          icon={<XCircle className="h-6 w-6" />}
          tone="red"
          title="사업자 정보가 반려되었습니다"
          description={verification.reviewer_note ? `반려 사유: ${verification.reviewer_note}` : '반려 사유가 등록되지 않았습니다'}
        />
        <BusinessVerificationForm onSubmitted={onSubmitted} submitLabel="다시 제출하기" />
      </>
    )
  }
  return <BusinessVerificationForm onSubmitted={onSubmitted} submitLabel="사업자 정보 등록하기" />
}

export default function SettingsPage() {
  const { verification, loadError, reload } = useVerification()

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-1">개인 설정</h2>
      <p className="text-[13px] text-[#6e6e73] mb-6">서비스 이용을 위해 사업자 정보를 등록해주세요</p>

      {loadError ? (
        <div className="rounded-[11px] bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
          {loadError}
        </div>
      ) : !verification ? (
        <SettingsSkeleton />
      ) : (
        <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-[10px] bg-[#0066cc]/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-[#0066cc]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#1d1d1f]">사업자 정보 등록</p>
              <p className="text-[12px] text-[#6e6e73]">사업자 등록 승인 후 모든 서비스를 이용할 수 있습니다</p>
            </div>
          </div>
          <VerificationCardBody verification={verification} onSubmitted={reload} />
        </div>
      )}
    </div>
  )
}
