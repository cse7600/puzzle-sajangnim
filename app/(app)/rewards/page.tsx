'use client';

import { useState } from 'react';
import {
  Upload,
  Camera,
  Wallet,
  ArrowUpRight,
  ReceiptText,
  TrendingUp,
  FileImage,
  ChevronDown,
  ChevronUp,
  Trophy,
  Sparkles,
  CheckCircle2,
  Search,
  XCircle,
  Medal,
} from 'lucide-react';

type UploadStatus = '승인' | '검토중' | '반려';

interface UploadRow {
  date: string;
  vendor: string;
  amount: number;
  points: number;
  status: UploadStatus;
}

interface LeaderRow {
  rank: number;
  nickname: string;
  uploads: number;
  points: number;
}

const SUPPORTED_TYPES = ['식자재 마트', '주류 도매', '식품 명세서', '인건비'];

const UPLOAD_HISTORY: UploadRow[] = [
  { date: '6/17', vendor: '마포농수산', amount: 284000, points: 140, status: '승인' },
  { date: '6/15', vendor: '서울식자재마트', amount: 156000, points: 78, status: '승인' },
  { date: '6/14', vendor: 'CJ제일제당 대리점', amount: 430000, points: 215, status: '승인' },
  { date: '6/12', vendor: '하이트진로', amount: 89000, points: 44, status: '검토중' },
  { date: '6/11', vendor: '동원홈푸드', amount: 312000, points: 156, status: '승인' },
  { date: '6/09', vendor: '롯데주류 도매', amount: 178000, points: 89, status: '승인' },
  { date: '6/07', vendor: '경동시장 청과', amount: 64000, points: 50, status: '승인' },
  { date: '6/05', vendor: '오뚜기 대리점', amount: 521000, points: 260, status: '검토중' },
  { date: '6/03', vendor: '한솥 인력사무소', amount: 1200000, points: 500, status: '승인' },
  { date: '6/01', vendor: '신선마켓 도매', amount: 47000, points: 0, status: '반려' },
];

const LEADERBOARD: LeaderRow[] = [
  { rank: 1, nickname: '철**님', uploads: 42, points: 8920 },
  { rank: 2, nickname: '박**님', uploads: 38, points: 7640 },
  { rank: 3, nickname: '김**님', uploads: 35, points: 6810 },
  { rank: 4, nickname: '이**님', uploads: 29, points: 5430 },
  { rank: 5, nickname: '최**님', uploads: 27, points: 4980 },
  { rank: 6, nickname: '정**님', uploads: 24, points: 4210 },
  { rank: 7, nickname: '강**님', uploads: 21, points: 3870 },
  { rank: 8, nickname: '조**님', uploads: 19, points: 3340 },
  { rank: 9, nickname: '윤**님', uploads: 17, points: 2960 },
  { rank: 10, nickname: '한**님', uploads: 14, points: 2510 },
];

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

