'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MessageCircle, ThumbsUp, Coins, Trophy, Crown, CheckCircle2, Heart, X } from 'lucide-react'

const QA_CATEGORIES = ['전체', '네이버SEO', '광고', 'SNS', '체험단', '블로그', '플레이스'] as const
type QACategory = (typeof QA_CATEGORIES)[number]

const QA_CATEGORY_STYLE: Record<string, string> = {
  네이버SEO: 'bg-green-50 text-green-700',
  광고: 'bg-orange-50 text-orange-700',
  SNS: 'bg-purple-50 text-purple-700',
  체험단: 'bg-cyan-50 text-cyan-700',
  블로그: 'bg-blue-50 text-blue-700',
  플레이스: 'bg-rose-50 text-rose-700',
}

const COMMUNITY_CATEGORIES = [
  { key: '전체', value: '' },
  { key: '일상', value: 'general' },
  { key: '사업', value: 'business' },
  { key: '성공사례', value: 'success' },
  { key: '질문', value: 'question' },
] as const

const COMMUNITY_CATEGORY_BADGE: Record<string, string> = {
  general: 'bg-gray-50 text-gray-600',
  business: 'bg-blue-50 text-blue-700',
  success: 'bg-green-50 text-green-700',
  question: 'bg-orange-50 text-orange-700',
}

