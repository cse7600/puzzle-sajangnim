'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Menu, ChevronRight } from 'lucide-react';

type AppTopBarProps = {
  title: string;
};

type PointBreakdown = {
  key: string;
  label: string;
  amount: number;
};

type PointsSummary = {
  total: number;
  breakdown: PointBreakdown[];
  redeemable: number;
  usable: number;
};

function formatP(amount: number) {
  return `${amount.toLocaleString('ko-KR')}P`;
}

export default function AppTopBar({ title }: AppTopBarProps) {
  const [, setMobileOpen] = useState(false);
  const [summary, setSummary] = useState<PointsSummary | null>(null);
  const [pointsOpen, setPointsOpen] = useState(false);
  const pointsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/points/summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: PointsSummary | null) => {
        if (active && payload) setSummary(payload);
      })
      .catch(() => {
        if (active) setSummary({ total: 0, breakdown: [], redeemable: 0, usable: 0 });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!pointsOpen) return;
    function onDocClick(event: MouseEvent) {
      if (pointsRef.current && !pointsRef.current.contains(event.target as Node)) {
        setPointsOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pointsOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="메뉴"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex items-center text-gray-600 transition active:scale-95 lg:hidden"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-1.5 text-[14px]">
          <span className="text-gray-400">퍼즐 사장님</span>
          <span className="text-gray-300">›</span>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="알림"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
        >
          <Bell size={18} />
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        <div className="relative" ref={pointsRef}>
          {summary === null ? (
            <span className="inline-block h-7 w-[72px] animate-pulse rounded-full bg-gray-100" />
          ) : (
            <button
              type="button"
              onClick={() => setPointsOpen((v) => !v)}
              aria-expanded={pointsOpen}
              className="rounded-full bg-[#0066cc]/10 px-3 py-1.5 text-[13px] font-semibold text-[#0066cc] transition hover:bg-[#0066cc]/20"
            >
              {formatP(summary.total)}
            </button>
          )}

          {pointsOpen && summary && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-gray-100 bg-white p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-500">총 보유 포인트</span>
                <span className="text-[15px] font-semibold text-gray-900">{formatP(summary.total)}</span>
              </div>

              <div className="my-3 border-t border-gray-100" />

              {summary.breakdown.length === 0 ? (
                <p className="py-1 text-[13px] text-gray-400">적립 내역이 없습니다</p>
              ) : (
                <ul className="space-y-2">
                  {summary.breakdown.map((entry) => (
                    <li key={entry.key} className="flex items-center justify-between text-[13px]">
                      <span className="text-gray-600">{entry.label}</span>
                      <span className={`font-medium ${entry.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatP(entry.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="my-3 border-t border-gray-100" />

              <div className="space-y-1.5 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">환급 가능</span>
                  <span className="font-medium text-gray-900">{formatP(summary.redeemable)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">서비스 이용</span>
                  <span className="font-medium text-gray-900">{formatP(summary.usable)}</span>
                </div>
              </div>

              <Link
                href="/earnings"
                onClick={() => setPointsOpen(false)}
                className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-[#0066cc] py-2 text-[13px] font-medium text-white transition hover:bg-[#0058b0]"
              >
                수익 현황 보기
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0066cc] text-[13px] font-semibold text-white">
          김
        </div>
      </div>
    </header>
  );
}
