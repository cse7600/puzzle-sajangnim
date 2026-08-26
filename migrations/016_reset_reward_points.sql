-- 5,000P 현상금 로직 삭제에 따라 기존 시드 데이터 reward_points를 0으로 초기화
-- reward_points 컬럼 자체는 유지 (향후 재활용 가능)
UPDATE knowledge_questions SET reward_points = 0 WHERE reward_points > 0;
