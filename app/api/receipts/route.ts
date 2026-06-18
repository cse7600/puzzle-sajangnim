export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'

const db = supabaseAdmin as any

// 영수증 금액 → 포인트 계산 (50원~500원)
function calcPoints(amount: number): number {
  if (!amount) return 100
  if (amount < 10000) return 50
  if (amount < 30000) return 100
  if (amount < 100000) return 200
  return 500
}

const MOCK_RECEIPTS = [
  { id: 'r1', store_name: '강남 청과', amount: 45000, points_earned: 200, status: 'approved', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'r2', store_name: '신선마트', amount: 128000, points_earned: 500, status: 'approved', created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 'r3', store_name: '바다수산', amount: 75000, points_earned: 200, status: 'pending', created_at: new Date().toISOString() },
]

export async function GET() {
  try {
    const { data, error } = await db
      .from('receipts')
      .select('*')
      .eq('user_id', DEMO_USER_ID)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data?.length ? data : MOCK_RECEIPTS)
  } catch {
    return NextResponse.json(MOCK_RECEIPTS)
  }
}

function parseOcrData(raw: FormDataEntryValue | null): Record<string, unknown> | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const storeName = formData.get('store_name') as string
  const amount = Number(formData.get('amount') || 0)
  const points = calcPoints(amount)
  const ocrData = parseOcrData(formData.get('ocr_data'))
  const receiptDate = formData.get('receipt_date')

  // receipt_date 전용 컬럼이 없으므로 ocr_data 안에 함께 보관
  const mergedOcr =
    typeof receiptDate === 'string' && receiptDate
      ? { ...(ocrData ?? {}), date: ocrData?.date ?? receiptDate }
      : ocrData

  const imageUrl = `https://nbfoifegbamvtwffbuxv.supabase.co/storage/v1/object/public/receipts/demo-${Date.now()}.jpg`

  const insertFields: Record<string, unknown> = {
    user_id: DEMO_USER_ID,
    image_url: imageUrl,
    store_name: storeName,
    amount,
    points_earned: points,
    status: 'pending',
    ocr_data: mergedOcr,
  }
  if (mergedOcr) insertFields.analyzed_at = new Date().toISOString()

  try {
    const { data, error } = await db.from('receipts').insert(insertFields).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({
      id: `r-${Date.now()}`,
      ...insertFields,
      created_at: new Date().toISOString(),
    })
  }
}
