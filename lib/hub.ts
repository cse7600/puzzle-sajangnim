// 클라이언트/서버 공용 상수·순수 함수만. supabaseAdmin 등 서버 전용 로직은 lib/hub-server.ts로 분리
// (그렇지 않으면 'use client' 컴포넌트 번들에 supabase-js가 딸려 들어가 빌드가 깨진다).

export type Platform = 'naver' | 'toss' | 'google' | 'kakao' | 'danggeun' | 'naver_gfa';

export const PLATFORM_INFO: Record<Platform, { name: string; color: string; paybackRate: number }> = {
  naver:     { name: '네이버',     color: '#03C75A', paybackRate: 5.0 },
  toss:      { name: '토스',       color: '#0066FF', paybackRate: 3.0 },
  google:    { name: '구글',       color: '#EA4335', paybackRate: 3.5 },
  kakao:     { name: '카카오',     color: '#191919', paybackRate: 4.5 },
  danggeun:  { name: '당근',       color: '#FF6F0F', paybackRate: 2.5 },
  naver_gfa: { name: '네이버 GFA', color: '#03C75A', paybackRate: 4.0 },
};

export type TransferStatus = 'waiting' | 'transfer_needed' | 'verifying' | 'completed';

export const TRANSFER_STATUSES: TransferStatus[] = ['waiting', 'transfer_needed', 'verifying', 'completed'];

export const TRANSFER_STATUS_LABEL: Record<TransferStatus, string> = {
  waiting: '대기',
  transfer_needed: '연동 필요',
  verifying: '연동 확인 중',
  completed: '연동 완료',
};

export type ConnectionStatus = 'duplicate' | 'reviewing' | 'connected';

export const CONNECTION_STATUSES: ConnectionStatus[] = ['duplicate', 'reviewing', 'connected'];

export const CONNECTION_STATUS_LABEL: Record<ConnectionStatus, string> = {
  duplicate: '중복',
  reviewing: '검수중',
  connected: '연동 완료',
};

/** period("YYYY-MM")에 대한 기본 지급 예정일 = 다음 달의 settlementDay일. */
export function computeScheduledPayDate(period: string, settlementDay: number): string {
  const [year, month] = period.split('-').map(Number);
  const payMonthIndex = month; // 0-based Date month for "다음 달" (month는 1-based이므로 그대로 쓰면 다음 달)
  const date = new Date(Date.UTC(year, payMonthIndex, settlementDay));
  return date.toISOString().slice(0, 10);
}
