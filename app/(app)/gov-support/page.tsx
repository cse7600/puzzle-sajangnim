'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, MapPin, AlertCircle, BadgeCheck, Search, ChevronRight } from 'lucide-react'

interface MatchedListing {
  id: string
  title: string
  org: string | null
  target: string | null
  deadline: string | null
  note?: string
}

interface MatchesResponse {
  profileComplete: boolean
  regionMissing?: boolean
  searchQuery?: string
  totalCount?: number
  transactable?: MatchedListing[]
  directApply?: MatchedListing[]
  error?: string
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

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  const dday = calcDday(deadline)
  const tone = dday.urgent ? 'bg-red-50 text-red-700' : 'bg-[#f5f5f7] text-[#6e6e73]'
  return (
    <span className={`whitespace-nowrap rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${tone}`}>
      {dday.text}
    </span>
  )
}

function ListingMeta({ listing }: { listing: MatchedListing }) {
  return (
    <div className="mt-1.5 space-y-0.5">
      {listing.org && (
        <p className="flex items-center gap-1.5 text-[12px] text-[#6e6e73]">
          <Building2 size={13} strokeWidth={1.8} className="shrink-0" />
          <span className="truncate">{listing.org}</span>
        </p>
      )}
      {listing.target && (
        <p className="text-[12px] text-[#6e6e73] line-clamp-2">지원대상: {listing.target}</p>
      )}
    </div>
  )
}

function DetailLink({ listingId }: { listingId: string }) {
  return (
    <Link
      href={`/gov-support/${listingId}`}
      className="mt-3 inline-flex items-center gap-1 rounded-[9999px] border border-[#e0e0e0] px-3.5 py-1.5 text-[12px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
    >
      자세히 보기
      <ChevronRight size={13} strokeWidth={1.8} />
    </Link>
  )
}

function TransactableCard({ listing }: { listing: MatchedListing }) {
  return (
    <div className="rounded-[14px] border-2 border-primary-dark bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="mb-1.5 inline-flex items-center gap-1 rounded-[9999px] bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-ink">
            <BadgeCheck size={12} strokeWidth={2.2} />
            퍼즐 대행 가능
          </span>
          <p className="text-[14px] font-semibold text-[#1d1d1f]">{listing.title}</p>
          <ListingMeta listing={listing} />
        </div>
        <DeadlineBadge deadline={listing.deadline} />
      </div>
      {listing.note && (
        <div className="mt-3 rounded-[9px] bg-[#f5f5f7] px-3 py-2.5">
          <p className="text-[12px] text-[#1d1d1f]">{listing.note}</p>
        </div>
      )}
      <DetailLink listingId={listing.id} />
    </div>
  )
}

function DirectApplyCard({ listing }: { listing: MatchedListing }) {
  return (
    <div className="rounded-[14px] border border-[#e0e0e0] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[#1d1d1f]">{listing.title}</p>
          <ListingMeta listing={listing} />
        </div>
        <DeadlineBadge deadline={listing.deadline} />
      </div>
      <DetailLink listingId={listing.id} />
    </div>
  )
}

function ProfileMissingCard() {
  return (
    <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-8 text-center">
      <AlertCircle className="mx-auto mb-3 text-[#6e6e73]" size={32} strokeWidth={1.6} />
      <p className="text-[16px] font-semibold text-[#1d1d1f]">사업 정보를 먼저 등록해주세요</p>
      <p className="mt-1.5 text-[13px] text-[#6e6e73]">
        사업자 인증과 지역 정보가 있어야 맞는 지원사업을 찾아드릴 수 있어요
      </p>
      <Link
        href="/settings"
        className="mt-5 inline-block rounded-[9999px] bg-primary px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-primary-hover transition-colors"
      >
        사업 정보 등록하러 가기
      </Link>
    </div>
  )
}

function RegionMissingBanner() {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-[14px] border-2 border-amber-400 bg-amber-50 px-4 py-3.5">
      <MapPin className="mt-0.5 shrink-0 text-amber-700" size={18} strokeWidth={2.2} />
      <div>
        <p className="text-[14px] font-semibold text-amber-900">
          지역 정보가 없어서 정확한 매칭이 안 돼요
        </p>
        <p className="mt-0.5 text-[13px] text-amber-800">
          지금은 전국 대상 공고만 보여드리고 있어요. 지역을 등록하면 우리 지역 지원사업까지
          찾아드려요.{' '}
          <Link href="/settings" className="font-semibold underline underline-offset-2">
            지역 등록하기
          </Link>
        </p>
      </div>
    </div>
  )
}

