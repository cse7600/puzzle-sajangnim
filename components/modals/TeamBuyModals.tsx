'use client';

import { useState } from 'react';
import {
  X,
  CheckCircle2,
  Users,
  CreditCard,
  Share2,
  Link2,
  MessageSquare,
  Info,
} from 'lucide-react';

// Product shape mirrors the type defined on the team-buy page.
export type TeamBuyProduct = {
  emoji: string;
  name: string;
  list: number;
  team: number;
  needed: number;
  discount: number;
  joined: number;
};

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

const AVATAR_COLORS = [
  'bg-[#0066cc]',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
];

const AVATAR_NAMES = ['김', '이', '박', '최', '정'];

/* ---------- Shared modal shell ---------- */
function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* ---------- Product summary (used by Join / Create) ---------- */
function ProductSummary({ product }: { product: TeamBuyProduct }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      <span className="text-3xl">{product.emoji}</span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-gray-900">
          {product.name}
        </h3>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-lg font-bold text-[#0066cc]">
            {won(product.team)}
          </span>
          <span className="pb-0.5 text-xs text-gray-400 line-through">
            {won(product.list)}
          </span>
          <span className="pb-0.5 text-xs font-semibold text-emerald-600">
            {product.discount}% 할인
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Avatar stack ---------- */
function MemberAvatars({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex -space-x-2">
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < filled;
        return (
          <div
            key={i}
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white ${
              isFilled ? AVATAR_COLORS[i % AVATAR_COLORS.length] : 'bg-gray-200'
            }`}
          >
            {isFilled ? AVATAR_NAMES[i % AVATAR_NAMES.length] : ''}
          </div>
        );
      })}
    </div>
  );
}

/* ===================================================================== */
/* 1. JoinTeamModal                                                       */
/* ===================================================================== */

type PaymentMethod = 'card' | 'kakaopay' | 'tosspay';

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string }[] = [
  { id: 'card', label: '카드 결제' },
  { id: 'kakaopay', label: '카카오페이' },
  { id: 'tosspay', label: '토스페이' },
];

export function JoinTeamModal({
  isOpen,
  onClose,
  product,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: TeamBuyProduct | null;
}) {
  const [payment, setPayment] = useState<PaymentMethod>('card');
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !product) return null;

  const handleClose = () => {
    setPayment('card');
    setAgreed(false);
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!agreed) return;
    setSubmitted(true);
  };

  return (
    <ModalShell
      title={submitted ? '팀 참여 완료' : '팀 참여하기'}
      subtitle={submitted ? undefined : '결제 방법을 선택하고 팀에 참여하세요'}
      onClose={handleClose}
    >
      {submitted ? (
        <>
          <div className="px-6 py-5">
            <div className="flex flex-col items-center py-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                팀 참여 완료!
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
                목표 인원 달성 시 자동 결제됩니다.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0058b3]"
            >
              확인
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4 px-6 py-5">
            <ProductSummary product={product} />

            {/* Current team members */}
            <div className="rounded-xl border border-gray-100 p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-gray-700">
                  <Users className="h-4 w-4 text-gray-400" />
                  현재 팀 멤버
                </span>
                <span className="font-semibold text-gray-900">
                  {product.joined}/{product.needed}명
                </span>
              </div>
              <MemberAvatars filled={product.joined} total={product.needed} />
            </div>

            {/* Payment method */}
            <div>
              <p className="mb-2 text-xs font-medium text-gray-700">결제 방법</p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map((opt) => {
                  const active = payment === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition ${
                        active
                          ? 'border-[#0066cc] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={opt.id}
                        checked={active}
                        onChange={() => setPayment(opt.id)}
                        className="sr-only"
                      />
                      <CreditCard
                        className={`h-5 w-5 ${
                          active ? 'text-[#0066cc]' : 'text-gray-400'
                        }`}
                      />
                      <span
                        className={`text-xs font-medium ${
                          active ? 'text-[#0066cc]' : 'text-gray-600'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Auto-billing note */}
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3.5 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" />
              <p className="text-xs leading-relaxed text-[#0066cc]">
                지금은 결제되지 않습니다. 목표 인원이 모두 모이면 선택한 결제
                수단으로 자동 결제됩니다.
              </p>
            </div>

            {/* Terms */}
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#0066cc] accent-[#0066cc]"
              />
              <span className="text-sm leading-relaxed text-gray-700">
                팀 구매 이용약관 및 자동 결제 조건에 동의합니다.
              </span>
            </label>
          </div>

          <div className="border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleSubmit}
              disabled={!agreed}
              className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0058b3] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              참여하기 (결제)
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

/* ===================================================================== */
/* 2. CreateTeamModal                                                     */
/* ===================================================================== */

export function CreateTeamModal({
  isOpen,
  onClose,
  product,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: TeamBuyProduct | null;
}) {
  const [teamName, setTeamName] = useState('');
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !product) return null;

  const shareLink = `https://puzzle.kr/team-buy/${encodeURIComponent(
    product.name,
  )}`;

  const handleClose = () => {
    setTeamName('');
    setCreated(false);
    setCopied(false);
    onClose();
  };

  const handleCreate = () => {
    setCreated(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore silently.
    }
  };

  return (
    <ModalShell
      title={created ? '팀 생성 완료' : '팀 만들기'}
      subtitle={created ? undefined : '새로운 팀 구매를 시작하세요'}
      onClose={handleClose}
    >
      {created ? (
        <>
          <div className="px-6 py-5">
            <div className="flex flex-col items-center py-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                팀이 만들어졌어요!
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
                {teamName.trim()
                  ? `'${teamName.trim()}' 팀에 멤버를 초대해 ${product.needed}명을 모아보세요.`
                  : `멤버를 초대해 ${product.needed}명을 모아보세요.`}
              </p>
            </div>

            {/* Share options */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5">
                <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate text-xs text-gray-500">
                  {shareLink}
                </span>
              </div>
              <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-semibold text-[#3C1E1E] transition hover:brightness-95">
                <MessageSquare className="h-4 w-4" />
                카카오톡 공유
              </button>
              <button
                onClick={handleCopy}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    복사됨!
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    링크 복사
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0058b3]"
            >
              완료
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4 px-6 py-5">
            <ProductSummary product={product} />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                팀 이름 <span className="text-gray-400">(선택)</span>
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="예: 강남 사장님 모임"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10"
              />
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3.5 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" />
              <p className="text-xs leading-relaxed text-[#0066cc]">
                팀이 만들어지면 카카오톡으로 공유하여 멤버를 모을 수 있습니다.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleCreate}
              className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0058b3]"
            >
              팀 만들기
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

/* ===================================================================== */
/* 3. ShareModal                                                          */
/* ===================================================================== */

export function ShareModal({
  isOpen,
  onClose,
  title,
  link,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  link: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore silently.
    }
  };

  return (
    <ModalShell title="공유하기" subtitle={title} onClose={handleClose}>
      <div className="space-y-3 px-6 py-5">
        {/* Pre-filled link */}
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2.5">
          <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate text-xs text-gray-600">{link}</span>
        </div>

        <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-semibold text-[#3C1E1E] transition hover:brightness-95">
          <MessageSquare className="h-4 w-4" />
          카카오톡 공유
        </button>

        <button
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              복사됨!
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              링크 복사
            </>
          )}
        </button>

        <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
          <Share2 className="h-4 w-4" />
          SMS 공유
        </button>
      </div>
    </ModalShell>
  );
}
