import type { SupabaseClient } from '@supabase/supabase-js'

export interface ResolvedHandlePage {
  userId: string
  userEmail: string | null
  userName: string | null
  pageId: string
  handle: string
}

export async function resolveHandlePage(
  admin: SupabaseClient,
  rawHandle: string
): Promise<ResolvedHandlePage | null> {
  const handle = rawHandle.trim().toLowerCase()
  if (!handle) return null

  const { data: page } = await admin
    .from('link_pages')
    .select('id, user_id, link_handle, is_published')
    .ilike('link_handle', handle)
    .eq('is_published', true)
    .maybeSingle()
  if (!page) return null

  const { data: verification } = await admin
    .from('business_verifications')
    .select('status')
    .eq('user_id', page.user_id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (verification?.status !== 'approved') return null

  const { data: user } = await admin
    .from('users')
    .select('email, profile_data')
    .eq('id', page.user_id)
    .maybeSingle()

  const profileData = (user?.profile_data ?? {}) as Record<string, unknown>

  return {
    userId: page.user_id,
    userEmail: user?.email ?? null,
    userName: (profileData.name as string) ?? null,
    pageId: page.id,
    handle,
  }
}
