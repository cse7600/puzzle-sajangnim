import KakaoLoginButton from '@/components/auth/KakaoLoginButton'
import LegalNotice from '@/components/auth/LegalNotice'
import { sanitizeRedirectPath } from '@/lib/safe-next'

const KAKAO_ENABLED = process.env.NEXT_PUBLIC_KAKAO_ENABLED === 'true'

function KakaoPendingNotice() {
  return (
    <div className="rounded-[11px] border border-dashed border-hairline bg-canvas-subtle px-4 py-6 text-center">
      <p className="text-[14px] font-medium text-ink">카카오 로그인 준비 중입니다</p>
      <p className="mt-1 text-[13px] text-muted-light">서비스 오픈 후 다시 안내드릴게요</p>
    </div>
  )
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string }
}) {
  const errorMessage = searchParams.error
  const next = sanitizeRedirectPath(searchParams.next) ?? undefined

  return (
    <div className="min-h-[100dvh] bg-canvas-subtle flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8 sm:mb-10">
          <span className="text-[24px] sm:text-[28px] font-bold text-ink">퍼즐 사장님</span>
          <p className="mt-2 text-[14px] sm:text-[15px] text-muted-light">소상공인 마케팅 슈퍼앱</p>
        </div>

        <div className="bg-canvas-white rounded-[18px] border border-hairline p-6 sm:p-8">
          <h1 className="text-[22px] font-semibold text-ink mb-2">로그인</h1>
          <p className="text-[14px] text-muted-light mb-8">카카오 계정으로 간편하게 시작하세요</p>

          {errorMessage && (
            <p className="mb-4 rounded-[11px] bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {errorMessage}
            </p>
          )}

          {/* 카카오 활성 여부에 따른 화면 표현은 이 분기 한 곳에서만 결정한다.
              하위 컴포넌트가 같은 판단을 중복하면 "활성 버튼 + 준비중 안내"가
              동시에 그려지는 모순이 다시 생긴다. */}
          {KAKAO_ENABLED ? (
            <>
              <KakaoLoginButton next={next} />
              <LegalNotice />
            </>
          ) : (
            <KakaoPendingNotice />
          )}
        </div>

        <p className="mt-6 text-center text-[13px] text-muted-light">
          사업자 등록번호가 있는 소상공인이라면 누구나 가입 가능합니다
        </p>
      </div>
    </div>
  )
}
