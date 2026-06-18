'use client'
import { useState, useEffect, useRef } from 'react'
import { Sparkles, FileImage, AlertCircle } from 'lucide-react'

interface Receipt {
  id: string
  store_name: string | null
  amount: number | null
  points_earned: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

// 서버 lib/claude.ts ReceiptAnalysis 형태를 클라이언트에서 재선언 (서버 import 회피)
type ReceiptAnalysis = {
  store_name: string | null
  total_amount: number | null
  date: string | null
  items: { name: string; price: number }[]
}

const STATUS_LABEL = {
  pending: { text: '검토중', class: 'bg-amber-50 text-amber-700' },
  approved: { text: '적립완료', class: 'bg-green-50 text-green-700' },
  rejected: { text: '반려', class: 'bg-red-50 text-red-700' },
}

export default function RewardsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [form, setForm] = useState({ store_name: '', amount: '' })
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [ocrData, setOcrData] = useState<ReceiptAnalysis | null>(null)

  function resetModal() {
    setForm({ store_name: '', amount: '' })
    setFileName('')
    setPreviewUrl('')
    setAnalyzing(false)
    setAnalyzeError('')
    setOcrData(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0]
    setAnalyzeError('')
    setOcrData(null)
    if (!picked) {
      setFileName('')
      setPreviewUrl('')
      return
    }
    setFileName(picked.name)
    setPreviewUrl(URL.createObjectURL(picked))
  }

