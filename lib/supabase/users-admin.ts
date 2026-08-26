import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

// public.users의 실제 컬럼(id/email/role/profile_data/created_at/updated_at)은
// types/database.ts의 users 타입(다른 세션 소유, 여기서 수정하지 않음)과 어긋난다.
// lib/admin-users.ts와 동일한 방식으로, 원본 Database['public']['Tables']['users']에서
// Omit/교차 타입으로만 "파생"시켜 postgrest-js(2.108.x)의 제네릭 추론이 Schema를 never로
// 붕괴시키는 문제(직접 실측 확인됨)를 피한다. 완전히 새로운 인터페이스로 갈아끼우면 안 된다.
type RealUsersTable = Database['public']['Tables']['users']

export type UsersRow = Omit<
  RealUsersTable['Row'],
  | 'kakao_id'
  | 'name'
  | 'phone'
  | 'business_name'
  | 'business_type'
  | 'total_points'
  | 'referral_code'
  | 'referred_by'
> & {
  email: string
  role: string | null
  profile_data: Record<string, Json> | null
}

export type UsersInsert = {
  id: string
  email: string
  role?: string | null
  profile_data?: Record<string, Json> | null
}

export type UsersUpdate = {
  email?: string
  role?: string | null
  profile_data?: Record<string, Json> | null
}

interface AuthDatabase {
  public: {
    Tables: {
      users: Omit<RealUsersTable, 'Row' | 'Insert' | 'Update'> & {
        Row: UsersRow
        Insert: UsersInsert
        Update: UsersUpdate
      }
      business_verifications: Database['public']['Tables']['business_verifications']
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 로그인 콜백(신규 유저 upsert)과 미들웨어 게이트(온보딩/사업자인증 조회)가 함께 쓰는
// 서비스 롤 클라이언트. fetch 기반 supabase-js만 사용해 Edge 런타임(미들웨어)에서도 동작한다.
export const usersAdmin = createClient<AuthDatabase>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
