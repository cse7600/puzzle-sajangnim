import type { Metadata } from 'next'
import KakaoReviewScreen from '@/components/auth/KakaoReviewScreen'

// 카카오 개발자 콘솔에 "로그인 화면 URL"로 제출하는 심사 전용 경로.
// 일반 사용자 동선(/login)과 달리 검색 노출은 막는다.
export const metadata: Metadata = {
  title: '카카오 로그인 | 퍼즐 사장님',
  robots: { index: false, follow: false },
}

export default function KakaoLoginPage() {
  return (
    <KakaoReviewScreen
      heading="로그인"
      description="카카오 계정으로 간편하게 로그인하세요"
    />
  )
}
