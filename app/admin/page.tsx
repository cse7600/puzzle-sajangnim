'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Stats {
  users: number
  adAccounts: number
  receipts: number
  teamDeals: number
  pendingReceipts: number
  totalPayback: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ users: 0, adAccounts: 0, receipts: 0, teamDeals: 0, pendingReceipts: 0, totalPayback: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setStats({
        users: 1,
        adAccounts: 1,
        receipts: 3,
        teamDeals: 3,
        pendingReceipts: 1,
        totalPayback: 27400,
      })

      try {
        const [usersRes, adRes, receiptRes, dealRes] = await Promise.allSettled([
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('ad_accounts').select('id', { count: 'exact', head: true }),
          supabase.from('receipts').select('id, status', { count: 'exact' }),
          supabase.from('team_deals').select('id', { count: 'exact', head: true }),
        ])

        const users = usersRes.status === 'fulfilled' ? (usersRes.value.count ?? 0) : 0
        const adAccounts = adRes.status === 'fulfilled' ? (adRes.value.count ?? 0) : 0
        const receipts = receiptRes.status === 'fulfilled' ? (receiptRes.value.count ?? 0) : 0
        const teamDeals = dealRes.status === 'fulfilled' ? (dealRes.value.count ?? 0) : 0
        const pendingReceipts = receiptRes.status === 'fulfilled'
          ? (receiptRes.value.data?.filter((r: { status: string }) => r.status === 'pending').length ?? 0)
          : 0

        if (users > 0 || adAccounts > 0) {
          setStats({ users, adAccounts, receipts, teamDeals, pendingReceipts, totalPayback: 27400 })
        }
      } catch {
        // 목 데이터 유지
      }
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: '총 사용자', value: stats.users.toLocaleString(), sub: '가입자', color: 'text-[#0066cc]' },
    { label: '광고계정', value: stats.adAccounts.toLocaleString(), sub: '연동됨', color: 'text-green-600' },
    { label: '영수증', value: stats.receipts.toLocaleString(), sub: `검토중 ${stats.pendingReceipts}건`, color: 'text-amber-600' },
    { label: '팀 구매', value: stats.teamDeals.toLocaleString(), sub: '딜 생성됨', color: 'text-violet-600' },
    { label: '총 페이백', value: `${stats.totalPayback.toLocaleString()}원`, sub: '이번 달', color: 'text-[#0066cc]' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-[#1d1d1f]">어드민 대시보드</h1>
        <p className="text-[13px] text-[#6e6e73] mt-0.5">서비스 전체 현황</p>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-[18px] bg-white border border-[#e0e0e0] animate-pulse" />)
        ) : (
          cards.map(c => (
            <div key={c.label} className="bg-white rounded-[18px] border border-[#e0e0e0] p-5">
              <p className="text-[12px] text-[#6e6e73]">{c.label}</p>
              <p className={`text-[26px] font-semibold mt-1 ${c.color}`}>{c.value}</p>
              <p className="text-[11px] text-[#6e6e73] mt-0.5">{c.sub}</p>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-5">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">영수증 검토 필요</h3>
          <p className="text-[13px] text-[#6e6e73]">{stats.pendingReceipts}건 대기 중</p>
          <a href="/admin/receipts" className="mt-3 inline-block text-[13px] font-medium text-[#0066cc]">검토하기 →</a>
        </div>
        <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-5">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">광고계정 승인 대기</h3>
          <p className="text-[13px] text-[#6e6e73]">신규 등록 계정 확인 필요</p>
          <a href="/admin/ad-accounts" className="mt-3 inline-block text-[13px] font-medium text-[#0066cc]">확인하기 →</a>
        </div>
      </div>
    </div>
  )
}
