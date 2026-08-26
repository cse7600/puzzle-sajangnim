// 팀구매 요청서(설문 문항) 파싱·세트 저장 공용 로직 (서버 전용).
// questions PUT 라우트와 딜 POST/PATCH(문항 인라인 저장)가 공유한다.
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isUuid } from '@/lib/admin-users'

const db = supabaseAdmin as any

const QUESTION_TYPES = new Set(['text', 'link', 'image'])
const MAX_QUESTIONS = 30
const MAX_LABEL_LENGTH = 200

export interface IncomingQuestion {
  id?: string
  position: number
  question_type: 'text' | 'link' | 'image'
  label: string
  required: boolean
}

function parseQuestion(raw: unknown, index: number): { error: string } | { question: IncomingQuestion } {
  const item = raw as Record<string, unknown>
  const label = typeof item.label === 'string' ? item.label.trim() : ''
  if (!label) return { error: `${index + 1}번 문항의 질문 내용을 입력해주세요` }
  if (label.length > MAX_LABEL_LENGTH) {
    return { error: `${index + 1}번 문항의 질문은 ${MAX_LABEL_LENGTH}자를 초과할 수 없습니다` }
  }
  if (typeof item.question_type !== 'string' || !QUESTION_TYPES.has(item.question_type)) {
    return { error: `${index + 1}번 문항의 타입이 올바르지 않습니다 (텍스트/링크/이미지)` }
  }
  if (item.id !== undefined && (typeof item.id !== 'string' || !isUuid(item.id))) {
    return { error: `${index + 1}번 문항의 ID 형식이 올바르지 않습니다` }
  }
  return {
    question: {
      id: item.id as string | undefined,
      position: index,
      question_type: item.question_type as IncomingQuestion['question_type'],
      label,
      required: item.required === true,
    },
  }
}

export function parseQuestionSet(questionsRaw: unknown): { error: string } | { questions: IncomingQuestion[] } {
  if (!Array.isArray(questionsRaw)) {
    return { error: 'questions 배열이 필요합니다' }
  }
  if (questionsRaw.length > MAX_QUESTIONS) {
    return { error: `설문 문항은 최대 ${MAX_QUESTIONS}개까지 등록할 수 있습니다` }
  }
  const questions: IncomingQuestion[] = []
  for (let index = 0; index < questionsRaw.length; index += 1) {
    const parsed = parseQuestion(questionsRaw[index], index)
    if ('error' in parsed) return parsed
    questions.push(parsed.question)
  }
  return { questions }
}

// 전체 세트 저장: id 있으면 update, 없으면 insert, 목록에서 빠진 기존 문항은 delete(답변 FK cascade).
export async function saveQuestionSet(dealId: string, questions: IncomingQuestion[]): Promise<string | null> {
  const { data: existingRows, error: existingError } = await db
    .from('team_deal_survey_questions')
    .select('id')
    .eq('deal_id', dealId)
  if (existingError) return '기존 문항을 불러오지 못했습니다'

  const existingIds = new Set<string>((existingRows ?? []).map((row: { id: string }) => row.id))
  const keptIds = new Set(questions.filter(q => q.id).map(q => q.id as string))
  for (const id of keptIds) {
    if (!existingIds.has(id)) return '이 딜의 문항이 아닌 항목이 포함되어 있습니다'
  }

  const removedIds = Array.from(existingIds).filter(id => !keptIds.has(id))
  if (removedIds.length > 0) {
    const { error } = await db.from('team_deal_survey_questions').delete().in('id', removedIds)
    if (error) return '삭제된 문항 정리에 실패했습니다'
  }

  const updates = questions.filter(q => q.id).map(q => ({ ...q, deal_id: dealId }))
  if (updates.length > 0) {
    const { error } = await db.from('team_deal_survey_questions').upsert(updates)
    if (error) return '문항 수정에 실패했습니다'
  }

  const inserts = questions.filter(q => !q.id).map(({ id: _unused, ...q }) => ({ ...q, deal_id: dealId }))
  if (inserts.length > 0) {
    const { error } = await db.from('team_deal_survey_questions').insert(inserts)
    if (error) return '문항 추가에 실패했습니다'
  }
  return null
}

export async function listQuestions(dealId: string) {
  const { data } = await db
    .from('team_deal_survey_questions')
    .select('id, position, question_type, label, required')
    .eq('deal_id', dealId)
    .order('position', { ascending: true })
  return data ?? []
}
