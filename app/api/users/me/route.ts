import { NextResponse } from 'next/server'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { UserProfileData } from '@/lib/profile'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('profile_data')
    .eq('id', sessionUser.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '사용자 정보를 불러오지 못했습니다' }, { status: 500 })
  }

  return NextResponse.json({
    id: sessionUser.id,
    email: sessionUser.email,
    profile: (data.profile_data ?? {}) as UserProfileData,
  })
}
