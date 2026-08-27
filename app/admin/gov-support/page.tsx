'use client'
import { useEffect, useState } from 'react'

interface GovSupportListing {
  pblanc_id: string
  title: string
  jrsdinsttnm: string | null
  trgetnm: string | null
  reqst_end_de: string | null
  is_marketing: boolean
  region_sido: string | null
  is_puzzle_transactable: boolean
  puzzle_note: string | null
  source: string
}

type PatchPayload = Partial<
  Pick<GovSupportListing, 'is_puzzle_transactable' | 'puzzle_note' | 'title' | 'jrsdinsttnm' | 'trgetnm' | 'reqst_end_de'>
>

interface NewListingForm {
  title: string
  jrsdinsttnm: string
  trgetnm: string
  reqst_end_de: string
  puzzle_note: string
  is_puzzle_transactable: boolean
}

const EMPTY_FORM: NewListingForm = {
  title: '',
  jrsdinsttnm: '',
  trgetnm: '',
  reqst_end_de: '',
  puzzle_note: '',
  is_puzzle_transactable: true,
}

const PAGE_SIZE = 30

interface ToastState { message: string; isError: boolean }

function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  function showToast(message: string, isError: boolean) {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 3000)
  }

  return { toast, showToast }
}

function useGovSupportAdmin() {
  const [items, setItems] = useState<GovSupportListing[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  // uncontrolled input(defaultValue)이 실패 시 화면에 남는 걸 막기 위한 리마운트 트리거.
  // 값이 안 바뀌어도(=서버 값 그대로 롤백해야 할 때도) 이 카운터를 올려서 key를 바꾸면
  // React가 input을 새로 마운트하며 defaultValue를 item[field]의 최신(=원래) 값으로 다시 읽는다.
  const [editAttempts, setEditAttempts] = useState<Record<string, number>>({})
  const { toast, showToast } = useToast()

  function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (query.trim()) params.set('q', query.trim())
    fetch(`/api/admin/gov-support?${params.toString()}`)
      .then(r => r.json())
      .then((body: { items?: GovSupportListing[]; totalCount?: number }) => {
        setItems(Array.isArray(body.items) ? body.items : [])
        setTotalCount(body.totalCount ?? 0)
      })
      .catch(() => showToast('목록을 불러오지 못했습니다', true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, query])

  async function patchItem(id: string, payload: PatchPayload) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/gov-support/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        showToast(body?.error ?? '저장에 실패했습니다', true)
        return
      }
      setItems(prev => prev.map(item => (item.pblanc_id === id ? { ...item, ...body } : item)))
    } catch {
      showToast('네트워크 오류로 저장하지 못했습니다', true)
    } finally {
      setSavingId(null)
    }
  }

  function saveIfChanged(item: GovSupportListing, field: 'puzzle_note' | 'title' | 'jrsdinsttnm' | 'trgetnm' | 'reqst_end_de', value: string) {
    const current = item[field] ?? ''
    if (value === current) return
    const attemptKey = `${item.pblanc_id}:${field}`
    setEditAttempts(prev => ({ ...prev, [attemptKey]: (prev[attemptKey] ?? 0) + 1 }))
    patchItem(item.pblanc_id, { [field]: value })
  }

  async function deleteItem(id: string) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/gov-support/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        showToast(body?.error ?? '삭제에 실패했습니다', true)
        return
      }
      setItems(prev => prev.filter(item => item.pblanc_id !== id))
      setTotalCount(prev => Math.max(0, prev - 1))
      showToast('삭제했습니다', false)
    } catch {
      showToast('네트워크 오류로 삭제하지 못했습니다', true)
    } finally {
      setSavingId(null)
    }
  }

  async function createItem(form: NewListingForm) {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/gov-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          jrsdinsttnm: form.jrsdinsttnm || undefined,
          trgetnm: form.trgetnm || undefined,
          reqst_end_de: form.reqst_end_de || undefined,
          puzzle_note: form.puzzle_note || undefined,
          is_puzzle_transactable: form.is_puzzle_transactable,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        showToast(body?.error ?? '등록에 실패했습니다', true)
        return false
      }
      showToast('등록했습니다', false)
      if (page === 1) {
        setItems(prev => [body, ...prev])
        setTotalCount(prev => prev + 1)
      } else {
        setPage(1)
      }
      return true
    } catch {
      showToast('네트워크 오류로 등록하지 못했습니다', true)
      return false
    } finally {
      setCreating(false)
    }
  }

  return {
    items,
    totalCount,
    loading,
    savingId,
    creating,
    query,
    setQuery,
    page,
    setPage,
    toast,
    editAttempts,
    patchItem,
    saveIfChanged,
    deleteItem,
    createItem,
  }
}

