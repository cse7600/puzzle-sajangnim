import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isUuid } from '@/lib/admin-users'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'

interface RouteParams {
  params: { id: string }
}

export interface AdvertiserSpendEntry {
  id: string
  ad_account_id: string
  account_name: string
  platform: string
  period: string
  spend_vat_excluded: number
  updated_at: string
}

// 어드민 전용 — 한 광고주(사장님)의 모든 광고계정에 걸친 월별 실 소진액 이력을 한 번에 조회.
// 이력 관리 화면은 "매체별 → 월별"이 아니라 "월별 → 매체별"로 보여줘야 하므로,
// 계정 단위로 흩어진 ad_account_monthly_spend를 이 라우트가 한 번에 모아서 클라이언트가 피벗한다.
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '잘못된 사용자 ID 형식입니다' }, { status: 400 })
  }

  const { data: accounts, error: accountsError } = await supabaseAdmin
    .from('ad_accounts')
    .select('id, account_name, platform')
    .eq('user_id', params.id)

  if (accountsError) {
    return NextResponse.json({ error: '광고계정 목록을 불러오지 못했습니다' }, { status: 500 })
  }
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ accounts: [], entries: [] })
  }

  const { data: spend, error: spendError } = await supabaseAdmin
    .from('ad_account_monthly_spend')
    .select('id, ad_account_id, period, spend_vat_excluded, updated_at')
    .in('ad_account_id', accounts.map(a => a.id))
    .order('period', { ascending: false })

  if (spendError) {
    return NextResponse.json({ error: '월별 소진액 이력을 불러오지 못했습니다' }, { status: 500 })
  }

  const accountById = new Map(accounts.map(a => [a.id, a]))
  const entries: AdvertiserSpendEntry[] = (spend ?? []).map(row => {
    const account = accountById.get(row.ad_account_id)
    return {
      id: row.id,
      ad_account_id: row.ad_account_id,
      account_name: account?.account_name ?? '(삭제된 계정)',
      platform: account?.platform ?? '',
      period: row.period,
      spend_vat_excluded: row.spend_vat_excluded,
      updated_at: row.updated_at,
    }
  })

  return NextResponse.json({ accounts, entries })
}
