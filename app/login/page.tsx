import LoginConsentGate from '@/components/auth/LoginConsentGate'

const KAKAO_ENABLED = process.env.NEXT_PUBLIC_KAKAO_ENABLED === 'true'

function sanitizeNext(next?: string): string | undefined {
  if (!next) return undefined
  return next.startsWith('/') && !next.startsWith('//') ? next : undefined
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string }
}) {
  const errorMessage = searchParams.error
  const next = sanitizeNext(searchParams.next)

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f7] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8 sm:mb-10">
          <span className="text-[24px] sm:text-[28px] font-bold text-ink">퍼즐 사장님</span>
          <p className="mt-2 text-[14px] sm:text-[15px] text-muted-light">소상공인 마케팅 슈퍼앱</p>
        </div>

        <div className="bg-white rounded-[18px] border border-hairline p-6 sm:p-8">
          <h1 className="text-[22px] font-semibold text-ink mb-2">로그인</h1>
          <p className="text-[14px] text-muted-light mb-8">카카오 계정으로 간편하게 시작하세요</p>

          {errorMessage && (
            <p className="mb-4 rounded-[11px] bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {errorMessage}
            </p>
          )}

          <LoginConsentGate next={next} kakaoEnabled={KAKAO_ENABLED} />

          {!KAKAO_ENABLED && (
            <div className="mt-6 rounded-[11px] border border-dashed border-hairline bg-[#fafafa] px-4 py-6 text-center">
              <p className="text-[14px] font-medium text-ink">카카오 로그인 준비 중입니다</p>
              <p className="mt-1 text-[13px] text-muted-light">서비스 오픈 후 다시 안내드릴게요</p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[13px] text-muted-light">
          사업자 등록번호가 있는 소상공인이라면 누구나 가입 가능합니다
        </p>
      </div>
    </div>
  )
}
