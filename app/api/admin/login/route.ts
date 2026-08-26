import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { checkRateLimit } from '@/lib/admin-rate-limit'
import {
  ADMIN_ENTRY_COOKIE,
  ADMIN_ENTRY_COOKIE_MAX_AGE,
  signAdminEntryToken,
} from '@/lib/admin-session'

// bcrypt는 네이티브 바인딩에 의존하므로 Edge가 아닌 Node 런타임에서만 동작한다.
export const runtime = 'nodejs'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

function decodePasswordHash(): string {
  const encoded = process.env.ADMIN_ENTRY_PASSWORD_HASH_B64
  if (!encoded) throw new Error('ADMIN_ENTRY_PASSWORD_HASH_B64가 설정되지 않았습니다')
  return Buffer.from(encoded, 'base64').toString('utf8')
}

function setAdminEntryCookie(response: NextResponse, token: string): void {
  response.cookies.set(ADMIN_ENTRY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_ENTRY_COOKIE_MAX_AGE,
  })
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!password) {
    return NextResponse.json({ error: '비밀번호를 입력해주세요' }, { status: 400 })
  }

  const passwordMatches = await bcrypt.compare(password, decodePasswordHash())
  if (!passwordMatches) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다' }, { status: 401 })
  }

  const token = await signAdminEntryToken()
  const response = NextResponse.json({ ok: true })
  setAdminEntryCookie(response, token)
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_ENTRY_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
