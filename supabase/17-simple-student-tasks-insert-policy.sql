-- 17. student_tasks 테이블 INSERT 정책 (단순화 버전)
-- 무한 재귀 문제를 피하기 위한 단순한 정책

-- 인증된 사용자(교사)가 student_tasks를 생성할 수 있도록 허용
-- 실제 권한 체크는 애플리케이션 레벨에서 수행
CREATE POLICY "Authenticated users can create student tasks" ON student_tasks
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM assignments a 
      WHERE a.id = assignment_id 
      AND a.created_by = auth.uid()
    )
  );