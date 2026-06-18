'use client'
import { useState, useEffect } from 'react'
import { Plus, MessageSquare, Flame, CheckCircle2, Trophy, Crown, Coins, ChevronRight, PenSquare, X } from 'lucide-react'

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

interface Answer {
  id: string
  body: string
  is_adopted: boolean
  created_at: string
  points_earned?: number
}

export default function KnowledgePage() {
  const [activeCategory, setActiveCategory] = useState<Category>('전체')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showAskModal, setShowAskModal] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [answerBody, setAnswerBody] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [askForm, setAskForm] = useState({ category: '네이버SEO', title: '', body: '', reward_points: '0' })
  const [submittingAsk, setSubmittingAsk] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchQuestions() {
    setLoading(true)
    const cat = activeCategory !== '전체' ? `&category=${encodeURIComponent(activeCategory)}` : ''
    const res = await fetch(`/api/knowledge/questions?${cat}`).catch(() => null)
    const data = res ? await res.json() : []
    setQuestions(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchQuestions() }, [activeCategory])

  async function openQuestion(q: Question) {
    setSelectedQuestion(q)
    const res = await fetch(`/api/knowledge/questions/${q.id}/answers`).catch(() => null)
    const data = res ? await res.json() : []
    setAnswers(Array.isArray(data) ? data : [])
  }

  async function submitAnswer() {
    if (!selectedQuestion || !answerBody.trim()) return
    setSubmittingAnswer(true)
    const res = await fetch(`/api/knowledge/questions/${selectedQuestion.id}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: answerBody }),
    })
    const data = await res.json()
    setAnswers(prev => [...prev, data])
    setAnswerBody('')
    setSubmittingAnswer(false)
    if (data.points_earned) showToast(`+${data.points_earned.toLocaleString()}P 적립!`)
  }

  async function submitQuestion() {
    if (!askForm.title.trim() || !askForm.body.trim()) return
    setSubmittingAsk(true)
    const res = await fetch('/api/knowledge/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...askForm, reward_points: Number(askForm.reward_points) }),
    })
    const data = await res.json()
    setShowAskModal(false)
    setAskForm({ category: '네이버SEO', title: '', body: '', reward_points: '0' })
    setSubmittingAsk(false)
    if (data.points_earned) showToast(`+${data.points_earned.toLocaleString()}P 적립!`)
    fetchQuestions()
  }

  const answerCount = (q: Question) => q.knowledge_answers?.[0]?.count ?? 0

  return (
    <div className="mx-auto max-w-7xl">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-[11px] bg-[#0066cc] px-5 py-3 text-[14px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">지식 거래소</h1>
          <p className="mt-1 text-sm text-gray-500">마케팅 고민을 전문가에게 물어보고 리워드를 받으세요</p>
        </div>
        <button
          onClick={() => setShowAskModal(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#0058b0] transition-colors"
        >
          <Plus className="h-4 w-4" />
          질문하기
        </button>
      </div>

      {/* 포인트 안내 */}
      <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-3 flex items-center gap-3">
        <Coins className="h-5 w-5 text-[#0066cc] shrink-0" />
        <p className="text-[13px] text-[#0066cc]">
          질문 작성 <strong>+1,000P</strong> · 답변 작성 <strong>+1,000P</strong> (하루 각 1회 적립)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 질문 피드 */}
        <div className="lg:col-span-2">
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
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
              <p className="text-gray-500 text-sm">아직 질문이 없습니다. 첫 질문을 올려보세요!</p>
              <button onClick={() => setShowAskModal(true)} className="mt-4 text-[#0066cc] text-sm font-medium hover:underline">
                질문하기 +1,000P
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map(q => (
                <button
                  key={q.id}
                  onClick={() => openQuestion(q)}
                  className="group w-full text-left flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:border-gray-200 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLE[q.category] ?? 'bg-gray-50 text-gray-600'}`}>
                        {q.category}
                      </span>
                      {q.is_adopted && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#0066cc]">
                          <CheckCircle2 className="h-3 w-3" /> 채택됨
                        </span>
                      )}
                    </div>
                    <h3 className="text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-[#0066cc]">{q.title}</h3>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {answerCount(q)}개</span>
                      <span>{new Date(q.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                  {q.reward_points > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
                      <Coins className="h-3.5 w-3.5" />{q.reward_points.toLocaleString()}P
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 사이드바 */}
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-semibold text-gray-900">이번 주 인기 답변자</h2>
            </div>
            <div className="divide-y divide-gray-50 px-5">
              {[{ name: '마케터 김**', answers: 34, pts: 45000 }, { name: '마케터 이**', answers: 28, pts: 38000 }, { name: '마케터 박**', answers: 21, pts: 29000 }].map((a, i) => (
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

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0066cc]">
              <Coins className="h-5 w-5 text-white" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-gray-900">마케팅 지식으로 수익 내기</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">답변하고 채택되면 리워드 전액 지급.</p>
            <button onClick={() => setShowAskModal(true)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0058b0] transition-colors">
              <PenSquare className="h-4 w-4" />질문하기 +1,000P
            </button>
          </div>
        </div>
      </div>

      {/* 질문 상세 모달 */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedQuestion(null)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium mb-2 ${CATEGORY_STYLE[selectedQuestion.category] ?? 'bg-gray-50 text-gray-600'}`}>
                  {selectedQuestion.category}
                </span>
                <h2 className="text-lg font-semibold text-gray-900">{selectedQuestion.title}</h2>
              </div>
              <button onClick={() => setSelectedQuestion(null)} className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700 leading-relaxed mb-6">{selectedQuestion.body}</p>

              <h3 className="text-sm font-semibold text-gray-900 mb-4">답변 {answers.length}개</h3>
              <div className="space-y-4 mb-6">
                {answers.map(a => (
                  <div key={a.id} className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{a.body}</p>
                    <p className="mt-2 text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                ))}
                {answers.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">첫 번째 답변을 달아보세요 (+1,000P)</p>
                )}
              </div>

              <div className="space-y-3">
                <textarea
                  value={answerBody}
                  onChange={e => setAnswerBody(e.target.value)}
                  placeholder="마케팅 노하우를 공유해보세요..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0066cc]"
                />
                <button
                  onClick={submitAnswer}
                  disabled={submittingAnswer || !answerBody.trim()}
                  className="w-full rounded-lg bg-[#0066cc] py-2.5 text-sm font-medium text-white hover:bg-[#0058b0] disabled:opacity-40 transition-colors"
                >
                  {submittingAnswer ? '등록 중...' : '답변 등록 (+1,000P)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 질문 작성 모달 */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowAskModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">질문 작성 (+1,000P)</h2>
              <button onClick={() => setShowAskModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">카테고리</label>
                <select value={askForm.category} onChange={e => setAskForm(f => ({ ...f, category: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-[#0066cc]">
                  {CATEGORIES.filter(c => c !== '전체').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">제목</label>
                <input type="text" placeholder="마케팅 고민을 한 줄로 요약해주세요" value={askForm.title} onChange={e => setAskForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0066cc]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">내용</label>
                <textarea rows={4} placeholder="구체적인 상황과 고민을 적어주세요" value={askForm.body} onChange={e => setAskForm(f => ({ ...f, body: e.target.value }))} className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0066cc]" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAskModal(false)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-600">취소</button>
                <button onClick={submitQuestion} disabled={submittingAsk || !askForm.title.trim() || !askForm.body.trim()} className="flex-1 rounded-lg bg-[#0066cc] py-2.5 text-sm font-medium text-white hover:bg-[#0058b0] disabled:opacity-40">
                  {submittingAsk ? '등록 중...' : '질문 등록'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
