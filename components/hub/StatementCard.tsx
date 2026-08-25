'use client'
import { useState } from 'react'

const STATUS_LABEL: Record<string, { text: string; class: string }> = {
  pending:   { text: '처리중',   class: 'text-amber-600 bg-amber-50 border-amber-200' },
  confirmed: { text: '확정',     class: 'text-green-600 bg-green-50 border-green-200' },
  paid:      { text: '지급완료', class: 'text-[#6e6e73] bg-[#f5f5f7] border-[#e0e0e0]' },
}

export interface StatementSummary {
  period: string
  totalAmount: number
  scheduledPayDate: string | null
  status: string
  accountCount: number
}

export default function StatementCard({ summary }: { summary: StatementSummary }) {
  const [downloading, setDownloading] = useState(false)
  const s = STATUS_LABEL[summary.status] ?? STATUS_LABEL.pending

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/paybacks/statement?period=${summary.period}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${summary.period}-정산내역서.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  const [year, month] = summary.period.split('-')

  return (
    <div className="rounded-[14px] border border-[#e0e0e0] p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[15px] font-semibold text-[#1d1d1f]">{year}년 {Number(month)}월 정산</p>
          <p className="text-[12px] text-[#6e6e73] mt-0.5">광고계정 {summary.accountCount}건</p>
        </div>
        <span className={`rounded-[9999px] border px-2.5 py-1 text-[11px] font-medium ${s.class}`}>{s.text}</span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[12px] text-[#6e6e73]">지급 예정일</p>
          <p className="text-[14px] font-medium text-[#1d1d1f] mt-0.5">{summary.scheduledPayDate ?? '미정'}</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-[#6e6e73]">합계</p>
          <p className="text-[20px] font-semibold text-[#0066cc]">+{summary.totalAmount.toLocaleString()}P</p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="mt-4 w-full rounded-[9999px] border border-[#e0e0e0] py-2.5 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50 transition-colors"
      >
        {downloading ? 'PDF 생성 중...' : '정산내역서 PDF 다운로드'}
      </button>
    </div>
  )
}
