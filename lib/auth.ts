// 카카오 로그인 구현 전 더미 세션
// 실제 구현 시 Supabase Auth + NextAuth로 교체

// Supabase public.users / auth.users 에 실제 시드된 UUID
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

export const DEMO_USER = {
  id: DEMO_USER_ID,
  kakao_id: '12345678',
  name: '김철수',
  phone: '010-1234-5678',
  business_name: '을지로 쌈밥 철수네',
  business_type: '외식업',
  total_points: 23400,
  referral_code: 'PUZZLE01',
  referred_by: null as string | null,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-06-18T00:00:00Z',
};

export function getCurrentUser() {
  return DEMO_USER;
}

export function isLoggedIn() {
  return true; // 데모 모드: 항상 로그인 상태
}