export default function AdminGovSupportPage() {
  const {
    items,
    totalCount,
    loading,
    savingId,
    creating,
    query,
    setQuery,
    page,
    setPage,
    toast,
    editAttempts,
    patchItem,
    saveIfChanged,
    deleteItem,
    createItem,
  } = useGovSupportAdmin()

  return (
    <div>
      {toast && <AdminToast toast={toast} />}
      <h1 className="text-[20px] font-semibold text-[#1d1d1f] mb-1">지원사업 관리</h1>
      <p className="text-[13px] text-[#6e6e73] mb-5">
        bizinfo 원본은 매일 배치가 덮어써서 기본 정보를 수정할 수 없어요 — 거래가능 여부와 메모만 편집 가능합니다. 직접 등록한 사업만 기본 정보 수정·삭제가 가능해요.
      </p>
      <NewListingFormPanel onCreate={createItem} creating={creating} />
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        <SearchBar query={query} onChange={value => { setPage(1); setQuery(value) }} />
        <GovSupportPanel
          items={items}
          loading={loading}
          savingId={savingId}
          editAttempts={editAttempts}
          onPatch={patchItem}
          onSaveIfChanged={saveIfChanged}
          onDelete={deleteItem}
        />
        <PaginationBar page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
      </div>
    </div>
  )
}

