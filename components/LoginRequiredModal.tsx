'use client'

import { Lock, X } from 'lucide-react'

interface LoginRequiredModalProps {
  onClose: () => void
  redirectPath?: string
}

export default function LoginRequiredModal({ onClose, redirectPath }: LoginRequiredModalProps) {
  const loginHref = redirectPath ? `/login?next=${encodeURIComponent(redirectPath)}` : '/login'
  const signupHref = redirectPath ? `/signup?next=${encodeURIComponent(redirectPath)}` : '/signup'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white px-8 py-10 text-center shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <Lock className="h-6 w-6 text-gray-500" />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-gray-900">로그인이 필요해요</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          질문이나 답변을 작성하려면 로그인해 주세요.<br />
          가입은 30초면 끝나요.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <a
            href={loginHref}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-ink hover:bg-primary-hover transition-colors"
          >
            로그인
          </a>
          <a
            href={signupHref}
            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            회원가입
          </a>
        </div>
      </div>
    </div>
  )
}
