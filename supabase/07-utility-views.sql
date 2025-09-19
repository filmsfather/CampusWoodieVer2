-- 07. 유틸리티 뷰 및 함수 생성
-- Supabase SQL Editor에서 실행

-- RLS 상태 확인 뷰
CREATE OR REPLACE VIEW rls_status AS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN 'Enabled'
    ELSE 'Disabled'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 정책 정보 확인 뷰
CREATE OR REPLACE VIEW table_policies AS
SELECT 
  pol.schemaname,
  pol.tablename,
  pol.policyname,
  pol.permissive,
  pol.roles,
  pol.cmd,
  pol.qual,
  pol.with_check
FROM pg_policies pol
WHERE pol.schemaname = 'public'
ORDER BY pol.tablename, pol.policyname;

-- 학생별 완료율 계산 뷰
CREATE OR REPLACE VIEW student_completion_rates AS
SELECT 
  u.id as user_id,
  u.name as student_name,
  c.id as class_id,
  c.name as class_name,
  COUNT(st.id) as total_tasks,
  COUNT(CASE WHEN st.status = 'completed' THEN 1 END) as completed_tasks,
  CASE 
    WHEN COUNT(st.id) > 0 THEN 
      ROUND((COUNT(CASE WHEN st.status = 'completed' THEN 1 END)::DECIMAL / COUNT(st.id)) * 100, 2)
    ELSE 0 
  END as completion_rate
FROM profiles u
JOIN class_members cm ON cm.user_id = u.id
JOIN classes c ON c.id = cm.class_id
LEFT JOIN student_tasks st ON st.user_id = u.id
LEFT JOIN assignments a ON a.id = st.assignment_id AND a.due_at < NOW()
WHERE 'student' = ANY(u.role)
GROUP BY u.id, u.name, c.id, c.name;

-- 반별 과제 현황 뷰
CREATE OR REPLACE VIEW class_assignment_status AS
SELECT 
  c.id as class_id,
  c.name as class_name,
  a.id as assignment_id,
  w.title as assignment_title,
  w.type as assignment_type,
  a.due_at,
  COUNT(st.id) as total_students,
  COUNT(CASE WHEN st.status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN st.status != 'completed' THEN 1 END) as incomplete_count,
  CASE 
    WHEN COUNT(st.id) > 0 THEN 
      ROUND((COUNT(CASE WHEN st.status = 'completed' THEN 1 END)::DECIMAL / COUNT(st.id)) * 100, 2)
    ELSE 0 
  END as completion_rate
FROM classes c
JOIN assignments a ON (
  (a.target_type = 'class' AND a.target_id = c.id::text) OR
  (a.target_type = 'user' AND EXISTS (
    SELECT 1 FROM class_members cm 
    WHERE cm.class_id = c.id AND cm.user_id = a.target_id::uuid
  ))
)
JOIN workbooks w ON w.id = a.workbook_id
LEFT JOIN student_tasks st ON st.assignment_id = a.id
GROUP BY c.id, c.name, a.id, w.title, w.type, a.due_at;

-- 테스트용 함수
CREATE OR REPLACE FUNCTION test_database_setup()
RETURNS TABLE(
  test_name TEXT,
  result TEXT,
  description TEXT
) AS $$
BEGIN
  -- RLS 활성화 확인
  RETURN QUERY
  SELECT 
    'RLS Status Check'::TEXT,
    CASE 
      WHEN (SELECT COUNT(*) FROM rls_status WHERE rls_enabled = false) = 0 
      THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END,
    'All tables should have RLS enabled'::TEXT;
    
  -- 기본 테이블 존재 확인
  RETURN QUERY
  SELECT 
    'Tables Exist Check'::TEXT,
    CASE 
      WHEN (SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('profiles', 'classes', 'workbooks', 'student_tasks')) = 4
      THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END,
    'Core tables should exist'::TEXT;
    
  -- Storage 버킷 존재 확인
  RETURN QUERY
  SELECT 
    'Storage Buckets Check'::TEXT,
    CASE 
      WHEN (SELECT COUNT(*) FROM storage.buckets 
            WHERE name IN ('pdf-submissions', 'item-images', 'task-images')) = 3
      THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END,
    'Storage buckets should exist'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;