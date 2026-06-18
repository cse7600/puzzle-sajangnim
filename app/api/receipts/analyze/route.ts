import { NextRequest, NextResponse } from 'next/server'
import { analyzeReceiptImage } from '@/lib/claude'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const imageFile = formData.get('image')

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return NextResponse.json(
      { error: '분석할 영수증 이미지가 없습니다. image 파일을 첨부해주세요.' },
      { status: 400 }
    )
  }

  const mediaType = imageFile.type || 'image/jpeg'
  const base64Image = Buffer.from(await imageFile.arrayBuffer()).toString('base64')

  try {
    const analysis = await analyzeReceiptImage(base64Image, mediaType)
    return NextResponse.json(analysis)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '영수증 분석 중 알 수 없는 오류가 발생했습니다'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
