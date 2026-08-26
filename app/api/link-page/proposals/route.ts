import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const db = supabaseAdmin as any

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data: proposals } = await db
    .from('business_proposals')
    .select('*')
    .eq('user_id', sessionUser.id)
    .order('created_at', { ascending: false })

  const { data: page } = await db
    .from('link_pages')
    .select('link_handle')
    .eq('user_id', sessionUser.id)
    .maybeSingle()

  return NextResponse.json({
    proposals: proposals || [],
    handle: page?.link_handle || null,
  })
}
