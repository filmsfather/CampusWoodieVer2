-- 06. Storage 버킷 생성 및 정책 설정
-- Supabase SQL Editor에서 실행

-- Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('pdf-submissions', 'pdf-submissions', false),
  ('item-images', 'item-images', true),
  ('task-images', 'task-images', false);

-- PDF 제출물 버킷 정책
CREATE POLICY "Students can upload own PDFs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pdf-submissions' AND
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.id::text = (string_to_array(name, '/'))[1]
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own PDFs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pdf-submissions' AND
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.id::text = (string_to_array(name, '/'))[1]
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view PDFs for their assignments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pdf-submissions' AND
    EXISTS (
      SELECT 1 FROM student_tasks st
      JOIN assignments a ON a.id = st.assignment_id
      WHERE st.id::text = (string_to_array(name, '/'))[1]
      AND a.created_by = auth.uid()
    )
  );

-- 문항 이미지 버킷 정책 (공개)
CREATE POLICY "Anyone can view item images" ON storage.objects
  FOR SELECT USING (bucket_id = 'item-images');

CREATE POLICY "Teachers can upload item images for own workbooks" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'item-images' AND
    EXISTS (
      SELECT 1 FROM workbook_items wi
      JOIN workbooks w ON w.id = wi.workbook_id
      WHERE wi.id::text = (string_to_array(name, '/'))[1]
      AND w.created_by = auth.uid()
    )
  );

-- 과제 이미지 버킷 정책
CREATE POLICY "Students can upload own task images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-images' AND
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.id::text = (string_to_array(name, '/'))[1]
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own task images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-images' AND
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.id::text = (string_to_array(name, '/'))[1]
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view task images for their assignments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-images' AND
    EXISTS (
      SELECT 1 FROM student_tasks st
      JOIN assignments a ON a.id = st.assignment_id
      WHERE st.id::text = (string_to_array(name, '/'))[1]
      AND a.created_by = auth.uid()
    )
  );