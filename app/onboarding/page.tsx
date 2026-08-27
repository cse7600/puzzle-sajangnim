'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KOREAN_PHONE_PATTERN } from '@/lib/profile'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ProfileResponse = {
  profile: {
    name?: string
    phone?: string
    notification_email?: string
  }
  email: string
}

type FieldErrors = {
  name?: string
  phone?: string
  notificationEmail?: string
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length < 4) return digits
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function validate(name: string, phone: string, notificationEmail: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!name.trim()) errors.name = '이름을 입력해주세요'
  if (!phone.trim()) errors.phone = '연락처를 입력해주세요'
  else if (!KOREAN_PHONE_PATTERN.test(phone.trim())) errors.phone = '연락처 형식이 올바르지 않습니다 (예: 010-1234-5678)'
  if (!notificationEmail.trim()) errors.notificationEmail = '알림 수신 이메일을 입력해주세요'
  else if (!EMAIL_PATTERN.test(notificationEmail.trim())) errors.notificationEmail = '이메일 형식이 올바르지 않습니다'
  return errors
}

function OnboardingSkeleton() {
  return (
    <div className="w-full max-w-[420px] animate-pulse">
      <div className="h-7 w-40 bg-[#e5e5ea] rounded mx-auto mb-2" />
      <div className="h-4 w-56 bg-[#e5e5ea] rounded mx-auto mb-10" />
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-8">
        <div className="h-11 w-full bg-[#e5e5ea] rounded-[11px] mb-4" />
        <div className="h-11 w-full bg-[#e5e5ea] rounded-[11px] mb-4" />
        <div className="h-11 w-full bg-[#e5e5ea] rounded-[11px] mb-4" />
        <div className="h-11 w-full bg-[#e5e5ea] rounded-full" />
      </div>
    </div>
  )
}

function FieldInput({ label, value, onChange, placeholder, error, type = 'text' }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  error?: string
  type?: string
}) {
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={`w-full rounded-[11px] border px-4 py-3 text-[15px] outline-none transition-colors ${
          error ? 'border-red-400 focus:border-red-500' : 'border-[#e0e0e0] focus:border-primary-dark'
        }`}
      />
      {error && <p className="mt-1.5 text-[12px] text-red-500">{error}</p>}
    </div>
  )
}

async function fetchProfile(): Promise<ProfileResponse> {
  const res = await fetch('/api/users/onboarding')
  if (!res.ok) throw new Error('프로필 정보를 불러오지 못했습니다')
  return res.json()
}

async function submitOnboarding(payload: { name: string; phone: string; notification_email: string }): Promise<{ error?: string; fieldErrors?: FieldErrors }> {
  const res = await fetch('/api/users/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (res.ok) return {}
  const body = await res.json().catch(() => ({}))
  if (body.errors) {
    return {
      fieldErrors: {
        name: body.errors.name,
        phone: body.errors.phone,
        notificationEmail: body.errors.notification_email,
      },
    }
  }
  return { error: body.error ?? '온보딩 정보 저장에 실패했습니다' }
}

function useOnboardingForm() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notificationEmail, setNotificationEmail] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchProfile()
      .then(({ profile, email }) => {
        if (cancelled) return
        setName(profile.name ?? '')
        setPhone(profile.phone ?? '')
        setNotificationEmail(profile.notification_email || (EMAIL_PATTERN.test(email) ? email : ''))
      })
      .catch((err: Error) => !cancelled && setLoadError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  return { loading, loadError, name, setName, phone, setPhone, notificationEmail, setNotificationEmail }
}

type FormFieldsProps = {
  name: string
  setName: (value: string) => void
  phone: string
  setPhone: (value: string) => void
  notificationEmail: string
  setNotificationEmail: (value: string) => void
  errors: FieldErrors
  submitError: string | null
  submitting: boolean
  hasBlockingError: boolean
  onSubmit: (e: React.FormEvent) => void
}

function OnboardingFormFields({
  name, setName, phone, setPhone, notificationEmail, setNotificationEmail,
  errors, submitError, submitting, hasBlockingError, onSubmit,
}: FormFieldsProps) {
  return (
    <form onSubmit={onSubmit}>
      {submitError && (
        <div className="mb-4 rounded-[11px] bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
          {submitError}
        </div>
      )}

      <FieldInput label="이름" value={name} onChange={setName} placeholder="홍길동" error={errors.name} />
      <FieldInput
        label="연락처"
        value={phone}
        onChange={value => setPhone(formatPhone(value))}
        placeholder="010-1234-5678"
        error={errors.phone}
      />
      <FieldInput
        label="알림 수신 이메일"
        value={notificationEmail}
        onChange={setNotificationEmail}
        placeholder="example@email.com"
        error={errors.notificationEmail}
        type="email"
      />
      <p className="mb-6 text-[12px] text-[#6e6e73] leading-relaxed">
        카카오 계정 이메일과 다르게 받고 싶으시면 별도로 입력해주세요
      </p>

      <button
        type="submit"
        disabled={submitting || hasBlockingError}
        className="w-full rounded-[9999px] bg-primary py-3 text-[15px] font-medium text-ink hover:bg-primary-hover disabled:opacity-40 transition-colors"
      >
        {submitting ? '저장 중...' : '다음: 사업자 인증'}
      </button>
    </form>
  )
}

function useOnboardingSubmit(name: string, phone: string, notificationEmail: string) {
  const router = useRouter()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors = validate(name, phone, notificationEmail)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await submitOnboarding({ name: name.trim(), phone: phone.trim(), notification_email: notificationEmail.trim() })
      if (result.fieldErrors) setErrors(result.fieldErrors)
      else if (result.error) setSubmitError(result.error)
      else router.push('/settings?next=business-verification')
    } catch {
      setSubmitError('네트워크 오류로 저장에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  return { errors, submitError, submitting, handleSubmit }
}

export default function OnboardingPage() {
  const { loading, loadError, name, setName, phone, setPhone, notificationEmail, setNotificationEmail } = useOnboardingForm()
  const { errors, submitError, submitting, handleSubmit } = useOnboardingSubmit(name, phone, notificationEmail)
  const hasBlockingError = Object.keys(validate(name, phone, notificationEmail)).length > 0

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      {loading ? (
        <OnboardingSkeleton />
      ) : (
        <div className="w-full max-w-[420px]">
          <div className="text-center mb-10">
            <span className="text-[28px] font-bold text-[#1d1d1f]">퍼즐 사장님</span>
            <p className="mt-2 text-[15px] text-[#6e6e73]">서비스 이용을 위해 기본 정보를 입력해주세요</p>
          </div>

          <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-8">
            {loadError ? (
              <div className="rounded-[11px] bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
                {loadError}
              </div>
            ) : (
              <OnboardingFormFields
                name={name}
                setName={setName}
                phone={phone}
                setPhone={setPhone}
                notificationEmail={notificationEmail}
                setNotificationEmail={setNotificationEmail}
                errors={errors}
                submitError={submitError}
                submitting={submitting}
                hasBlockingError={hasBlockingError}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
