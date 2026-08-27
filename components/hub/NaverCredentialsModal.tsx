'use client'
import { useState } from 'react'

export default function NaverCredentialsModal({
  accountId,
  onClose,
  onSaved,
}: {
  accountId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [customerId, setCustomerId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/ad-accounts/${accountId}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, apiKey, secretKey }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'API 키 저장에 실패했습니다')
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-[18px] w-full max-w-[480px] mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-[18px] font-semibold text-[#1d1d1f] mb-1">네이버 API 키 등록</h3>
        <p className="text-[13px] text-[#6e6e73] mb-1 leading-relaxed">
          비용을 자동으로 확인하려면 네이버 검색광고 API 키가 필요해요.
        </p>
        <p className="text-[12px] text-[#a1a1a6] mb-5">
          발급 위치: searchad.naver.com → 도구 → API 관리자 발급
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Customer ID</label>
            <input
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              placeholder="예: 1234567"
              className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-primary-dark transition-colors"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">API Key (Access License)</label>
            <input
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="API 키를 붙여넣어주세요"
              className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-primary-dark transition-colors"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Secret Key</label>
            <input
              type="password"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              placeholder="Secret Key를 붙여넣어주세요"
              className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-primary-dark transition-colors"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 rounded-[9999px] border border-[#e0e0e0] py-3 text-[15px] text-[#6e6e73] hover:bg-[#f5f5f7] transition-colors">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !customerId || !apiKey || !secretKey}
            className="flex-1 rounded-[9999px] bg-primary py-3 text-[15px] font-medium text-ink hover:bg-primary-hover disabled:opacity-40 transition-colors"
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
