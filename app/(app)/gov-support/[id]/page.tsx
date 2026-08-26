'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Building2, AlertCircle, BadgeCheck, Phone, CalendarDays } from 'lucide-react'

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

function DetailSection({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-[14px] font-semibold text-[#1d1d1f]">{heading}</h3>
      <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#3a3a3c]">{body}</p>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-24 rounded-[9px] bg-[#f5f5f7] animate-pulse" />
      <div className="h-16 rounded-[14px] bg-[#f5f5f7] animate-pulse" />
      <div className="h-40 rounded-[14px] bg-[#f5f5f7] animate-pulse" />
      <div className="h-24 rounded-[14px] bg-[#f5f5f7] animate-pulse" />
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
    <article className="rounded-[18px] border border-[#e0e0e0] bg-white p-6">
      {detail.isTransactable && (
        <span className="mb-2 inline-flex items-center gap-1 rounded-[9999px] bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-ink">
          <BadgeCheck size={12} strokeWidth={2.2} />
          퍼즐 대행 가능
        </span>
      )}
      <h2 className="text-[19px] font-semibold leading-snug text-[#1d1d1f]">{detail.title}</h2>
      {detail.isTransactable && detail.note && (
        <div className="mt-3 rounded-[11px] border-2 border-primary-dark bg-primary/10 px-4 py-3">
          <p className="text-[13px] font-medium text-[#1d1d1f]">{detail.note}</p>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {detail.org && (
          <p className="flex items-center gap-2 text-[13px] text-[#1d1d1f]">
            <Building2 size={15} strokeWidth={1.8} className="shrink-0 text-[#6e6e73]" />
            {detail.org}
          </p>
        )}
        <DeadlineRow deadline={detail.deadline} />
        {detail.contact && (
          <p className="flex items-center gap-2 text-[13px] text-[#1d1d1f]">
            <Phone size={15} strokeWidth={1.8} className="shrink-0 text-[#6e6e73]" />
            {detail.contact}
          </p>
        )}
      </div>
      {detail.target && <DetailSection heading="지원대상" body={detail.target} />}
      {detail.summary && <DetailSection heading="사업개요" body={detail.summary} />}
      {detail.applyMethod && <DetailSection heading="신청방법" body={detail.applyMethod} />}
    </article>
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
