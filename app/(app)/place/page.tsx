'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Store,
  MapPin,
  Tag,
  CheckCircle2,
  Check,
  AlertTriangle,
  X,
  Star,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  PlaceRegistration,
  PlaceRegistrationsResponse,
  KeywordWithRank,
  RankingTrendResponse,
  RegisterResponse,
  KeywordCard,
  ChartLine,
} from './types';
import { toKeywordCards, toChartLabels, toChartLines } from './lib';
import { buildChecklist } from './checklist';
import {
  SIGNAL_STYLES,
  TrendBadge,
  SkeletonCard,
  RegisterModal,
  RankChart,
} from './components';

type ModalRole = 'mine' | 'competitor';

export default function PlacePage() {
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<PlaceRegistration | null>(null);
  const [competitors, setCompetitors] = useState<PlaceRegistration[]>([]);
  const [keywordCards, setKeywordCards] = useState<KeywordCard[]>([]);
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [chartLines, setChartLines] = useState<ChartLine[]>([]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);

  const [modalRole, setModalRole] = useState<ModalRole | null>(null);
  const [registerUrl, setRegisterUrl] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerNotice, setRegisterNotice] = useState<string | null>(null);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  const [newKeyword, setNewKeyword] = useState('');
  const [keywordError, setKeywordError] = useState<string | null>(null);

  // registration 의 키워드 + 순위 시계열을 불러와 카드/차트 state 갱신.
  const loadKeywordData = useCallback(async (registrationId: string) => {
    const keywordRes = await fetch(
      `/api/place/keywords?registration_id=${registrationId}`
    ).catch(() => null);
    const rankingRes = await fetch(
      `/api/place/rankings?registration_id=${registrationId}&days=30`
    ).catch(() => null);

    const keywords: KeywordWithRank[] = keywordRes ? await keywordRes.json() : [];
    const rankings: RankingTrendResponse | null = rankingRes ? await rankingRes.json() : null;
    const series = rankings?.series ?? [];

    setKeywordCards(toKeywordCards(Array.isArray(keywords) ? keywords : [], series));
    setChartLabels(toChartLabels(series));
    setChartLines(toChartLines(series));
  }, []);

  // 내 가게 + 경쟁자 목록을 불러온다. 내 가게가 있으면 키워드 데이터까지 로드.
  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/place/register').catch(() => null);
    const payload: PlaceRegistrationsResponse = res
      ? await res.json()
      : { mine: null, competitors: [] };
    setMine(payload.mine ?? null);
    setCompetitors(Array.isArray(payload.competitors) ? payload.competitors : []);
    if (payload.mine) await loadKeywordData(payload.mine.id);
    setLoading(false);
  }, [loadKeywordData]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  function openRegisterModal(role: ModalRole) {
    setModalRole(role);
    setRegisterUrl(role === 'mine' && mine ? mine.place_url : '');
    setRegisterError(null);
    setRegisterNotice(null);
  }

  async function submitRegister() {
    if (!modalRole || !registerUrl.trim()) {
      setRegisterError('플레이스 URL을 입력해주세요.');
      return;
    }
    setRegisterSubmitting(true);
    setRegisterError(null);
    setRegisterNotice(null);
    const res = await fetch('/api/place/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_url: registerUrl.trim(), role: modalRole }),
    }).catch(() => null);
    setRegisterSubmitting(false);

    if (!res) {
      setRegisterError('네트워크 오류로 등록에 실패했습니다.');
      return;
    }
    const payload: RegisterResponse & { error?: string } = await res.json();
    if (!res.ok) {
      setRegisterError(payload.error ?? '등록에 실패했습니다.');
      return;
    }
    if (payload.fetch_failed) {
      setRegisterNotice('기본정보 수집 대기중입니다. 등록은 완료되었습니다.');
    }
    setRegisterUrl('');
    setModalRole(null);
    loadRegistrations();
  }

  async function removeCompetitor(registrationId: string) {
    const res = await fetch(`/api/place/register?registration_id=${registrationId}`, {
      method: 'DELETE',
    }).catch(() => null);
    if (res?.ok) loadRegistrations();
  }

  async function addKeyword() {
    if (!mine || !newKeyword.trim()) {
      setKeywordError('키워드를 입력해주세요.');
      return;
    }
    setKeywordError(null);
    const res = await fetch('/api/place/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_id: mine.id, keyword: newKeyword.trim() }),
    }).catch(() => null);

    if (!res) {
      setKeywordError('네트워크 오류로 키워드 추가에 실패했습니다.');
      return;
    }
    if (res.status === 409) {
      setKeywordError('이미 등록된 키워드입니다');
      return;
    }
    if (!res.ok) {
      const payload = await res.json();
      setKeywordError(payload.error ?? '키워드 추가에 실패했습니다.');
      return;
    }
    setNewKeyword('');
    loadKeywordData(mine.id);
  }

  async function removeKeyword(keywordId: string) {
    if (!mine) return;
    const res = await fetch(`/api/place/keywords?id=${keywordId}`, {
      method: 'DELETE',
    }).catch(() => null);
    if (res?.ok) loadKeywordData(mine.id);
    else setKeywordError('키워드 삭제에 실패했습니다.');
  }

  // 등록된 placeId 로 register 재호출(upsert) → 순위·기본정보 재수집.
  async function handleRefresh() {
    if (isUpdating || !mine) return;
    setIsUpdating(true);
    setUpdated(false);
    const res = await fetch('/api/place/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_url: mine.place_url, role: 'mine' }),
    }).catch(() => null);
    setIsUpdating(false);
    if (res?.ok) {
      setUpdated(true);
      setTimeout(() => setUpdated(false), 3000);
      loadRegistrations();
    }
  }

  const modal = modalRole && (
    <RegisterModal
      url={registerUrl}
      setUrl={setRegisterUrl}
      error={registerError}
      notice={registerNotice}
      submitting={registerSubmitting}
      onClose={() => setModalRole(null)}
      onSubmit={submitRegister}
      title={modalRole === 'mine' ? '네이버 플레이스 등록' : '경쟁 가게 등록'}
      description={
        modalRole === 'mine'
          ? '내 가게의 네이버 플레이스 URL을 붙여넣어 주세요. 순위·기본정보를 다시 수집합니다.'
          : '비교하고 싶은 경쟁 가게의 네이버 플레이스 URL을 붙여넣어 주세요.'
      }
    />
  );

  if (loading) return <PlaceSkeleton />;

  if (!mine) {
    return (
      <>
        <EmptyState onRegister={() => openRegisterModal('mine')} />
        {modal}
      </>
    );
  }

  const checklist = mine.latest_snapshot ? buildChecklist(mine.latest_snapshot) : null;

  const compareRows = [mine, ...competitors].sort(
    (a, b) =>
      (b.latest_snapshot?.visitor_review_count ?? -1) -
      (a.latest_snapshot?.visitor_review_count ?? -1)
  );
  const maxReviews = Math.max(0, ...compareRows.map((row) => row.latest_snapshot?.visitor_review_count ?? 0));
  const maxPhotos = Math.max(0, ...compareRows.map((row) => row.latest_snapshot?.photo_count ?? 0));
  const myReviews = mine.latest_snapshot?.visitor_review_count ?? 0;
  const myPhotos = mine.latest_snapshot?.photo_count ?? 0;
  const reviewGap = maxReviews - myReviews;
  const photoGap = maxPhotos - myPhotos;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">플레이스 최적화</h1>
          <p className="mt-1 text-sm text-gray-500">
            내 가게의 네이버 노출 순위를 실시간으로 관리하세요
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isUpdating}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0055aa] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? '업데이트 중...' : updated ? '업데이트 완료' : '순위 업데이트'}
        </button>
      </div>

      {/* 가게 정보 BAR */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-gray-400" />
          <span className="text-base font-bold text-gray-900">{mine.name}</span>
        </div>
        {mine.address && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            {mine.address}
          </div>
        )}
        {mine.category && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Tag className="h-4 w-4 text-gray-400" />
            {mine.category}
          </div>
        )}
        {mine.latest_snapshot ? (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            네이버 연동 완료
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            기본정보 수집 대기중
          </div>
        )}
        <button
          onClick={() => openRegisterModal('mine')}
          className="ml-auto text-sm font-medium text-[#0066cc] hover:underline"
        >
          가게 정보 수정
        </button>
      </div>

      {/* 키워드 순위 PANEL */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newKeyword}
            onChange={(event) => {
              setNewKeyword(event.target.value);
              setKeywordError(null);
            }}
            onKeyDown={(event) => event.key === 'Enter' && addKeyword()}
            placeholder="모니터링할 키워드 추가 (예: 을지로 쌈밥)"
            className="min-w-[240px] flex-1 rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0066cc] focus:outline-none"
          />
          <button
            onClick={addKeyword}
            disabled={!newKeyword.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0055aa] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            키워드 추가
          </button>
        </div>
        {keywordError && <p className="text-sm font-medium text-red-600">{keywordError}</p>}

        {keywordCards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
            모니터링할 키워드를 추가하면 순위 추이가 표시됩니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {keywordCards.map((card) => {
              const style = SIGNAL_STYLES[card.signal];
              return (
                <div
                  key={card.id}
                  className="group relative rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">{card.keyword}</span>
                    <span
                      className={`h-4 w-4 rounded-full ${style.dot} ring-4 ${style.ring}`}
                      aria-label={`신호 ${card.signal}`}
                    />
                  </div>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-[48px] font-bold leading-none text-gray-900">
                      {card.rank ?? '—'}
                    </span>
                    <span className="pb-1 text-lg font-semibold text-gray-400">
                      {card.rank === null ? '권 밖' : '위'}
                    </span>
                    <div className="ml-auto pb-1">
                      <TrendBadge trend={card.trend} delta={card.delta} />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    {card.rank === null
                      ? '순위권 밖 — 노출 개선이 필요해요'
                      : card.trend === 'up'
                        ? '지난 수집 대비 순위 상승 중'
                        : card.trend === 'down'
                          ? '순위 하락 — 개선이 필요해요'
                          : '순위 변동 없음'}
                  </p>
                  <button
                    onClick={() => removeKeyword(card.id)}
                    aria-label="키워드 삭제"
                    className="absolute right-3 top-3 rounded-md p-1 text-gray-300 opacity-0 transition hover:bg-gray-100 hover:text-gray-500 group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2-COLUMN: 개선 진단 + 경쟁자 분석 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 개선 진단 체크리스트 — 실 수집 데이터 기반 */}
        <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">개선 진단 체크리스트</h2>
            {checklist && (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#0066cc]">{checklist.score}</span>
                <span className="text-sm font-medium text-gray-400">/100</span>
              </div>
            )}
          </div>

          {checklist ? (
            <>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#0066cc]"
                  style={{ width: `${checklist.score}%` }}
                />
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {checklist.items.map((item) => {
                  const isDone = item.status === 'done';
                  const isWarn = item.status === 'warn';
                  return (
                    <li
                      key={item.label}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          isDone
                            ? 'bg-emerald-50 text-emerald-600'
                            : isWarn
                              ? 'bg-amber-50 text-amber-500'
                              : 'bg-red-50 text-red-500'
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : isWarn ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-medium ${
                            isDone ? 'text-gray-500' : 'text-gray-900'
                          }`}
                        >
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-400">{item.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
                네이버가 순위 알고리즘 가중치를 공식적으로 공개하지 않아, 위 항목은
                &ldquo;채워졌는지 여부&rdquo;를 진단할 뿐 순위 상승을 보장하지 않습니다.
                &lsquo;순위 업데이트&rsquo;로 최신 데이터를 다시 수집할 수 있습니다.
              </div>
            </>
          ) : (
            <div className="mt-5 flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
              기본정보 수집 대기중입니다. &lsquo;순위 업데이트&rsquo;를 눌러 다시 시도해보세요.
            </div>
          )}
        </div>

        {/* 내 가게 vs 경쟁자 — 실제 등록된 경쟁자만 표시 */}
        <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">내 가게 vs 경쟁자</h2>
            <button
              onClick={() => openRegisterModal('competitor')}
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0066cc] hover:bg-blue-100"
            >
              <Plus className="h-3.5 w-3.5" />
              경쟁자 추가
            </button>
          </div>

          {competitors.length === 0 ? (
            <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 py-10 text-center">
              <p className="text-sm text-gray-500">등록된 경쟁 가게가 없습니다</p>
              <p className="text-xs text-gray-400">경쟁 가게를 등록하면 리뷰수·사진·평점을 비교합니다</p>
            </div>
          ) : (
            <>
              <p className="mt-1 text-xs text-gray-400">리뷰수 기준 정렬</p>
              <div className="mt-3 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                      <th className="pb-2 pl-3 font-medium">#</th>
                      <th className="pb-2 font-medium">가게명</th>
                      <th className="pb-2 text-right font-medium">리뷰수</th>
                      <th className="pb-2 text-right font-medium">사진</th>
                      <th className="pb-2 pr-1 text-right font-medium">평점</th>
                      <th className="pb-2 pl-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((row, index) => {
                      const isMine = row.id === mine.id;
                      const snapshot = row.latest_snapshot;
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-gray-50 last:border-0 ${
                            isMine ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <td
                            className={`py-3 pl-3 ${
                              isMine ? 'border-l-2 border-[#0066cc]' : 'border-l-2 border-transparent'
                            }`}
                          >
                            <span className="font-semibold text-gray-700">{index + 1}</span>
                          </td>
                          <td className="py-3 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`truncate ${
                                  isMine ? 'font-bold text-[#0066cc]' : 'font-medium text-gray-800'
                                }`}
                              >
                                {row.name}
                              </span>
                              {isMine && (
                                <span className="shrink-0 rounded bg-[#0066cc] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                  내 가게
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-right tabular-nums text-gray-600">
                            {snapshot?.visitor_review_count?.toLocaleString() ?? '—'}
                          </td>
                          <td className="py-3 text-right tabular-nums text-gray-600">
                            {snapshot?.photo_count ?? '—'}
                          </td>
                          <td className="py-3 pr-1 text-right">
                            {snapshot?.rating !== null && snapshot?.rating !== undefined ? (
                              <span className="inline-flex items-center gap-0.5 font-medium tabular-nums text-gray-800">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                {snapshot.rating.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 pl-2 text-right">
                            {!isMine && (
                              <button
                                onClick={() => removeCompetitor(row.id)}
                                aria-label="경쟁자 삭제"
                                className="rounded-md p-1 text-gray-300 hover:bg-gray-100 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                  리뷰수 1위와 격차{' '}
                  <b className="text-gray-700">{reviewGap > 0 ? `-${reviewGap.toLocaleString()}` : '1위'}</b>
                </span>
                <span className="inline-flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5 text-gray-400" />
                  사진 격차{' '}
                  <b className="text-gray-700">{photoGap > 0 ? `+${photoGap}장` : '1위'}</b>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 순위 변동 그래프 */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">순위 변동 추이</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              최근 30일 키워드별 노출 순위 (낮을수록 상위)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {chartLines.map((line) => (
              <div key={line.name} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: line.color }}
                />
                <span className="text-xs font-medium text-gray-600">{line.name}</span>
              </div>
            ))}
          </div>
        </div>

        {chartLabels.length === 0 ? (
          <p className="mt-6 rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
            순위 수집 이력이 쌓이면 추이 그래프가 표시됩니다.
          </p>
        ) : (
          <>
            <RankChart labels={chartLabels} lines={chartLines} />
            <div className="ml-11 mt-2 flex justify-between text-[10px] text-gray-400">
              {chartLabels.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>
          </>
        )}
      </div>

      {modal}
    </div>
  );
}

function EmptyState({ onRegister }: { onRegister: () => void }) {
  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">플레이스 최적화</h1>
        <p className="mt-1 text-sm text-gray-500">
          내 가게의 네이버 노출 순위를 실시간으로 관리하세요
        </p>
      </div>
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-gray-200 bg-white p-16 text-center shadow-sm">
        <Store className="h-10 w-10 text-gray-300" />
        <div>
          <p className="text-base font-semibold text-gray-900">등록된 플레이스가 없습니다</p>
          <p className="mt-1 text-sm text-gray-500">
            네이버 플레이스 URL을 등록하면 순위·기본정보 추적이 시작됩니다.
          </p>
        </div>
        <button
          onClick={onRegister}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0066cc] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0055aa]"
        >
          <Plus className="h-4 w-4" />
          플레이스 등록
        </button>
      </div>
    </div>
  );
}

function PlaceSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <div className="h-16 animate-pulse rounded-xl border border-gray-100 bg-white shadow-sm" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>
      <SkeletonCard className="h-64" />
    </div>
  );
}