function AdminToast({ toast }: { toast: ToastState }) {
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-[11px] px-5 py-3 text-[14px] font-medium text-white shadow-lg ${toast.isError ? 'bg-red-600' : 'bg-[#0066cc]'}`}>
      {toast.message}
    </div>
  )
}

function SearchBar({ query, onChange }: { query: string; onChange: (value: string) => void }) {
  return (
    <div className="p-4 border-b border-[#e0e0e0]">
      <input
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="사업명으로 검색"
        className="w-full max-w-[320px] rounded-[8px] border border-[#e0e0e0] px-3 py-2 text-[13px] outline-none focus:border-[#0066cc] transition-colors"
      />
    </div>
  )
}

function PaginationBar({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#e0e0e0] text-[13px] text-[#6e6e73]">
      <span>전체 {totalCount}건</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-[6px] border border-[#e0e0e0] px-2.5 py-1 disabled:opacity-40"
        >
          이전
        </button>
        <span>{page} / {totalPages}</span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-[6px] border border-[#e0e0e0] px-2.5 py-1 disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  )
}

function NewListingFormPanel({
  onCreate,
  creating,
}: {
  onCreate: (form: NewListingForm) => Promise<boolean>
  creating: boolean
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<NewListingForm>(EMPTY_FORM)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    const ok = await onCreate(form)
    if (ok) {
      setForm(EMPTY_FORM)
      setOpen(false)
    }
  }

  return (
    <div className="bg-white rounded-[18px] border border-[#e0e0e0] mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-medium text-[#1d1d1f]"
      >
        새 사업 등록
        <span className="text-[#6e6e73]">{open ? '접기' : '펼치기'}</span>
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 pt-1 border-t border-[#e0e0e0] grid grid-cols-2 gap-3">
          <input
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="사업명 (필수)"
            required
            className="col-span-2 rounded-[8px] border border-[#e0e0e0] px-3 py-2 text-[13px] outline-none focus:border-[#0066cc]"
          />
          <input
            value={form.jrsdinsttnm}
            onChange={e => setForm({ ...form, jrsdinsttnm: e.target.value })}
            placeholder="주관기관"
            className="rounded-[8px] border border-[#e0e0e0] px-3 py-2 text-[13px] outline-none focus:border-[#0066cc]"
          />
          <input
            value={form.trgetnm}
            onChange={e => setForm({ ...form, trgetnm: e.target.value })}
            placeholder="지원대상"
            className="rounded-[8px] border border-[#e0e0e0] px-3 py-2 text-[13px] outline-none focus:border-[#0066cc]"
          />
          <input
            type="date"
            value={form.reqst_end_de}
            onChange={e => setForm({ ...form, reqst_end_de: e.target.value })}
            className="rounded-[8px] border border-[#e0e0e0] px-3 py-2 text-[13px] outline-none focus:border-[#0066cc]"
          />
          <label className="flex items-center gap-2 text-[13px] text-[#1d1d1f]">
            <input
              type="checkbox"
              checked={form.is_puzzle_transactable}
              onChange={e => setForm({ ...form, is_puzzle_transactable: e.target.checked })}
              className="w-4 h-4 accent-[#0066cc]"
            />
            거래가능
          </label>
          <textarea
            value={form.puzzle_note}
            onChange={e => setForm({ ...form, puzzle_note: e.target.value })}
            placeholder="메모"
            rows={2}
            className="col-span-2 rounded-[8px] border border-[#e0e0e0] px-3 py-2 text-[13px] outline-none focus:border-[#0066cc] resize-none"
          />
          <button
            type="submit"
            disabled={creating || !form.title.trim()}
            className="col-span-2 rounded-[8px] bg-[#0066cc] text-white text-[13px] font-medium py-2 disabled:opacity-50"
          >
            {creating ? '등록 중...' : '등록'}
          </button>
        </form>
      )}
    </div>
  )
}

function GovSupportPanel({
  items,
  loading,
  savingId,
  editAttempts,
  onPatch,
  onSaveIfChanged,
  onDelete,
}: {
  items: GovSupportListing[]
  loading: boolean
  savingId: string | null
  editAttempts: Record<string, number>
  onPatch: (id: string, payload: PatchPayload) => void
  onSaveIfChanged: (item: GovSupportListing, field: 'puzzle_note' | 'title' | 'jrsdinsttnm' | 'trgetnm' | 'reqst_end_de', value: string) => void
  onDelete: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="p-8 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-[#f5f5f7] animate-pulse" />)}
      </div>
    )
  }
  if (items.length === 0) {
    return <div className="p-8 text-center text-[#6e6e73] text-[14px]">등록된 지원사업이 없습니다</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] min-w-[1180px]">
        <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">사업명</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">주관기관</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">지원대상</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">마감일</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">지역</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">출처</th>
            <th className="text-center px-4 py-3 font-medium text-[#6e6e73]">거래가능</th>
            <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">메모</th>
            <th className="text-center px-4 py-3 font-medium text-[#6e6e73]">삭제</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e0e0e0]">
          {items.map(item => (
            <GovSupportRow
              key={item.pblanc_id}
              item={item}
              saving={savingId === item.pblanc_id}
              editAttempts={editAttempts}
              onPatch={onPatch}
              onSaveIfChanged={onSaveIfChanged}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GovSupportRow({
  item,
  saving,
  editAttempts,
  onPatch,
  onSaveIfChanged,
  onDelete,
}: {
  item: GovSupportListing
  saving: boolean
  editAttempts: Record<string, number>
  onPatch: (id: string, payload: PatchPayload) => void
  onSaveIfChanged: (item: GovSupportListing, field: 'puzzle_note' | 'title' | 'jrsdinsttnm' | 'trgetnm' | 'reqst_end_de', value: string) => void
  onDelete: (id: string) => void
}) {
  const isManual = item.source === 'manual'
  const attemptFor = (field: string) => editAttempts[`${item.pblanc_id}:${field}`] ?? 0
  return (
    <tr className="hover:bg-[#f5f5f7] transition-colors">
      <ManualEditableCell item={item} field="title" isManual={isManual} saving={saving} attempt={attemptFor('title')} onSaveIfChanged={onSaveIfChanged} width="w-[220px]" />
      <ManualEditableCell item={item} field="jrsdinsttnm" isManual={isManual} saving={saving} attempt={attemptFor('jrsdinsttnm')} onSaveIfChanged={onSaveIfChanged} width="w-[140px]" />
      <ManualEditableCell item={item} field="trgetnm" isManual={isManual} saving={saving} attempt={attemptFor('trgetnm')} onSaveIfChanged={onSaveIfChanged} width="w-[140px]" />
      <td className="px-4 py-3">
        {isManual ? (
          <input
            key={`${item.pblanc_id}-reqst_end_de-${attemptFor('reqst_end_de')}`}
            type="date"
            defaultValue={item.reqst_end_de ?? ''}
            onBlur={e => onSaveIfChanged(item, 'reqst_end_de', e.target.value)}
            disabled={saving}
            className="w-[140px] rounded-[6px] border border-transparent px-1.5 py-1 text-[12px] hover:border-[#e0e0e0] focus:border-[#0066cc] outline-none transition-colors disabled:opacity-50"
          />
        ) : (
          <span className="text-[#1d1d1f] whitespace-nowrap">{item.reqst_end_de ?? '상시'}</span>
        )}
      </td>
      <td className="px-4 py-3 text-[#6e6e73] whitespace-nowrap">{item.region_sido ?? '-'}</td>
      <td className="px-4 py-3 text-[#6e6e73] whitespace-nowrap">{isManual ? '직접등록' : 'bizinfo'}</td>
      <TransactableCell
        checked={item.is_puzzle_transactable}
        saving={saving}
        onChange={checked => onPatch(item.pblanc_id, { is_puzzle_transactable: checked })}
      />
      <td className="px-4 py-3">
        <input
          key={`${item.pblanc_id}-puzzle_note-${attemptFor('puzzle_note')}`}
          defaultValue={item.puzzle_note ?? ''}
          placeholder="메모 입력"
          onBlur={e => onSaveIfChanged(item, 'puzzle_note', e.target.value)}
          disabled={saving}
          className="w-[200px] rounded-[6px] border border-transparent px-1.5 py-1 text-[12px] hover:border-[#e0e0e0] focus:border-[#0066cc] outline-none transition-colors disabled:opacity-50"
        />
      </td>
      <td className="px-4 py-3 text-center">
        {isManual ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('이 지원사업을 삭제할까요?')) onDelete(item.pblanc_id)
            }}
            disabled={saving}
            className="text-[12px] text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            삭제
          </button>
        ) : (
          <span className="text-[12px] text-[#c7c7cc]">-</span>
        )}
      </td>
    </tr>
  )
}

function ManualEditableCell({
  item,
  field,
  isManual,
  saving,
  attempt,
  onSaveIfChanged,
  width,
}: {
  item: GovSupportListing
  field: 'title' | 'jrsdinsttnm' | 'trgetnm'
  isManual: boolean
  saving: boolean
  attempt: number
  onSaveIfChanged: (item: GovSupportListing, field: 'puzzle_note' | 'title' | 'jrsdinsttnm' | 'trgetnm' | 'reqst_end_de', value: string) => void
  width: string
}) {
  if (!isManual) {
    return <td className="px-4 py-3 text-[#1d1d1f]">{item[field] ?? '-'}</td>
  }
  return (
    <td className="px-4 py-3">
      <input
        key={`${item.pblanc_id}-${field}-${attempt}`}
        defaultValue={item[field] ?? ''}
        onBlur={e => onSaveIfChanged(item, field, e.target.value)}
        disabled={saving}
        className={`${width} rounded-[6px] border border-transparent px-1.5 py-1 text-[12px] hover:border-[#e0e0e0] focus:border-[#0066cc] outline-none transition-colors disabled:opacity-50`}
      />
    </td>
  )
}

function TransactableCell({
  checked,
  saving,
  onChange,
}: {
  checked: boolean
  saving: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <td className="px-4 py-3 text-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={saving}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#0066cc] disabled:opacity-50"
      />
    </td>
  )
}
