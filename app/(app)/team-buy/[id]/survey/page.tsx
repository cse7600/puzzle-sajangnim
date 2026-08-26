'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, ImagePlus } from 'lucide-react'

interface SurveyQuestion {
  id: string
  position: number
  question_type: 'text' | 'link' | 'image'
  label: string
  required: boolean
}

interface SurveyData {
  deal: { id: string; title: string }
  member_id: string
  member_status: string
  questions: SurveyQuestion[]
  responses: Record<string, string>
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function ProgressBar({ answered, total }: { answered: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100)
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-[9999px] bg-[#f5f5f7]">
      <div className="h-full rounded-[9999px] bg-[#0066cc] transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}

interface ImageAnswerProps {
  dealId: string
  value: string
  readOnly: boolean
  onChange: (value: string) => void
  onNotice: (message: string | null) => void
}

function ImageAnswerInput({ dealId, value, readOnly, onChange, onNotice }: ImageAnswerProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file || uploading) return
    setUploading(true)
    onNotice(null)
    try {
      const formData = new FormData()
      formData.append('deal_id', dealId)
      formData.append('image', file)
      const res = await fetch('/api/team-deals/survey-upload', { method: 'POST', body: formData })
      const body = await res.json()
      if (!res.ok) {
        onNotice(body.error ?? '이미지 업로드에 실패했습니다. 다시 시도해주세요')
      } else {
        onChange(body.image_url)
      }
    } catch {
      onNotice('이미지 업로드 중 네트워크 오류가 발생했습니다')
    }
    setUploading(false)
  }

  return (
    <div>
      {value && (
        <div className="mb-3 overflow-hidden rounded-[14px] border border-[#e0e0e0] bg-[#f5f5f7]">
          <img src={value} alt="업로드한 이미지" className="max-h-72 w-full object-contain" />
        </div>
      )}
      {!readOnly && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-[9999px] border border-[#e0e0e0] bg-white px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-40 transition-colors"
          >
            <ImagePlus className="h-4 w-4" />
            {uploading ? '업로드 중...' : value ? '다른 이미지로 교체' : '이미지 선택 (JPG/PNG/WEBP, 5MB 이하)'}
          </button>
        </>
      )}
    </div>
  )
}

interface QuestionScreenProps {
  question: SurveyQuestion
  index: number
  total: number
  dealId: string
  value: string
  readOnly: boolean
  onChange: (value: string) => void
  onNotice: (message: string | null) => void
}

function QuestionScreen({ question, index, total, dealId, value, readOnly, onChange, onNotice }: QuestionScreenProps) {
  const textRef = useRef<HTMLTextAreaElement>(null)
  const linkRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (readOnly) return
    if (question.question_type === 'text') textRef.current?.focus()
    if (question.question_type === 'link') linkRef.current?.focus()
  }, [question.id, question.question_type, readOnly])

  return (
    <div>
      <p className="mb-2 text-[12px] font-medium text-[#6e6e73]">
        질문 {index + 1} / {total}
        {question.required && <span className="ml-2 rounded-[9999px] bg-[#0066cc]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0066cc]">필수</span>}
      </p>
      <h2 className="mb-6 text-[21px] font-semibold leading-snug text-[#1d1d1f]">{question.label}</h2>

      {question.question_type === 'text' && (
        <textarea
          ref={textRef}
          value={value}
          disabled={readOnly}
          onChange={e => onChange(e.target.value)}
          rows={5}
          placeholder="자유롭게 입력해주세요"
          className="w-full rounded-[14px] border border-[#e0e0e0] bg-white p-4 text-[14px] text-[#1d1d1f] placeholder:text-[#6e6e73]/60 focus:border-[#0066cc] focus:outline-none disabled:bg-[#f5f5f7] transition-colors"
        />
      )}

      {question.question_type === 'link' && (
        <input
          ref={linkRef}
          type="url"
          value={value}
          disabled={readOnly}
          onChange={e => onChange(e.target.value)}
          placeholder="https://example.com"
          className="w-full rounded-[9999px] border border-[#e0e0e0] bg-white px-5 py-3 text-[14px] text-[#1d1d1f] placeholder:text-[#6e6e73]/60 focus:border-[#0066cc] focus:outline-none disabled:bg-[#f5f5f7] transition-colors"
        />
      )}

      {question.question_type === 'image' && (
        <ImageAnswerInput dealId={dealId} value={value} readOnly={readOnly} onChange={onChange} onNotice={onNotice} />
      )}
    </div>
  )
}

