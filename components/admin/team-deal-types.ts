// 어드민 팀구매 화면 공유 타입/상수. API 계약: app/api/admin/team-deals/*
export interface AdminTeamDeal {
  id: string
  title: string
  description: string | null
  category: string
  original_price: number
  deal_price: number
  target_count: number
  current_count: number
  deadline: string
  status: 'active' | 'completed' | 'failed' | 'cancelled'
  thumbnail_url: string | null
  content_html: string | null
  created_at: string
  applicant_count: number
  joined_quantity: number
}

export interface AdminDealMember {
  id: string
  user_id: string
  business_name: string
  email: string
  quantity: number
  price_paid: number
  status: 'joined' | 'refunded' | 'cancelled'
  joined_at: string
  refund_transaction_id: string | null
}

export const DEAL_CATEGORY_OPTIONS = [
  { value: 'blog', label: 'AI 블로그' },
  { value: 'place', label: '플레이스' },
  { value: 'experience', label: '체험단' },
  { value: 'ads', label: '광고' },
  { value: 'other', label: '기타' },
] as const

export const DEAL_CATEGORY_EMOJI: Record<string, string> = {
  blog: '📝', place: '📍', experience: '⭐', ads: '📣', other: '🛒',
}

export const DEAL_STATUS_LABEL: Record<AdminTeamDeal['status'], string> = {
  active: '모집중',
  completed: '완료',
  failed: '미달종료',
  cancelled: '취소',
}

export const DEAL_STATUS_STYLE: Record<AdminTeamDeal['status'], string> = {
  active: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  failed: 'bg-[#f5f5f7] text-[#6e6e73]',
  cancelled: 'bg-red-50 text-red-600',
}

export const MEMBER_STATUS_LABEL: Record<AdminDealMember['status'], string> = {
  joined: '신청 완료',
  refunded: '환불(모집미달)',
  cancelled: '취소(환불)',
}

export const MEMBER_STATUS_STYLE: Record<AdminDealMember['status'], string> = {
  joined: 'bg-green-50 text-green-700',
  refunded: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-600',
}

// ── 설문(딜 단위 공용 문항 + 신청 건별 답변) ──
export type SurveyQuestionType = 'text' | 'link' | 'image'

export interface AdminSurveyQuestion {
  id: string
  position: number
  question_type: SurveyQuestionType
  label: string
  required: boolean
}

export interface AdminMemberResponse {
  question_id: string
  value: string
  updated_at: string
}

export interface AdminMemberSpendEntry {
  platform: string
  account_name: string
  spend_vat_excluded: number
}

export type SurveyStatus = 'none' | 'pending' | 'partial' | 'done'

export interface AdminDealMemberDetail extends AdminDealMember {
  contact_phone: string | null
  tax_invoice_email: string | null
  point_balance: number
  prev_month_spend: AdminMemberSpendEntry[]
  prev_month_total: number
  survey_status: SurveyStatus
  responses: AdminMemberResponse[]
}

export interface AdminDealMembersPayload {
  deal: Pick<AdminTeamDeal, 'id' | 'title' | 'status' | 'deal_price' | 'target_count' | 'current_count'>
  questions: AdminSurveyQuestion[]
  members: AdminDealMemberDetail[]
  prev_month_period: string
}

export const QUESTION_TYPE_OPTIONS: { value: SurveyQuestionType; label: string }[] = [
  { value: 'text', label: '텍스트' },
  { value: 'link', label: '링크' },
  { value: 'image', label: '이미지' },
]

export const QUESTION_TYPE_LABEL: Record<SurveyQuestionType, string> = {
  text: '텍스트', link: '링크', image: '이미지',
}

export const SURVEY_STATUS_LABEL: Record<SurveyStatus, string> = {
  none: '문항 없음',
  pending: '미작성',
  partial: '작성중',
  done: '작성완료',
}

export const SURVEY_STATUS_STYLE: Record<SurveyStatus, string> = {
  none: 'bg-[#f5f5f7] text-[#6e6e73]',
  pending: 'bg-amber-50 text-amber-700',
  partial: 'bg-blue-50 text-blue-700',
  done: 'bg-green-50 text-green-700',
}
