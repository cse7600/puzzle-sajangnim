'use client'
import { useEffect, useState } from 'react'
import type { UserProfileData } from '@/lib/profile'

export type CurrentUser = {
  id: string
  email: string
  profile: UserProfileData
}

export function useUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetch('/api/users/me')
      .then((res) => (res.ok ? (res.json() as Promise<CurrentUser>) : null))
      .then((body) => {
        if (!cancelled) setUser(body)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { user, loading }
}
