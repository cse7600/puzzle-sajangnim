'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { QUESTION_TYPE_OPTIONS, SurveyQuestionType } from './team-deal-types'

export interface DraftQuestion {
  id?: string
  label: string
  question_type: SurveyQuestionType
  required: boolean
}

function QuestionRow({
  draft,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  draft: DraftQuestion
  index: number
  total: number
  onChange: (patch: Partial<DraftQuestion>) => void
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="text-[#6e6e73] hover:text-[#1d1d1f] disabled:opacity-30 transition-colors"
          aria-label="위로 이동"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="text-[#6e6e73] hover:text-[#1d1d1f] disabled:opacity-30 transition-colors"
          aria-label="아래로 이동"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <select
        value={draft.question_type}
        onChange={e => onChange({ question_type: e.target.value as SurveyQuestionType })}
        className="rounded-[9px] border border-[#e0e0e0] px-2 py-1.5 text-[12px] text-[#1d1d1f] bg-white"
      >
        {QUESTION_TYPE_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <input
        value={draft.label}
        onChange={e => onChange({ label: e.target.value })}
        placeholder="질문을 입력하세요 (예: 매장 네이버 플레이스 링크를 알려주세요)"
        className="flex-1 rounded-[9px] border border-[#e0e0e0] px-3 py-1.5 text-[13px] text-[#1d1d1f] focus:border-[#0066cc] focus:outline-none"
      />
      <label className="flex items-center gap-1 text-[12px] text-[#6e6e73] whitespace-nowrap cursor-pointer">
        <input
          type="checkbox"
          checked={draft.required}
          onChange={e => onChange({ required: e.target.checked })}
          className="accent-[#0066cc]"
        />
        필수
      </label>
      <button
        type="button"
        onClick={onRemove}
        className="text-[#6e6e73] hover:text-red-600 transition-colors"
        aria-label="문항 삭제"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

// 요청서 문항 편집 리스트 (표시 전용 상태 없음 — 상태는 소비자가 소유).
// shouldConfirmRemove가 true를 반환하는 문항은 삭제 전 window.confirm으로 경고한다.
export function SurveyQuestionEditor({
  drafts,
  onChange,
  shouldConfirmRemove,
  confirmRemoveMessage,
}: {
  drafts: DraftQuestion[]
  onChange: (next: DraftQuestion[]) => void
  shouldConfirmRemove?: (draft: DraftQuestion) => boolean
  confirmRemoveMessage?: string
}) {
  function updateAt(index: number, patch: Partial<DraftQuestion>) {
    onChange(drafts.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)))
  }

  function moveAt(index: number, delta: -1 | 1) {
    const next = [...drafts]
    const [moved] = next.splice(index, 1)
    next.splice(index + delta, 0, moved)
    onChange(next)
  }

  function removeAt(index: number) {
    const draft = drafts[index]
    if (shouldConfirmRemove?.(draft)) {
      const confirmed = window.confirm(
        confirmRemoveMessage ?? '이 문항을 삭제하면 이미 제출된 답변도 함께 삭제됩니다. 계속할까요?'
      )
      if (!confirmed) return
    }
    onChange(drafts.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {drafts.length === 0 && (
        <p className="text-[13px] text-[#6e6e73]">
          아직 문항이 없습니다. 문항을 추가해야 딜이 고객에게 오픈(모집중)될 수 있습니다.
        </p>
      )}
      {drafts.map((draft, index) => (
        <QuestionRow
          key={draft.id ?? `new-${index}`}
          draft={draft}
          index={index}
          total={drafts.length}
          onChange={patch => updateAt(index, patch)}
          onMove={delta => moveAt(index, delta)}
          onRemove={() => removeAt(index)}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...drafts, { label: '', question_type: 'text', required: true }])}
        className="inline-flex items-center gap-1 rounded-[9999px] border border-[#e0e0e0] px-4 py-1.5 text-[12px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        문항 추가
      </button>
    </div>
  )
}
