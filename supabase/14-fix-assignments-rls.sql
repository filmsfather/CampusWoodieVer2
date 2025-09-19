-- 14. assignments 테이블 RLS 정책 수정
-- 무한 재귀 문제 해결

-- 기존 문제가 있는 정책 삭제
DROP POLICY IF EXISTS "Students can view their assignments" ON assignments;

-- 새로운 정책 생성 - 순환 참조 없이 구현
-- 학생은 target_type과 target_id를 통해 직접 확인
CREATE POLICY "Students can view assignments targeted to them" ON assignments
  FOR SELECT USING (
    -- 반 전체 대상 과제인 경우
    (target_type = 'class' AND 
     EXISTS (
       SELECT 1 FROM class_members cm 
       WHERE cm.class_id = target_id::bigint 
       AND cm.user_id = auth.uid()
     ))
    OR
    -- 개별 학생 대상 과제인 경우
    (target_type = 'individual' AND 
     auth.uid()::text = ANY(string_to_array(target_id, ',')))
  );