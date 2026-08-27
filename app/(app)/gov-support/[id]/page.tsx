'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  AlertCircle,
  BadgeCheck,
  Phone,
  CalendarDays,
  CheckCircle2,
  HelpCircle,
  XCircle,
  ChevronDown,
} from 'lucide-react'

type EligibilityStatus = 'likely' | 'unclear' | 'unlikely'

interface ListingDetail {
  id: string
  title: string
  org: string | null
  target: string | null
  deadline: string | null
  summary: string | null
  applyMethod: string | null
  contact: string | null
  isTransactable: boolean
  note: string | null
  maxSupportKrw: number | null
  eligibilityNotes: string | null
  puzzleServices: string[]
  applicationSteps: string[]
  hasBusinessProfile: boolean
  eligibilityCheck: { status: EligibilityStatus; reasons: string[] }
}

function formatSupportAmount(krw: number): string {
  const eok = Math.floor(krw / 100000000)
  const man = Math.floor((krw % 100000000) / 10000)
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString('ko-KR')}만원`
  if (eok > 0) return `${eok}억원`
  return `${man.toLocaleString('ko-KR')}만원`
}

function calcDday(deadline: string | null): { text: string; urgent: boolean } {
  if (!deadline) return { text: '상시', urgent: false }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(`${deadline}T00:00:00`)
  const daysLeft = Math.round((end.getTime() - today.getTime()) / 86400000)
  if (daysLeft < 0) return { text: '마감됨', urgent: false }
  if (daysLeft === 0) return { text: '오늘 마감', urgent: true }
  return { text: `D-${daysLeft}`, urgent: daysLeft <= 7 }
}

function BackToListLink() {
  return (
    <Link
      href="/gov-support"
      className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
    >
      <ArrowLeft size={15} strokeWidth={2} />
      목록으로
    </Link>
  )
}

function DeadlineRow({ deadline }: { deadline: string | null }) {
  const dday = calcDday(deadline)
  const tone = dday.urgent ? 'bg-red-50 text-red-700' : 'bg-[#f5f5f7] text-[#6e6e73]'
  return (
    <div className="flex items-center gap-2 text-[13px] text-[#1d1d1f]">
      <CalendarDays size={15} strokeWidth={1.8} className="shrink-0 text-[#6e6e73]" />
      <span>{deadline ? `${deadline} 마감` : '상시 접수'}</span>
      <span className={`rounded-[9999px] px-2.5 py-0.5 text-[11px] font-medium ${tone}`}>
        {dday.text}
      </span>
    </div>
  )
}

function SupportAmountHeadline({ detail }: { detail: ListingDetail }) {
  return (
    <header className="rounded-[18px] border border-[#e0e0e0] bg-white p-6">
      {detail.isTransactable && (
        <span className="mb-3 inline-flex items-center gap-1 rounded-[9999px] bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-ink">
          <BadgeCheck size={12} strokeWidth={2.2} />
          퍼즐 대행 가능
        </span>
      )}
      <h2 className="text-[17px] font-semibold leading-snug text-[#1d1d1f]">{detail.title}</h2>
      {detail.maxSupportKrw ? (
        <p className="mt-3 text-[15px] text-[#6e6e73]">
          최대{' '}
          <strong className="text-[32px] font-bold leading-none text-[#1d1d1f]">
            {formatSupportAmount(detail.maxSupportKrw)}
          </strong>{' '}
          지원
        </p>
      ) : (
        <p className="mt-3 text-[15px] text-[#6e6e73]">
          지원 규모는 심사에 따라 달라져요 — 상담 시 안내드려요
        </p>
      )}
      <div className="mt-4">
        <DeadlineRow deadline={detail.deadline} />
      </div>
    </header>
  )
}

const ELIGIBILITY_STYLES: Record<
  EligibilityStatus,
  { label: string; card: string; badge: string; Icon: typeof CheckCircle2 }
> = {
  likely: {
    label: '가능성 높음',
    card: 'border-green-200 bg-green-50',
    badge: 'bg-green-600 text-white',
    Icon: CheckCircle2,
  },
  unclear: {
    label: '확인 필요',
    card: 'border-amber-200 bg-amber-50',
    badge: 'bg-amber-500 text-white',
    Icon: HelpCircle,
  },
  unlikely: {
    label: '조건이 달라요',
    card: 'border-[#e0e0e0] bg-[#f5f5f7]',
    badge: 'bg-[#6e6e73] text-white',
    Icon: XCircle,
  },
}

function EligibilityCard({ detail }: { detail: ListingDetail }) {
  const { status, reasons } = detail.eligibilityCheck
  const style = ELIGIBILITY_STYLES[status]
  // status가 unclear인 이유가 "사업 쪽 큐레이션 정보 부재"일 수도 있다 — 그럴 땐 사장님한테
  // 등록을 요구해봐야 소용없으니(원인이 우리 쪽 데이터 부족), 프로필이 실제로 없을 때만 CTA를 보여준다.
  const needsProfileCta = !detail.hasBusinessProfile
  return (
    <section className={`rounded-[18px] border p-6 ${style.card}`}>
      <div className="flex items-center gap-2">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">나는 받을 수 있을까?</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-[9999px] px-2.5 py-0.5 text-[11px] font-semibold ${style.badge}`}
        >
          <style.Icon size={12} strokeWidth={2.2} />
          {style.label}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {reasons.map((reason, index) => (
          <li key={`${index}-${reason}`} className="flex items-start gap-2 text-[13px] text-[#3a3a3c]">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#6e6e73]" />
            {reason}
          </li>
        ))}
      </ul>
      {detail.eligibilityNotes && (
        <p className="mt-3 rounded-[11px] bg-white/70 px-3.5 py-2.5 text-[13px] leading-relaxed text-[#3a3a3c]">
          {detail.eligibilityNotes}
        </p>
      )}
      {needsProfileCta && (
        <Link
          href="/settings"
          className="mt-4 inline-block rounded-[9px] bg-[#1d1d1f] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3a3a3c] transition-colors"
        >
          사업 정보 등록하고 정확히 확인하기
        </Link>
      )}
    </section>
  )
}

