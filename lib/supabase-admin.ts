import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 쓰기/유저 민감 데이터용 — Next.js 데이터 캐시 우회
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' })

export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: noStoreFetch },
})

// 목록 조회용 — Next.js 데이터 캐시(30s) 활용해 DB 왕복 줄임
const cachedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, next: { revalidate: 30 } } as RequestInit)

export const supabaseAdminCached = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: cachedFetch },
})
