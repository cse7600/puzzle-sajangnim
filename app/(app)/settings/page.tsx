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
  tax_invoice_email?: string | null
  business_address?: string | null
  naver_place_url?: string | null
  bank_name?: string | null
  account_number?: string | null
  account_holder?: string | null
  bankbook_copy_url?: string | null
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

type BusinessInfoField = 'tax_invoice_email' | 'business_address' | 'naver_place_url' | 'account_number'

// 서버는 단일 error 메시지만 돌려주므로, 문구를 보고 어느 필드 문제인지 추정해 그 아래에 붙인다.
// 매칭되지 않으면(예: 404/500) 폼 상단 배너로 표시한다.
function classifyPatchError(message: string): BusinessInfoField | 'general' {
  if (message.includes('이메일')) return 'tax_invoice_email'
  if (message.includes('네이버 플레이스')) return 'naver_place_url'
  if (message.includes('계좌번호')) return 'account_number'
  return 'general'
}

async function patchBusinessInfo(body: {
  tax_invoice_email: string
  business_address: string
  naver_place_url: string
  bank_name: string
  account_number: string
  account_holder: string
}): Promise<{ error?: string; field?: BusinessInfoField | 'general' }> {
  const res = await fetch('/api/business-verification', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.ok) return {}
  const responseBody = await res.json().catch(() => null)
  const message = typeof responseBody?.error === 'string' ? responseBody.error : '사업장 부가 정보 저장에 실패했습니다'
  return { error: message, field: classifyPatchError(message) }
}

function BusinessInfoSection({ verification }: { verification: VerificationResponse }) {
  const [email, setEmail] = useState(verification.tax_invoice_email ?? '')
  const [address, setAddress] = useState(verification.business_address ?? '')
  const [naverUrl, setNaverUrl] = useState(verification.naver_place_url ?? '')
  const [bankName, setBankName] = useState(verification.bank_name ?? '')
  const [accountNumber, setAccountNumber] = useState(verification.account_number ?? '')
  const [accountHolder, setAccountHolder] = useState(verification.account_holder ?? '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [fieldError, setFieldError] = useState<Partial<Record<BusinessInfoField, string>>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFieldError({})
    setGeneralError(null)
    setSavedAt(null)
    try {
      const result = await patchBusinessInfo({
        tax_invoice_email: email.trim(),
        business_address: address.trim(),
        naver_place_url: naverUrl.trim(),
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_holder: accountHolder.trim(),
      })
      if (result.error) {
        if (result.field && result.field !== 'general') {
          setFieldError({ [result.field]: result.error })
        } else {
          setGeneralError(result.error)
        }
      } else {
        setSavedAt(Date.now())
      }
    } catch {
      setGeneralError('네트워크 오류로 저장하지 못했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-6 mt-4">
      <p className="text-[15px] font-semibold text-[#1d1d1f] mb-1">사업장 부가 정보</p>
      <p className="text-[12px] text-[#6e6e73] mb-5">이 정보를 수정해도 사업자 승인 상태는 그대로 유지돼요.</p>

      <form onSubmit={handleSave} className="space-y-4">
        {generalError && (
          <div className="rounded-[11px] bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
            {generalError}
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">세금계산서 수신 메일</label>
          <input
            type="email"
            placeholder="tax@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors"
          />
          {fieldError.tax_invoice_email && (
            <p className="mt-1.5 text-[12px] text-red-600">{fieldError.tax_invoice_email}</p>
          )}
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">사업장 정보</label>
          <p className="text-[12px] text-[#6e6e73] mb-2">
            네이버 플레이스 링크 또는 사업장 주소 중 하나만 입력해도 도움이 돼요. 둘 다 입력하면 더 정확해요.
          </p>
          <input
            type="url"
            placeholder="https://naver.me/xxxxxxx"
            value={naverUrl}
            onChange={e => setNaverUrl(e.target.value)}
            className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors"
          />
          {fieldError.naver_place_url && (
            <p className="mt-1.5 text-[12px] text-red-600">{fieldError.naver_place_url}</p>
          )}
          <input
            type="text"
            placeholder="사업장 주소"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors mt-2"
          />
          {fieldError.business_address && (
            <p className="mt-1.5 text-[12px] text-red-600">{fieldError.business_address}</p>
          )}
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">정산 계좌</label>
          <p className="text-[12px] text-[#6e6e73] mb-2">페이백 정산금을 입금받을 계좌예요. 은행/계좌번호/예금주를 정확히 입력해주세요.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="은행명 (예: 국민은행)"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              className="w-1/2 rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors"
            />
            <input
              type="text"
              placeholder="계좌번호"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              className="w-1/2 rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors"
            />
          </div>
          {fieldError.account_number && (
            <p className="mt-1.5 text-[12px] text-red-600">{fieldError.account_number}</p>
          )}
          <input
            type="text"
            placeholder="예금주"
            value={accountHolder}
            onChange={e => setAccountHolder(e.target.value)}
            className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors mt-2"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[9999px] bg-[#0066cc] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#0058b3] disabled:opacity-40 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          {savedAt && <span className="text-[12px] text-green-600">저장됐어요</span>}
        </div>
      </form>

      <BankbookUpload initialUrl={verification.bankbook_copy_url ?? null} />
    </div>
  )
}

function BankbookUpload({ initialUrl }: { initialUrl: string | null }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0]
    if (!picked) return
    setFileName(picked.name)
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('bankbook_copy', picked)
      const res = await fetch('/api/business-verification/bankbook', { method: 'POST', body: fd })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? '통장사본 업로드에 실패했습니다')
        return
      }
      setPreviewUrl(body.bankbook_copy_url ?? null)
    } catch {
      setError('네트워크 오류로 통장사본을 업로드하지 못했습니다')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-5 pt-5 border-t border-[#e0e0e0]">
      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">통장사본</label>
      <p className="text-[12px] text-[#6e6e73] mb-2">정산 계좌 확인용 통장사본(또는 계좌 캡처) 사진을 올려주세요.</p>
      <div className="flex items-center gap-3">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage 서명 URL 미리보기
          <img src={previewUrl} alt="통장사본 미리보기" className="h-16 w-16 rounded-[9px] object-cover border border-[#e0e0e0]" />
        )}
        <label className="inline-block cursor-pointer rounded-[9999px] border border-[#e0e0e0] px-4 py-2 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors">
          {uploading ? '업로드 중...' : previewUrl ? '사진 다시 올리기' : '사진 선택'}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFileChange} />
        </label>
        {fileName && !error && <span className="text-[12px] text-[#6e6e73] truncate max-w-[140px]">{fileName}</span>}
      </div>
      {error && <p className="mt-1.5 text-[12px] text-red-600">{error}</p>}
    </div>
  )
}

function BusinessInfoUnavailableNote() {
  return (
    <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-6 mt-4">
      <p className="text-[15px] font-semibold text-[#1d1d1f] mb-1">사업장 부가 정보</p>
      <p className="text-[13px] text-[#6e6e73]">
        사업자 정보를 먼저 등록해야 세금계산서 수신 메일과 사업장 정보를 입력할 수 있어요.
      </p>
    </div>
  )
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

      {verification && (
        verification.status === 'not_submitted'
          ? <BusinessInfoUnavailableNote />
          : <BusinessInfoSection key={verification.submitted_at ?? 'unknown'} verification={verification} />
      )}
    </div>
  )
}