function StatusBadge({ status }: { status: UploadStatus }) {
  const config = {
    승인: {
      icon: CheckCircle2,
      label: '승인',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    검토중: {
      icon: Search,
      label: '검토중',
      className: 'bg-amber-50 text-amber-700 border-amber-100',
    },
    반려: {
      icon: XCircle,
      label: '반려',
      className: 'bg-rose-50 text-rose-700 border-rose-100',
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

export default function RewardsPage() {
  const [leaderboardOpen, setLeaderboardOpen] = useState(true);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* PAGE HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">앱테크 리워드</h1>
          <p className="mt-1 text-sm text-gray-500">
            식자재·거래 영수증을 올리면 포인트가 쌓입니다
          </p>
        </div>
        <button className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0055ab]">
          <Upload className="h-4 w-4" />
          영수증 업로드
        </button>
      </div>

      {/* 포인트 지갑 */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: balance */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0066cc]/10">
              <Wallet className="h-6 w-6 text-[#0066cc]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">현재 보유 포인트</p>
              <p className="mt-0.5 text-[40px] font-bold leading-none text-[#0066cc]">
                23,400
                <span className="text-2xl">P</span>
              </p>
              <p className="mt-2 text-sm text-gray-500">
                현금 전환 가능:{' '}
                <span className="font-medium text-gray-700">23,400원</span>
              </p>
            </div>
          </div>

          {/* Center: this month stats */}
          <div className="flex items-center gap-8 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">이번 달 적립</p>
                <p className="text-lg font-semibold text-emerald-600">+3,840P</p>
              </div>
            </div>
            <div className="hidden h-10 w-px bg-gray-100 sm:block" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                <ReceiptText className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">이번 달 업로드</p>
                <p className="text-lg font-semibold text-gray-900">12건</p>
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex flex-col items-stretch gap-2 sm:flex-row lg:flex-col lg:items-end">
            <div className="flex gap-2">
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0055ab]">
                <ArrowUpRight className="h-4 w-4" />
                포인트 출금
              </button>
              <button className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                사용 내역
              </button>
            </div>
            <p className="text-right text-xs text-gray-400 lg:mt-1">
              1P = 1원 · 최소 출금 1,000P
            </p>
          </div>
        </div>
      </div>

      {/* 영수증 업로드 PANEL */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">영수증 업로드</h2>

        {/* Dropzone */}
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center transition-colors hover:border-[#0066cc]/40 hover:bg-[#0066cc]/[0.02]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
            <Camera className="h-7 w-7 text-gray-400" />
          </div>
          <p className="mt-4 text-sm font-medium text-gray-700">
            영수증 사진을 드래그하거나 클릭해 올려주세요
          </p>
          <p className="mt-1 text-xs text-gray-400">JPG, PNG, HEIC · 최대 10MB</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0055ab]">
              <FileImage className="h-4 w-4" />
              사진 선택
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              <Camera className="h-4 w-4" />
              카메라 촬영
            </button>
          </div>
        </div>

        {/* Supported types + criteria */}
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500">지원 유형</span>
            {SUPPORTED_TYPES.map((type) => (
              <span
                key={type}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600"
              >
                {type}
              </span>
            ))}
          </div>
          <div className="rounded-lg bg-[#0066cc]/[0.06] px-3 py-1.5 text-xs font-medium text-[#0066cc]">
            적립 기준: 구매 금액의 0.05% (최소 50P ~ 최대 500P)
          </div>
        </div>
      </div>

      {/* 이번 달 업로드 이력 TABLE */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              이번 달 업로드 이력
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">2026년 6월 · 총 10건</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3">날짜</th>
                <th className="px-6 py-3">업체명</th>
                <th className="px-6 py-3 text-right">구매금액</th>
                <th className="px-6 py-3 text-right">적립 포인트</th>
                <th className="px-6 py-3">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {UPLOAD_HISTORY.map((row, idx) => (
                <tr
                  key={idx}
                  className="transition-colors hover:bg-gray-50/60"
                >
                  <td className="whitespace-nowrap px-6 py-3.5 text-gray-500">
                    {row.date}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-gray-900">
                    {row.vendor}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-right tabular-nums text-gray-700">
                    {formatNumber(row.amount)}원
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-right tabular-nums font-semibold">
                    {row.points > 0 ? (
                      <span className="text-emerald-600">
                        +{formatNumber(row.points)}P
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 포인트 적립 리더보드 (collapsible) */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <button
          onClick={() => setLeaderboardOpen((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                포인트 적립 리더보드
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">이번 달 TOP 10</p>
            </div>
          </div>
          {leaderboardOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {leaderboardOpen && (
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3">순위</th>
                  <th className="px-6 py-3">닉네임</th>
                  <th className="px-6 py-3 text-right">업로드 건수</th>
                  <th className="px-6 py-3 text-right">적립 포인트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {LEADERBOARD.map((row) => {
                  const medalColor =
                    row.rank === 1
                      ? 'text-amber-400'
                      : row.rank === 2
                      ? 'text-gray-400'
                      : row.rank === 3
                      ? 'text-amber-700'
                      : '';
                  return (
                    <tr
                      key={row.rank}
                      className="transition-colors hover:bg-gray-50/60"
                    >
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5">
                          {row.rank <= 3 ? (
                            <Medal className={`h-4 w-4 ${medalColor}`} />
                          ) : (
                            <span className="inline-flex h-4 w-4 items-center justify-center text-xs text-gray-300">
                              ·
                            </span>
                          )}
                          <span className="font-semibold text-gray-700 tabular-nums">
                            {row.rank}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-gray-900">
                        {row.nickname}
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-gray-700">
                        {row.uploads}건
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums font-semibold text-[#0066cc]">
                        {formatNumber(row.points)}P
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI 영수증 판독 안내 */}
      <div className="flex items-start gap-3 rounded-xl border border-[#0066cc]/15 bg-[#0066cc]/[0.06] p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0066cc]/10">
          <Sparkles className="h-5 w-5 text-[#0066cc]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">AI 영수증 판독</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            AI가 1초 만에 영수증을 자동 인식합니다. 중복·훼손·가짜 영수증은 즉시
            반려됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
