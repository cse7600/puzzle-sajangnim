import KakaoLoginButton from '@/components/auth/KakaoLoginButton'
import LegalNotice from '@/components/auth/LegalNotice'

// 카카오 개발자 콘솔 심사 담당자가 실제 로그인 화면을 확인해야 심사가 진행된다.
// 이 화면은 NEXT_PUBLIC_KAKAO_ENABLED 플래그를 의도적으로 읽지 않는다 —
// 플래그가 false로 되돌아가도 카카오 버튼이 항상 활성 상태로 보여야 한다.
// 구성은 /login과 동일하게 유지한다. 심사에 제출한 화면과 실제 화면이 달라지면 안 된다.
type KakaoReviewScreenProps = {
  heading: string
  description: string
}

export default function KakaoReviewScreen({ heading, description }: KakaoReviewScreenProps) {
  return (
    <div className="min-h-[100dvh] bg-canvas-subtle flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8 sm:mb-10">
          <span className="text-[24px] sm:text-[28px] font-bold text-ink">퍼즐 사장님</span>
          <p className="mt-2 text-[14px] sm:text-[15px] text-muted-light">소상공인 마케팅 슈퍼앱</p>
        </div>

        <div className="bg-canvas-white rounded-[18px] border border-hairline p-6 sm:p-8">
          <h1 className="text-[22px] font-semibold text-ink mb-2">{heading}</h1>
          <p className="text-[14px] text-muted-light mb-8">{description}</p>

          <KakaoLoginButton />
          <LegalNotice />
        </div>

        <p className="mt-6 text-center text-[13px] text-muted-light">
          사업자 등록번호가 있는 소상공인이라면 누구나 가입 가능합니다
        </p>
      </div>
    </div>
  )
}
