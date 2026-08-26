'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

type AdminLoginFormProps = {
  next: string
}

export default function AdminLoginForm({ next }: AdminLoginFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const payload = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(typeof payload.error === 'string' ? payload.error : '로그인에 실패했습니다')
        return
      }

      router.push(next)
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-[18px] border border-[#e0e0e0] p-8">
      <h1 className="text-[22px] font-semibold text-[#1d1d1f] mb-2">관리자 비밀번호</h1>
      <p className="text-[14px] text-[#6e6e73] mb-6">공유된 관리자 비밀번호를 입력하세요</p>

      {error && (
        <p className="mb-4 rounded-[11px] bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>
      )}

      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="비밀번호"
        autoFocus
        className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[14px] outline-none focus:border-[#0066cc]"
      />

      <button
        type="submit"
        disabled={loading || !password}
        className="mt-4 w-full rounded-[11px] bg-[#1d1d1f] py-3 text-[14px] font-medium text-white transition disabled:opacity-40"
      >
        {loading ? '확인 중...' : '입장하기'}
      </button>
    </form>
  )
}
