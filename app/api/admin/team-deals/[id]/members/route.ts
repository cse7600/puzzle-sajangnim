export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { usersReadOnlyAdmin, resolveBusinessName, isUuid } from '@/lib/admin-users'

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

async function attachApplicantInfo(rows: MemberRow[]) {
  if (rows.length === 0) return []
  const userIds = Array.from(new Set(rows.map(row => row.user_id)))
  const { data: users } = await usersReadOnlyAdmin
    .from('users')
    .select('id, email, profile_data')
    .in('id', userIds)
  const infoByUserId = new Map(
    (users ?? []).map(user => [user.id, { business_name: resolveBusinessName(user), email: user.email }])
  )
  return rows.map(row => ({
    ...row,
    business_name: infoByUserId.get(row.user_id)?.business_name ?? row.user_id,
    email: infoByUserId.get(row.user_id)?.email ?? '',
  }))
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }

  const { data, error } = await db
    .from('team_deal_members')
    .select('id, user_id, quantity, price_paid, status, joined_at, refund_transaction_id')
    .eq('deal_id', params.id)
    .order('joined_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: '신청자 목록을 불러오지 못했습니다' }, { status: 500 })
  }
  return NextResponse.json(await attachApplicantInfo(data ?? []))
}
