'use client';

import { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  QrCode,
  TrendingUp,
  Users,
  Wallet,
  MessageCircle,
  Link2,
  ArrowUpRight,
  Info,
} from 'lucide-react';

const earningLogs = [
  { name: '김**', service: 'AI 블로그 서비스', amount: 2400, time: '6시간 전' },
  { name: '박**', service: '플레이스 분석', amount: 1800, time: '1일 전' },
  { name: '이**', service: 'AI 블로그 서비스', amount: 2400, time: '1일 전' },
  { name: '최**', service: '리뷰 관리 자동화', amount: 1500, time: '2일 전' },
  { name: '정**', service: '플레이스 분석', amount: 1800, time: '3일 전' },
  { name: '강**', service: 'AI 블로그 서비스', amount: 2400, time: '4일 전' },
  { name: '윤**', service: '키워드 추적', amount: 1200, time: '5일 전' },
  { name: '임**', service: '리뷰 관리 자동화', amount: 1500, time: '6일 전' },
];

const monthlyRows = [
  { month: '6월 (현재)', friends: 7, count: 23, amount: 128000, current: true },
  { month: '5월', friends: 6, count: 18, amount: 94000, current: false },
  { month: '4월', friends: 5, count: 14, amount: 67000, current: false },
  { month: '3월', friends: 4, count: 9, amount: 42000, current: false },
  { month: '2월', friends: 3, count: 6, amount: 28000, current: false },
];

