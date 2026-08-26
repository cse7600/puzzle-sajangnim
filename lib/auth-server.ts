import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/is-admin-email'
import { usersAdmin } from '@/lib/supabase/users-admin'
import {
  ADMIN_ENTRY_COOKIE,
  QA_MODE_COOKIE,
  verifyAdminEntryCookie,
  verifyQaModeCookie,
} from '@/lib/admin-session'

export type SessionUser = {
  id: string
  email: string
  isAdmin: boolean
}

function resolveIsAdmin(email: string, appMetadata: Record<string, unknown> | null): boolean {
  return appMetadata?.role === 'admin' || isAdminEmail(email)
}

type ProofContext = {
  supabaseUser: User | null
  supabaseAdminProof: boolean
  adminProof: boolean
}

// 관리자 증명은 Supabase 세션 관리자 OR 관리자 입장 쿠키, 둘 중 하나면 충분하다.
async function resolveProofContext(): Promise<ProofContext> {
  const cookieStore = cookies()
  const cookieAdminProof = await verifyAdminEntryCookie(cookieStore.get(ADMIN_ENTRY_COOKIE)?.value)

  const supabase = createServerSupabase()
  const { data, error } = await supabase.auth.getUser()
  const supabaseUser = !error && data.user ? data.user : null
  const appMetadata = (supabaseUser?.app_metadata ?? null) as Record<string, unknown> | null
  const supabaseAdminProof = supabaseUser
    ? resolveIsAdmin(supabaseUser.email ?? '', appMetadata)
    : false

  return { supabaseUser, supabaseAdminProof, adminProof: supabaseAdminProof || cookieAdminProof }
}

async function resolveQaSessionUser(qaUid: string): Promise<SessionUser> {
  const { data } = await usersAdmin.from('users').select('email').eq('id', qaUid).maybeSingle()
  return { id: qaUid, email: data?.email ?? '', isAdmin: false }
}

// getSession()이 아닌 getUser()를 쓴다 — getUser()는 매 호출마다 Supabase Auth 서버에
// 재검증을 요청하므로, 쿠키만 읽고 신뢰하는 getSession()과 달리 위조된 세션을 걸러낸다.
//
// QA 모드는 admin proof + 유효한 QA 쿠키가 모두 있어야만 활성화된다. QA 쿠키만 있고
// admin proof가 없으면(만료·탈취 등) QA 모드는 무효고 아래 일반 인증 분기로 떨어진다.
export async function getSessionUser(): Promise<SessionUser | null> {
  const { supabaseUser, supabaseAdminProof, adminProof } = await resolveProofContext()

  if (adminProof) {
    const qaToken = cookies().get(QA_MODE_COOKIE)?.value
    const qaUid = await verifyQaModeCookie(qaToken)
    if (qaUid) return resolveQaSessionUser(qaUid)
  }

  if (supabaseUser) {
    return { id: supabaseUser.id, email: supabaseUser.email ?? '', isAdmin: supabaseAdminProof }
  }

  if (adminProof) {
    // 관리자 입장 쿠키만으로 들어온 세션 — 실제 users 행이 없으므로 sentinel id를 쓴다.
    // /api/admin/* 라우트는 isAdmin만 확인하므로 id/email이 쓰이지 않는다.
    return { id: 'admin-entry', email: '', isAdmin: true }
  }

  return null
}

// (app) 레이아웃에서 "QA 모드 — 관리자" 배지를 표시할지 서버에서 판단한다.
export async function isQaModeActive(): Promise<boolean> {
  const { adminProof } = await resolveProofContext()
  if (!adminProof) return false
  const qaToken = cookies().get(QA_MODE_COOKIE)?.value
  return (await verifyQaModeCookie(qaToken)) !== null
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// admin-entry 쿠키만으로 들어온 세션은 id가 'admin-entry' sentinel 문자열이라 users 행이 없다.
// 이 값을 그대로 uuid FK 컬럼(entered_by, reviewed_by_1/2, confirmed_by)에 쓰면 DB insert가 깨지므로,
// 실제 uuid일 때만 actor id를 반환하고 아니면 null(감사 컬럼은 익명 처리)을 반환한다.
export function actorUserId(sessionUser: SessionUser): string | null {
  return UUID_PATTERN.test(sessionUser.id) ? sessionUser.id : null
}
