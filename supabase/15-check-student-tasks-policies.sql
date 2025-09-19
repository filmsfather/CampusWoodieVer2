-- 15. student_tasks 테이블의 현재 RLS 정책 확인

-- 현재 student_tasks 테이블의 모든 정책 조회
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'student_tasks'
ORDER BY policyname;