  async function handleAnalyze() {
    const picked = fileRef.current?.files?.[0]
    if (!picked) {
      setAnalyzeError('먼저 영수증 사진을 선택해주세요.')
      return
    }
    setAnalyzing(true)
    setAnalyzeError('')
    try {
      const fd = new FormData()
      fd.append('image', picked)
      const res = await fetch('/api/receipts/analyze', { method: 'POST', body: fd })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `분석 실패 (HTTP ${res.status})`)
      const analysis = body as ReceiptAnalysis
      setOcrData(analysis)
      setForm({
        store_name: analysis.store_name ?? '',
        amount: analysis.total_amount != null ? analysis.total_amount.toLocaleString() : '',
      })
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : '영수증 분석에 실패했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  useEffect(() => {
    fetch('/api/receipts').then(r => r.json()).then(data => {
      setReceipts(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const totalPoints = receipts.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.points_earned, 0)
  const pendingPoints = receipts.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.points_earned, 0)

  async function handleUpload() {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('store_name', form.store_name)
      fd.append('amount', form.amount.replace(/,/g, ''))
      if (fileRef.current?.files?.[0]) fd.append('image', fileRef.current.files[0])
      if (ocrData) fd.append('ocr_data', JSON.stringify(ocrData))
      if (ocrData?.date) fd.append('receipt_date', ocrData.date)

      const res = await fetch('/api/receipts', { method: 'POST', body: fd })
      const newReceipt = await res.json()
      setReceipts(prev => [newReceipt, ...prev])
      setUploadSuccess(true)
      setTimeout(() => {
        setUploadSuccess(false)
        setShowUploadModal(false)
        resetModal()
      }, 2000)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* 포인트 현황 카드 */}
      <div className="bg-[#0066cc] rounded-[18px] p-6 text-white mb-6">
        <p className="text-[13px] opacity-80 mb-1">보유 포인트</p>
        <p className="text-[40px] font-semibold">{(23400 + totalPoints).toLocaleString()}<span className="text-[20px] ml-1 opacity-80">P</span></p>
        <div className="flex gap-6 mt-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-[12px] opacity-70">이번 달 적립</p>
            <p className="text-[18px] font-semibold">+{totalPoints.toLocaleString()}P</p>
          </div>
          <div>
            <p className="text-[12px] opacity-70">검토중</p>
            <p className="text-[18px] font-semibold">+{pendingPoints.toLocaleString()}P</p>
          </div>
          <div>
            <p className="text-[12px] opacity-70">영수증 장당</p>
            <p className="text-[18px] font-semibold">50~500P</p>
          </div>
        </div>
      </div>

      {/* 영수증 업로드 섹션 */}
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[16px] font-semibold text-[#1d1d1f]">영수증 올리기</h3>
            <p className="text-[13px] text-[#6e6e73] mt-0.5">식자재·운영비 영수증을 올리면 포인트가 쌓입니다</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-[#0066cc] text-white rounded-[9999px] px-4 py-2 text-[14px] font-medium hover:bg-[#0058b3] transition-colors"
          >
            영수증 추가
          </button>
        </div>

        {/* 포인트 안내 */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { range: '~1만원', points: '50P' },
            { range: '1~3만원', points: '100P' },
            { range: '3~10만원', points: '200P' },
            { range: '10만원+', points: '500P' },
          ].map(item => (
            <div key={item.range} className="rounded-[11px] bg-[#f5f5f7] p-3 text-center">
              <p className="text-[11px] text-[#6e6e73]">{item.range}</p>
              <p className="text-[16px] font-semibold text-[#0066cc]">{item.points}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 영수증 내역 */}
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-6">
        <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-4">영수증 내역</h3>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-[11px] bg-[#f5f5f7] animate-pulse" />)}
          </div>
        ) : receipts.length === 0 ? (
          <p className="text-center py-10 text-[#6e6e73] text-[14px]">아직 등록된 영수증이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {receipts.map(r => {
              const s = STATUS_LABEL[r.status]
              return (
                <div key={r.id} className="flex items-center justify-between rounded-[11px] border border-[#e0e0e0] px-4 py-3">
                  <div>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">{r.store_name || '영수증'}</p>
                    <p className="text-[12px] text-[#6e6e73]">
                      {r.amount ? `${r.amount.toLocaleString()}원 · ` : ''}
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[15px] font-semibold text-[#0066cc]">+{r.points_earned}P</p>
                    <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${s.class}`}>{s.text}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 영수증 업로드 모달 */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowUploadModal(false); resetModal() }}>
          <div className="bg-white rounded-[18px] w-full max-w-[420px] mx-4 p-6" onClick={e => e.stopPropagation()}>
            {uploadSuccess ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M5 14L11 20L23 8" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[16px] font-semibold text-[#1d1d1f]">영수증 등록 완료</p>
                <p className="text-[13px] text-[#6e6e73] mt-1">검토 후 포인트가 적립됩니다</p>
              </div>
            ) : (
              <>
                <h3 className="text-[18px] font-semibold text-[#1d1d1f] mb-5">영수증 등록</h3>
                <div className="space-y-4">
                  <div
                    className="border-2 border-dashed border-[#e0e0e0] rounded-[11px] p-4 text-center cursor-pointer hover:border-[#0066cc] transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    {previewUrl ? (
                      <div className="flex items-center gap-3 text-left">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 blob 미리보기라 next/image 부적합 */}
                        <img src={previewUrl} alt="영수증 미리보기" className="h-16 w-16 rounded-[9px] object-cover border border-[#e0e0e0]" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#1d1d1f] truncate">{fileName}</p>
                          <p className="text-[12px] text-[#6e6e73] mt-0.5">탭하면 다른 사진으로 변경</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <FileImage className="mx-auto mb-2 text-[#6e6e73]" size={32} strokeWidth={1.8} />
                        <p className="text-[14px] text-[#6e6e73]">사진을 탭해 업로드</p>
                        <p className="text-[12px] text-[#6e6e73] mt-0.5">JPG, PNG 지원</p>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={analyzing || !fileName}
                    className="flex w-full items-center justify-center gap-2 rounded-[11px] border border-[#0066cc] py-2.5 text-[14px] font-medium text-[#0066cc] hover:bg-[#0066cc]/5 disabled:opacity-40 transition-colors"
                  >
                    <Sparkles size={16} strokeWidth={2} />
                    {analyzing ? '분석 중...' : '자동 분석으로 채우기'}
                  </button>

                  {analyzeError && (
                    <div className="flex items-start gap-2 rounded-[9px] bg-red-50 px-3 py-2.5">
                      <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={15} />
                      <p className="text-[12px] text-red-700">{analyzeError}</p>
                    </div>
                  )}

                  {ocrData && !analyzeError && (
                    <div className="rounded-[9px] bg-[#f5f5f7] px-3 py-2.5">
                      <p className="text-[12px] text-[#1d1d1f]">
                        분석 완료{ocrData.date ? ` · ${ocrData.date}` : ''}
                        {ocrData.items.length ? ` · 품목 ${ocrData.items.length}개` : ''}
                      </p>
                      {ocrData.items.length > 0 && (
                        <p className="text-[11px] text-[#6e6e73] mt-0.5 truncate">
                          {ocrData.items.slice(0, 3).map(it => it.name).join(', ')}
                          {ocrData.items.length > 3 ? ' 외' : ''}
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">가게명</label>
                    <input
                      type="text"
                      placeholder="예: 강남 청과"
                      value={form.store_name}
                      onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))}
                      className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">결제 금액</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="예: 45,000"
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                        className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors pr-8"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#6e6e73]">원</span>
                    </div>
                    {form.amount && (
                      <p className="mt-1 text-[12px] text-[#0066cc]">
                        예상 적립: +{Number(form.amount.replace(/,/g, '')) >= 100000 ? 500 : Number(form.amount.replace(/,/g, '')) >= 30000 ? 200 : Number(form.amount.replace(/,/g, '')) >= 10000 ? 100 : 50}P
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setShowUploadModal(false); resetModal() }} className="flex-1 rounded-[9999px] border border-[#e0e0e0] py-3 text-[14px] text-[#6e6e73] hover:bg-[#f5f5f7] transition-colors">취소</button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !form.store_name}
                    className="flex-1 rounded-[9999px] bg-[#0066cc] py-3 text-[14px] font-medium text-white hover:bg-[#0058b3] disabled:opacity-40 transition-colors"
                  >
                    {uploading ? '등록 중...' : '등록하기'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
