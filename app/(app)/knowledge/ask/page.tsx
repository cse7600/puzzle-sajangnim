'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import AppTopBar from '@/components/AppTopBar'

const CATEGORIES = ['네이버SEO', '광고', 'SNS', '체험단', '블로그', '플레이스'] as const

const TITLE_MIN = 16
const TITLE_MAX = 80
const BODY_MIN = 55
const BODY_MAX = 10000

export default function KnowledgeAskPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; body?: string; category?: string }>({})

  function validate() {
    const e: typeof errors = {}
    if (title.length < TITLE_MIN) e.title = `제목은 최소 ${TITLE_MIN}자 이상 입력해주세요`
    if (body.length < BODY_MIN) e.body = `내용은 최소 ${BODY_MIN}자 이상 입력해주세요`
    if (!category) e.category = '카테고리를 선택해주세요'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/knowledge/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, title, body }),
      })
      const data = await res.json()
      if (data.id) router.push(`/knowledge/${data.id}`)
      else router.push('/knowledge')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <AppTopBar title="질문하기" />
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-8">
            <h1 className="text-[28px] font-bold text-gray-900">무엇이든 물어보세요</h1>
            <p className="mt-1 text-[15px] text-gray-500">답변은 언제나 무료예요.</p>
          </div>

          <div className="flex gap-8 items-start">
            {/* 좌측 입력 영역 */}
            <div className="flex-1 space-y-6">
              {/* 제목 */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[14px] font-semibold text-gray-900">제목</label>
                  <span className={`text-[12px] ${title.length < TITLE_MIN ? 'text-gray-400' : 'text-[#0066cc]'}`}>
                    {title.length} / {TITLE_MAX}자 (최소 {TITLE_MIN}자)
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={TITLE_MAX}
                  placeholder="제목을 작성해 주세요."
                  value={title}
                  onChange={e => { setTitle(e.target.value); setErrors(v => ({ ...v, title: undefined })) }}
                  className={`w-full rounded-lg border px-4 py-3 text-[15px] outline-none transition-colors ${errors.title ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-[#0066cc]'}`}
                />
                {errors.title && (
                  <p className="mt-1.5 flex items-center gap-1 text-[12px] text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" />{errors.title}
                  </p>
                )}
              </div>

              {/* 내용 */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[14px] font-semibold text-gray-900">내용</label>
                  <span className={`text-[12px] ${body.length < BODY_MIN ? 'text-gray-400' : 'text-[#0066cc]'}`}>
                    {body.length} / {BODY_MAX.toLocaleString()}자 (최소 {BODY_MIN}자)
                  </span>
                </div>
                {/* 툴바 */}
                <div className="mb-2 flex gap-1 border-b border-gray-100 pb-2">
                  {[
                    { label: '이미지', icon: '🖼' },
                    { label: '목록', icon: '☰' },
                    { label: '굵게', icon: 'B' },
                    { label: '링크', icon: '🔗' },
                  ].map(t => (
                    <button key={t.label} type="button" title={t.label}
                      className="flex h-7 w-7 items-center justify-center rounded text-[13px] text-gray-500 hover:bg-gray-100">
                      {t.icon}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={12}
                  maxLength={BODY_MAX}
                  placeholder="질문의 내용을 구체적으로 적어주세요. 전문가 및 답변자들에게 더 좋은 답변을 받을 수 있어요."
                  value={body}
                  onChange={e => { setBody(e.target.value); setErrors(v => ({ ...v, body: undefined })) }}
                  className={`w-full resize-none rounded-lg border px-4 py-3 text-[15px] leading-relaxed outline-none transition-colors ${errors.body ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-[#0066cc]'}`}
                />
                {errors.body && (
                  <p className="mt-1.5 flex items-center gap-1 text-[12px] text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" />{errors.body}
                  </p>
                )}
              </div>

              {/* 카테고리 */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <label className="block text-[14px] font-semibold text-gray-900 mb-1">카테고리</label>
                <p className="text-[13px] text-gray-500 mb-4">질문과 가장 관련 있는 카테고리를 선택해주세요.</p>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setCategory(cat); setErrors(v => ({ ...v, category: undefined })) }}
                      className={`rounded-lg border-2 py-2.5 text-[13px] font-medium transition-colors ${
                        category === cat
                          ? 'border-[#0066cc] bg-[#0066cc]/5 text-[#0066cc]'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {errors.category && (
                  <p className="mt-2 flex items-center gap-1 text-[12px] text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" />{errors.category}
                  </p>
                )}
              </div>
            </div>

            {/* 우측 사이드 */}
            <div className="w-[240px] shrink-0 space-y-4 sticky top-6">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-xl bg-[#0066cc] py-4 text-[15px] font-semibold text-white hover:bg-[#0058b0] disabled:opacity-50 transition-colors"
              >
                {submitting ? '등록 중...' : '질문하기'}
              </button>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-gray-500 shrink-0" />
                  <span className="text-[13px] font-semibold text-gray-700">꼭 확인해 주세요.</span>
                </div>
                <ul className="space-y-2">
                  {[
                    '남기신 질문은 타 사이트에서 검색을 통해 노출될 수 있어요.',
                    '답변이 달리면 질문을 수정할 수 없어요.',
                    '질문 등록 시 +1,000P가 적립돼요.',
                  ].map((tip, i) => (
                    <li key={i} className="flex gap-1.5 text-[12px] text-gray-500">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => router.back()}
                className="w-full rounded-xl border border-gray-200 py-3 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
