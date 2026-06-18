'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface TeamDeal {
  id: string
  title: string
  category: 'blog' | 'place' | 'experience' | 'ads' | 'other'
  original_price: number
  deal_price: number
  leader_price: number
  target: number
  current: number
  status: '모집중' | '마감' | '완료'
  deadline: string
  content_html: string
}

interface DealForm {
  title: string
  category: 'blog' | 'place' | 'experience' | 'ads' | 'other'
  original_price: string
  deal_price: string
  leader_price: string
  target: string
  deadline: string
  content_html: string
}

const PLACEHOLDER_HTML = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; margin-bottom: 16px;">네이버 검색광고 공동구매 패키지</h2>

  <div style="background: #f0f7ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
    <p style="font-size: 15px; color: #0066cc; font-weight: 600; margin: 0 0 8px;">이런 분께 추천해요</p>
    <ul style="margin: 0; padding-left: 20px; color: #444; font-size: 14px; line-height: 2;">
      <li>네이버 플레이스/검색광고를 처음 시작하는 사장님</li>
      <li>혼자 하면 비싼 광고비를 절약하고 싶은 분</li>
      <li>동종 업계 사장님들과 함께 광고 효율을 높이고 싶은 분</li>
    </ul>
  </div>

  <h3 style="font-size: 17px; font-weight: 700; color: #1d1d1f; margin-bottom: 12px;">패키지 구성</h3>
  <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
    <thead>
      <tr style="background: #f5f5f7;">
        <th style="text-align: left; padding: 10px 14px; color: #6e6e73; font-weight: 600; border-radius: 8px 0 0 0;">항목</th>
        <th style="text-align: right; padding: 10px 14px; color: #6e6e73; font-weight: 600; border-radius: 0 8px 0 0;">내용</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 10px 14px; color: #1d1d1f;">광고 집행 기간</td>
        <td style="padding: 10px 14px; text-align: right; color: #1d1d1f; font-weight: 500;">1개월</td>
      </tr>
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 10px 14px; color: #1d1d1f;">키워드 세팅</td>
        <td style="padding: 10px 14px; text-align: right; color: #1d1d1f; font-weight: 500;">업종 맞춤 20개</td>
      </tr>
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 10px 14px; color: #1d1d1f;">리포트 제공</td>
        <td style="padding: 10px 14px; text-align: right; color: #1d1d1f; font-weight: 500;">주 1회 성과 리포트</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; color: #1d1d1f;">전담 매니저</td>
        <td style="padding: 10px 14px; text-align: right; color: #0066cc; font-weight: 600;">배정</td>
      </tr>
    </tbody>
  </table>

  <div style="background: #fff8ec; border: 1px solid #ffd880; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
    <p style="font-size: 14px; color: #b45309; margin: 0;">
      <strong>방장 혜택:</strong> 팀을 모집하면 방장 특별가 적용 + 퍼즐 포인트 3,000P 추가 지급
    </p>
  </div>

  <h3 style="font-size: 17px; font-weight: 700; color: #1d1d1f; margin-bottom: 12px;">진행 순서</h3>
  <ol style="padding-left: 20px; color: #444; font-size: 14px; line-height: 2.2; margin-bottom: 24px;">
    <li>팀 구매 참여 신청</li>
    <li>목표 인원 달성 시 딜 확정 알림</li>
    <li>담당 매니저 배정 및 광고 계정 세팅</li>
    <li>광고 집행 시작</li>
    <li>주간 성과 리포트 수령</li>
  </ol>
