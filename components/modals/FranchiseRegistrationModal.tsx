'use client';

import { useState } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Gift,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

type FranchiseRegistrationModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const BENEFITS = [
  'AI 블로그 무료',
  '플레이스 최적화 무료',
  '체험단 무료',
  '광고비 페이백 최대 7%',
];

const TOTAL_STEPS = 3;

export default function FranchiseRegistrationModal({
  isOpen,
  onClose,
}: FranchiseRegistrationModalProps) {
  const [step, setStep] = useState<number>(1);
  const [accountId, setAccountId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [agreed, setAgreed] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  // Reset all internal state and close the modal
  const handleClose = () => {
    setStep(1);
    setAccountId('');
    setPassword('');
    setAgreed(false);
    setSubmitted(false);
    onClose();
  };

  const canProceedStep1 = accountId.trim().length > 0 && password.trim().length > 0;

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = () => {
    if (!agreed) return;
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">영업권 등록</h2>
            {!submitted && (
              <p className="mt-0.5 text-xs text-gray-500">
                Step {step}/{TOTAL_STEPS}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress indicator */}
        {!submitted && (
          <div className="flex gap-1.5 px-6 pt-4">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition ${
                  i < step ? 'bg-[#0066cc]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5">
          {submitted ? (
            <SuccessState />
          ) : step === 1 ? (
            <StepAccount
              accountId={accountId}
              password={password}
              onAccountIdChange={setAccountId}
              onPasswordChange={setPassword}
            />
          ) : step === 2 ? (
            <StepService />
          ) : (
            <StepConsent agreed={agreed} onAgreedChange={setAgreed} />
          )}
        </div>

        {/* Footer actions */}
        {!submitted && (
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
            {step > 1 ? (
              <button
                onClick={goBack}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                이전
              </button>
            ) : (
              <span />
            )}

            {step < TOTAL_STEPS ? (
              <button
                onClick={goNext}
                disabled={step === 1 && !canProceedStep1}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066cc] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0058b3] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                다음
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!agreed}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066cc] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0058b3] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                등록 신청
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Footer for success state */}
        {submitted && (
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0058b3]"
            >
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Step 1: Account input ---------- */
function StepAccount({
  accountId,
  password,
  onAccountIdChange,
  onPasswordChange,
}: {
  accountId: string;
  password: string;
  onAccountIdChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">계정 입력</h3>
        <p className="mt-1 text-xs text-gray-500">
          네이버 광고 계정 정보를 입력해 주세요
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-700">
          네이버 광고 계정 ID
        </label>
        <input
          type="text"
          value={accountId}
          onChange={(e) => onAccountIdChange(e.target.value)}
          placeholder="아이디를 입력하세요"
          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-700">
          비밀번호
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="비밀번호를 입력하세요"
          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10"
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3.5 py-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" />
        <p className="text-xs leading-relaxed text-[#0066cc]">
          계정 정보는 암호화되어 안전하게 전달됩니다
        </p>
      </div>
    </div>
  );
}

/* ---------- Step 2: Service guide ---------- */
function StepService() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">서비스 안내</h3>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#0066cc]" />
        <p className="text-sm leading-relaxed text-gray-700">
          퍼즐 사장님이 귀사의 네이버 광고 영업권을 등록합니다. 이 과정은 1~3
          영업일이 소요되며, 수동으로 처리됩니다.
        </p>
      </div>

      <div className="rounded-xl border border-gray-100 p-4">
        <div className="mb-3 flex items-center gap-1.5">
          <Gift className="h-4 w-4 text-[#0066cc]" />
          <p className="text-sm font-semibold text-gray-900">
            등록 시 받는 혜택
          </p>
        </div>
        <ul className="space-y-2.5">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="text-sm text-gray-700">{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- Step 3: Consent & submit ---------- */
function StepConsent({
  agreed,
  onAgreedChange,
}: {
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">동의 및 제출</h3>
        <p className="mt-1 text-xs text-gray-500">
          아래 내용에 동의하시면 등록 신청이 완료됩니다
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-[#0066cc]/40">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgreedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#0066cc] accent-[#0066cc]"
        />
        <span className="text-sm leading-relaxed text-gray-700">
          네이버 광고 영업권을 퍼즐 사장님에게 위임하고, 모든 마케팅 툴을
          무료로 이용하는 것에 동의합니다.
        </span>
      </label>

      <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3.5 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" />
        <p className="text-xs leading-relaxed text-[#0066cc]">
          위임은 언제든지 철회할 수 있으며, 계정 정보는 영업권 등록 목적
          외에는 사용되지 않습니다.
        </p>
      </div>
    </div>
  );
}

/* ---------- Success state ---------- */
function SuccessState() {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-gray-900">접수 완료!</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
        1~3 영업일 내 담당자가 처리 후 연락드립니다.
      </p>
    </div>
  );
}
