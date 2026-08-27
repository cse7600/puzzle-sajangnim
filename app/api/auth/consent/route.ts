import { NextResponse } from 'next/server'
import {
  buildConsentRecord,
  hasRequiredConsent,
  parseConsentSelection,
  CONSENT_COOKIE,
  CONSENT_COOKIE_MAX_AGE_SECONDS,
} from '@/lib/consent'

const INVALID_BODY_MESSAGE = '동의 항목 형식이 올바르지 않습니다.'
const REQUIRED_CONSENT_MESSAGE = '이용약관과 개인정보처리방침에는 동의해야 합니다.'

// 로그인 전(비인증) 사용자가 동의를 남기는 공개 엔드포인트. middleware.ts의
// PROTECTED_API_PREFIXES에 /api/auth를 넣지 않는다 — 넣으면 동의 자체가 불가능해진다.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const selection = parseConsentSelection(body)
  if (!selection) {
    return NextResponse.json({ error: INVALID_BODY_MESSAGE }, { status: 400 })
  }

  if (!hasRequiredConsent(selection)) {
    return NextResponse.json({ error: REQUIRED_CONSENT_MESSAGE }, { status: 400 })
  }

  const record = buildConsentRecord(selection)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(CONSENT_COOKIE, JSON.stringify(record), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CONSENT_COOKIE_MAX_AGE_SECONDS,
  })
  return response
}

export async function GET() {
  return NextResponse.json({ error: '허용되지 않은 메서드입니다.' }, { status: 405 })
}
