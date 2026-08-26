import type { PlaceBasicInfo } from '@/lib/naver-place'

function todayDate(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

// 네이버 기본정보를 snapshot row 로 변환. register(등록)와 collect(비동기 수집) 둘 다 쓴다.
export function toSnapshotRow(registrationId: string, info: PlaceBasicInfo) {
  return {
    registration_id: registrationId,
    snapshot_date: todayDate(),
    review_count: info.reviewCount,
    visitor_review_count: info.visitorReviewCount,
    blog_review_count: info.blogReviewCount,
    rating: info.rating,
    photo_count: info.photoCount,
    has_reservation: info.hasReservation,
    has_smart_order: info.hasSmartOrder,
    coupon_count: info.couponCount,
    keyword_count: info.keywordList?.length ?? null,
    keyword_list: info.keywordList,
    has_description: info.description !== null,
    menu_count: info.menuCount,
    business_photo_urls: info.businessPhotoUrls,
    review_photo_urls: info.reviewPhotoUrls,
    raw_data: info.raw,
  }
}
