// 어드민 팀구매 딜 입력 검증. POST(생성)/PATCH(부분 편집)가 공유한다.
export const TEAM_DEAL_CATEGORIES = ['blog', 'place', 'experience', 'ads', 'other'] as const
export type TeamDealCategory = (typeof TEAM_DEAL_CATEGORIES)[number]

export interface TeamDealWriteValues {
  title: string
  description: string | null
  category: TeamDealCategory
  original_price: number
  deal_price: number
  target_count: number
  deadline: string
  thumbnail_url: string | null
  content_html: string | null
}

type FieldResult = { error: string } | { value: unknown }

function validateField(key: keyof TeamDealWriteValues, raw: unknown): FieldResult {
  switch (key) {
    case 'title': {
      if (typeof raw !== 'string' || raw.trim().length === 0) return { error: '제목을 입력해주세요' }
      return { value: raw.trim() }
    }
    case 'description':
    case 'thumbnail_url':
    case 'content_html': {
      if (raw === null || raw === undefined || raw === '') return { value: null }
      if (typeof raw !== 'string') return { error: '문자열 필드 형식이 올바르지 않습니다' }
      return { value: raw }
    }
    case 'category': {
      if (!TEAM_DEAL_CATEGORIES.includes(raw as TeamDealCategory)) return { error: '카테고리가 올바르지 않습니다' }
      return { value: raw }
    }
    case 'original_price':
    case 'deal_price': {
      const price = Number(raw)
      if (!Number.isInteger(price) || price <= 0) return { error: '가격은 1원 이상의 정수여야 합니다' }
      return { value: price }
    }
    case 'target_count': {
      const count = Number(raw)
      if (!Number.isInteger(count) || count < 2) return { error: '목표 수량은 2 이상이어야 합니다' }
      return { value: count }
    }
    case 'deadline': {
      if (typeof raw !== 'string' || Number.isNaN(Date.parse(raw))) return { error: '마감일 형식이 올바르지 않습니다' }
      if (Date.parse(raw) <= Date.now()) return { error: '마감일은 미래여야 합니다' }
      return { value: new Date(raw).toISOString() }
    }
  }
}

const REQUIRED_KEYS: (keyof TeamDealWriteValues)[] = [
  'title', 'category', 'original_price', 'deal_price', 'target_count', 'deadline',
]
const ALL_KEYS: (keyof TeamDealWriteValues)[] = [
  ...REQUIRED_KEYS, 'description', 'thumbnail_url', 'content_html',
]

export function validateDealCreate(body: Record<string, unknown>): { error: string } | { values: TeamDealWriteValues } {
  // deadline_hours(시간 단위)도 허용 — 기존 사용자 딜 생성 폼과 같은 입력 방식 지원
  if (body.deadline === undefined && typeof body.deadline_hours === 'number' && body.deadline_hours > 0) {
    body = { ...body, deadline: new Date(Date.now() + body.deadline_hours * 3600_000).toISOString() }
  }
  const values: Record<string, unknown> = {}
  for (const key of ALL_KEYS) {
    const checked = validateField(key, body[key])
    if ('error' in checked) {
      if (REQUIRED_KEYS.includes(key) || body[key] !== undefined) return { error: checked.error }
      continue
    }
    values[key] = checked.value
  }
  const result = values as unknown as TeamDealWriteValues
  if (result.deal_price > result.original_price) return { error: '딜 가격은 정가를 초과할 수 없습니다' }
  return { values: result }
}

export function hasDealPatchField(body: Record<string, unknown>): boolean {
  return ALL_KEYS.some(key => body[key] !== undefined)
}

export function validateDealPatch(body: Record<string, unknown>): { error: string } | { values: Partial<TeamDealWriteValues> } {
  const values: Partial<Record<keyof TeamDealWriteValues, unknown>> = {}
  for (const key of ALL_KEYS) {
    if (body[key] === undefined) continue
    const checked = validateField(key, body[key])
    if ('error' in checked) return { error: checked.error }
    values[key] = checked.value
  }
  if (Object.keys(values).length === 0) return { error: '수정할 항목이 없습니다' }
  return { values: values as Partial<TeamDealWriteValues> }
}
