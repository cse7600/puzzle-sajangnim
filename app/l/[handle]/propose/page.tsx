import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ProposeForm from './ProposeForm'

export const revalidate = 60

interface PageProps {
  params: { handle: string }
}

const db = supabaseAdmin as any

async function loadPartner(handleRaw: string) {
  const handle = handleRaw.toLowerCase()

  const { data: page } = await db
    .from('link_pages')
    .select('user_id, link_handle, display_name, avatar_url, is_published, proposal_enabled, theme_preset')
    .ilike('link_handle', handle)
    .eq('is_published', true)
    .maybeSingle()

  if (!page || page.proposal_enabled === false) return null

  const { data: verification } = await db
    .from('business_verifications')
    .select('status')
    .eq('user_id', page.user_id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (verification?.status !== 'approved') return null

  const { data: user } = await db
    .from('users')
    .select('profile_data')
    .eq('id', page.user_id)
    .maybeSingle()
  const profileData = (user?.profile_data ?? {}) as Record<string, unknown>
  const userName = (profileData.name as string) || ''

  return {
    handle: page.link_handle || handle,
    displayName: page.display_name || userName || handle,
    avatarUrl: page.avatar_url || null,
    themePreset: page.theme_preset || null,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = params
  const partner = await loadPartner(handle)
  return { title: partner ? `${partner.displayName}님에게 비즈니스 제안 | 나만의 링크` : '나만의 링크' }
}

export default async function ProposePage({ params }: PageProps) {
  const { handle } = params
  const partner = await loadPartner(handle)
  if (!partner) notFound()
  return <ProposeForm partner={partner} />
}
