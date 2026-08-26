import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { supabaseAdminCached } from '@/lib/supabase-admin'
import { relativeTime } from '@/lib/relative-time'

export const metadata: Metadata = {
  title: '오호라! - 사장님들의 사업 Q&A | 퍼즐 사장님',
  description: '사업 고민을 사장님들과 나누고 실전 노하우를 얻으세요. 네이버SEO, 광고, SNS, 체험단, 블로그, 플레이스 분야 Q&A.',
  openGraph: {
    title: '오호라! - 사장님들의 사업 Q&A',
    description: '사업 고민을 사장님들과 나누고 실전 노하우를 얻으세요.',
    type: 'website',
  },
}

const CATEGORY_STYLE: Record<string, string> = {
  네이버SEO: 'bg-green-50 text-green-700',
  광고: 'bg-orange-50 text-orange-700',
  SNS: 'bg-purple-50 text-purple-700',
  체험단: 'bg-cyan-50 text-cyan-700',
  블로그: 'bg-blue-50 text-blue-700',
  플레이스: 'bg-rose-50 text-rose-700',
}

interface QuestionRow {
  id: string
  category: string
  title: string
  body: string
  created_at: string
  knowledge_answers: { count: number }[]
}

export default async function OhoraPublicPage() {
  const { data: questions } = await (supabaseAdminCached as any)
    .from('knowledge_questions')
    .select('id, category, title, body, created_at, knowledge_answers(count)')
    .order('created_at', { ascending: false })
    .limit(20)

  const rows: QuestionRow[] = questions ?? []

  return (
    <>
      <Navigation />
      <main className="bg-canvas-white min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-[30px] font-black tracking-tight text-ink">오호라!</h1>
          <p className="mt-2 text-body text-muted">사장님들의 사업 고민과 노하우가 모이는 곳</p>

          <div className="mt-8 space-y-4">
            {rows.length === 0 ? (
              <p className="py-12 text-center text-muted">아직 질문이 없습니다.</p>
            ) : (
              rows.map(q => {
                const cnt = q.knowledge_answers?.[0]?.count ?? 0
                return (
                  <Link
                    key={q.id}
                    href={`/ohora/${q.id}`}
                    className="block rounded-xl border border-ink/10 bg-canvas-white p-5 transition hover:border-ink/20 hover:shadow-sm"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLE[q.category] ?? 'bg-gray-50 text-gray-600'}`}>
                        {q.category}
                      </span>
                      <span className="text-[12px] text-muted">{relativeTime(q.created_at)}</span>
                    </div>
                    <h2 className="text-[15px] font-semibold leading-snug text-ink">{q.title}</h2>
                    <p className="mt-1.5 text-[13px] text-muted leading-relaxed line-clamp-2">{q.body}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {cnt === 0 ? '답변 대기 중' : `답변 ${cnt}개`}
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          <div className="mt-10 text-center">
            <a
              href="/signup"
              className="btn-pill btn-primary inline-flex"
            >
              무료 가입하고 질문하기
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
