'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AdminExperienceCampaign,
  CAMPAIGN_STATUS_STYLE,
} from '@/components/admin/experience-campaign-types'
import {
  CAMPAIGN_STATUS_LABEL,
  CampaignStatus,
  MISSION_TYPE_LABEL,
} from '@/lib/experience-campaigns'

const FILTER_TABS: { value: CampaignStatus | 'all' | 'needs_review'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'needs_review', label: '검토 필요' },
  { value: 'pending_setup', label: '세팅 요청' },
  { value: 'pending_approval', label: '승인 대기' },
  { value: 'active', label: '운영 중' },
  { value: 'paused', label: '일시중지' },
  { value: 'change_requested', label: '수정 요청됨' },
  { value: 'closed', label: '마감' },
  { value: 'rejected', label: '반려' },
]

const NEEDS_REVIEW_STATUSES: CampaignStatus[] = ['pending_setup', 'pending_approval']

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function BudgetProgress({ campaign }: { campaign: AdminExperienceCampaign }) {
  if (campaign.budget_total === 0) return <span className="text-[#6e6e73]">-</span>
  const usedRatio = 1 - campaign.budget_available / campaign.budget_total
  const pct = Number.isFinite(usedRatio) ? Math.min(100, Math.max(0, Math.round(usedRatio * 100))) : 0
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[#1d1d1f] font-medium tabular-nums">
          {campaign.budget_reserved.toLocaleString()}P 예약
        </span>
        <div className="w-16 h-1.5 rounded-full bg-[#e0e0e0] overflow-hidden">
          <div className="h-full rounded-full bg-[#0066cc]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className="text-[11px] text-[#6e6e73] mt-0.5">
        가용 {campaign.budget_available.toLocaleString()}P / 총 {campaign.budget_total.toLocaleString()}P
      </p>
    </div>
  )
}

export default function AdminExperienceCampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<AdminExperienceCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<CampaignStatus | 'all' | 'needs_review'>('needs_review')

  function load() {
    setLoading(true)
    setLoadError(null)
    const query = filter === 'all' || filter === 'needs_review' ? '' : `?status=${filter}`
    fetch(`/api/admin/experience-campaigns${query}`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? '목록을 불러오지 못했습니다')
        setCampaigns(Array.isArray(body) ? body : [])
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const visibleCampaigns = useMemo(() => {
    if (filter !== 'needs_review') return campaigns
    return campaigns.filter((c) => NEEDS_REVIEW_STATUSES.includes(c.status))
  }, [campaigns, filter])

  const reviewCount = useMemo(
    () => campaigns.filter((c) => NEEDS_REVIEW_STATUSES.includes(c.status)).length,
    [campaigns]
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-semibold text-[#1d1d1f]">한끼 체험단 관리</h1>
      </div>

      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              filter === tab.value
                ? 'bg-[#1d1d1f] text-white'
                : 'bg-white text-[#6e6e73] border border-[#e0e0e0] hover:bg-[#f5f5f7]'
            }`}
          >
            {tab.label}
            {tab.value === 'needs_review' && reviewCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5">
                {reviewCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-[#f5f5f7] animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="p-8 text-center">
            <p className="text-[13px] text-red-600 mb-3">{loadError}</p>
            <button onClick={load} className="text-[13px] text-[#0066cc] hover:underline">
              다시 시도
            </button>
          </div>
        ) : visibleCampaigns.length === 0 ? (
          <div className="p-8 text-center text-[#6e6e73] text-[14px]">해당하는 캠페인이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">캠페인</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">사장님</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">유형</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">모집 현황</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">예산 현황</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상태</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">등록일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {visibleCampaigns.map((campaign) => {
                  const needsReview = NEEDS_REVIEW_STATUSES.includes(campaign.status)
                  return (
                    <tr
                      key={campaign.id}
                      onClick={() => router.push(`/admin/experience-campaigns/${campaign.id}`)}
                      className={`cursor-pointer transition-colors hover:bg-[#f5f5f7] ${
                        needsReview ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-[#1d1d1f]">{campaign.title}</p>
                          <p className="text-[11px] text-[#6e6e73] mt-0.5">{campaign.store_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6e6e73]">
                        {campaign.owner_business_name || campaign.owner_email || '-'}
                      </td>
                      <td className="px-4 py-3 text-[#6e6e73]">
                        {MISSION_TYPE_LABEL[campaign.mission_type]}
                      </td>
                      <td className="px-4 py-3">
                        <span className="tabular-nums text-[#1d1d1f]">
                          승인 {campaign.participant_stats.approved} · 검증 {campaign.participant_stats.verified} · 지급{' '}
                          {campaign.participant_stats.paid}
                        </span>
                        <p className="text-[11px] text-[#6e6e73] mt-0.5">
                          신청 {campaign.participant_stats.applied} / 정원 {campaign.capacity}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <BudgetProgress campaign={campaign} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${CAMPAIGN_STATUS_STYLE[campaign.status]}`}
                        >
                          {CAMPAIGN_STATUS_LABEL[campaign.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6e6e73]">{formatDate(campaign.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
