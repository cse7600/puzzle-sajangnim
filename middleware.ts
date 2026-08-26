import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { updateSession } from '@/lib/supabase/middleware'
import { usersAdmin } from '@/lib/supabase/users-admin'
import { isAdminEmail } from '@/lib/is-admin-email'
import { isOnboardingComplete, type UserProfileData } from '@/lib/profile'
import {
  ADMIN_ENTRY_COOKIE,
  QA_MODE_COOKIE,
  verifyAdminEntryCookie,
  verifyQaModeCookie,
} from '@/lib/admin-session'

// route group `(app)`은 URL에 나타나지 않으므로 실제 경로 기준으로 나열한다.
const PROTECTED_PAGES = [
  '/dashboard', '/ai-blog', '/place', '/experience', '/team-buy', '/rewards',
  '/knowledge', '/referral', '/earnings', '/community', '/hub', '/settings',
  '/my-link', '/onboarding', '/admin',
]

const PROTECTED_API_PREFIXES = [
  '/api/receipts', '/api/business-verification', '/api/team-deals', '/api/earnings',
  '/api/ad-accounts', '/api/paybacks', '/api/referral', '/api/knowledge', '/api/points',
  '/api/place', '/api/community', '/api/users', '/api/settlement-config', '/api/admin',
  '/api/withdrawals', '/api/link-page', '/api/experience',
]

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isUserAdmin(user: User): boolean {
  const appMetadata = (user.app_metadata ?? null) as Record<string, unknown> | null
  return appMetadata?.role === 'admin' || isAdminEmail(user.email)
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

function redirectTo(request: NextRequest, pathname: string, params?: Record<string, string>): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  if (params) Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  return NextResponse.redirect(url)
}

async function fetchOnboardingComplete(userId: string): Promise<boolean> {
  const { data } = await usersAdmin.from('users').select('profile_data').eq('id', userId).maybeSingle()
  return isOnboardingComplete((data?.profile_data ?? null) as UserProfileData | null)
}

async function fetchBusinessApproved(userId: string): Promise<boolean> {
  const { data } = await usersAdmin
    .from('business_verifications')
    .select('status')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.status === 'approved'
}

function handleUnauthenticated(
  request: NextRequest,
  isProtectedPage: boolean,
  isProtectedApi: boolean
): NextResponse | null {
  if (isProtectedPage) return redirectTo(request, '/login', { next: request.nextUrl.pathname })
  if (isProtectedApi) return jsonError('로그인이 필요합니다', 401)
  return null
}

function handleAdminGate(request: NextRequest, admin: boolean, pathname: string): NextResponse | null {
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/')
  const isAdminApi = pathname === '/api/admin' || pathname.startsWith('/api/admin/')
  if (!isAdminPage && !isAdminApi) return null
  if (admin) return null
  return isAdminApi
    ? jsonError('권한이 없습니다', 403)
    : redirectTo(request, '/admin/login', { next: pathname })
}

async function handleOnboardingGate(
  request: NextRequest,
  userId: string,
  isProtectedPage: boolean,
  isProtectedApi: boolean,
  pathname: string
): Promise<NextResponse | null> {
  const exempt =
    pathname === '/onboarding' ||
    pathname === '/login' ||
    pathname.startsWith('/auth/') ||
    pathname === '/api/users/onboarding'
  if (exempt || (!isProtectedPage && !isProtectedApi)) return null

  const onboarded = await fetchOnboardingComplete(userId)
  if (onboarded) return null
  return isProtectedApi ? jsonError('온보딩을 완료해주세요', 403) : redirectTo(request, '/onboarding')
}

async function handleVerificationGate(
  request: NextRequest,
  userId: string,
  admin: boolean,
  isProtectedPage: boolean,
  pathname: string
): Promise<NextResponse | null> {
  if (admin || !isProtectedPage) return null
  const exempt =
    pathname.startsWith('/api/') ||
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    pathname === '/onboarding' ||
    pathname.startsWith('/auth/') ||
    pathname === '/knowledge' ||
    pathname.startsWith('/knowledge/')
  if (exempt) return null

  const approved = await fetchBusinessApproved(userId)
  if (approved) return null
  return redirectTo(request, '/settings')
}