</div>`

const INITIAL_MOCK: TeamDeal[] = [
  { id: 'd1', title: '네이버 광고 공동 구매 6월', current: 4, target: 10, status: '모집중', deadline: '2026.06.30', category: 'ads', original_price: 500000, deal_price: 350000, leader_price: 280000, content_html: PLACEHOLDER_HTML },
  { id: 'd2', title: '카카오 플러스친구 홍보 패키지', current: 8, target: 8, status: '마감', deadline: '2026.06.20', category: 'other', original_price: 300000, deal_price: 200000, leader_price: 160000, content_html: '' },
  { id: 'd3', title: '인스타그램 릴스 광고 공동', current: 10, target: 10, status: '완료', deadline: '2026.06.10', category: 'ads', original_price: 400000, deal_price: 260000, leader_price: 210000, content_html: '' },
]

const STATUS_STYLE: Record<TeamDeal['status'], string> = {
  '모집중': 'bg-amber-50 text-amber-700',
  '마감': 'bg-blue-50 text-blue-700',
  '완료': 'bg-green-50 text-green-700',
}

const CATEGORY_OPTIONS: { value: TeamDeal['category']; label: string }[] = [
  { value: 'blog', label: 'AI 블로그' },
  { value: 'place', label: '플레이스' },
  { value: 'experience', label: '체험단' },
  { value: 'ads', label: '광고' },
  { value: 'other', label: '기타' },
]

const EMPTY_FORM: DealForm = {
  title: '',
  category: 'ads',
  original_price: '',
  deal_price: '',
  leader_price: '',
  target: '',
  deadline: '',
  content_html: '',
}

function dealToForm(deal: TeamDeal): DealForm {
  return {
    title: deal.title,
    category: deal.category,
    original_price: String(deal.original_price),
    deal_price: String(deal.deal_price),
    leader_price: String(deal.leader_price),
    target: String(deal.target),
    deadline: deal.deadline,
    content_html: deal.content_html,
  }
}

export default function AdminTeamDealsPage() {
  const [deals, setDeals] = useState<TeamDeal[]>(INITIAL_MOCK)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DealForm>(EMPTY_FORM)

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(deal: TeamDeal) {
    setEditingId(deal.id)
    setForm(dealToForm(deal))
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function handleSave() {
    if (editingId) {
      setDeals(prev =>
        prev.map(d =>
          d.id === editingId
            ? {
                ...d,
                title: form.title,
                category: form.category,
                original_price: Number(form.original_price),
                deal_price: Number(form.deal_price),
                leader_price: Number(form.leader_price),
                target: Number(form.target),
                deadline: form.deadline,
                content_html: form.content_html,
              }
            : d
        )
      )
    } else {
      const newDeal: TeamDeal = {
        id: `d${Date.now()}`,
        title: form.title,
        category: form.category,
        original_price: Number(form.original_price),
        deal_price: Number(form.deal_price),
        leader_price: Number(form.leader_price),
        target: Number(form.target),
        current: 0,
        status: '모집중',
        deadline: form.deadline,
        content_html: form.content_html,
      }
      setDeals(prev => [newDeal, ...prev])
    }
    closeModal()
  }

  function setField<K extends keyof DealForm>(key: K, value: DealForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-semibold text-[#1d1d1f]">팀 구매 관리</h1>
        <button
          onClick={openCreate}
          className="rounded-[9999px] bg-[#0066cc] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0058b3] transition-colors"
        >
          딜 등록
        </button>
      </div>

      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">제목</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">모집 현황</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상태</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">마감일</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {deals.map(d => (
              <tr key={d.id} className="hover:bg-[#f5f5f7] transition-colors">
                <td className="px-4 py-3 font-medium text-[#1d1d1f]">{d.title}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[#1d1d1f] font-medium">{d.current}/{d.target}명</span>
                    <div className="w-20 h-1.5 rounded-full bg-[#e0e0e0] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0066cc]"
                        style={{ width: `${Math.round((d.current / d.target) * 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[d.status]}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#6e6e73]">{d.deadline}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openEdit(d)}
                    className="text-[12px] text-[#0066cc] hover:underline"
                  >
                    편집
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[20px] shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0e0e0]">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                {editingId ? '딜 편집' : '딜 등록'}
              </h2>
              <button onClick={closeModal} className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">제목</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-[#0066cc] focus:outline-none"
                  placeholder="딜 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">카테고리</label>
                <select
                  value={form.category}
                  onChange={e => setField('category', e.target.value as TeamDeal['category'])}
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-900 focus:border-[#0066cc] focus:outline-none"
                >
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">원가 (원)</label>
                  <input
                    type="number"
                    value={form.original_price}
                    onChange={e => setField('original_price', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-[#0066cc] focus:outline-none"
                    placeholder="500000"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">딜가 (원)</label>
                  <input
                    type="number"
                    value={form.deal_price}
                    onChange={e => setField('deal_price', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-[#0066cc] focus:outline-none"
                    placeholder="350000"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">방장 특별가 (원)</label>
                  <input
                    type="number"
                    value={form.leader_price}
                    onChange={e => setField('leader_price', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-[#0066cc] focus:outline-none"
                    placeholder="280000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">목표 인원 (명)</label>
                  <input
                    type="number"
                    value={form.target}
                    onChange={e => setField('target', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-[#0066cc] focus:outline-none"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">마감일</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setField('deadline', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-900 focus:border-[#0066cc] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">HTML 상세 내용</label>
                <textarea
                  value={form.content_html}
                  onChange={e => setField('content_html', e.target.value)}
                  rows={15}
                  className="w-full resize-y rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] font-mono leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-[#0066cc] focus:outline-none"
                  placeholder="HTML로 상세 내용을 작성하세요"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#e0e0e0]">
              <button
                onClick={closeModal}
                className="rounded-[9999px] border border-[#e0e0e0] px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="rounded-[9999px] bg-[#0066cc] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0058b3] transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
