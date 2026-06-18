// Claude Vision API 호출 유틸 (anthropic SDK 미설치 → fetch 직접 호출)

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const VISION_MODEL = 'claude-haiku-4-5';

export type ReceiptAnalysis = {
  store_name: string | null;
  total_amount: number | null;
  date: string | null;
  items: { name: string; price: number }[];
};

const RECEIPT_PROMPT = `이 영수증 이미지에서 다음 정보를 JSON으로만 추출해주세요. 설명 없이 JSON만 출력하세요.
{
  "store_name": "가게명",
  "total_amount": 숫자(원, 콤마 없이),
  "date": "YYYY-MM-DD",
  "items": [{"name": "품목명", "price": 숫자}]
}
정보를 찾을 수 없는 필드는 null로 표시하세요.`;

function parseJsonBlock(text: string): ReceiptAnalysis {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Claude 응답에서 JSON을 찾을 수 없습니다');
  }
  const parsed = JSON.parse(match[0]) as ReceiptAnalysis;
  return {
    store_name: parsed.store_name ?? null,
    total_amount:
      typeof parsed.total_amount === 'number' ? parsed.total_amount : null,
    date: parsed.date ?? null,
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}

export async function analyzeReceiptImage(
  base64Image: string,
  mediaType: string
): Promise<ReceiptAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 가 설정되지 않았습니다');

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            { type: 'text', text: RECEIPT_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Claude API 오류 (${response.status}): ${errBody}`);
  }

  const payload = (await response.json()) as {
    content: { type: string; text: string }[];
  };
  const textBlock = payload.content.find((block) => block.type === 'text');
  if (!textBlock) throw new Error('Claude 응답에 텍스트 블록이 없습니다');
  return parseJsonBlock(textBlock.text);
}