const COMMUNITY_CATEGORY_LABEL: Record<string, string> = {
  general: '일상',
  business: '사업',
  success: '성공사례',
  question: '질문',
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

interface CommunityPost {
  id: string
  title: string | null
  body: string
  category: string
  likes: number
  author_name: string
  comment_count: number
  created_at: string
}

interface WriteForm {
  category: string
  title: string
  body: string
}

function relativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return '방금 전'
  if (diff < 60) return `${diff}분 전`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}시간 전`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

export default function KnowledgePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'qa' | 'community'>('qa')

  // Q&A state
  const [activeCategory, setActiveCategory] = useState<QACategory>('전체')
  const [questions, setQuestions] = useState<Question[]>([])
  const [qaLoading, setQaLoading] = useState(true)

  // Community state
  const [communityCategory, setCommunityCategory] = useState<string>('')
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [communityLoading, setCommunityLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState<WriteForm>({ category: 'general', title: '', body: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function fetchQuestions() {
    setQaLoading(true)
    const cat = activeCategory !== '전체' ? `&category=${encodeURIComponent(activeCategory)}` : ''
    const res = await fetch(`/api/knowledge/questions?${cat}`).catch(() => null)
    const data = res ? await res.json() : []
    setQuestions(Array.isArray(data) ? data : [])
    setQaLoading(false)
  }

  async function fetchPosts() {
    setCommunityLoading(true)
    const qs = communityCategory ? `?category=${communityCategory}` : ''
    const res = await fetch(`/api/community/posts${qs}`).catch(() => null)
    const data = res ? await res.json() : []
    setPosts(Array.isArray(data) ? data : [])
    setCommunityLoading(false)
  }

  useEffect(() => { fetchQuestions() }, [activeCategory])
  useEffect(() => {
    if (activeTab === 'community') fetchPosts()
  }, [activeTab, communityCategory])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  function openModal() {
    setForm({ category: 'general', title: '', body: '' })
    setFormError(null)
    setShowModal(true)
  }

  async function submitPost() {
    if (!form.body.trim()) {
      setFormError('내용을 입력해주세요.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    const res = await fetch('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).catch(() => null)
    setSubmitting(false)

    if (!res) {
      setFormError('네트워크 오류로 등록에 실패했습니다.')
      return
    }
    const result = await res.json()
    if (!res.ok) {
      setFormError(result.error ?? '등록에 실패했습니다.')
      return
    }
    setShowModal(false)
    showToast(result.capped ? '오늘 적립 한도 도달' : `+${(result.points_awarded ?? 0).toLocaleString()}P 적립!`)
    fetchPosts()
  }

  const answerCount = (q: Question) => q.knowledge_answers?.[0]?.count ?? 0

  return (
    <div className="mx-auto max-w-7xl">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-[11px] bg-[#0066cc] px-5 py-3 text-[14px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">지식 거래소</h1>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'qa'
              ? '마케팅 고민을 사장님들과 나누고 리워드를 받으세요'
              : '장사와 사업 이야기를 나누는 공간'}
          </p>
        </div>
        {activeTab === 'qa' ? (
          <button
            onClick={() => router.push('/knowledge/ask')}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#0058b0] transition-colors"
          >
            <Plus className="h-4 w-4" />
            질문하기 +1,000P
          </button>
        ) : (
          <button
            onClick={openModal}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#0058b0] transition-colors"
          >
            <Plus className="h-4 w-4" />
            글쓰기
          </button>
        )}
      </div>

      {/* 최상위 탭 */}
      <div className="mb-6 flex gap-1 border-b border-gray-100">
        <button
          onClick={() => setActiveTab('qa')}
          className={`px-5 py-3 text-sm font-semibold transition-colors ${activeTab === 'qa' ? 'text-[#0066cc] border-b-2 border-[#0066cc]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          지식 Q&A
        </button>
        <button
          onClick={() => setActiveTab('community')}
          className={`px-5 py-3 text-sm font-semibold transition-colors ${activeTab === 'community' ? 'text-[#0066cc] border-b-2 border-[#0066cc]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          사장님 모임
        </button>
      </div>

      {activeTab === 'qa' ? (
        <QATab
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          questions={questions}
          loading={qaLoading}
          router={router}
          answerCount={answerCount}
        />
      ) : (
        <CommunityTab
          communityCategory={communityCategory}
          setCommunityCategory={setCommunityCategory}
          posts={posts}
          loading={communityLoading}
          openModal={openModal}
        />
      )}

      {showModal && (
        <WriteModal
          form={form}
          setForm={setForm}
          error={formError}
          submitting={submitting}
          onClose={() => setShowModal(false)}
          onSubmit={submitPost}
        />
      )}
    </div>
  )
}

function QATab({
  activeCategory,
  setActiveCategory,
  questions,
  loading,
  router,
  answerCount,
}: {
  activeCategory: QACategory
  setActiveCategory: (c: QACategory) => void
  questions: Question[]
  loading: boolean
  router: ReturnType<typeof useRouter>
  answerCount: (q: Question) => number
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* 질문 피드 */}
      <div className="lg:col-span-2">
        {/* 포인트 안내 배너 */}
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-3 flex items-center gap-3">
          <Coins className="h-5 w-5 text-[#0066cc] shrink-0" />
          <p className="text-[13px] text-[#0066cc]">
            질문 작성 <strong>+1,000P</strong> · 답변 작성 <strong>+1,000P</strong> (하루 각 1회 적립)
          </p>
        </div>

        {/* 카테고리 탭 */}
        <div className="mb-5 flex flex-wrap gap-2">
          {QA_CATEGORIES.map(cat => (
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
                  <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${QA_CATEGORY_STYLE[q.category] ?? 'bg-gray-50 text-gray-600'}`}>
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
                  <h3 className="text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-[#0066cc] transition-colors">
                    {q.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed line-clamp-2">
                    {q.body}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[12px] text-[#0066cc]">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {cnt === 0 ? '첫 번째로 답변해보세요' : `${cnt}명이 답변했어요`}
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
  )
}

function CommunityTab({
  communityCategory,
  setCommunityCategory,
  posts,
  loading,
  openModal,
}: {
  communityCategory: string
  setCommunityCategory: (c: string) => void
  posts: CommunityPost[]
  loading: boolean
  openModal: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex gap-1 border-b border-gray-100">
        {COMMUNITY_CATEGORIES.map(tab => (
          <button
            key={tab.key}
            onClick={() => setCommunityCategory(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              communityCategory === tab.value
                ? 'text-[#0066cc] border-b-2 border-[#0066cc]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.key}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">아직 글이 없습니다. 첫 이야기를 남겨보세요.</p>
          <button onClick={openModal} className="mt-4 text-sm font-medium text-[#0066cc] hover:underline">
            글쓰기 +500P
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </div>
  )
}

function PostCard({ post }: { post: CommunityPost }) {
  return (
    <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:border-gray-200 hover:bg-gray-50/50 transition-colors">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0066cc] text-xs font-bold text-white">
          {post.author_name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{post.author_name}</p>
          <p className="text-xs text-gray-400">{relativeTime(post.created_at)}</p>
        </div>
        <span className={`ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${COMMUNITY_CATEGORY_BADGE[post.category] ?? 'bg-gray-50 text-gray-600'}`}>
          {COMMUNITY_CATEGORY_LABEL[post.category] ?? post.category}
        </span>
      </div>
      {post.title && <h2 className="mb-1 text-[15px] font-semibold leading-snug text-gray-900">{post.title}</h2>}
      <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap line-clamp-4">{post.body}</p>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {post.likes}</span>
        <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {post.comment_count}</span>
      </div>
    </article>
  )
}

function WriteModal(props: {
  form: WriteForm
  setForm: (form: WriteForm) => void
  error: string | null
  submitting: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  const { form, setForm, error, submitting, onClose, onSubmit } = props
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl bg-white" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900">글쓰기</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {Object.entries(COMMUNITY_CATEGORY_LABEL).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setForm({ ...form, category: value })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  form.category === value
                    ? 'bg-[#0066cc] text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={form.title}
            onChange={event => setForm({ ...form, title: event.target.value })}
            placeholder="제목 (선택)"
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0066cc] focus:outline-none"
          />
          <textarea
            value={form.body}
            onChange={event => setForm({ ...form, body: event.target.value })}
            placeholder="장사 이야기, 고민, 노하우를 자유롭게 나눠보세요."
            rows={6}
            className="w-full resize-none rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0066cc] focus:outline-none"
          />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 p-5">
          <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            취소
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting || !form.body.trim()}
            className="rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0058b0] transition-colors disabled:opacity-50"
          >
            {submitting ? '등록 중...' : '등록 (+500P)'}
          </button>
        </div>
      </div>
    </div>
  )
}
