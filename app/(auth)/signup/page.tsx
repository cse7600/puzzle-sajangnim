'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BUSINESS_TYPES = ['외식업', '카페/베이커리', '미용/뷰티', '쇼핑/패션', '교육/학원', '서비스업', '기타'];

type FormState = { businessName: string; businessType: string; region: string };

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(2);
  const [form, setForm] = useState<FormState>({ businessName: '', businessType: '', region: '' });

  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
        <div className="w-full max-w-[480px]">
          <div className="text-center mb-8">
            <span className="text-[24px] font-bold text-[#1d1d1f]">퍼즐 사장님</span>
          </div>

          {/* 스텝 인디케이터 */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-[12px] font-semibold">
                ✓
              </div>
              <span className="text-[13px] text-[#6e6e73]">카카오 연동</span>
            </div>
            <div className="flex-1 h-px bg-[#e0e0e0]" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-[12px] font-semibold">
                2
              </div>
              <span className="text-[13px] font-semibold text-[#1d1d1f]">사업장 정보</span>
            </div>
            <div className="flex-1 h-px bg-[#e0e0e0]" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#6e6e73] text-[12px]">
                3
              </div>
              <span className="text-[13px] text-[#6e6e73]">완료</span>
            </div>
          </div>

          <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-8">
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-1">사업장 정보 입력</h2>
            <p className="text-[14px] text-[#6e6e73] mb-6">맞춤형 마케팅 도구 제공을 위해 필요해요</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">상호명 *</label>
                <input
                  type="text"
                  placeholder="예: 을지로 쌈밥 철수네"
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] text-[#1d1d1f] outline-none focus:border-[#0066cc] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">업종 *</label>
                <select
                  value={form.businessType}
                  onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
                  className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] text-[#1d1d1f] outline-none focus:border-[#0066cc] transition-colors bg-white"
                >
                  <option value="">업종 선택</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">지역 *</label>
                <input
                  type="text"
                  placeholder="예: 서울 중구"
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] text-[#1d1d1f] outline-none focus:border-[#0066cc] transition-colors"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!form.businessName || !form.businessType || !form.region}
              className="mt-6 w-full bg-[#0066cc] text-white rounded-[9999px] py-3.5 text-[16px] font-semibold hover:bg-[#0058b3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              완료하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: 완료 화면
  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] text-center">
        <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-10">
          <div className="w-16 h-16 bg-[#0066cc]/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M6 16L13 23L26 9"
                stroke="#0066cc"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] mb-2">가입 완료!</h2>
          <p className="text-[15px] text-[#6e6e73] mb-8">
            {form.businessName || '사업장'}이 등록되었습니다.
            <br />
            지금 바로 마케팅을 시작해보세요.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#0066cc] text-white rounded-[9999px] py-3.5 text-[16px] font-semibold hover:bg-[#0058b3] transition-colors"
          >
            대시보드로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
