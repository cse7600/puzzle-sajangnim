export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { usersReadOnlyAdmin, resolveBusinessName, isUuid } from '@/lib/admin-users'
import { getPointBalance } from '@/lib/points'

const db = supabaseAdmin as any

interface MemberRow {
  id: string
  user_id: string
  quantity: number
  price_paid: number
  status: string
  joined_at: string
  refund_transaction_id: string | null
}

interface QuestionRow {
  id: string
  position: number
  question_type: 'text' | 'link' | 'image'
  label: string
  required: boolean
}

interface ResponseRow {
  member_id: string
  question_id: string
  value: string
  updated_at: string
}

interface SpendEntry {
  platform: string
  account_name: string
  spend_vat_excluded: number
}

function previousMonthPeriod(): string {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
}

async function loadApplicantProfiles(userIds: string[]) {
  const { data: users } = await usersReadOnlyAdmin
    .from('users')
    .select('id, email, profile_data')
    .in('id', userIds)
  return new Map(
    (users ?? []).map(user => [user.id, { business_name: resolveBusinessName(user), email: user.email }])
  )
}

// 유저별 최신 제출 건(submitted_at 기준)의 세금계산서 수신 메일 — created_at은 실 DB에 없다.
async function loadTaxInvoiceEmails(userIds: string[]): Promise<Map<string, string>> {
  const { data: rows } = await db
    .from('business_verifications')
    .select('user_id, tax_invoice_email, submitted_at')
    .in('user_id', userIds)
    .order('submitted_at', { ascending: false })
  const emailByUser = new Map<string, string>()
  for (const row of rows ?? []) {
    if (!emailByUser.has(row.user_id) && row.tax_invoice_email) {
      emailByUser.set(row.user_id, row.tax_invoice_email)
    }
  }
  return emailByUser
}

interface AdAccountRow {
  id: string
  user_id: string
  account_name: string
  platform: string
  contact_phone: string | null
}

async function loadAdAccounts(userIds: string[]): Promise<AdAccountRow[]> {
  const { data: accounts } = await db
    .from('ad_accounts')
    .select('id, user_id, account_name, platform, contact_phone')
    .in('user_id', userIds)
  return accounts ?? []
}

// users.phone은 실 DB에 없으므로(마이그레이션 001 사문) 광고계정 담당자 연락처로 대체한다.
function contactPhoneByUser(accounts: AdAccountRow[]): Map<string, string> {
  const phoneByUser = new Map<string, string>()
  for (const account of accounts) {
    if (!phoneByUser.has(account.user_id) && account.contact_phone) {
      phoneByUser.set(account.user_id, account.contact_phone)
    }
  }
  return phoneByUser
}

async function loadPrevMonthSpend(accounts: AdAccountRow[]): Promise<Map<string, SpendEntry[]>> {
  const spendByUser = new Map<string, SpendEntry[]>()
  if (accounts.length === 0) return spendByUser
  const { data: rows } = await db
    .from('ad_account_monthly_spend')
    .select('ad_account_id, spend_vat_excluded')
    .in('ad_account_id', accounts.map(account => account.id))
    .eq('period', previousMonthPeriod())
  const accountById = new Map(accounts.map(account => [account.id, account]))
  for (const row of rows ?? []) {
    const account = accountById.get(row.ad_account_id)
    if (!account) continue
    const entries = spendByUser.get(account.user_id) ?? []
    entries.push({
      platform: account.platform,
      account_name: account.account_name,
      spend_vat_excluded: row.spend_vat_excluded,
    })
    spendByUser.set(account.user_id, entries)
  }
  return spendByUser
}

async function loadResponses(memberIds: string[]): Promise<Map<string, ResponseRow[]>> {
  const responsesByMember = new Map<string, ResponseRow[]>()
  if (memberIds.length === 0) return responsesByMember
  const { data: rows } = await db
    .from('team_deal_survey_responses')
    .select('member_id, question_id, value, updated_at')
    .in('member_id', memberIds)
  for (const row of rows ?? []) {
    const entries = responsesByMember.get(row.member_id) ?? []
    entries.push(row)
    responsesByMember.set(row.member_id, entries)
  }
  return responsesByMember
}

async function loadPointBalances(userIds: string[]): Promise<Map<string, number>> {
  const balances = await Promise.all(userIds.map(userId => getPointBalance(userId)))
  return new Map(userIds.map((userId, index) => [userId, balances[index]]))
}

function surveyStatus(questions: QuestionRow[], responses: ResponseRow[]): 'none' | 'pending' | 'partial' | 'done' {
  if (questions.length === 0) return 'none'
  if (responses.length === 0) return 'pending'
  const answeredIds = new Set(responses.map(response => response.question_id))
  const requiredDone = questions.filter(q => q.required).every(q => answeredIds.has(q.id))
  return requiredDone ? 'done' : 'partial'
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }

  const { data: deal } = await db
    .from('team_deals')
    .select('id, title, status, deal_price, target_count, current_count')
    .eq('id', params.id)
    .maybeSingle()
  if (!deal) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }

  const [{ data: memberRows, error: membersError }, { data: questionRows, error: questionsError }] =
    await Promise.all([
      db.from('team_deal_members')
        .select('id, user_id, quantity, price_paid, status, joined_at, refund_transaction_id')
        .eq('deal_id', params.id)
        .order('joined_at', { ascending: false }),
      db.from('team_deal_survey_questions')
        .select('id, position, question_type, label, required')
        .eq('deal_id', params.id)
        .order('position', { ascending: true }),
    ])
  if (membersError || questionsError) {
    return NextResponse.json({ error: '신청자 목록을 불러오지 못했습니다' }, { status: 500 })
  }

  const members: MemberRow[] = memberRows ?? []
  const questions: QuestionRow[] = questionRows ?? []
  const userIds = Array.from(new Set(members.map(member => member.user_id)))

  const accounts = await loadAdAccounts(userIds)
  const [profiles, taxEmails, spendByUser, responsesByMember, balances] = await Promise.all([
    loadApplicantProfiles(userIds),
    loadTaxInvoiceEmails(userIds),
    loadPrevMonthSpend(accounts),
    loadResponses(members.map(member => member.id)),
    loadPointBalances(userIds),
  ])
  const phoneByUser = contactPhoneByUser(accounts)

  const enriched = members.map(member => {
    const responses = responsesByMember.get(member.id) ?? []
    const prevMonthSpend = spendByUser.get(member.user_id) ?? []
    return {
      ...member,
      business_name: profiles.get(member.user_id)?.business_name ?? member.user_id,
      email: profiles.get(member.user_id)?.email ?? '',
      contact_phone: phoneByUser.get(member.user_id) ?? null,
      tax_invoice_email: taxEmails.get(member.user_id) ?? null,
      point_balance: balances.get(member.user_id) ?? 0,
      prev_month_spend: prevMonthSpend,
      prev_month_total: prevMonthSpend.reduce((sum, entry) => sum + entry.spend_vat_excluded, 0),
      survey_status: surveyStatus(questions, responses),
      responses: responses.map(({ question_id, value, updated_at }) => ({ question_id, value, updated_at })),
    }
  })

  return NextResponse.json({ deal, questions, members: enriched, prev_month_period: previousMonthPeriod() })
}
