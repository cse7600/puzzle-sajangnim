'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MessageCircle, ThumbsUp, Coins, Trophy, Crown, CheckCircle2 } from 'lucide-react'

const CATEGORIES = ['전체', '네이버SEO', '광고', 'SNS', '체험단', '블로그', '플레이스'] as const
type Category = (typeof CATEGORIES)[number]

const CATEGORY_STYLE: Record<string, string> = {
  네이버SEO: 'bg-green-50 text-green-700',
  광고: 'bg-orange-50 text-orange-700',
  SNS: 'bg-purple-50 text-purple-700',
  체험단: 'bg-cyan-50 text-cyan-700',
  블로그: 'bg-blue-50 text-blue-700',
  플레이스: 'bg-rose-50 text-rose-700',
}

interface Question {
  id: string
  category: string
  title: string
  body: string
  reward_points: number
  is_adopted: boolean
  created_at: string
  knowledge_answers: { count: number }[]
}

function relativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return '방금 전'
  if (diff < 60) return `${diff}분 전`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

export default function KnowledgePage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<Category>('전체')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchQuestions() {
    setLoading(true)
    const cat = activeCategory !== '전체' ? `&category=${encodeURIComponent(activeCategory)}` : ''
    const res = await fetch(`/api/knowledge/questions?${cat}`).catch(() => null)
    const data = res ? await res.json() : []
    setQuestions(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchQuestions() }, [activeCategory])

  const answerCount = (q: Question) => q.knowledge_answers?.[0]?.count ?? 0

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">지식 거래소</h1>
          <p className="mt-1 text-sm text-gray-500">마케팅 고민을 사장님들과 나누고 리워드를 받으세요</p>
        </div>
        <button
          onClick={() => router.push('/knowledge/ask')}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#0058b0] transition-colors"
        >
          <Plus className="h-4 w-4" />
          질문하기 +1,000P
        </button>
      </div>

      {/* 포인트 안내 배너 */}
      <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-3 flex items-center gap-3">
        <Coins className="h-5 w-5 text-[#0066cc] shrink-0" />
        <p className="text-[13px] text-[#0066cc]">
          질문 작성 <strong>+1,000P</strong> · 답변 작성 <strong>+1,000P</strong> (하루 각 1회 적립)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 질문 피드 */}
        <div className="lg:col-span-2">
          {/* 카테고리 탭 */}
          <div className="mb-5 flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-[#0066cc] text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
              <p className="text-gray-500 text-sm">아직 질문이 없습니다. 첫 질문을 올려보세요!</p>
              <button
                onClick={() => router.push('/knowledge/ask')}
                className="mt-4 text-[#0066cc] text-sm font-medium hover:underline"
              >
                질문하기 +1,000P
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map(q => {
                const cnt = answerCount(q)
                return (
                  <button
                    key={q.id}
                    onClick={() => router.push(`/knowledge/${q.id}`)}
                    className="group w-full text-left rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:border-gray-200 hover:shadow-md transition-all"
                  >
                    {/* 카테고리 + 배지 */}
                    <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLE[q.category] ?? 'bg-gray-50 text-gray-600'}`}>
                        {q.category}
                      </span>
                      {q.is_adopted && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#0066cc]">
                          <CheckCircle2 className="h-3 w-3" />채택됨
                        </span>
                      )}
                      {q.reward_points > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          <Coins className="h-3 w-3" />{q.reward_points.toLocaleString()}P
                        </span>
                      )}
                    </div>

                    {/* 제목 */}
                    <h3 className="text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-[#0066cc] transition-colors">
                      {q.title}
                    </h3>

                    {/* 미리보기 */}
                    <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed line-clamp-2">
                      {q.body}
                    </p>

                    {/* 푸터 */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[12px] text-[#0066cc]">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {cnt === 0
                          ? '첫 번째로 답변해보세요'
                          : `${cnt}명이 답변했어요`}
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-gray-400">
                        <span>{relativeTime(q.created_at)}</span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3.5 w-3.5" />0
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 사이드바 */}
        <div className="space-y-5">
          {/* 인기 답변자 */}
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-semibold text-gray-900">이번 주 인기 답변자</h2>
            </div>
            <div className="divide-y divide-gray-50 px-5">
              {[
                { name: '마케터 김**', answers: 34, pts: 45000 },
                { name: '마케터 이**', answers: 28, pts: 38000 },
                { name: '마케터 박**', answers: 21, pts: 29000 },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-4">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : 'bg-orange-300 text-white'}`}>
                    {i === 0 ? <Crown className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-500">답변 {a.answers}개</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#0066cc]">{a.pts.toLocaleString()}P</span>
                </div>
              ))}
            </div>
          </div>

          {/* 질문하기 CTA */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0066cc]">
              <Coins className="h-5 w-5 text-white" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-gray-900">마케팅 지식으로 수익 내기</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">답변하고 채택되면 리워드 전액 지급.</p>
            <button
              onClick={() => router.push('/knowledge/ask')}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0058b0] transition-colors"
            >
              <Plus className="h-4 w-4" />질문하기 +1,000P
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
