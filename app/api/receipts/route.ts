import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const DEMO_USER_ID = 'demo-user-001'

// 영수증 금액 → 포인트 계산 (50원~500원 랜덤)
function calcPoints(amount: number): number {
  if (!amount) return 100
  if (amount < 10000) return 50
  if (amount < 30000) return 100
  if (amount < 100000) return 200
  return 500
}

export async function GET() {
  const mock = [
    { id: 'r1', store_name: '강남 청과', amount: 45000, points_earned: 200, status: 'approved', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'r2', store_name: '신선마트', amount: 128000, points_earned: 500, status: 'approved', created_at: new Date(Date.now() - 172800000).toISOString() },
    { id: 'r3', store_name: '바다수산', amount: 75000, points_earned: 200, status: 'pending', created_at: new Date().toISOString() },
  ]

  try {
    const { data, error } = await supabase.from('receipts').select('*').eq('user_id', DEMO_USER_ID).order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data?.length ? data : mock)
  } catch {
    return NextResponse.json(mock)
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const storeName = formData.get('store_name') as string
  const amount = Number(formData.get('amount') || 0)
  const points = calcPoints(amount)

  // 실제 이미지 업로드 없이 더미 URL
  const imageUrl = `https://nbfoifegbamvtwffbuxv.supabase.co/storage/v1/object/public/receipts/demo-${Date.now()}.jpg`

  const newReceipt = {
    id: `r-${Date.now()}`,
    user_id: DEMO_USER_ID,
    image_url: imageUrl,
    store_name: storeName,
    amount,
    points_earned: points,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
  }

  try {
    const { id: _id, created_at: _ca, ...insertFields } = newReceipt
    const { data, error } = await supabase.from('receipts').insert({ ...insertFields, ocr_data: null }).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(newReceipt)
  }
}
