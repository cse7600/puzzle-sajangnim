'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ThumbsUp, MessageCircle, Share2, ChevronLeft, CheckCircle2, Coins } from 'lucide-react'
import AppTopBar from '@/components/AppTopBar'

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

interface Answer {
  id: string
  body: string
  is_adopted: boolean
  created_at: string
  points_earned?: number
}

function relativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return '방금 전'
  if (diff < 60) return `${diff}분 전`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

export default function KnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [question, setQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [answerBody, setAnswerBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/knowledge/questions/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/knowledge/questions/${id}/answers`).then(r => r.ok ? r.json() : []),
    ]).then(([q, a]) => {
      setQuestion(q)
      setAnswers(Array.isArray(a) ? a : [])
      setLoading(false)
    })
  }, [id])

  async function submitAnswer() {
    if (!answerBody.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/knowledge/questions/${id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: answerBody }),
      })
      const data = await res.json()
      setAnswers(prev => [...prev, data])
      setAnswerBody('')
      if (data.points_earned) {
        setToast(`+${data.points_earned.toLocaleString()}P 적립!`)
        setTimeout(() => setToast(null), 3000)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <>
      <AppTopBar title="지식 거래소" />
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-4">
        {[180, 120, 100].map(h => (
          <div key={h} className="rounded-xl bg-gray-100 animate-pulse" style={{ height: h }} />
        ))}
      </div>
    </>
  )

  if (!question) return (
    <>
      <AppTopBar title="지식 거래소" />
      <div className="mx-auto max-w-3xl px-6 py-20 text-center text-gray-500">질문을 찾을 수 없습니다.</div>
    </>
  )

  const answerCount = question.knowledge_answers?.[0]?.count ?? answers.length

  return (
    <>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-[11px] bg-[#0066cc] px-5 py-3 text-[14px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
      <AppTopBar title="지식 거래소" />
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* 뒤로가기 */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            목록으로
          </button>

          {/* 질문 카드 */}
          <div className="rounded-xl border border-gray-200 bg-white p-7 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-medium ${CATEGORY_STYLE[question.category] ?? 'bg-gray-50 text-gray-600'}`}>
                {question.category}
              </span>
              {question.is_adopted && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-[#0066cc]">
                  <CheckCircle2 className="h-3.5 w-3.5" />채택 완료
                </span>
              )}
              {question.reward_points > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-700">
                  <Coins className="h-3.5 w-3.5" />{question.reward_points.toLocaleString()}P 리워드
                </span>
              )}
            </div>

            <h1 className="text-[22px] font-bold text-gray-900 leading-snug mb-5">
              {question.title}
            </h1>

            <p className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap">
              {question.body}
            </p>

            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-[12px] text-gray-400">{relativeTime(question.created_at)}</span>
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-[#0066cc] transition-colors">
                  <ThumbsUp className="h-4 w-4" />
                  <span>도움돼요</span>
                </button>
                <button className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-[#0066cc] transition-colors">
                  <Share2 className="h-4 w-4" />
                  <span>공유</span>
                </button>
              </div>
            </div>
          </div>

          {/* 답변 헤더 */}
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-4 w-4 text-gray-500" />
            <span className="text-[14px] font-semibold text-gray-900">
              답변 {answerCount}개
            </span>
          </div>

          {/* 답변 목록 */}
          <div className="space-y-4 mb-8">
            {answers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
                <p className="text-[14px] text-gray-500">첫 번째 답변을 달아보세요</p>
                <p className="mt-1 text-[13px] text-[#0066cc]">답변 등록 시 +1,000P 적립</p>
              </div>
            ) : (
              answers.map((a, i) => (
                <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0066cc]/10 text-[12px] font-semibold text-[#0066cc]">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-900">사장님 {i + 1}</p>
                      <p className="text-[11px] text-gray-400">{relativeTime(a.created_at)}</p>
                    </div>
                    {a.is_adopted && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#0066cc] px-2.5 py-0.5 text-[11px] font-medium text-white">
                        <CheckCircle2 className="h-3 w-3" />채택
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {a.body}
                  </p>
                  <div className="mt-4 flex items-center gap-3 border-t border-gray-50 pt-3">
                    <button className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
                      <ThumbsUp className="h-3.5 w-3.5" />평가
                    </button>
                    <button className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
                      <MessageCircle className="h-3.5 w-3.5" />댓글
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 답변 작성 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-[14px] font-semibold text-gray-900 mb-3">
              답변 작성
              <span className="ml-2 text-[13px] font-normal text-[#0066cc]">+1,000P</span>
            </h3>
            <textarea
              rows={5}
              value={answerBody}
              onChange={e => setAnswerBody(e.target.value)}
              placeholder="마케팅 노하우를 공유해보세요. 구체적인 경험일수록 더 많은 도움이 됩니다."
              className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-[14px] leading-relaxed text-gray-900 outline-none focus:border-[#0066cc] transition-colors"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={submitAnswer}
                disabled={submitting || !answerBody.trim()}
                className="rounded-lg bg-[#0066cc] px-6 py-2.5 text-[14px] font-medium text-white hover:bg-[#0058b0] disabled:opacity-40 transition-colors"
              >
                {submitting ? '등록 중...' : '답변 등록'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
