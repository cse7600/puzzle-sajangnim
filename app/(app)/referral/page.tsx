'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Share2,
  Copy,
  Check,
  QrCode,
  Wallet,
  MessageCircle,
  Link2,
  Users,
  TrendingUp,
  HandCoins,
  Info,
} from 'lucide-react';

type ReferralFriend = {
  id: string;
  name: string;
  business_name: string;
  joined_at: string;
};

type ReferralStats = {
  referral_code: string;
  referral_link: string;
  friends: ReferralFriend[];
  friend_count: number;
  total_earned: number;
  unpaid_earned: number;
  paid_earned: number;
};

type ReferralEarning = {
  id: string;
  referee_name: string;
  source_label: string;
  source_amount: number;
  earned_amount: number;
  earning_rate: number;
  is_paid: boolean;
  created_at: string;
};

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function ReferralPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [earnings, setEarnings] = useState<ReferralEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchJson<ReferralStats>('/api/referral/stats'),
      fetchJson<ReferralEarning[]>('/api/referral/earnings'),
    ]).then(([statsData, earningsData]) => {
      if (!active) return;
      setStats(statsData);
      setEarnings(earningsData ?? []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleCopy = (text: string, target: 'code' | 'link') => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    if (target === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    }
  };

  if (loading) return <ReferralSkeleton />;

  const referralCode = stats?.referral_code ?? '';
  const referralLink = stats?.referral_link ?? '';
  const friends = stats?.friends ?? [];
  const totalEarned = stats?.total_earned ?? 0;
  const unpaidEarned = stats?.unpaid_earned ?? 0;
  const friendCount = stats?.friend_count ?? 0;

  const summaryCards = [
    {
      label: '누적 포인트 적립',
      value: `${totalEarned.toLocaleString('ko-KR')}P`,
      sub: '가입 후 전체 합계',
      icon: TrendingUp,
      accent: true,
    },
    {
      label: '적립 처리중',
      value: `${unpaidEarned.toLocaleString('ko-KR')}P`,
      sub: '보통 즉시 반영됩니다',
      icon: HandCoins,
      accent: false,
    },
    {
      label: '추천 친구',
      value: `${friendCount}명`,
      sub: '내 코드로 가입한 친구',
      icon: Users,
      accent: false,
    },
  ];

  return (
    <div className="py-2 sm:px-8 sm:py-6 max-w-[1280px] mx-auto">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">추천인 시스템</h1>
          <p className="mt-1 text-sm text-gray-500">
            친구가 포인트를 벌 때마다 5%가 내 포인트로 즉시 적립돼요
          </p>
        </div>
        <button
          onClick={() => handleCopy(referralLink, 'link')}
          disabled={!referralLink}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" />
          추천 링크 공유
        </button>
      </div>

      {/* 수익 요약 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  {card.label}
                </span>
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                    card.accent
                      ? 'bg-accent-bg text-primary-dark'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div
                className={`mt-3 text-3xl font-bold tracking-tight ${
                  card.accent ? 'text-primary-dark' : 'text-gray-900'
                }`}
              >
                {card.value}
              </div>
              <p className="mt-1 text-xs text-gray-400">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* 내 추천 코드 */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">내 추천 코드</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          아래 코드나 QR을 친구에게 공유하면 자동으로 내 추천으로 연결됩니다
        </p>

        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-center">
          {/* 코드 + 공유 버튼 */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
                <span className="font-mono text-2xl font-bold tracking-widest text-gray-900">
                  {referralCode || '코드 없음'}
                </span>
              </div>
              <button
                onClick={() => handleCopy(referralCode, 'code')}
                disabled={!referralCode}
                className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="코드 복사"
              >
                {copiedCode ? (
                  <Check className="h-5 w-5 text-primary-dark" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-semibold text-[#3C1E1E] transition-opacity hover:opacity-90">
                <MessageCircle className="h-4 w-4" />
                카카오톡 공유
              </button>
              <button
                onClick={() => handleCopy(referralLink, 'link')}
                disabled={!referralLink}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copiedLink ? (
                  <Check className="h-4 w-4 text-primary-dark" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {copiedLink ? '복사됨' : '링크 복사'}
              </button>
            </div>
            {referralLink && (
              <p className="mt-3 break-all text-xs text-gray-400">{referralLink}</p>
            )}
          </div>

          {/* QR placeholder */}
          <div className="flex flex-col items-center">
            <div className="flex h-[120px] w-[120px] items-center justify-center rounded-lg border border-gray-200 bg-gray-100">
              <QrCode className="h-12 w-12 text-gray-300" />
            </div>
            <span className="mt-2 text-xs text-gray-400">QR 코드 스캔</span>
          </div>
        </div>
      </div>

      {/* 2-COLUMN */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        {/* LEFT — 추천 네트워크 */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              내 추천 네트워크
            </h2>
            <Users className="h-4 w-4 text-gray-400" />
          </div>

          {friends.length === 0 ? (
            <div className="mt-8 flex flex-col items-center gap-2 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-gray-600">
                아직 추천한 친구가 없습니다
              </p>
              <p className="text-xs text-gray-400">
                추천 코드를 공유하고 첫 친구를 초대해보세요
              </p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-sm font-bold text-ink shadow-md ring-4 ring-primary/10">
                나
              </div>
              <div className="h-5 w-px bg-gray-200" />
              <div className="h-px w-3/4 bg-gray-200" />

              <div className="mt-4 flex flex-wrap justify-center gap-4">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary-dark/40 bg-accent-bg text-sm font-semibold text-primary-dark">
                      {friend.name.charAt(0)}
                    </div>
                    <span className="max-w-[72px] truncate text-xs font-medium text-gray-700">
                      {friend.name}
                    </span>
                    {friend.business_name && (
                      <span className="max-w-[80px] truncate text-[11px] text-gray-400">
                        {friend.business_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex w-full items-center justify-center rounded-lg bg-gray-50 py-3 text-center">
                <div>
                  <div className="text-lg font-bold text-primary-dark">
                    {friendCount}명
                  </div>
                  <div className="text-xs text-gray-400">직접 추천한 친구</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — 수익 발생 로그 */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              수익 발생 로그
            </h2>
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600">
              실시간
            </span>
          </div>

          {earnings.length === 0 ? (
            <div className="mt-8 flex flex-col items-center gap-2 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <HandCoins className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-gray-600">
                아직 발생한 수익이 없습니다
              </p>
              <p className="text-xs text-gray-400">
                추천한 친구가 포인트를 벌면 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {earnings.map((earning) => (
                <li
                  key={earning.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-700">
                      <span className="font-medium text-gray-900">
                        {earning.referee_name}님
                      </span>{' '}
                      {earning.source_label}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {relativeTime(earning.created_at)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          earning.is_paid
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {earning.is_paid ? '포인트 적립됨' : '적립 처리중'}
                      </span>
                    </div>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-green-600">
                    +{earning.earned_amount.toLocaleString('ko-KR')}P
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 포인트 적립 안내 카드 */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-bg text-primary-dark">
            <Wallet className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm text-gray-500">누적 포인트 적립</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalEarned.toLocaleString('ko-KR')}P
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-accent-bg px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-dark" />
          <p className="text-xs text-primary-dark">
            추천 수익은 발생 즉시 포인트로 적립됩니다. 별도 출금 신청 없이
            내 포인트 잔액에 자동으로 합산돼요.
          </p>
        </div>

        <Link
          href="/earnings?tab=confirmed"
          className="mt-3 flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
        >
          <span>전체 적립 내역은 수익·정산에서 확인하세요</span>
          <span className="font-medium text-primary-dark">보러가기 →</span>
        </Link>
      </div>
    </div>
  );
}

function ReferralSkeleton() {
  return (
    <div className="py-2 sm:px-8 sm:py-6 max-w-[1280px] mx-auto animate-pulse">
      <div className="mb-6 h-12 w-64 rounded-lg bg-gray-100" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div className="h-4 w-20 rounded bg-gray-100" />
            <div className="mt-4 h-8 w-32 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="mb-6 h-44 rounded-xl border border-gray-100 bg-white shadow-sm" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-xl border border-gray-100 bg-white shadow-sm" />
        <div className="h-72 rounded-xl border border-gray-100 bg-white shadow-sm" />
      </div>
    </div>
  );
}
