import { MessageCircle, ArrowRight } from 'lucide-react'
import { supabaseAdminCached } from '@/lib/supabase-admin'
import { relativeTime } from '@/lib/relative-time'

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

export default async function OhoraPreviewSection() {
  const db = supabaseAdminCached as any
  const { data } = await db
    .from('knowledge_questions')
    .select('id, category, title, body, created_at, knowledge_answers(count)')
    .order('created_at', { ascending: false })
    .limit(5)

  const questions: QuestionRow[] = data ?? []

  if (questions.length === 0) return null

  return (
    <section className="bg-canvas-white">
      <div className="mx-auto max-w-wide px-6 py-section">
        <div className="mb-10 text-center">
          <h2 className="text-[30px] font-black tracking-tight text-ink md:text-section">
            오호라! 사장님 Q&A
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body text-muted">
            사업 고민, 혼자 끙끙대지 마세요. 경험 많은 사장님들이 답해드립니다.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-3">
          {questions.map(q => {
            const cnt = q.knowledge_answers?.[0]?.count ?? 0
            return (
              <a
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
                <h3 className="text-[15px] font-semibold leading-snug text-ink">{q.title}</h3>
                <p className="mt-1 text-[13px] text-muted line-clamp-1">{q.body}</p>
                <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-muted">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {cnt === 0 ? '답변 대기 중' : `답변 ${cnt}개`}
                </div>
              </a>
            )
          })}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/ohora"
            className="inline-flex items-center gap-1 text-body font-semibold text-primary-dark hover:underline"
          >
            더 많은 Q&A 보기 <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  )
}
