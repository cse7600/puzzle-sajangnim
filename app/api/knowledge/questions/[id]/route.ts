export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const db = supabaseAdmin as any

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await db
    .from('knowledge_questions')
    .select('*, knowledge_answers(count)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}
