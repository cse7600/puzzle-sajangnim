import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const DEMO_USER_ID = 'demo-user-001'

export async function POST(req: Request) {
  const { business_number, certificate_url } = await req.json()
  if (!business_number) return NextResponse.json({ error: '사업자 번호 필수' }, { status: 400 })

  // new columns added in migration 002 — cast to bypass TS types
  const { error } = await (supabase as any)
    .from('users')
    .update({
      business_number,
      business_certificate_url: certificate_url ?? null,
      onboarding_completed: true,
    })
    .eq('id', DEMO_USER_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
