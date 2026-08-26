import KakaoLoginButton from '@/components/auth/KakaoLoginButton'

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
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <span className="text-[28px] font-bold text-[#1d1d1f]">퍼즐 사장님</span>
          <p className="mt-2 text-[15px] text-[#6e6e73]">소상공인 마케팅 슈퍼앱</p>
        </div>

        <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-8">
          <h1 className="text-[22px] font-semibold text-[#1d1d1f] mb-2">로그인</h1>
          <p className="text-[14px] text-[#6e6e73] mb-8">카카오 계정으로 간편하게 시작하세요</p>

          {errorMessage && (
            <p className="mb-4 rounded-[11px] bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {errorMessage}
            </p>
          )}

          {KAKAO_ENABLED ? (
            <KakaoLoginButton next={next} />
          ) : (
            <div className="rounded-[11px] border border-dashed border-[#e0e0e0] bg-[#fafafa] px-4 py-6 text-center">
              <p className="text-[14px] font-medium text-[#1d1d1f]">카카오 로그인 준비 중입니다</p>
              <p className="mt-1 text-[13px] text-[#6e6e73]">서비스 오픈 후 다시 안내드릴게요</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-[#e0e0e0]">
            <p className="text-[12px] text-[#6e6e73] text-center leading-relaxed">
              로그인 시{' '}
              <span className="text-[#0066cc]">이용약관</span> 및{' '}
              <span className="text-[#0066cc]">개인정보 처리방침</span>에 동의합니다
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[13px] text-[#6e6e73]">
          사업자 등록번호가 있는 소상공인이라면 누구나 가입 가능합니다
        </p>
      </div>
    </div>
  )
}
