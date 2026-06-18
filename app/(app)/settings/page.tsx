'use client'
import { useState } from 'react'
import { CheckCircle2, Building2, FileText } from 'lucide-react'

export default function SettingsPage() {
  const [form, setForm] = useState({ business_number: '', certificate_url: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.business_number) return
    setSubmitting(true)
    try {
      await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-1">개인 설정</h2>
      <p className="text-[13px] text-[#6e6e73] mb-6">서비스 이용을 위해 사업자 정보를 등록해주세요</p>

      <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[10px] bg-[#0066cc]/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-[#0066cc]" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#1d1d1f]">사업자 정보 등록</p>
            <p className="text-[12px] text-[#6e6e73]">사업자 등록 후 모든 서비스를 이용할 수 있습니다</p>
          </div>
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-[15px] font-semibold text-[#1d1d1f] mb-1">사업자 정보가 등록되었습니다</p>
            <p className="text-[13px] text-[#6e6e73]">모든 서비스를 자유롭게 이용하실 수 있습니다</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                사업자 번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="000-00-00000"
                value={form.business_number}
                onChange={e => setForm(f => ({ ...f, business_number: e.target.value }))}
                className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                사업자 등록증
              </label>
              <div className="border-2 border-dashed border-[#e0e0e0] rounded-[11px] p-6 text-center hover:border-[#0066cc]/40 transition-colors">
                <FileText className="h-8 w-8 text-[#c0c0c0] mx-auto mb-2" />
                <p className="text-[13px] text-[#6e6e73] mb-2">사업자 등록증 이미지를 첨부해주세요</p>
                <label className="inline-block cursor-pointer rounded-[9999px] border border-[#e0e0e0] px-4 py-1.5 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors">
                  파일 선택
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) setForm(f => ({ ...f, certificate_url: file.name }))
                    }}
                  />
                </label>
                {form.certificate_url && (
                  <p className="mt-2 text-[12px] text-[#0066cc]">{form.certificate_url}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !form.business_number}
              className="w-full rounded-[9999px] bg-[#0066cc] py-3 text-[15px] font-medium text-white hover:bg-[#0058b3] disabled:opacity-40 transition-colors"
            >
              {submitting ? '등록 중...' : '사업자 정보 등록하기'}
            </button>
          </form>
        )}
      </div>

      <div className="rounded-[11px] bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-700">
        사업자 등록증이 없어도 이용 가능하나, 페이백 정산을 위해 사업자 정보 등록이 필요합니다.
      </div>
    </div>
  )
}
