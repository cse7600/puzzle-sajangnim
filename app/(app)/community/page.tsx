'use client'
import { useState, useEffect } from 'react'
import { Plus, Heart, MessageCircle, X } from 'lucide-react'

const CATEGORIES = [
  { key: '전체', value: '' },
  { key: '일상', value: 'general' },
  { key: '사업', value: 'business' },
  { key: '성공사례', value: 'success' },
  { key: '질문', value: 'question' },
] as const

const CATEGORY_LABEL: Record<string, string> = {
  general: '일상',
  business: '사업',
  success: '성공사례',
  question: '질문',
}

const CATEGORY_BADGE: Record<string, string> = {
  general: 'bg-gray-50 text-gray-600',
  business: 'bg-blue-50 text-blue-700',
  success: 'bg-green-50 text-green-700',
  question: 'bg-orange-50 text-orange-700',
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

export default function CommunityPage() {
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState({ category: 'general', title: '', body: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchPosts() {
    setLoading(true)
    const qs = activeCategory ? `?category=${activeCategory}` : ''
    const res = await fetch(`/api/community/posts${qs}`).catch(() => null)
    const data = res ? await res.json() : []
    setPosts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [activeCategory])

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

  return (
    <div className="mx-auto max-w-3xl">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-[11px] bg-[#0066cc] px-5 py-3 text-[14px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">사장님 모임</h1>
          <p className="mt-1 text-sm text-gray-500">장사와 사업 이야기를 나누는 공간</p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#0058b0] transition-colors"
        >
          <Plus className="h-4 w-4" />
          글쓰기
        </button>
      </div>

      <div className="mb-5 flex gap-1 border-b border-gray-100">
        {CATEGORIES.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeCategory === tab.value
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
        <span className={`ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[post.category] ?? 'bg-gray-50 text-gray-600'}`}>
          {CATEGORY_LABEL[post.category] ?? post.category}
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

interface WriteForm {
  category: string
  title: string
  body: string
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
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
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
