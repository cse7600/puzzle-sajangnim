import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { usersReadOnlyAdmin, resolveBusinessName } from '@/lib/admin-users'

export const runtime = 'nodejs'

type VerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'

interface AdminUserListItem {
  id: string
  business_name: string
  email: string
  verification_status: VerificationStatus
  created_at: string
}

async function fetchLatestVerificationStatusByUser(): Promise<Map<string, VerificationStatus>> {
  const { data, error } = await supabaseAdmin
    .from('business_verifications')
    .select('user_id, status, submitted_at')
    .order('submitted_at', { ascending: false })
  if (error || !data) return new Map()
  const statusByUser = new Map<string, VerificationStatus>()
  for (const row of data) {
    if (!statusByUser.has(row.user_id)) statusByUser.set(row.user_id, row.status)
  }
  return statusByUser
}

export async function GET() {
  const { data: users, error } = await usersReadOnlyAdmin
    .from('users')
    .select('id, email, profile_data, created_at')
    .order('created_at', { ascending: false })

  if (error || !users) {
    return NextResponse.json({ error: '사용자 목록을 불러오지 못했습니다' }, { status: 500 })
  }

  const statusByUser = await fetchLatestVerificationStatusByUser()

  const items: AdminUserListItem[] = users.map((user) => ({
    id: user.id,
    business_name: resolveBusinessName(user),
    email: user.email,
    verification_status: statusByUser.get(user.id) ?? 'not_submitted',
    created_at: user.created_at,
  }))

  return NextResponse.json(items)
}
