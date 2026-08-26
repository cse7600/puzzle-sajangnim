'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import {
  AdminDealMemberDetail,
  AdminDealMembersPayload,
  AdminSurveyQuestion,
  DEAL_STATUS_LABEL,
  DEAL_STATUS_STYLE,
  MEMBER_STATUS_LABEL,
  MEMBER_STATUS_STYLE,
  QUESTION_TYPE_LABEL,
  SURVEY_STATUS_LABEL,
  SURVEY_STATUS_STYLE,
} from '@/components/admin/team-deal-types'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

const PLATFORM_LABEL: Record<string, string> = {
  naver: '네이버', kakao: '카카오', google: '구글', meta: '메타', carrot: '당근',
}

function platformLabel(platform: string): string {
  return PLATFORM_LABEL[platform] ?? platform
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-[#6e6e73] mb-0.5">{label}</p>
      <div className="text-[13px] font-medium text-[#1d1d1f]">{value}</div>
    </div>
  )
}

function PrevMonthSpendTable({ member, period }: { member: AdminDealMemberDetail; period: string }) {
  if (member.prev_month_spend.length === 0) {
    return <p className="text-[12px] text-[#6e6e73]">전월({period}) 소진 이력이 없습니다</p>
  }
  return (
    <div className="rounded-[11px] border border-[#e0e0e0] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead className="bg-[#f5f5f7]">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-[#6e6e73]">매체</th>
            <th className="text-left px-3 py-2 font-medium text-[#6e6e73]">계정</th>
            <th className="text-right px-3 py-2 font-medium text-[#6e6e73]">전월 소진액(VAT 별도)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e0e0e0]">
          {member.prev_month_spend.map((entry, index) => (
            <tr key={`${entry.account_name}-${index}`}>
              <td className="px-3 py-2 text-[#1d1d1f]">{platformLabel(entry.platform)}</td>
              <td className="px-3 py-2 text-[#6e6e73]">{entry.account_name}</td>
              <td className="px-3 py-2 text-right tabular-nums text-[#1d1d1f]">
                {entry.spend_vat_excluded.toLocaleString()}원
              </td>
            </tr>
          ))}
          <tr className="bg-[#f5f5f7]">
            <td className="px-3 py-2 font-semibold text-[#1d1d1f]" colSpan={2}>합계</td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold text-[#1d1d1f]">
              {member.prev_month_total.toLocaleString()}원
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ResponseValue({ question, value }: { question: AdminSurveyQuestion; value: string }) {
  if (question.question_type === 'image') {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="inline-block">
        <img
          src={value}
          alt={question.label}
          className="h-20 w-28 rounded-[11px] object-cover border border-[#e0e0e0] hover:opacity-80 transition-opacity"
        />
      </a>
    )
  }
  if (question.question_type === 'link') {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[13px] text-[#0066cc] hover:underline break-all"
      >
        {value}
      </a>
    )
  }
  return <p className="text-[13px] text-[#1d1d1f] whitespace-pre-wrap">{value}</p>
}

function SurveyAnswers({ member, questions }: { member: AdminDealMemberDetail; questions: AdminSurveyQuestion[] }) {
  if (questions.length === 0) {
    return <p className="text-[12px] text-[#6e6e73]">이 딜에 설정된 설문 문항이 없습니다</p>
  }
  const valueByQuestion = new Map(member.responses.map(response => [response.question_id, response.value]))
  return (
    <div className="space-y-3">
      {questions.map(question => {
        const value = valueByQuestion.get(question.id)
        return (
          <div key={question.id}>
            <p className="text-[12px] text-[#6e6e73] mb-1">
              {question.label}
              <span className="ml-1.5 text-[11px] text-[#a1a1a6]">
                {QUESTION_TYPE_LABEL[question.question_type]}{question.required ? ' · 필수' : ''}
              </span>
            </p>
            {value ? (
              <ResponseValue question={question} value={value} />
            ) : (
              <p className="text-[13px] text-[#a1a1a6]">미응답</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MemberDetailPanel({
  member,
  questions,
  period,
  cancelling,
  onCancel,
}: {
  member: AdminDealMemberDetail
  questions: AdminSurveyQuestion[]
  period: string
  cancelling: boolean
  onCancel: () => void
}) {
  return (
    <div className="bg-[#f5f5f7]/60 px-6 py-5 space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <InfoItem label="연락처" value={member.contact_phone ?? <span className="text-[#a1a1a6]">미등록</span>} />
        <InfoItem
          label="담당자 수신메일"
          value={member.tax_invoice_email ?? <span className="text-[#a1a1a6]">미등록</span>}
        />
        <InfoItem label="현재 포인트 잔액" value={`${member.point_balance.toLocaleString()}P`} />
        <InfoItem
          label="회원 상세"
          value={
            <Link href={`/admin/users/${member.user_id}`} className="text-[#0066cc] hover:underline">
              사업자·광고계정·수익 전체 보기
            </Link>
          }
        />
      </div>

      <div>
        <p className="text-[12px] font-semibold text-[#1d1d1f] mb-2">광고 매체 전월({period}) 소진 현황</p>
        <PrevMonthSpendTable member={member} period={period} />
      </div>

      <div>
        <p className="text-[12px] font-semibold text-[#1d1d1f] mb-2">설문 답변</p>
        <SurveyAnswers member={member} questions={questions} />
      </div>

      {member.status === 'joined' && (
        <div className="pt-1">
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="rounded-[9999px] border border-red-200 px-4 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            {cancelling ? '처리 중...' : `신청 취소 · ${member.price_paid.toLocaleString()}P 환불`}
          </button>
        </div>
      )}
    </div>
  )
}

function MembersTable({
  payload,
  expandedId,
  onToggle,
  cancellingId,
  onCancel,
}: {
  payload: AdminDealMembersPayload
  expandedId: string | null
  onToggle: (memberId: string) => void
  cancellingId: string | null
  onCancel: (member: AdminDealMemberDetail) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상호명</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">이메일</th>
            <th className="text-right px-4 py-3 font-medium text-[#6e6e73]">수량</th>
            <th className="text-right px-4 py-3 font-medium text-[#6e6e73]">결제 포인트</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">설문</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상태</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">신청일시</th>
            <th className="px-2 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e0e0e0]">
          {payload.members.map(member => (
            <MemberRow
              key={member.id}
              member={member}
              payload={payload}
              expanded={expandedId === member.id}
              onToggle={() => onToggle(member.id)}
              cancelling={cancellingId === member.id}
              onCancel={() => onCancel(member)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MemberRow({
  member,
  payload,
  expanded,
  onToggle,
  cancelling,
  onCancel,
}: {
  member: AdminDealMemberDetail
  payload: AdminDealMembersPayload
  expanded: boolean
  onToggle: () => void
  cancelling: boolean
  onCancel: () => void
}) {
  return (
    <>
      <tr onClick={onToggle} className="hover:bg-[#f5f5f7] transition-colors cursor-pointer">
        <td className="px-4 py-3 font-medium text-[#1d1d1f]">{member.business_name}</td>
        <td className="px-4 py-3 text-[#6e6e73]">{member.email}</td>
        <td className="px-4 py-3 text-right tabular-nums text-[#1d1d1f]">{member.quantity}개</td>
        <td className="px-4 py-3 text-right tabular-nums font-medium text-[#1d1d1f]">
          {member.price_paid.toLocaleString()}P
        </td>
        <td className="px-4 py-3">
          <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${SURVEY_STATUS_STYLE[member.survey_status]}`}>
            {SURVEY_STATUS_LABEL[member.survey_status]}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${MEMBER_STATUS_STYLE[member.status]}`}>
            {MEMBER_STATUS_LABEL[member.status]}
          </span>
        </td>
        <td className="px-4 py-3 text-[#6e6e73]">{formatDateTime(member.joined_at)}</td>
        <td className="px-2 py-3 text-[#6e6e73]">
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="p-0">
            <MemberDetailPanel
              member={member}
              questions={payload.questions}
              period={payload.prev_month_period}
              cancelling={cancelling}
              onCancel={onCancel}
            />
          </td>
        </tr>
      )}
    </>
  )
}

export default function AdminTeamDealMembersPage() {
  const params = useParams<{ id: string }>()
  const dealId = params.id
  const [payload, setPayload] = useState<AdminDealMembersPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    fetch(`/api/admin/team-deals/${dealId}/members`)
      .then(async res => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? '신청자 목록을 불러오지 못했습니다')
        setPayload(body)
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [dealId])

  useEffect(load, [load])

  async function handleCancel(member: AdminDealMemberDetail) {
    const confirmed = window.confirm(
      `${member.business_name}님의 신청을 취소하고 ${member.price_paid.toLocaleString()}P를 환불합니다. 계속할까요?`
    )
    if (!confirmed) return
    setCancellingId(member.id)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/team-deals/${dealId}/members/${member.id}/cancel`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        setActionError(body.error ?? '취소 처리에 실패했습니다')
        return
      }
      load()
    } catch {
      setActionError('취소 처리 중 네트워크 오류가 발생했습니다')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div>
      <Link
        href="/admin/team-deals"
        className="inline-flex items-center gap-1 text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        팀 구매 관리로 돌아가기
      </Link>

      {loading ? (
        <div className="space-y-4">
          <div className="h-20 rounded-[18px] bg-white border border-[#e0e0e0] animate-pulse" />
          <div className="rounded-[18px] bg-white border border-[#e0e0e0] p-8 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-[#f5f5f7] animate-pulse" />)}
          </div>
        </div>
      ) : loadError ? (
        <div className="rounded-[18px] bg-white border border-[#e0e0e0] p-8 text-center">
          <p className="text-[13px] text-red-600 mb-3">{loadError}</p>
          <button onClick={load} className="text-[13px] text-[#0066cc] hover:underline">다시 시도</button>
        </div>
      ) : payload ? (
        <>
          <div className="rounded-[18px] bg-white border border-[#e0e0e0] px-6 py-5 mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-[18px] font-semibold text-[#1d1d1f]">{payload.deal.title}</h1>
              <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${DEAL_STATUS_STYLE[payload.deal.status]}`}>
                {DEAL_STATUS_LABEL[payload.deal.status]}
              </span>
            </div>
            <p className="text-[13px] text-[#6e6e73] mt-1">
              딜가 {payload.deal.deal_price.toLocaleString()}P · 모집{' '}
              {payload.deal.current_count}/{payload.deal.target_count}개 · 신청자 {payload.members.length}명
            </p>
          </div>

          {actionError && (
            <p className="mb-4 rounded-[11px] bg-red-50 px-4 py-2.5 text-[12px] font-medium text-red-600">
              {actionError}
            </p>
          )}

          <div className="rounded-[18px] bg-white border border-[#e0e0e0] overflow-hidden">
            {payload.members.length === 0 ? (
              <div className="p-8 text-center text-[#6e6e73] text-[14px]">아직 신청자가 없습니다</div>
            ) : (
              <MembersTable
                payload={payload}
                expandedId={expandedId}
                onToggle={memberId => setExpandedId(current => (current === memberId ? null : memberId))}
                cancellingId={cancellingId}
                onCancel={handleCancel}
              />
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
