-- 11. Storage 기능 향상 및 제약조건 추가
-- Supabase SQL Editor에서 실행

-- 파일 크기 제한을 위한 정책 업데이트 (파일 크기는 클라이언트에서 제어)
-- Supabase에서는 서버 레벨 파일 크기 제한이 기본 제공됨

-- PDF 파일 삭제 정책 (학생은 본인 파일만 삭제 가능)
CREATE POLICY "Students can delete own PDFs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pdf-submissions' AND
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.id::text = (string_to_array(name, '/'))[1]
      AND st.user_id = auth.uid()
    )
  );

-- 교사는 자신이 출제한 과제의 PDF 삭제 가능 (필요시)
CREATE POLICY "Teachers can delete PDFs for their assignments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pdf-submissions' AND
    EXISTS (
      SELECT 1 FROM student_tasks st
      JOIN assignments a ON a.id = st.assignment_id
      WHERE st.id::text = (string_to_array(name, '/'))[1]
      AND a.created_by = auth.uid()
    )
  );

-- 문항 이미지 삭제 정책 (교사는 본인 문제집의 이미지만 삭제 가능)
CREATE POLICY "Teachers can delete item images for own workbooks" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'item-images' AND
    EXISTS (
      SELECT 1 FROM workbook_items wi
      JOIN workbooks w ON w.id = wi.workbook_id
      WHERE wi.id::text = (string_to_array(name, '/'))[1]
      AND w.created_by = auth.uid()
    )
  );

-- 과제 이미지 삭제 정책 (학생은 본인 이미지만 삭제 가능)
CREATE POLICY "Students can delete own task images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-images' AND
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.id::text = (string_to_array(name, '/'))[1]
      AND st.user_id = auth.uid()
    )
  );

-- 교사는 자신이 출제한 과제의 이미지 삭제 가능 (필요시)
CREATE POLICY "Teachers can delete task images for their assignments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-images' AND
    EXISTS (
      SELECT 1 FROM student_tasks st
      JOIN assignments a ON a.id = st.assignment_id
      WHERE st.id::text = (string_to_array(name, '/'))[1]
      AND a.created_by = auth.uid()
    )
  );

-- 파일 업로드 로깅을 위한 테이블 생성
CREATE TABLE file_upload_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  bucket_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  action TEXT NOT NULL CHECK (action IN ('upload', 'delete')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 파일 로깅 테이블에 RLS 적용
ALTER TABLE file_upload_logs ENABLE ROW LEVEL SECURITY;

-- 파일 로깅 정책 (사용자는 본인 로그만 조회 가능)
CREATE POLICY "Users can view own file logs" ON file_upload_logs
  FOR SELECT USING (user_id = auth.uid());

-- 교사와 관리자는 모든 로그 조회 가능
CREATE POLICY "Teachers and admins can view all file logs" ON file_upload_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND ('admin' = ANY(role) OR 'teacher' = ANY(role))
    )
  );

-- 로그 삽입 정책
CREATE POLICY "Authenticated users can insert file logs" ON file_upload_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 파일 업로드 로깅 함수
CREATE OR REPLACE FUNCTION log_file_operation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO file_upload_logs (user_id, bucket_name, file_path, file_size, action)
    VALUES (auth.uid(), NEW.bucket_id, NEW.name, NEW.metadata->>'size', 'upload');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO file_upload_logs (user_id, bucket_name, file_path, action)
    VALUES (auth.uid(), OLD.bucket_id, OLD.name, 'delete');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 파일 업로드/삭제 로깅 트리거 생성
DROP TRIGGER IF EXISTS log_storage_operations ON storage.objects;
CREATE TRIGGER log_storage_operations
  AFTER INSERT OR DELETE ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION log_file_operation();

-- Storage 상태 확인 뷰
CREATE OR REPLACE VIEW storage_status AS
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::BIGINT) as total_size_bytes,
  ROUND(SUM((metadata->>'size')::BIGINT)::DECIMAL / 1024 / 1024, 2) as total_size_mb
FROM storage.objects 
GROUP BY bucket_id;

-- 사용자별 파일 사용량 뷰
CREATE OR REPLACE VIEW user_file_usage AS
SELECT 
  p.id as user_id,
  p.name as user_name,
  ful.bucket_name,
  COUNT(CASE WHEN ful.action = 'upload' THEN 1 END) as uploads,
  COUNT(CASE WHEN ful.action = 'delete' THEN 1 END) as deletes,
  SUM(CASE WHEN ful.action = 'upload' THEN ful.file_size ELSE 0 END) as total_uploaded_bytes
FROM profiles p
LEFT JOIN file_upload_logs ful ON ful.user_id = p.id
GROUP BY p.id, p.name, ful.bucket_name;