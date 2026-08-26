import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, MessageCircle } from 'lucide-react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { supabaseAdminCached, supabaseAdmin } from '@/lib/supabase-admin'
import { relativeTime } from '@/lib/relative-time'

const CATEGORY_STYLE: Record<string, string> = {
  네이버SEO: 'bg-green-50 text-green-700',
  광고: 'bg-orange-50 text-orange-700',
  SNS: 'bg-purple-50 text-purple-700',
  체험단: 'bg-cyan-50 text-cyan-700',
  블로그: 'bg-blue-50 text-blue-700',
  플레이스: 'bg-rose-50 text-rose-700',
}

interface PageProps {
  params: Promise<{ id: string }>
}

async function fetchQuestion(id: string) {
  const db = supabaseAdminCached as any
  const { data } = await db
    .from('knowledge_questions')
    .select('id, category, title, body, created_at, is_adopted, knowledge_answers(count)')
    .eq('id', id)
    .maybeSingle()
  return data as {
    id: string
    category: string
    title: string
    body: string
    created_at: string
    is_adopted: boolean
    knowledge_answers: { count: number }[]
  } | null
}

async function fetchAnswers(questionId: string) {
  const db = supabaseAdmin as any
  const { data } = await db
    .from('knowledge_answers')
    .select('id, body, is_adopted, created_at')
    .eq('question_id', questionId)
    .order('created_at', { ascending: true })
  return (data ?? []) as { id: string; body: string; is_adopted: boolean; created_at: string }[]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const question = await fetchQuestion(id)
  if (!question) return { title: '질문을 찾을 수 없습니다 | 오호라!' }

  const description = question.body.slice(0, 160)
  return {
    title: `${question.title} | 오호라! - 퍼즐 사장님`,
    description,
    openGraph: {
      title: question.title,
      description,
      type: 'article',
    },
  }
}

export default async function OhoraDetailPage({ params }: PageProps) {
  const { id } = await params
  const [question, answers] = await Promise.all([fetchQuestion(id), fetchAnswers(id)])

  if (!question) {
    return (
      <>
        <Navigation />
        <main className="bg-canvas-white min-h-screen">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center text-muted">
            질문을 찾을 수 없습니다.
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const answerCount = question.knowledge_answers?.[0]?.count ?? answers.length

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: question.title,
      text: question.body,
      dateCreated: question.created_at,
      answerCount,
      ...(answers.length > 0
        ? {
            acceptedAnswer: question.is_adopted && answers.find(a => a.is_adopted)
              ? { '@type': 'Answer', text: answers.find(a => a.is_adopted)!.body, dateCreated: answers.find(a => a.is_adopted)!.created_at }
              : undefined,
            suggestedAnswer: answers.map(a => ({ '@type': 'Answer', text: a.body, dateCreated: a.created_at })),
          }
        : {}),
    },
  }

  return (
    <>
      <Navigation />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="bg-canvas-white min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <Link
            href="/ohora"
            className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            목록으로
          </Link>

          {/* 질문 */}
          <article className="rounded-xl border border-ink/10 bg-canvas-white p-7 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex rounded-md px-2.5 py-1 text-[12px] font-medium ${CATEGORY_STYLE[question.category] ?? 'bg-gray-50 text-gray-600'}`}>
                {question.category}
              </span>
              <span className="text-[12px] text-muted">{relativeTime(question.created_at)}</span>
            </div>
            <h1 className="text-[22px] font-bold text-ink leading-snug mb-5">{question.title}</h1>
            <p className="text-[15px] text-ink/80 leading-relaxed whitespace-pre-wrap">{question.body}</p>
          </article>

          {/* 답변 */}
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-4 w-4 text-muted" />
            <span className="text-[14px] font-semibold text-ink">답변 {answerCount}개</span>
          </div>

          <div className="space-y-4 mb-8">
            {answers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink/10 bg-canvas-white px-6 py-10 text-center">
                <p className="text-[14px] text-muted">아직 답변이 없습니다</p>
              </div>
            ) : (
              answers.map((a, i) => (
                <div key={a.id} className="rounded-xl border border-ink/10 bg-canvas-white p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0066cc]/10 text-[12px] font-semibold text-[#0066cc]">
                      {i + 1}
                    </div>
                    <p className="text-[11px] text-muted">{relativeTime(a.created_at)}</p>
                    {a.is_adopted && (
                      <span className="ml-auto rounded-full bg-[#0066cc] px-2.5 py-0.5 text-[11px] font-medium text-white">
                        채택
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] text-ink/80 leading-relaxed whitespace-pre-wrap">{a.body}</p>
                </div>
              ))
            )}
          </div>

          {/* CTA */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-6 text-center">
            <p className="text-[14px] font-semibold text-ink">답변을 작성하고 1,000P를 받으세요</p>
            <p className="mt-1 text-[13px] text-muted">로그인하면 질문과 답변을 작성할 수 있습니다</p>
            <div className="mt-4 flex justify-center gap-3">
              <a
                href={`/login?next=/knowledge/${id}`}
                className="rounded-lg bg-[#0066cc] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0058b0] transition-colors"
              >
                로그인
              </a>
              <a
                href={`/signup?next=/knowledge/${id}`}
                className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                회원가입
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
