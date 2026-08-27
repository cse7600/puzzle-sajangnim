import type { Metadata } from 'next'
import KakaoReviewScreen from '@/components/auth/KakaoReviewScreen'

// 카카오 개발자 콘솔에 "가입 화면 URL"로 제출하는 심사 전용 경로.
// 퍼즐 사장님은 로그인과 가입이 단일 카카오 플로우라 화면 구성은 동일하고
// 문구만 가입 맥락으로 바꾼다.
export const metadata: Metadata = {
  title: '카카오 회원가입 | 퍼즐 사장님',
  robots: { index: false, follow: false },
}

export default function KakaoSignupPage() {
  return (
    <KakaoReviewScreen
      heading="회원가입"
      description="카카오 계정으로 간편하게 가입하세요"
    />
  )
}