function SearchBox({
  value,
  onChange,
}: {
  value: string
  onChange: (nextValue: string) => void
}) {
  return (
    <div className="relative mb-5">
      <Search
        size={16}
        strokeWidth={2}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6e6e73]"
      />
      <input
        type="search"
        value={value}
        onChange={changeEvent => onChange(changeEvent.target.value)}
        placeholder="전체 마케팅 지원사업에서 공고명으로 검색"
        className="w-full rounded-[11px] border border-[#e0e0e0] bg-white py-2.5 pl-10 pr-4 text-[14px] text-[#1d1d1f] placeholder:text-[#a1a1a6] focus:border-primary-dark focus:outline-none"
      />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-28 rounded-[14px] bg-[#f5f5f7] animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState({ regionMissing }: { regionMissing: boolean }) {
  return (
    <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-8 text-center">
      <p className="text-[15px] font-medium text-[#1d1d1f]">매칭되는 지원사업이 아직 없어요</p>
      <p className="mt-1.5 text-[13px] text-[#6e6e73]">
        {regionMissing
          ? '지역 정보를 등록하면 매칭 범위가 넓어져요. 새 공고가 올라오면 다시 확인해보세요.'
          : '지금 신청 가능한 공고 중 사장님 지역에 해당하는 건이 없어요. 새 공고가 올라오면 다시 확인해보세요.'}
      </p>
    </div>
  )
}

function SearchResultSection({
  matches,
  query,
}: {
  matches: MatchesResponse
  query: string
}) {
  const combined = [...(matches.transactable ?? []), ...(matches.directApply ?? [])]
  if (combined.length === 0) {
    return (
      <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-8 text-center">
        <p className="text-[15px] font-medium text-[#1d1d1f]">
          &lsquo;{query}&rsquo;에 해당하는 공고가 없어요
        </p>
        <p className="mt-1.5 text-[13px] text-[#6e6e73]">
          다른 검색어로 시도해보세요. 마감된 공고는 검색 결과에 나오지 않아요.
        </p>
      </div>
    )
  }
  return (
    <section>
      <h3 className="mb-3 text-[16px] font-semibold text-[#1d1d1f]">
        &lsquo;{query}&rsquo; 검색결과 {matches.totalCount ?? combined.length}건
      </h3>
      <div className="space-y-3">
        {(matches.transactable ?? []).map(listing => (
          <TransactableCard key={listing.id} listing={listing} />
        ))}
        {(matches.directApply ?? []).map(listing => (
          <DirectApplyCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  )
}

function MatchedSections({ matches }: { matches: MatchesResponse }) {
  const transactable = matches.transactable ?? []
  const directApply = matches.directApply ?? []
  const shownCount = transactable.length + directApply.length
  const totalCount = matches.totalCount ?? 0

  if (shownCount === 0) return <EmptyState regionMissing={Boolean(matches.regionMissing)} />

  return (
    <>
      {transactable.length > 0 && (
        <section className="mb-7">
          <h3 className="mb-3 text-[16px] font-semibold text-[#1d1d1f]">
            퍼즐이 바로 도와드릴 수 있어요
          </h3>
          <div className="space-y-3">
            {transactable.map(listing => (
              <TransactableCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}
      {directApply.length > 0 && (
        <section>
          <h3 className="mb-1 text-[16px] font-semibold text-[#1d1d1f]">이런 지원사업도 있어요</h3>
          <p className="mb-3 text-[12px] text-[#6e6e73]">
            사장님이 직접 신청하는 사업이에요. 상세 내용에서 자격을 확인해보세요.
          </p>
          <div className="space-y-3">
            {directApply.map(listing => (
              <DirectApplyCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}
      {totalCount > shownCount && (
        <p className="mt-5 text-center text-[12px] text-[#6e6e73]">
          매칭된 {totalCount}건 중 마감 임박순으로 {shownCount}건을 보여드리고 있어요
        </p>
      )}
    </>
  )
}

export default function GovSupportPage() {
  const [matches, setMatches] = useState<MatchesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const debounceTimer = setTimeout(() => setQuery(searchInput.trim()), 400)
    return () => clearTimeout(debounceTimer)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    const endpoint = query
      ? `/api/gov-support/matches?q=${encodeURIComponent(query)}`
      : '/api/gov-support/matches'
    fetch(endpoint)
      .then(async res => {
        const body = (await res.json()) as MatchesResponse
        if (!res.ok) throw new Error(body.error || `지원사업 조회 실패 (HTTP ${res.status})`)
        if (!cancelled) setMatches(body)
      })
      .catch((fetchError: unknown) => {
        if (cancelled) return
        setLoadError(
          fetchError instanceof Error ? fetchError.message : '지원사업 목록을 불러오지 못했습니다'
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  const profileComplete = Boolean(matches?.profileComplete)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <h2 className="text-[22px] font-semibold text-[#1d1d1f]">정부지원사업 매칭</h2>
        <p className="mt-1 text-[13px] text-[#6e6e73]">
          사장님 사업 정보에 맞는 지원사업만 골라서 보여드려요
        </p>
      </div>

      {matches?.regionMissing && <RegionMissingBanner />}
      {profileComplete && <SearchBox value={searchInput} onChange={setSearchInput} />}

      {loading ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <div className="flex items-start gap-2 rounded-[11px] bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={15} />
          <p className="text-[13px] text-red-700">{loadError}</p>
        </div>
      ) : !matches?.profileComplete ? (
        <ProfileMissingCard />
      ) : query ? (
        <SearchResultSection matches={matches} query={query} />
      ) : (
        <MatchedSections matches={matches} />
      )}
    </div>
  )
}
