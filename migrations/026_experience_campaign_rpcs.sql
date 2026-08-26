-- 026_experience_campaign_rpcs.sql
-- 한끼 체험단 예산 원자 처리 (join_team_deal과 동일하게 행잠금 기반 원자 함수로 구현 —
-- 클라이언트 사이드 read-modify-write는 경쟁 상태에서 예산 초과/이중지급이 발생할 수 있음)
-- Created: 2026-08-26

-- 캠페인을 충전 확정 + 승인 처리 (수수료 선차감, budget_available 확정)
CREATE OR REPLACE FUNCTION experience_activate_campaign(p_campaign_id uuid)
RETURNS void AS $$
DECLARE
  v_budget_total integer;
  v_fee_rate numeric(5,2);
  v_fee_amount integer;
  v_available integer;
BEGIN
  SELECT budget_total, fee_rate INTO v_budget_total, v_fee_rate
  FROM experience_campaigns WHERE id = p_campaign_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_not_found';
  END IF;

  v_fee_amount := ROUND(v_budget_total * v_fee_rate / 100);
  v_available := v_budget_total - v_fee_amount;

  UPDATE experience_campaigns
  SET fee_amount = v_fee_amount,
      budget_available = v_available,
      status = 'active',
      charge_confirmed = true,
      charge_confirmed_at = now(),
      updated_at = now()
  WHERE id = p_campaign_id;

  INSERT INTO experience_campaign_ledger (campaign_id, type, amount, balance_after, note)
  VALUES (p_campaign_id, 'fee', -v_fee_amount, v_available, '캠페인 승인 시 수수료 선차감');
END;
$$ LANGUAGE plpgsql;

-- 참여자 승인 시 페이백 단가만큼 예산 예약(escrow). 예산 부족 시 예외.
-- 예약 후 남은 예산이 단가 미만이면 캠페인을 자동 일시중지(paused)한다.
CREATE OR REPLACE FUNCTION experience_approve_participant(p_participant_id uuid)
RETURNS text AS $$
DECLARE
  v_campaign_id uuid;
  v_payback integer;
  v_status text;
  v_campaign_status text;
  v_available integer;
  v_reserved integer;
  v_new_status text;
BEGIN
  SELECT campaign_id, status INTO v_campaign_id, v_status
  FROM experience_participants WHERE id = p_participant_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'participant_not_found';
  END IF;
  IF v_status <> 'applied' THEN
    RAISE EXCEPTION 'invalid_participant_status: %', v_status;
  END IF;

  SELECT payback_amount, status, budget_available, budget_reserved
  INTO v_payback, v_campaign_status, v_available, v_reserved
  FROM experience_campaigns WHERE id = v_campaign_id FOR UPDATE;

  IF v_campaign_status <> 'active' THEN
    RAISE EXCEPTION 'campaign_not_active';
  END IF;
  IF v_available < v_payback THEN
    RAISE EXCEPTION 'insufficient_budget';
  END IF;

  v_available := v_available - v_payback;
  v_reserved := v_reserved + v_payback;
  v_new_status := CASE WHEN v_available < v_payback THEN 'paused' ELSE v_campaign_status END;

  UPDATE experience_campaigns
  SET budget_available = v_available, budget_reserved = v_reserved,
      status = v_new_status, updated_at = now()
  WHERE id = v_campaign_id;

  UPDATE experience_participants
  SET status = 'approved', approved_at = now(), updated_at = now()
  WHERE id = p_participant_id;

  INSERT INTO experience_campaign_ledger (campaign_id, participant_id, type, amount, balance_after, note)
  VALUES (v_campaign_id, p_participant_id, 'reserve', -v_payback, v_available, '참여 승인 - 예산 예약');

  RETURN v_new_status;
END;
$$ LANGUAGE plpgsql;

-- 참여자 반려/만료 시 예약된 예산을 해제하고, 일시중지 상태였다면 예산이 회복된 만큼 자동 재개한다.
CREATE OR REPLACE FUNCTION experience_release_participant(p_participant_id uuid, p_new_status text, p_reason text)
RETURNS void AS $$
DECLARE
  v_campaign_id uuid;
  v_payback integer;
  v_status text;
  v_campaign_status text;
  v_available integer;
  v_reserved integer;
  v_had_reservation boolean;
BEGIN
  IF p_new_status NOT IN ('rejected', 'expired') THEN
    RAISE EXCEPTION 'invalid_target_status: %', p_new_status;
  END IF;

  SELECT campaign_id, status INTO v_campaign_id, v_status
  FROM experience_participants WHERE id = p_participant_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'participant_not_found';
  END IF;
  IF v_status IN ('paid', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'invalid_participant_status: %', v_status;
  END IF;

  v_had_reservation := v_status IN ('approved', 'content_submitted', 'verifying', 'verified');

  SELECT payback_amount, status, budget_available, budget_reserved
  INTO v_payback, v_campaign_status, v_available, v_reserved
  FROM experience_campaigns WHERE id = v_campaign_id FOR UPDATE;

  IF v_had_reservation THEN
    v_available := v_available + v_payback;
    v_reserved := v_reserved - v_payback;

    UPDATE experience_campaigns
    SET budget_available = v_available, budget_reserved = v_reserved,
        status = CASE WHEN v_campaign_status = 'paused' AND v_available >= v_payback THEN 'active' ELSE v_campaign_status END,
        updated_at = now()
    WHERE id = v_campaign_id;

    INSERT INTO experience_campaign_ledger (campaign_id, participant_id, type, amount, balance_after, note)
    VALUES (v_campaign_id, p_participant_id, 'release', v_payback, v_available, COALESCE(p_reason, '참여 반려/만료 - 예산 해제'));
  END IF;

  UPDATE experience_participants
  SET status = p_new_status, reject_reason = p_reason, updated_at = now()
  WHERE id = p_participant_id;
END;
$$ LANGUAGE plpgsql;

-- 검증 완료 + 예약된 예산을 실지급 처리. 이중지급은 ledger의 partial unique index로 하드 차단.
CREATE OR REPLACE FUNCTION experience_payout_participant(p_participant_id uuid, p_note text)
RETURNS void AS $$
DECLARE
  v_campaign_id uuid;
  v_payback integer;
  v_status text;
  v_available integer;
  v_reserved integer;
BEGIN
  SELECT campaign_id, status INTO v_campaign_id, v_status
  FROM experience_participants WHERE id = p_participant_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'participant_not_found';
  END IF;
  IF v_status NOT IN ('content_submitted', 'verifying', 'verified') THEN
    RAISE EXCEPTION 'invalid_participant_status: %', v_status;
  END IF;

  SELECT payback_amount, budget_available, budget_reserved
  INTO v_payback, v_available, v_reserved
  FROM experience_campaigns WHERE id = v_campaign_id FOR UPDATE;

  v_reserved := v_reserved - v_payback;

  UPDATE experience_campaigns
  SET budget_reserved = v_reserved, updated_at = now()
  WHERE id = v_campaign_id;

  -- unique index (participant_id) WHERE type='payout' 가 이중지급을 막는다 — 위반 시 예외로 롤백.
  INSERT INTO experience_campaign_ledger (campaign_id, participant_id, type, amount, balance_after, note)
  VALUES (v_campaign_id, p_participant_id, 'payout', -v_payback, v_available, COALESCE(p_note, '검증 완료 - 페이백 지급'));

  UPDATE experience_participants
  SET status = 'paid', payout_amount = v_payback, verified_at = COALESCE(verified_at, now()), paid_at = now(), updated_at = now()
  WHERE id = p_participant_id;
END;
$$ LANGUAGE plpgsql;
