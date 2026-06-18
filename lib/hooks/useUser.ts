'use client'
import { useState, useEffect } from 'react'

// 임시 더미 사용자 (카카오 로그인 구현 전)
const DEMO_USER = {
  id: 'demo-user-001',
  name: '김테스트',
  business_name: '강남 치킨집',
  business_type: '외식업',
  total_points: 23400,
  referral_code: 'PUZZLE01',
  kakao_id: null,
  phone: '010-1234-5678',
  referred_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export function useUser() {
  const [user, setUser] = useState(DEMO_USER)
  const [loading, setLoading] = useState(false)
  return { user, loading, setUser }
}