function CompleteScreen({ total, onBack }: { total: number; onBack: () => void }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[9999px] bg-green-50">
        <Check className="h-7 w-7 text-green-600" />
      </div>
      <p className="mb-1 text-[18px] font-semibold text-[#1d1d1f]">설문을 제출했습니다</p>
      <p className="mb-6 text-[13px] text-[#6e6e73]">
        {total}개 질문에 대한 답변이 저장됐습니다. 진행 시작 전까지 언제든 다시 수정할 수 있어요.
      </p>
      <button
        onClick={onBack}
        className="rounded-[9999px] bg-[#0066cc] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0058b3] transition-colors"
      >
        팀 구매로 돌아가기
      </button>
    </div>
  )
}

export default function TeamBuySurveyPage() {
  const params = useParams()
  const router = useRouter()
  const dealId = params.id as string

  const [data, setData] = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({})
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const loadSurvey = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/team-deals/${dealId}/survey`)
      const body = await res.json()
      if (!res.ok) {
        setLoadError(body.error ?? '설문 정보를 불러오지 못했습니다')
      } else {
        setData(body)
        setAnswers({ ...body.responses })
        setSavedAnswers({ ...body.responses })
      }
    } catch {
      setLoadError('네트워크 연결을 확인해주세요')
    }
    setLoading(false)
  }, [dealId])

  useEffect(() => { loadSurvey() }, [loadSurvey])

  const questions = data?.questions ?? []
  const readOnly = data !== null && data.member_status !== 'joined'
  const answeredCount = questions.filter(q => (answers[q.id] ?? '').trim().length > 0).length

  function validateCurrent(question: SurveyQuestion): string | null {
    const value = (answers[question.id] ?? '').trim()
    if (value.length > 0 && question.question_type === 'link' && !isValidHttpUrl(value)) {
      return '링크는 http:// 또는 https://로 시작하는 주소여야 합니다'
    }
    return null
  }

  async function saveAnswers(targets: SurveyQuestion[]): Promise<boolean> {
    const dirty = targets
      .map(q => ({ question_id: q.id, value: (answers[q.id] ?? '').trim() }))
      .filter(a => a.value.length > 0 && a.value !== (savedAnswers[a.question_id] ?? '').trim())
    if (dirty.length === 0) return true
    setSaving(true)
    try {
      const res = await fetch(`/api/team-deals/${dealId}/survey`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: dirty }),
      })
      const body = await res.json()
      if (!res.ok) {
        setNotice(body.error ?? '답변 저장에 실패했습니다. 잠시 후 다시 시도해주세요')
        return false
      }
      setSavedAnswers(prev => {
        const next = { ...prev }
        for (const a of dirty) next[a.question_id] = a.value
        return next
      })
      return true
    } catch {
      setNotice('답변 저장 중 네트워크 오류가 발생했습니다')
      return false
    } finally {
      setSaving(false)
    }
  }

  function goTo(next: number) {
    setVisible(false)
    window.setTimeout(() => {
      setIdx(next)
      setNotice(null)
      setVisible(true)
    }, 150)
  }

  async function handleNext() {
    const question = questions[idx]
    const validationError = validateCurrent(question)
    if (validationError) {
      setNotice(validationError)
      return
    }
    if (!readOnly && !(await saveAnswers([question]))) return
    goTo(idx + 1)
  }

  function handlePrev() {
    if (idx === 0) return
    goTo(idx - 1)
  }

  async function handleSubmit() {
    const question = questions[idx]
    const validationError = validateCurrent(question)
    if (validationError) {
      setNotice(validationError)
      return
    }
    const missingIdx = questions.findIndex(q => q.required && (answers[q.id] ?? '').trim().length === 0)
    if (missingIdx >= 0) {
      goTo(missingIdx)
      window.setTimeout(() => setNotice('필수 질문입니다. 답변을 입력해주세요'), 200)
      return
    }
    if (await saveAnswers(questions)) setSubmitted(true)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-6 w-40 rounded-[9999px] bg-white border border-[#e0e0e0] animate-pulse mb-4" />
        <div className="h-1.5 rounded-[9999px] bg-white border border-[#e0e0e0] animate-pulse mb-6" />
        <div className="h-72 rounded-[18px] bg-white border border-[#e0e0e0] animate-pulse" />
      </div>
    )
  }

  if (loadError || !data) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-[15px] text-[#1d1d1f] mb-1">{loadError ?? '설문 정보를 불러오지 못했습니다'}</p>
        <p className="text-[13px] text-[#6e6e73] mb-4">잠시 후 다시 시도하거나 팀 구매 목록으로 돌아가세요</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={loadSurvey} className="rounded-[9999px] bg-[#0066cc] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#0058b3] transition-colors">
            다시 시도
          </button>
          <button onClick={() => router.push('/team-buy')} className="text-[13px] text-[#0066cc] hover:underline">
            팀 구매 목록으로
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.push('/team-buy')}
        className="flex items-center gap-1.5 text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        팀 구매
      </button>

      <div className="mb-4">
        <p className="text-[13px] text-[#6e6e73] mb-2 line-clamp-1">{data.deal.title}</p>
        <ProgressBar answered={answeredCount} total={questions.length} />
      </div>

      <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-6 sm:p-8">
        {questions.length === 0 ? (
          <div className="py-12 text-center text-[#6e6e73]">
            <p className="text-[15px] mb-1">아직 작성할 설문이 없습니다</p>
            <p className="text-[13px]">진행에 필요한 정보가 생기면 이곳에서 요청드릴게요</p>
          </div>
        ) : submitted ? (
          <CompleteScreen total={questions.length} onBack={() => router.push('/team-buy')} />
        ) : (
          <>
            {readOnly && (
              <div className="mb-5 rounded-[11px] bg-[#f5f5f7] px-4 py-2.5 text-[12px] font-medium text-[#6e6e73]">
                환불되었거나 취소된 신청 건이라 열람만 가능합니다
              </div>
            )}

            <div className={`transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              <QuestionScreen
                question={questions[idx]}
                index={idx}
                total={questions.length}
                dealId={dealId}
                value={answers[questions[idx].id] ?? ''}
                readOnly={readOnly}
                onChange={value => setAnswers(prev => ({ ...prev, [questions[idx].id]: value }))}
                onNotice={setNotice}
              />
            </div>

            {notice && (
              <p className="mt-4 rounded-[11px] bg-red-50 px-4 py-2.5 text-[12px] font-medium text-red-600">{notice}</p>
            )}

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={idx === 0 || saving}
                className="rounded-[9999px] border border-[#e0e0e0] px-5 py-2.5 text-[13px] font-medium text-[#6e6e73] hover:bg-[#f5f5f7] disabled:opacity-30 transition-colors"
              >
                이전
              </button>
              {idx < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={saving}
                  className="rounded-[9999px] bg-[#0066cc] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0058b3] disabled:opacity-40 transition-colors"
                >
                  {saving ? '저장 중...' : '다음'}
                </button>
              ) : (
                !readOnly && (
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="rounded-[9999px] bg-[#0066cc] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0058b3] disabled:opacity-40 transition-colors"
                  >
                    {saving ? '저장 중...' : '제출하기'}
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
