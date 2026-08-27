import type { Metadata } from 'next';
import { DraftNotice, ClauseList } from '../_components';
import { PRIVACY_CLAUSES, EFFECTIVE_DATE } from './content';

export const metadata: Metadata = {
  title: '개인정보처리방침 | 퍼즐 사장님',
  description: '퍼즐 사장님 서비스 개인정보처리방침(초안). 법무 검토 전 문서입니다.',
};

export default function PrivacyPage() {
  return (
    <>
      <p className="text-[13px] font-semibold text-muted">개인정보처리방침</p>
      <h1 className="mt-2 text-[26px] font-black leading-[1.25] text-ink">
        퍼즐 사장님 개인정보처리방침
      </h1>
      <p className="mt-4 text-[13px] text-muted-light">시행일 {EFFECTIVE_DATE}</p>

      <div className="mt-10">
        <DraftNotice effectiveDate={EFFECTIVE_DATE} />
      </div>

      <ClauseList clauses={PRIVACY_CLAUSES} />
    </>
  );
}
