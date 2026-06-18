'use client';

import { useState } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Users,
  Calendar,
  ClipboardList,
  Send,
  ArrowLeftRight,
} from 'lucide-react';

// ── Shared types (kept local; mirror the shapes used on the experience page) ──
export interface Campaign {
  id: string;
  title: string;
  status: 'recruiting' | 'waiting';
  recruited: number;
  capacity: number;
  experienceDate: string;
  conditions: string[];
}

export interface Creator {
  id: string;
  nickname: string;
  followers: number;
  category: string;
  matchScore: number;
  color: string;
}

const PRIMARY = '#0066cc';

function formatFollowers(n: number): string {
  return n.toLocaleString('ko-KR') + '명';
}

// ── Reusable modal shell (centered overlay) ──────────────────────────────────
function ModalShell({
  onClose,
  children,
  maxWidth = 'max-w-lg',
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${maxWidth} rounded-xl bg-white shadow-xl`}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// 1. NewCampaignModal — multi-step form
// =============================================================================
const CONDITION_OPTIONS = ['블로그 1건', '인스타 1건', '유튜브 쇼츠 1건'];
const NEW_CAMPAIGN_STEPS = 3;

export interface NewCampaignData {
  name: string;
  description: string;
  capacity: number;
  experienceDate: string;
  conditions: string[];
}

export function NewCampaignModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title = '새 체험단 만들기',
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: NewCampaignData) => void;
  initialData?: Partial<NewCampaignData>;
  title?: string;
}) {
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>(initialData?.name ?? '');
  const [description, setDescription] = useState<string>(
    initialData?.description ?? '',
  );
  const [capacity, setCapacity] = useState<number>(initialData?.capacity ?? 3);
  const [experienceDate, setExperienceDate] = useState<string>(
    initialData?.experienceDate ?? '',
  );
  const [conditions, setConditions] = useState<string[]>(
    initialData?.conditions ?? [],
  );
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setName(initialData?.name ?? '');
    setDescription(initialData?.description ?? '');
    setCapacity(initialData?.capacity ?? 3);
    setExperienceDate(initialData?.experienceDate ?? '');
    setConditions(initialData?.conditions ?? []);
    setSubmitted(false);
    onClose();
  };

  const toggleCondition = (cond: string) => {
    setConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond],
    );
  };

  const goNext = () => setStep((s) => Math.min(s + 1, NEW_CAMPAIGN_STEPS));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const canProceedStep1 = name.trim().length > 0;
  const canProceedStep2 =
    capacity >= 1 && capacity <= 10 && experienceDate.trim().length > 0;

  const handleSubmit = () => {
    onSubmit?.({ name, description, capacity, experienceDate, conditions });
    setSubmitted(true);
  };

  const progressPct = (step / NEW_CAMPAIGN_STEPS) * 100;

  return (
    <ModalShell onClose={handleClose}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress bar */}
      {!submitted && (
        <div className="px-6 pt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
            <span>
              {step === 1 && '기본 정보'}
              {step === 2 && '모집 설정'}
              {step === 3 && '확인'}
            </span>
            <span>
              {step}/{NEW_CAMPAIGN_STEPS}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, backgroundColor: PRIMARY }}
            />
          </div>
        </div>
      )}

      {/* Body */}
      <div className="px-6 py-5">
        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              체험단이 등록되었습니다!
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
              크리에이터 모집이 시작되면 지원자 목록에서 확인할 수 있습니다.
            </p>
          </div>
        ) : (
          <>
            {/* Step 1: 기본 정보 */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    캠페인 이름
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예) 을지로 쌈밥 런치 체험"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    체험 내용
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="제공하는 메뉴/서비스와 체험 방식을 적어주세요."
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
                  />
                </div>
              </div>
            )}

            {/* Step 2: 모집 설정 */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    모집 인원 (1~10명)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    체험일
                  </label>
                  <input
                    type="date"
                    value={experienceDate}
                    onChange={(e) => setExperienceDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
                  />
                </div>
                <div>
                  <span className="mb-2 block text-sm font-medium text-gray-700">
                    조건
                  </span>
                  <div className="space-y-2">
                    {CONDITION_OPTIONS.map((cond) => (
                      <label
                        key={cond}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={conditions.includes(cond)}
                          onChange={() => toggleCondition(cond)}
                          className="h-4 w-4 rounded border-gray-300 text-[#0066cc] focus:ring-[#0066cc]"
                        />
                        {cond}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: 확인 */}
            {step === 3 && (
              <dl className="space-y-3 rounded-lg bg-gray-50 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">캠페인 이름</dt>
                  <dd className="text-right font-medium text-gray-900">
                    {name || '-'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">체험 내용</dt>
                  <dd className="max-w-[60%] text-right font-medium text-gray-900">
                    {description || '-'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">모집 인원</dt>
                  <dd className="text-right font-medium text-gray-900">
                    {capacity}명
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">체험일</dt>
                  <dd className="text-right font-medium text-gray-900">
                    {experienceDate || '-'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">조건</dt>
                  <dd className="text-right font-medium text-gray-900">
                    {conditions.length > 0 ? conditions.join(', ') : '-'}
                  </dd>
                </div>
              </dl>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-6 py-4">
        {submitted ? (
          <button
            type="button"
            onClick={handleClose}
            className="ml-auto inline-flex items-center justify-center rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0058b0]"
          >
            확인
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={step === 1 ? handleClose : goBack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {step === 1 ? (
                '취소'
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  이전
                </>
              )}
            </button>
            {step < NEW_CAMPAIGN_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0058b0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                다음
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0058b0]"
              >
                등록하기
              </button>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
}

// =============================================================================
// 2. ApplicantsDrawer — right slide-over panel
// =============================================================================
interface Applicant {
  id: string;
  nickname: string;
  followers: number;
  category: string;
  color: string;
}

const MOCK_APPLICANTS: Applicant[] = [
  { id: 'a1', nickname: '맛집헌터지수', followers: 13200, category: '맛집탐방', color: '#0066cc' },
  { id: 'a2', nickname: '서울푸드로그', followers: 8700, category: '한식', color: '#16a34a' },
  { id: 'a3', nickname: '데일리먹부림', followers: 21500, category: '외식업', color: '#9333ea' },
  { id: 'a4', nickname: '동네맛집기록', followers: 5400, category: '로컬맛집', color: '#ea580c' },
  { id: 'a5', nickname: '미식가의하루', followers: 16800, category: '푸드포토', color: '#dc2626' },
];

type ApplicantState = 'pending' | 'approved' | 'rejected';

export function ApplicantsDrawer({
  isOpen,
  onClose,
  campaign,
}: {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
}) {
  const [states, setStates] = useState<Record<string, ApplicantState>>({});

  const setState = (id: string, next: ApplicantState) =>
    setStates((prev) => ({ ...prev, [id]: next }));

  const handleClose = () => {
    setStates({});
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed right-0 top-0 z-50 flex h-full w-96 max-w-full flex-col bg-white shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500">지원자 목록</p>
            <h2 className="truncate text-base font-semibold text-gray-900">
              {campaign?.title ?? '체험단'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5">
          <ul className="space-y-3">
            {MOCK_APPLICANTS.map((ap) => {
              const state = states[ap.id] ?? 'pending';
              if (state === 'rejected') {
                return (
                  <li
                    key={ap.id}
                    className="pointer-events-none rounded-xl border border-gray-100 p-4 opacity-0 transition-opacity duration-300"
                    aria-hidden="true"
                  />
                );
              }
              return (
                <li
                  key={ap.id}
                  className="rounded-xl border border-gray-100 p-4 transition-opacity duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: ap.color }}
                    >
                      {ap.nickname.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {ap.nickname}
                      </p>
                      <p className="text-xs text-gray-500">
                        팔로워 {formatFollowers(ap.followers)} · {ap.category}
                      </p>
                    </div>
                    {state === 'approved' && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        승인됨
                      </span>
                    )}
                  </div>
                  {state === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setState(ap.id, 'approved')}
                        className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#0066cc] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0058b0]"
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        onClick={() => setState(ap.id, 'rejected')}
                        className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        거절
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// 3. RecruitModal — centered creator outreach modal
// =============================================================================
export function RecruitModal({
  isOpen,
  onClose,
  creator,
  storeName = '우리 가게',
}: {
  isOpen: boolean;
  onClose: () => void;
  creator: Creator | null;
  storeName?: string;
}) {
  const defaultMessage = creator
    ? `안녕하세요 ${creator.nickname}님! ${storeName} 체험단에 초대드립니다. 함께 좋은 콘텐츠를 만들어보고 싶어 연락드렸습니다. 관심 있으시면 회신 부탁드립니다!`
    : '';

  const [message, setMessage] = useState<string>(defaultMessage);
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen || !creator) return null;

  // Re-sync the template when a different creator opens the modal
  if (messageKey !== creator.id) {
    setMessageKey(creator.id);
    setMessage(defaultMessage);
    setSubmitted(false);
  }

  const handleClose = () => {
    setSubmitted(false);
    setMessageKey(null);
    onClose();
  };

  const handleSubmit = () => setSubmitted(true);

  return (
    <ModalShell onClose={handleClose}>
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">크리에이터 섭외</h2>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-6 py-5">
        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              섭외 요청이 전송되었습니다!
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
              {creator.nickname}님이 수락하면 알림으로 안내해 드립니다.
            </p>
          </div>
        ) : (
          <>
            {/* Creator summary */}
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
                style={{ backgroundColor: creator.color }}
              >
                {creator.nickname.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {creator.nickname}
                </p>
                <p className="text-xs text-gray-500">
                  팔로워 {formatFollowers(creator.followers)} · {creator.category}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-[#0066cc]">
                {creator.matchScore}%
              </span>
            </div>

            {/* Message */}
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                섭외 메시지
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
        {submitted ? (
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0058b0]"
          >
            확인
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0058b0]"
            >
              <Send className="h-4 w-4" />
              섭외 요청 보내기
            </button>
          </>
        )}
      </div>
    </ModalShell>
  );
}

// =============================================================================
// 4. ExchangeProposalModal — 품앗이 제안 폼
// =============================================================================
const EXCHANGE_TYPES = [
  '인스타 상호 노출',
  '블로그 교차 리뷰',
  '스토리 공유',
  '릴스 태그',
];

export function ExchangeProposalModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [partner, setPartner] = useState<string>('');
  const [type, setType] = useState<string>(EXCHANGE_TYPES[0]);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setPartner('');
    setType(EXCHANGE_TYPES[0]);
    setScheduledDate('');
    setSubmitted(false);
    onClose();
  };

  const canSubmit = partner.trim().length > 0 && scheduledDate.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitted(true);
  };

  return (
    <ModalShell onClose={handleClose}>
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <ArrowLeftRight className="h-4.5 w-4.5 text-[#0066cc]" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">품앗이 교환 제안</h2>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-6 py-5">
        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              교환 제안이 전송되었습니다!
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
              {partner}에서 수락하면 품앗이 현황에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                상대 가게명
              </label>
              <input
                type="text"
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                placeholder="예) 연남동 베이글베이커리"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                교환 유형
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
              >
                {EXCHANGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                예정일
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
        {submitted ? (
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0058b0]"
          >
            확인
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0058b0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              교환 제안 보내기
            </button>
          </>
        )}
      </div>
    </ModalShell>
  );
}