// 관리자 진입 방법은 둘 중 하나면 충분하다: Supabase 세션의 관리자 계정, 또는
// 공유 비밀번호로 발급된 서명 쿠키. 어느 쪽이든 admin proof가 true가 된다.
async function resolveAdminProof(request: NextRequest, user: User | null): Promise<boolean> {
  const supabaseAdminProof = user ? isUserAdmin(user) : false
  if (supabaseAdminProof) return true
  return verifyAdminEntryCookie(request.cookies.get(ADMIN_ENTRY_COOKIE)?.value)
}

// QA 쿠키는 admin proof가 있을 때만 조회한다 — admin proof 없이 QA 쿠키만 있는
// 요청은 여기서 항상 null을 받아 이후 일반 인증 게이트로 떨어진다(권한 상승 방지).
async function resolveQaUid(request: NextRequest, adminProof: boolean): Promise<string | null> {
  if (!adminProof) return null
  return verifyQaModeCookie(request.cookies.get(QA_MODE_COOKIE)?.value)
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname
  const isProtectedPage = matchesPrefix(pathname, PROTECTED_PAGES)
  const isProtectedApi = matchesPrefix(pathname, PROTECTED_API_PREFIXES)

  // /api/admin/login은 관리자 증명이 아직 없는 사용자가 증명을 발급받는 경로이므로
  // admin 게이트 대상에서 제외한다. 제외하지 않으면 로그인 자체가 불가능해진다.
  if (pathname === '/api/admin/login') return supabaseResponse

  const adminProof = await resolveAdminProof(request, user)

  // /admin/login은 admin 게이트에서 제외해 리다이렉트 루프를 막는다.
  // 이미 관리자 증명이 있으면 편의상 /admin으로 보낸다.
  if (pathname === '/admin/login') {
    return adminProof ? redirectTo(request, '/admin') : supabaseResponse
  }

  const adminGateResult = handleAdminGate(request, adminProof, pathname)
  if (adminGateResult) return adminGateResult

  const isAdminRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/api/admin' ||
    pathname.startsWith('/api/admin/')
  // 관리자 경로는 admin 게이트를 통과한 시점에 이미 접근이 확정된다. 쿠키 전용
  // 관리자(Supabase 세션 없음)가 아래의 앱 전용 게이트(미인증/온보딩/사업자인증)에
  // 걸리지 않도록 여기서 바로 반환한다.
  if (isAdminRoute) {
    // /admin 페이지(비-API)로 돌아오면 잔여 QA 쿠키를 지운다. getSessionUser()는
    // admin proof보다 QA 쿠키를 항상 우선하므로, QA 모드를 "종료" 없이 /admin으로
    // 돌아온 경우 남은 쿠키 탓에 /api/admin/* 전체가 403을 반환하는 문제가 있었다.
    // /api/admin/qa-mode(QA 모드 진입 자체)는 /admin이 아닌 /api/admin 하위라 여기서 제외된다.
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      supabaseResponse.cookies.set(QA_MODE_COOKIE, '', { path: '/', maxAge: 0 })
    }
    return supabaseResponse
  }

  const qaUid = await resolveQaUid(request, adminProof)
  if (qaUid) {
    // QA 모드: (app) 페이지/API에 대해 로그인·온보딩·사업자인증 게이트를 건너뛴다.
    // getSessionUser()가 이 쿠키를 다시 검증해 QA 유저로 요청을 처리한다.
    return supabaseResponse
  }

  if (!user) {
    // 쿠키 전용 관리자(Supabase 세션 없음): /api/admin 밖의 보호 API(/api/paybacks,
    // /api/ad-accounts 등)도 어드민 화면이 호출한다. 여기서 401을 내면 어드민 정산/수수료율
    // 기능 전체가 죽으므로 통과시킨다 — 각 라우트의 getSessionUser()가 쿠키를 재검증하고
    // isAdmin 기반 인가를 다시 수행하므로 권한 상승은 없다. 보호 페이지는 기존대로 로그인으로 보낸다.
    if (adminProof && isProtectedApi) return supabaseResponse
    return handleUnauthenticated(request, isProtectedPage, isProtectedApi) ?? supabaseResponse
  }
  if (pathname === '/login') return redirectTo(request, '/hub')

  const admin = isUserAdmin(user)

  const onboardingGateResult = await handleOnboardingGate(
    request, user.id, isProtectedPage, isProtectedApi, pathname
  )
  if (onboardingGateResult) return onboardingGateResult

  const verificationGateResult = await handleVerificationGate(
    request, user.id, admin, isProtectedPage, pathname
  )
  if (verificationGateResult) return verificationGateResult

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
