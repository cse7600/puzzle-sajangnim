'use client';

import { useState } from 'react';
import {
  Plus,
  Link2,
  PlugZap,
  Wallet,
  CheckCircle2,
  ExternalLink,
  Unlink,
  LogIn,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  X,
  Sparkles,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import FranchiseRegistrationModal from '@/components/modals/FranchiseRegistrationModal';

const summaryStats = [
  {
    label: '연동된 채널',
    value: '3개',
    icon: Link2,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    label: '미연동 채널',
    value: '5개',
    icon: PlugZap,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-500',
  },
  {
    label: '오늘 총 광고비',
    value: '84,000원',
    icon: Wallet,
    iconBg: 'bg-blue-50',
    iconColor: 'text-[#0066cc]',
  },
];

type ConnectedChannel = {
  emoji: string;
  name: string;
  metrics: { label: string; value: string }[];
  status?: string;
  canDisconnect: boolean;
};

const connectedChannels: ConnectedChannel[] = [
  {
    emoji: '🔍',
    name: '네이버 검색광고',
    metrics: [
      { label: '이번 달 광고비', value: '340,000원' },
      { label: '클릭수', value: '1,240' },
    ],
    canDisconnect: true,
  },
  {
    emoji: '📍',
    name: '네이버 플레이스',
    status: '실시간 순위 수집 중',
    metrics: [],
    canDisconnect: false,
  },
  {
    emoji: '💬',
    name: '카카오 모먼트',
    metrics: [
      { label: '이번 달 광고비', value: '180,000원' },
      { label: '클릭', value: '52,800' },
    ],
    canDisconnect: true,
  },
];

const availableChannels = [
  { emoji: '📘', name: '메타 광고', effect: '도달률 2.4배 향상 예상' },
  { emoji: '🔍', name: '구글 광고', effect: '검색 트래픽 35% 추가' },
  { emoji: '🥕', name: '당근마켓 비즈', effect: '근거리 타겟팅 강화' },
  { emoji: '💰', name: '토스 광고', effect: 'MZ 고객 도달' },
  { emoji: '🛒', name: '쿠팡 광고', effect: '쇼핑 트래픽 연계' },
];

const connectSteps = [
  {
    step: 1,
    icon: LogIn,
    title: '로그인 클릭',
    desc: '연동할 광고 채널 계정으로 로그인합니다',
  },
  {
    step: 2,
    icon: ShieldCheck,
    title: '권한 승인',
    desc: '데이터 조회 권한을 한 번만 승인합니다',
  },
  {
    step: 3,
    icon: RefreshCw,
    title: '자동 관리 시작',
    desc: '이후 모든 데이터가 자동으로 수집됩니다',
  },
];

type SyncRow = {
  emoji: string;
  name: string;
  lastSync: string;
  state: 'success' | 'syncing';
  stateLabel: string;
};

const syncRows: SyncRow[] = [
  {
    emoji: '🔍',
    name: '네이버 검색광고',
    lastSync: '오늘 14:32',
    state: 'success',
    stateLabel: '동기화 완료',
  },
  {
    emoji: '📍',
    name: '네이버 플레이스',
    lastSync: '오늘 14:30',
    state: 'syncing',
    stateLabel: '수집 중',
  },
  {
    emoji: '💬',
    name: '카카오 모먼트',
    lastSync: '오늘 14:32',
    state: 'success',
    stateLabel: '동기화 완료',
  },
];

export default function HubPage() {
  // Modal / interaction state
  const [franchiseOpen, setFranchiseOpen] = useState(false);
  const [connectChannel, setConnectChannel] = useState<string | null>(null);
  const [detailChannel, setDetailChannel] = useState<ConnectedChannel | null>(
    null
  );
  const [disconnectChannel, setDisconnectChannel] = useState<string | null>(
    null
  );
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  // Trigger a fake "지금 동기화" run: show spinner for 1s, then success
  const handleSyncNow = () => {
    if (syncing) return;
    setSyncDone(false);
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncDone(true);
    }, 1000);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">연동 허브</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            광고 채널을 연동하면 모든 데이터가 한 곳에 모입니다
          </p>
        </div>
        <button
          onClick={() => setFranchiseOpen(true)}
          className="inline-flex items-center gap-1.5 self-start rounded-lg bg-[#0066cc] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#0058b3] sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          연동 채널 추가
        </button>
      </div>

      {/* 영업권 등록 CTA 배너 */}
      <div className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0066cc]/10">
            <Sparkles className="h-5 w-5 text-[#0066cc]" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              영업권 등록하고 모든 마케팅 툴 무료로
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600">
              네이버 광고 계정만 연결하면 AI 블로그, 체험단, 플레이스 최적화를
              전부 무료로 사용합니다.
            </p>
            <p className="mt-2 text-xs font-medium text-[#0066cc]">
              현재 3,847명이 혜택 수령 중
            </p>
          </div>
        </div>
        <button
          onClick={() => setFranchiseOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg bg-[#0066cc] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0058b3] sm:self-auto"
        >
          영업권 등록하기
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* 연동 현황 BAR */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-gray-100 bg-gray-100 shadow-sm sm:grid-cols-3">
        {summaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-3 bg-white px-6 py-5"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.iconBg}`}
              >
                <Icon className={`h-5 w-5 ${stat.iconColor}`} />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                <p className="mt-0.5 text-xl font-semibold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 연동된 채널 */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </span>
          <h2 className="text-base font-semibold text-gray-900">연동된 채널</h2>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
            3개 활성
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-3">
          {connectedChannels.map((channel) => (
            <div
              key={channel.name}
              className="flex flex-col rounded-xl border border-gray-100 bg-gray-50/60 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{channel.emoji}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {channel.name}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  연동 완료
                </span>
              </div>

              <div className="mt-4 min-h-[52px] flex-1">
                {channel.metrics.length > 0 ? (
                  <div className="flex gap-6">
                    {channel.metrics.map((m) => (
                      <div key={m.label}>
                        <p className="text-xs text-gray-400">{m.label}</p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-900">
                          {m.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    {channel.status}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
                <button
                  onClick={() => setDetailChannel(channel)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  상세 보기
                </button>
                {channel.canDisconnect && (
                  <button
                    onClick={() => setDisconnectChannel(channel.name)}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    연동 해제
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 연동 가능한 채널 */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50">
            <PlugZap className="h-4 w-4 text-[#0066cc]" />
          </span>
          <h2 className="text-base font-semibold text-gray-900">
            연동 가능한 채널
          </h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            5개
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3 xl:grid-cols-5">
          {availableChannels.map((channel) => (
            <div
              key={channel.name}
              className="flex flex-col rounded-xl border border-gray-100 p-5 transition hover:border-[#0066cc]/30 hover:shadow-sm"
            >
              <span className="text-2xl">{channel.emoji}</span>
              <p className="mt-3 text-sm font-semibold text-gray-900">
                {channel.name}
              </p>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-gray-500">
                {channel.effect}
              </p>
              <button
                onClick={() => setConnectChannel(channel.name)}
                className="mt-4 inline-flex items-center justify-center gap-1 rounded-lg bg-[#0066cc] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#0058b3]"
              >
                연동하기
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 연동 방법 */}
        <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">연동 방법</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              3단계로 1분 안에 끝납니다
            </p>
          </div>
          <div className="space-y-3 p-6">
            {connectSteps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-[#0066cc]">
                      {s.step}
                    </span>
                    {i < connectSteps.length - 1 && (
                      <span className="mt-1 h-6 w-px bg-gray-200" />
                    )}
                  </div>
                  <div className="pt-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-900">
                        {s.title}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 데이터 동기화 상태 */}
        <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                데이터 동기화 상태
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                10분마다 자동으로 갱신됩니다
              </p>
            </div>
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  동기화 중...
                </>
              ) : syncDone ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  동기화 완료
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  지금 동기화
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-3 text-xs">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              마지막 동기화
              <span className="font-medium text-gray-900">오늘 14:32</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1.5 text-gray-500">
              다음 예정
              <span className="font-medium text-gray-900">오늘 15:42</span>
            </div>
          </div>

          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="px-6 py-2.5 font-medium">채널</th>
                  <th className="px-6 py-2.5 font-medium">마지막 동기화</th>
                  <th className="px-6 py-2.5 text-right font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {syncRows.map((row) => (
                  <tr
                    key={row.name}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{row.emoji}</span>
                        <span className="font-medium text-gray-900">
                          {row.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{row.lastSync}</td>
                    <td className="px-6 py-3 text-right">
                      {row.state === 'success' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          {row.stateLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#0066cc]">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          {row.stateLabel}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ===== MODALS ===== */}
      <FranchiseRegistrationModal
        isOpen={franchiseOpen}
        onClose={() => setFranchiseOpen(false)}
      />

      <ChannelConnectModal
        channelName={connectChannel}
        onClose={() => setConnectChannel(null)}
      />

      <ChannelDetailPanel
        channel={detailChannel}
        onClose={() => setDetailChannel(null)}
      />

      <DisconnectDialog
        channelName={disconnectChannel}
        onClose={() => setDisconnectChannel(null)}
      />
    </div>
  );
}

/* ---------- 채널 연동 모달 (OAuth step flow) ---------- */
function ChannelConnectModal({
  channelName,
  onClose,
}: {
  channelName: string | null;
  onClose: () => void;
}) {
  const [done, setDone] = useState(false);

  if (!channelName) return null;

  const handleClose = () => {
    setDone(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {channelName} 연동
          </h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {done ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                연동 완료
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {channelName} 채널이 연결되었습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-[#0066cc]">
                  1
                </span>
                <p className="pt-0.5 text-sm text-gray-700">
                  {channelName} 계정으로 로그인
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-[#0066cc]">
                  2
                </span>
                <p className="pt-0.5 text-sm text-gray-700">권한 승인</p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-500" />
                <p className="pt-0.5 text-sm font-medium text-gray-700">
                  연동 완료
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          {done ? (
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0058b3]"
            >
              확인
            </button>
          ) : (
            <button
              onClick={() => setDone(true)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0058b3]"
            >
              <LogIn className="h-4 w-4" />
              연동하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- 상세 보기 슬라이드 오버 패널 ---------- */
function ChannelDetailPanel({
  channel,
  onClose,
}: {
  channel: ConnectedChannel | null;
  onClose: () => void;
}) {
  if (!channel) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex h-full w-full max-w-sm flex-col bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{channel.emoji}</span>
            <h2 className="text-base font-semibold text-gray-900">
              {channel.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            연동 완료
          </span>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">지표</h3>
            {channel.metrics.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {channel.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
                  >
                    <p className="text-xs text-gray-400">{m.label}</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-sm text-gray-500">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {channel.status}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              마지막 동기화
              <span className="font-medium text-gray-900">오늘 14:32</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 연동 해제 확인 다이얼로그 ---------- */
function DisconnectDialog({
  channelName,
  onClose,
}: {
  channelName: string | null;
  onClose: () => void;
}) {
  if (!channelName) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="px-6 py-6">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-gray-900">
              연동을 해제할까요?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              {channelName} 채널의 연동을 해제하면 데이터 수집이 중단됩니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-600"
          >
            연동 해제
          </button>
        </div>
      </div>
    </div>
  );
}
