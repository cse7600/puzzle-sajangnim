'use client'

import { useRef, useState } from 'react'
import { X, ImagePlus } from 'lucide-react'
import { AdminTeamDeal, DEAL_CATEGORY_OPTIONS } from './team-deal-types'

interface DealFormState {
  title: string
  category: string
  original_price: string
  deal_price: string
  target_count: string
  deadline: string
  description: string
  thumbnail_url: string
  content_html: string
}

// deadline(ISO) → datetime-local 입력값(로컬 타임존 YYYY-MM-DDTHH:mm)
function isoToLocalInput(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return ''
  const offsetMs = parsed.getTimezoneOffset() * 60_000
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16)
}

function buildInitialForm(deal: AdminTeamDeal | null): DealFormState {
  if (!deal) {
    return {
      title: '', category: 'ads', original_price: '', deal_price: '',
      target_count: '', deadline: '', description: '', thumbnail_url: '', content_html: '',
    }
  }
  return {
    title: deal.title,
    category: deal.category,
    original_price: String(deal.original_price),
    deal_price: String(deal.deal_price),
    target_count: String(deal.target_count),
    deadline: isoToLocalInput(deal.deadline),
    description: deal.description ?? '',
    thumbnail_url: deal.thumbnail_url ?? '',
    content_html: deal.content_html ?? '',
  }
}

function validateForm(form: DealFormState): string | null {
  if (!form.title.trim()) return '제목을 입력해주세요'
  const originalPrice = Number(form.original_price)
  const dealPrice = Number(form.deal_price)
  if (!Number.isInteger(originalPrice) || originalPrice <= 0) return '정가는 1원 이상의 정수여야 합니다'
  if (!Number.isInteger(dealPrice) || dealPrice <= 0) return '딜가는 1P 이상의 정수여야 합니다'
  if (dealPrice > originalPrice) return '딜 가격은 정가를 초과할 수 없습니다'
  const targetCount = Number(form.target_count)
  if (!Number.isInteger(targetCount) || targetCount < 2) return '목표 수량은 2 이상이어야 합니다'
  if (!form.deadline) return '마감일시를 선택해주세요'
  if (new Date(form.deadline).getTime() <= Date.now()) return '마감일은 미래여야 합니다'
  return null
}

const FIELD_CLASS =
  'w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-[#0066cc] focus:outline-none'

export function TeamDealFormModal({
  deal,
  onClose,
  onSaved,
}: {
  deal: AdminTeamDeal | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<DealFormState>(() => buildInitialForm(deal))
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function setField<K extends keyof DealFormState>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleThumbnailFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('thumbnail', file)
      const res = await fetch('/api/admin/team-deals/upload', { method: 'POST', body: formData })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? '썸네일 업로드에 실패했습니다')
        return
      }
      setField('thumbnail_url', body.thumbnail_url)
    } catch {
      setError('썸네일 업로드 중 네트워크 오류가 발생했습니다')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSave() {
    const clientError = validateForm(form)
    if (clientError) {
      setError(clientError)
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      title: form.title.trim(),
      category: form.category,
      original_price: Number(form.original_price),
      deal_price: Number(form.deal_price),
      target_count: Number(form.target_count),
      deadline: new Date(form.deadline).toISOString(),
      description: form.description.trim() || null,
      thumbnail_url: form.thumbnail_url || null,
      content_html: form.content_html || null,
    }
    try {
      const res = await fetch(deal ? `/api/admin/team-deals/${deal.id}` : '/api/admin/team-deals', {
        method: deal ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? '저장에 실패했습니다')
        return
      }
      onSaved()
    } catch {
      setError('저장 중 네트워크 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[20px] shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0e0e0]">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f]">{deal ? '딜 편집' : '딜 등록'}</h2>
          <button onClick={onClose} className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">썸네일 이미지</label>
            <div className="flex items-center gap-3">
              {form.thumbnail_url ? (
                <img
                  src={form.thumbnail_url}
                  alt="딜 썸네일 미리보기"
                  className="h-20 w-32 rounded-lg object-cover border border-[#e0e0e0]"
                />
              ) : (
                <div className="h-20 w-32 rounded-lg border border-dashed border-[#e0e0e0] flex items-center justify-center text-[#a1a1a6]">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-[9999px] border border-[#e0e0e0] px-3.5 py-1.5 text-[12px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-40 transition-colors"
                >
                  {uploading ? '업로드 중...' : form.thumbnail_url ? '이미지 교체' : '이미지 선택'}
                </button>
                <p className="text-[11px] text-[#a1a1a6]">JPG/PNG/WEBP · 최대 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => handleThumbnailFile(e.target.files?.[0])}
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">제목</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              className={FIELD_CLASS}
              placeholder="딜 제목을 입력하세요"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">카테고리</label>
              <select
                value={form.category}
                onChange={e => setField('category', e.target.value)}
                className={FIELD_CLASS}
              >
                {DEAL_CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">마감일시</label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={e => setField('deadline', e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">정가 (원)</label>
              <input
                type="number"
                value={form.original_price}
                onChange={e => setField('original_price', e.target.value)}
                className={FIELD_CLASS}
                placeholder="500000"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">딜가 (P)</label>
              <input
                type="number"
                value={form.deal_price}
                onChange={e => setField('deal_price', e.target.value)}
                className={FIELD_CLASS}
                placeholder="350000"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">목표 수량 (개)</label>
              <input
                type="number"
                value={form.target_count}
                onChange={e => setField('target_count', e.target.value)}
                className={FIELD_CLASS}
                placeholder="10"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">설명 (선택)</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              className={FIELD_CLASS}
              placeholder="목록 카드에 표시될 한 줄 설명"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">HTML 상세 내용</label>
            <textarea
              value={form.content_html}
              onChange={e => setField('content_html', e.target.value)}
              rows={12}
              className={`${FIELD_CLASS} resize-y font-mono leading-relaxed`}
              placeholder="HTML로 상세 내용을 작성하세요"
            />
          </div>

          {error && (
            <p className="rounded-[11px] bg-red-50 px-4 py-2.5 text-[12px] font-medium text-red-600">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#e0e0e0]">
          <button
            onClick={onClose}
            className="rounded-[9999px] border border-[#e0e0e0] px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="rounded-[9999px] bg-[#0066cc] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0058b3] disabled:opacity-40 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
