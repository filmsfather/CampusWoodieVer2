-- 16. student_tasks 테이블에 INSERT 정책 추가
-- 교사가 과제 출제 시 student_tasks를 생성할 수 있도록 허용

-- 교사가 자신이 생성한 assignment에 대해 student_tasks를 생성할 수 있도록 허용
CREATE POLICY "Teachers can create student tasks for their assignments" ON student_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a 
      WHERE a.id = assignment_id 
      AND a.created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND 'teacher' = ANY(role)
      )
    )
  );

-- 관리자가 모든 student_tasks를 관리할 수 있도록 허용
CREATE POLICY "Admins can manage all student tasks" ON student_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND 'admin' = ANY(role)
    )
  );