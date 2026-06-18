'use client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        {/* 로고 */}
        <div className="text-center mb-10">
          <span className="text-[28px] font-bold text-[#1d1d1f]">퍼즐 사장님</span>
          <p className="mt-2 text-[15px] text-[#6e6e73]">소상공인 마케팅 슈퍼앱</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-8">
          <h1 className="text-[22px] font-semibold text-[#1d1d1f] mb-2">로그인</h1>
          <p className="text-[14px] text-[#6e6e73] mb-8">카카오 계정으로 간편하게 시작하세요</p>

          {/* 카카오 로그인 버튼 */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center justify-center gap-3 bg-[#FEE500] rounded-[11px] py-4 px-6 text-[16px] font-semibold text-[#191919] hover:bg-[#e6cf00] transition-colors"
          >
            <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 0C4.477 0 0 3.582 0 8c0 2.861 1.743 5.38 4.379 6.826L3.5 18l5.035-2.643c.482.07.977.107 1.465.107 5.523 0 10-3.582 10-8s-4.477-8-10-8z"
                fill="#191919"
              />
            </svg>
            카카오로 시작하기
          </button>

          <div className="mt-6 pt-6 border-t border-[#e0e0e0]">
            <p className="text-[12px] text-[#6e6e73] text-center leading-relaxed">
              로그인 시{' '}
              <span className="text-[#0066cc]">이용약관</span> 및{' '}
              <span className="text-[#0066cc]">개인정보 처리방침</span>에 동의합니다
            </p>
          </div>
        </div>

        {/* 하단 안내 */}
        <p className="mt-6 text-center text-[13px] text-[#6e6e73]">
          사업자 등록번호가 있는 소상공인이라면 누구나 가입 가능합니다
        </p>
      </div>
    </div>
  );
}
