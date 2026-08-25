import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

// public.users는 다른 프로덕트와 공유하는 읽기 전용 테이블이다.
// types/database.ts의 users 타입은 실제 컬럼(id/email/role/profile_data/created_at/updated_at)과
// 어긋나 있고 그 파일은 다른 세션이 소유하고 있어 여기서 고치지 않는다.
// 대신 실제 컬럼에 맞는 Row 타입을 파생시켜 users 전용 클라이언트를 둔다.
// 주의: Database['public']['Tables']['users']를 통째로 새 인터페이스로 다시 쓰면
// postgrest-js(2.108.x)의 제네릭 추론이 Schema를 `never`로 붕괴시키는 문제가 있어(직접 실측 확인),
// 반드시 실제 Database 타입에서 Omit/교차 타입으로 "파생"시켜야 한다.
type RealUsersRow = Database['public']['Tables']['users']['Row']

export type AdminUserRow = Omit<
  RealUsersRow,
  'kakao_id' | 'name' | 'phone' | 'business_name' | 'business_type' | 'total_points' | 'referral_code' | 'referred_by'
> & {
  email: string
  role: string | null
  profile_data: Record<string, Json> | null
}

interface UsersOnlyDatabase {
  public: {
    Tables: {
      users: Omit<Database['public']['Tables']['users'], 'Row'> & { Row: AdminUserRow }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const usersReadOnlyAdmin = createClient<UsersOnlyDatabase>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

export function resolveBusinessName(user: Pick<AdminUserRow, 'email' | 'profile_data'>): string {
  const businessName = user.profile_data?.business_name
  if (typeof businessName === 'string' && businessName.trim().length > 0) {
    return businessName
  }
  return user.email
}
