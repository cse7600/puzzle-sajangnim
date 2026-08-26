// 한끼 체험단 공용 타입 · 상수 · 검증 헬퍼 (서버/클라이언트 공용)

export type MissionType = 'visit' | 'press' | 'provided' | 'receipt_review'
export type CreatorType = 'blog' | 'instagram' | 'youtube' | 'tiktok'
export type CampaignStatus =
  | 'draft'
  | 'pending_setup'
  | 'pending_approval'
  | 'change_requested'
  | 'active'
  | 'paused'
  | 'closed'
  | 'settled'
  | 'rejected'
export type ParticipantStatus =
  | 'applied'
  | 'approved'
  | 'content_submitted'
  | 'verifying'
  | 'verified'
  | 'paid'
  | 'rejected'
  | 'expired'

export const MISSION_TYPE_LABEL: Record<MissionType, string> = {
  visit: '방문형',
  press: '기자단',
  provided: '제공형',
  receipt_review: '영수증 리뷰형',
}

export const CREATOR_TYPE_LABEL: Record<CreatorType, string> = {
  blog: '블로그',
  instagram: '인스타그램',
  youtube: '유튜브',
  tiktok: '틱톡',
}

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: '작성 중',
  pending_setup: '세팅 요청됨',
  pending_approval: '승인 대기',
  change_requested: '수정 요청됨',
  active: '운영 중',
  paused: '일시중지(예산 소진)',
  closed: '마감',
  settled: '정산 완료',
  rejected: '반려',
}

export const PARTICIPANT_STATUS_LABEL: Record<ParticipantStatus, string> = {
  applied: '신청 접수',
  approved: '참여 승인',
  content_submitted: '콘텐츠 제출',
  verifying: '검증 중',
  verified: '검증 완료',
  paid: '지급 완료',
  rejected: '반려',
  expired: '기간 만료',
}

export const DEFAULT_FEE_RATE = 10

export interface CampaignCreateInput {
  store_name: string
  title: string
  description?: string
  mission_type: MissionType
  creator_types: CreatorType[]
  mission_conditions: string
  payback_amount: number
  capacity: number
  budget_total: number
  setup_mode?: 'self' | 'requested'
  place_registration_id?: string | null
  naver_place_id?: string | null
  start_date?: string | null
  end_date?: string | null
}

const MISSION_TYPES: MissionType[] = ['visit', 'press', 'provided', 'receipt_review']
const CREATOR_TYPES: CreatorType[] = ['blog', 'instagram', 'youtube', 'tiktok']

export function validateCampaignCreateInput(
  body: Record<string, unknown>
): { error: string } | { data: CampaignCreateInput } {
  const store_name = typeof body.store_name === 'string' ? body.store_name.trim() : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const mission_conditions =
    typeof body.mission_conditions === 'string' ? body.mission_conditions.trim() : ''
  const mission_type = body.mission_type as MissionType
  const creator_types = Array.isArray(body.creator_types) ? (body.creator_types as CreatorType[]) : []
  const payback_amount = Number(body.payback_amount)
  const capacity = Number(body.capacity)
  const budget_total = Number(body.budget_total)

  if (!store_name) return { error: '가게 이름을 입력해주세요' }
  if (!title) return { error: '캠페인 제목을 입력해주세요' }
  if (!MISSION_TYPES.includes(mission_type)) return { error: '미션 유형을 선택해주세요' }
  if (creator_types.length === 0 || !creator_types.every((t) => CREATOR_TYPES.includes(t))) {
    return { error: '참여 크리에이터 유형을 하나 이상 선택해주세요' }
  }
  if (mission_conditions.length < 10) {
    return { error: '지급 조건은 크리에이터가 정확히 이해할 수 있도록 10자 이상 작성해주세요' }
  }
  if (!Number.isFinite(payback_amount) || payback_amount <= 0) {
    return { error: '페이백 금액을 올바르게 입력해주세요' }
  }
  if (!Number.isInteger(capacity) || capacity <= 0) {
    return { error: '모집 인원을 올바르게 입력해주세요' }
  }
  if (!Number.isFinite(budget_total) || budget_total < payback_amount * capacity) {
    return { error: '예산은 최소 (페이백 금액 × 모집 인원) 이상이어야 합니다' }
  }

  const setup_mode = body.setup_mode === 'requested' ? 'requested' : 'self'

  return {
    data: {
      store_name,
      title,
      description: typeof body.description === 'string' ? body.description.trim() : undefined,
      mission_type,
      creator_types,
      mission_conditions,
      payback_amount: Math.round(payback_amount),
      capacity,
      budget_total: Math.round(budget_total),
      setup_mode,
      place_registration_id:
        typeof body.place_registration_id === 'string' ? body.place_registration_id : null,
      naver_place_id: typeof body.naver_place_id === 'string' ? body.naver_place_id : null,
      start_date: typeof body.start_date === 'string' ? body.start_date : null,
      end_date: typeof body.end_date === 'string' ? body.end_date : null,
    },
  }
}

// draft/change_requested 상태에서만 캠페인 본문을 수정할 수 있다 — 승인 대기/운영 중에는
// 사후 변경으로 이미 참여한 크리에이터에게 안내된 조건이 바뀌는 것을 막는다.
export const CAMPAIGN_EDITABLE_STATUSES: CampaignStatus[] = ['draft', 'change_requested']

// 참여 신청을 받을 수 있는 상태
export const CAMPAIGN_APPLICABLE_STATUSES: CampaignStatus[] = ['active']
