import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fontGoogleHref } from '@/lib/link-themes'
import ProfileView, { type ProfileData, type PublicBlock } from './ProfileView'

export const revalidate = 60

interface PageProps {
  params: { handle: string }
}

interface BlockRow {
  id: string
  type: string
  payload: Record<string, unknown> | null
  position: number
  is_pinned: boolean
  is_active: boolean
  is_archived: boolean
}

const db = supabaseAdmin as any

async function loadProfile(handleRaw: string): Promise<ProfileData | null> {
  const handle = handleRaw.toLowerCase()

  const { data: page } = await db
    .from('link_pages')
    .select('*')
    .ilike('link_handle', handle)
    .eq('is_published', true)
    .maybeSingle()

  if (!page) return null

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

  const { data: blockRows } = await db
    .from('link_blocks')
    .select('id, type, payload, position, is_pinned, is_active, is_archived')
    .eq('link_page_id', page.id)
    .eq('is_active', true)
    .eq('is_archived', false)
    .order('is_pinned', { ascending: false })
    .order('position', { ascending: true })

  const blocks: BlockRow[] = blockRows || []

  const publicBlocks: PublicBlock[] = blocks.map(b => ({
    id: b.id,
    type: b.type,
    payload: b.payload || {},
    programs: [],
  }))

  return {
    handle: page.link_handle || handle,
    partnerName: userName,
    displayName: page.display_name || userName || handle,
    bio: page.bio || '',
    avatarUrl: page.avatar_url || null,
    snsLinks: Array.isArray(page.sns_links) ? page.sns_links : [],
    noticeText: page.notice_text || '',
    proposalEnabled: page.proposal_enabled !== false,
    themePreset: page.theme_preset || null,
    blockStyle: (page.block_style as Record<string, unknown>) || {},
    layoutPreset: page.layout_preset || null,
    fontPreset: page.font_preset || null,
    background: (page.background as Record<string, unknown>) || null,
    blocks: publicBlocks,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = params
  const profileData = await loadProfile(handle)
  if (!profileData) return { title: '나만의 링크' }
  return {
    title: `${profileData.displayName} | 나만의 링크`,
    description: profileData.bio || `${profileData.displayName}님의 프로필 링크`,
  }
}

export default async function PublicLinkPage({ params }: PageProps) {
  const { handle } = params
  const profileData = await loadProfile(handle)
  if (!profileData) notFound()
  const fontHref = fontGoogleHref(profileData.fontPreset)
  return (
    <>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <ProfileView data={profileData} />
    </>
  )
}