function PuzzleServicesSection({ detail }: { detail: ListingDetail }) {
  if (!detail.isTransactable || detail.puzzleServices.length === 0) return null
  return (
    <section className="rounded-[18px] border-2 border-primary-dark bg-primary/10 p-6">
      <div className="flex items-center gap-2">
        <BadgeCheck size={18} strokeWidth={2.2} className="text-primary-dark" />
        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
          이 지원금으로 퍼즐이 해드리는 일
        </h3>
      </div>
      <p className="mt-1.5 text-[13px] text-[#3a3a3c]">
        퍼즐코퍼레이션은 이 사업의 공급기업이에요. 선정되면 지원금으로 아래 서비스를 맡길 수 있어요.
      </p>
      <ul className="mt-3 space-y-2">
        {detail.puzzleServices.map((service, index) => (
          <li key={`${index}-${service}`} className="flex items-start gap-2 text-[14px] font-medium text-[#1d1d1f]">
            <CheckCircle2 size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-primary-dark" />
            {service}
          </li>
        ))}
      </ul>
      {detail.note && <p className="mt-3 text-[12px] text-[#6e6e73]">{detail.note}</p>}
    </section>
  )
}

function ApplicationStepsSection({ detail }: { detail: ListingDetail }) {
  if (detail.applicationSteps.length > 0) {
    return (
      <section className="rounded-[18px] border border-[#e0e0e0] bg-white p-6">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">그럼 뭘 하면 될까?</h3>
        <ol className="mt-3 space-y-3">
          {detail.applicationSteps.map((step, index) => (
            <li key={`${index}-${step}`} className="flex items-start gap-3 text-[14px] text-[#1d1d1f]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-[12px] font-semibold text-white">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    )
  }
  if (!detail.applyMethod && !detail.contact) return null
  return (
    <section className="rounded-[18px] border border-[#e0e0e0] bg-white p-6">
      <h3 className="text-[15px] font-semibold text-[#1d1d1f]">그럼 뭘 하면 될까?</h3>
      {detail.applyMethod && (
        <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-[#3a3a3c]">
          {detail.applyMethod}
        </p>
      )}
      {detail.contact && (
        <p className="mt-2 flex items-center gap-2 text-[13px] text-[#1d1d1f]">
          <Phone size={15} strokeWidth={1.8} className="shrink-0 text-[#6e6e73]" />
          {detail.contact}
        </p>
      )}
    </section>
  )
}

function FullNoticeSection({ detail }: { detail: ListingDetail }) {
  const [open, setOpen] = useState(false)
  const rows = [
    { heading: '주관기관', body: detail.org, Icon: Building2 },
    { heading: '지원대상', body: detail.target, Icon: null },
    { heading: '사업개요', body: detail.summary, Icon: null },
    { heading: '신청방법', body: detail.applyMethod, Icon: null },
    { heading: '문의처', body: detail.contact, Icon: Phone },
  ].filter(row => row.body)
  if (rows.length === 0) return null
  return (
    <section className="rounded-[18px] border border-[#e0e0e0] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center justify-between px-6 py-4 text-[14px] font-semibold text-[#1d1d1f]"
      >
        자세한 공고 내용
        <ChevronDown
          size={17}
          strokeWidth={2}
          className={`text-[#6e6e73] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="space-y-4 border-t border-[#e0e0e0] px-6 py-5">
          {rows.map(row => (
            <div key={row.heading}>
              <h4 className="mb-1 text-[13px] font-semibold text-[#6e6e73]">{row.heading}</h4>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#3a3a3c]">
                {row.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-24 rounded-[9px] bg-[#f5f5f7] animate-pulse" />
      <div className="h-36 rounded-[18px] bg-[#f5f5f7] animate-pulse" />
      <div className="h-32 rounded-[18px] bg-[#f5f5f7] animate-pulse" />
      <div className="h-40 rounded-[18px] bg-[#f5f5f7] animate-pulse" />
    </div>
  )
}

function DetailError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-[11px] bg-red-50 px-4 py-3">
      <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={15} />
      <p className="text-[13px] text-red-700">{message}</p>
    </div>
  )
}

function DetailContent({ detail }: { detail: ListingDetail }) {
  return (
    <div className="space-y-4">
      <SupportAmountHeadline detail={detail} />
      <EligibilityCard detail={detail} />
      <PuzzleServicesSection detail={detail} />
      <ApplicationStepsSection detail={detail} />
      <FullNoticeSection detail={detail} />
    </div>
  )
}

export default function GovSupportDetailPage() {
  const routeParams = useParams<{ id: string }>()
  const [detail, setDetail] = useState<ListingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!routeParams?.id) return
    fetch(`/api/gov-support/${encodeURIComponent(routeParams.id)}`)
      .then(async res => {
        const body = (await res.json()) as ListingDetail & { error?: string }
        if (res.status === 404) throw new Error('해당 공고를 찾을 수 없어요. 마감되어 내려갔을 수 있어요.')
        if (!res.ok) throw new Error(body.error || `공고 조회 실패 (HTTP ${res.status})`)
        setDetail(body)
      })
      .catch((fetchError: unknown) => {
        setLoadError(
          fetchError instanceof Error ? fetchError.message : '공고 정보를 불러오지 못했습니다'
        )
      })
      .finally(() => setLoading(false))
  }, [routeParams?.id])

  return (
    <div className="max-w-3xl mx-auto">
      <BackToListLink />
      {loading ? (
        <DetailSkeleton />
      ) : loadError ? (
        <DetailError message={loadError} />
      ) : detail ? (
        <DetailContent detail={detail} />
      ) : null}
    </div>
  )
}
