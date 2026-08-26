// 어드민 한끼 체험단 화면 공유 타입/상수. API 계약: app/api/admin/experience-campaigns/*
import type {
  CampaignStatus,
  CreatorType,
  MissionType,
  ParticipantStatus,
} from '@/lib/experience-campaigns'

export interface AdminExperienceCampaign {
  id: string
  user_id: string
  store_name: string
  title: string
  mission_type: MissionType
  creator_types: CreatorType[]
  payback_amount: number
  capacity: number
  budget_total: number
  fee_rate: number
  fee_amount: number
  budget_available: number
  budget_reserved: number
  setup_mode: 'self' | 'requested'
  status: CampaignStatus
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
  owner_email: string
  owner_business_name: string
  participant_stats: { applied: number; approved: number; verified: number; paid: number }
}

export interface AdminExperienceParticipant {
  id: string
  campaign_id: string
  nickname: string
  phone: string
  email: string | null
  creator_type: CreatorType
  channel_handle: string
  channel_url: string | null
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  status: ParticipantStatus
  applied_at: string
  approved_at: string | null
  content_url: string | null
  content_detected_at: string | null
  content_match_snippet: string | null
  receipt_image_url: string | null
  receipt_ocr_store: string | null
  receipt_ocr_amount: number | null
  receipt_ocr_at: string | null
  receipt_matched: boolean
  verification_note: string | null
  verified_at: string | null
  payout_amount: number | null
  paid_at: string | null
  reject_reason: string | null
}

export interface AdminExperienceLedgerEntry {
  id: string
  campaign_id: string
  participant_id: string | null
  type: 'fee' | 'reserve' | 'release' | 'payout' | 'refund'
  amount: number
  balance_after: number
  note: string | null
  created_at: string
}

export interface AdminExperienceComment {
  id: string
  campaign_id: string
  author_role: 'user' | 'admin'
  author_id: string | null
  body: string
  created_at: string
}

export interface AdminExperienceCampaignDetail {
  campaign: AdminExperienceCampaign & {
    description: string | null
    naver_place_id: string | null
    mission_conditions: string
    auto_payout: boolean
    charge_confirmed: boolean
    charge_confirmed_at: string | null
    reject_reason: string | null
  }
  participants: AdminExperienceParticipant[]
  ledger: AdminExperienceLedgerEntry[]
  comments: AdminExperienceComment[]
}

export const CAMPAIGN_STATUS_STYLE: Record<CampaignStatus, string> = {
  draft: 'bg-[#f5f5f7] text-[#6e6e73]',
  pending_setup: 'bg-orange-50 text-orange-700',
  pending_approval: 'bg-amber-50 text-amber-700',
  change_requested: 'bg-purple-50 text-purple-700',
  active: 'bg-green-50 text-green-700',
  paused: 'bg-red-50 text-red-600',
  closed: 'bg-[#f5f5f7] text-[#6e6e73]',
  settled: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-600',
}

export const PARTICIPANT_STATUS_STYLE: Record<ParticipantStatus, string> = {
  applied: 'bg-amber-50 text-amber-700',
  approved: 'bg-blue-50 text-blue-700',
  content_submitted: 'bg-purple-50 text-purple-700',
  verifying: 'bg-purple-50 text-purple-700',
  verified: 'bg-green-50 text-green-700',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-50 text-red-600',
  expired: 'bg-[#f5f5f7] text-[#6e6e73]',
}