const summaryCards = [
  {
    label: '이번 달 수익',
    value: '128,000원',
    sub: '+36% 지난달 대비',
    icon: TrendingUp,
    accent: true,
  },
  {
    label: '누적 수익',
    value: '2,340,000원',
    sub: '가입 후 전체 합계',
    icon: Wallet,
    accent: false,
  },
  {
    label: '연 환산',
    value: '~1,536,000원',
    sub: '최근 추세 기준 / 년',
    icon: ArrowUpRight,
    accent: false,
  },
];

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function ReferralPage() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const referralCode = 'CHULSOO23';
  const referralLink = 'https://puzzle.kr/r/CHULSOO23';

  const handleCopy = (text: string, type: 'code' | 'link') => {
    navigator.clipboard?.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    }
  };

  return (
    <div className="px-8 py-6 max-w-[1280px] mx-auto">
      {/* PAGE HEADER */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">추천인 시스템</h1>
          <p className="mt-1 text-sm text-gray-500">
            친구가 결제할 때마다 5%가 평생 내 통장으로
          </p>
        </div>
        <button
          onClick={() => handleCopy(referralLink, 'link')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0058b0]"
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
                      ? 'bg-[#0066cc]/10 text-[#0066cc]'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div
                className={`mt-3 text-3xl font-bold tracking-tight ${
                  card.accent ? 'text-[#0066cc]' : 'text-gray-900'
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
                  {referralCode}
                </span>
              </div>
              <button
                onClick={() => handleCopy(referralCode, 'code')}
                className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-[#0066cc]"
                aria-label="코드 복사"
              >
                {copiedCode ? (
                  <Check className="h-5 w-5 text-[#0066cc]" />
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
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                {copiedLink ? (
                  <Check className="h-4 w-4 text-[#0066cc]" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {copiedLink ? '복사됨' : '링크 복사'}
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-400">{referralLink}</p>
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
        {/* LEFT */}
        <div className="flex flex-col gap-6">
          {/* 추천 네트워크 */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                내 추천 네트워크
              </h2>
              <Users className="h-4 w-4 text-gray-400" />
            </div>

            {/* Visual tree */}
            <div className="mt-6 flex flex-col items-center">
              {/* 나 */}
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0066cc] text-sm font-bold text-white shadow-md ring-4 ring-[#0066cc]/10">
                나
              </div>
              {/* connector */}
              <div className="h-5 w-px bg-gray-200" />
              <div className="h-px w-3/4 bg-gray-200" />

              {/* 1단계 7명 */}
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {Array.from({ length: 7 }).map((_, i) => {
                  const hasSub = i === 1 || i === 3 || i === 5;
                  return (
                    <div key={i} className="flex flex-col items-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0066cc]/40 bg-[#0066cc]/10 text-[11px] font-semibold text-[#0066cc]">
                        {i + 1}
                      </div>
                      {hasSub && (
                        <>
                          <div className="h-3 w-px bg-gray-200" />
                          <div className="flex gap-1.5">
                            {Array.from({
                              length: i === 1 ? 3 : i === 3 ? 2 : 2,
                            }).map((_, j) => (
                              <div
                                key={j}
                                className="h-5 w-5 rounded-full border border-gray-300 bg-gray-100"
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* stats */}
              <div className="mt-6 flex w-full items-center justify-center gap-6 rounded-lg bg-gray-50 py-3 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900">7명</div>
                  <div className="text-xs text-gray-400">1단계</div>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div>
                  <div className="text-lg font-bold text-gray-900">12명</div>
                  <div className="text-xs text-gray-400">2단계</div>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div>
                  <div className="text-lg font-bold text-[#0066cc]">19명</div>
                  <div className="text-xs text-gray-400">활성</div>
                </div>
              </div>
            </div>
          </div>

          {/* 수익 발생 로그 */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                수익 발생 로그
              </h2>
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600">
                실시간
              </span>
            </div>
            <ul className="mt-4 divide-y divide-gray-100">
              {earningLogs.map((log, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-700">
                      <span className="font-medium text-gray-900">
                        {log.name}님
                      </span>{' '}
                      {log.service}
                    </p>
                    <p className="text-xs text-gray-400">{log.time}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-green-600">
                    +{formatWon(log.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RIGHT — 월별 수익 내역 */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            월별 수익 내역
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            월별 추천 친구 수와 발생한 수익을 확인하세요
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  <th className="pb-3 pr-3 font-medium">월</th>
                  <th className="pb-3 pr-3 text-right font-medium">추천 친구</th>
                  <th className="pb-3 pr-3 text-right font-medium">수익 건수</th>
                  <th className="pb-3 text-right font-medium">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyRows.map((row) => (
                  <tr
                    key={row.month}
                    className={row.current ? 'bg-[#0066cc]/[0.03]' : ''}
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            row.current ? 'text-[#0066cc]' : 'text-gray-900'
                          }`}
                        >
                          {row.month}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right text-gray-600">
                      {row.friends}명
                    </td>
                    <td className="py-3 pr-3 text-right text-gray-600">
                      {row.count}건
                    </td>
                    <td
                      className={`py-3 text-right font-semibold ${
                        row.current ? 'text-[#0066cc]' : 'text-gray-900'
                      }`}
                    >
                      {formatWon(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td className="pt-3 font-semibold text-gray-900">합계</td>
                  <td className="pt-3 text-right text-sm text-gray-500">—</td>
                  <td className="pt-3 text-right font-medium text-gray-700">
                    70건
                  </td>
                  <td className="pt-3 text-right font-bold text-gray-900">
                    359,000원
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            * 최근 5개월 기준. 전체 누적 수익은 상단 요약 카드를 참고하세요.
          </p>
        </div>
      </div>

      {/* 출금 카드 */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#0066cc]/10 text-[#0066cc]">
              <Wallet className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm text-gray-500">출금 가능 잔액</p>
              <p className="text-2xl font-bold text-gray-900">2,340,000원</p>
            </div>
          </div>

          <div className="group relative">
            <button
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-200 px-5 py-3 text-sm font-medium text-gray-400"
            >
              출금 신청
              <Info className="h-4 w-4" />
            </button>
            <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden whitespace-nowrap rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg group-hover:block">
              출시 후 활성화됩니다
              <span className="absolute right-6 top-full -mt-px border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700">
            출금 기능은 정식 출시 후 활성화될 예정입니다. 그 전까지 발생한
            수익은 모두 누적되어 안전하게 보관됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
