import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/is-admin-email'
import {
  ADMIN_ENTRY_COOKIE,
  QA_MODE_COOKIE,
  QA_MODE_COOKIE_MAX_AGE,
  signQaModeToken,
  verifyAdminEntryCookie,
} from '@/lib/admin-session'

export const runtime = 'nodejs'

function resolveIsAdmin(email: string, appMetadata: Record<string, unknown> | null): boolean {
  return appMetadata?.role === 'admin' || isAdminEmail(email)
}

// QA 모드 진입은 반드시 서버에서 관리자 증명을 재검증한다 — 쿼리 파라미터나
// 클라이언트가 보낸 플래그는 절대 신뢰하지 않는다. 미들웨어의 admin 게이트와
// 별개로 라우트 자체에서도 동일한 증명을 확인하는 이중 방어다.
async function hasVerifiedAdminProof(): Promise<boolean> {
  const cookieStore = cookies()
  const cookieProof = await verifyAdminEntryCookie(cookieStore.get(ADMIN_ENTRY_COOKIE)?.value)
  if (cookieProof) return true

  const supabase = createServerSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return false
  const appMetadata = (data.user.app_metadata ?? null) as Record<string, unknown> | null
  return resolveIsAdmin(data.user.email ?? '', appMetadata)
}

export async function POST() {
  if (!(await hasVerifiedAdminProof())) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  }

  const qaUserId = process.env.QA_USER_ID
  if (!qaUserId) {
    return NextResponse.json({ error: 'QA_USER_ID가 설정되지 않았습니다' }, { status: 500 })
  }

  const token = await signQaModeToken(qaUserId)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(QA_MODE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: QA_MODE_COOKIE_MAX_AGE,
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(QA_MODE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
