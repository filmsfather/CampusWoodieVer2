-- 04. RLS 정책 생성
-- Supabase SQL Editor에서 실행

-- profiles 테이블 정책
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin and teachers can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND ('admin' = ANY(role) OR 'teacher' = ANY(role))
    )
  );

-- classes 테이블 정책
CREATE POLICY "Teachers and admins can view all classes" ON classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND ('admin' = ANY(role) OR 'teacher' = ANY(role))
    )
  );

CREATE POLICY "Admins can manage classes" ON classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND 'admin' = ANY(role)
    )
  );

-- class_members 테이블 정책
CREATE POLICY "Users can view their class memberships" ON class_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Teachers and admins can view all class memberships" ON class_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND ('admin' = ANY(role) OR 'teacher' = ANY(role))
    )
  );

CREATE POLICY "Admins can manage class memberships" ON class_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND 'admin' = ANY(role)
    )
  );

-- workbooks 테이블 정책
CREATE POLICY "Teachers can create workbooks" ON workbooks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND 'teacher' = ANY(role)
    )
  );

CREATE POLICY "Teachers can view and edit own workbooks" ON workbooks
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "All users can view workbooks" ON workbooks
  FOR SELECT USING (true);

-- workbook_items 테이블 정책
CREATE POLICY "Teachers can manage workbook items" ON workbook_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workbooks w 
      WHERE w.id = workbook_id 
      AND w.created_by = auth.uid()
    )
  );

CREATE POLICY "All users can view workbook items" ON workbook_items
  FOR SELECT USING (true);

-- assignments 테이블 정책
CREATE POLICY "Teachers can create assignments" ON assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND 'teacher' = ANY(role)
    )
  );

CREATE POLICY "Teachers can view own assignments" ON assignments
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Students can view their assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.assignment_id = id 
      AND st.user_id = auth.uid()
    )
  );

-- student_tasks 테이블 정책
CREATE POLICY "Students can view own tasks" ON student_tasks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Students can update own tasks" ON student_tasks
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Teachers can view tasks for their assignments" ON student_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a 
      WHERE a.id = assignment_id 
      AND a.created_by = auth.uid()
    )
  );

-- answers 테이블 정책
CREATE POLICY "Students can manage own answers" ON answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.id = student_task_id 
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view answers for their assignments" ON answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_tasks st
      JOIN assignments a ON a.id = st.assignment_id
      WHERE st.id = student_task_id 
      AND a.created_by = auth.uid()
    )
  );

-- srs_state 테이블 정책
CREATE POLICY "Students can manage own SRS state" ON srs_state
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM answers ans
      JOIN student_tasks st ON st.id = ans.student_task_id
      WHERE ans.id = answer_id 
      AND st.user_id = auth.uid()
    )
  );

-- essay_reviews 테이블 정책
CREATE POLICY "Teachers can manage reviews for their assignments" ON essay_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM student_tasks st
      JOIN assignments a ON a.id = st.assignment_id
      WHERE st.id = student_task_id 
      AND a.created_by = auth.uid()
    )
  );

CREATE POLICY "Students can view own reviews" ON essay_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.id = student_task_id 
      AND st.user_id = auth.uid()
    )
  );

-- viewing_notes 테이블 정책
CREATE POLICY "Students can manage own viewing notes" ON viewing_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.id = student_task_id 
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view notes for their assignments" ON viewing_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_tasks st
      JOIN assignments a ON a.id = st.assignment_id
      WHERE st.id = student_task_id 
      AND a.created_by = auth.uid()
    )
  );

-- lecture_summaries 테이블 정책
CREATE POLICY "Students can manage own summaries" ON lecture_summaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.id = student_task_id 
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view summaries for their assignments" ON lecture_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_tasks st
      JOIN assignments a ON a.id = st.assignment_id
      WHERE st.id = student_task_id 
      AND a.created_by = auth.uid()
    )
  );

-- pdf_uploads 테이블 정책
CREATE POLICY "Students can manage own PDF uploads" ON pdf_uploads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.id = student_task_id 
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view PDFs for their assignments" ON pdf_uploads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_tasks st
      JOIN assignments a ON a.id = st.assignment_id
      WHERE st.id = student_task_id 
      AND a.created_by = auth.uid()
    )
  );

-- print_requests 테이블 정책
CREATE POLICY "Teachers can manage print requests for their assignments" ON print_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pdf_uploads pu
      JOIN student_tasks st ON st.id = pu.student_task_id
      JOIN assignments a ON a.id = st.assignment_id
      WHERE pu.id = pdf_upload_id 
      AND a.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can view all print requests" ON print_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND 'admin' = ANY(role)
    )
  );

-- workbook_item_images 테이블 정책
CREATE POLICY "Teachers can manage item images for own workbooks" ON workbook_item_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workbook_items wi
      JOIN workbooks w ON w.id = wi.workbook_id
      WHERE wi.id = workbook_item_id 
      AND w.created_by = auth.uid()
    )
  );

CREATE POLICY "All users can view item images" ON workbook_item_images
  FOR SELECT USING (true);

-- task_images 테이블 정책
CREATE POLICY "Students can manage own task images" ON task_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM student_tasks st 
      WHERE st.id = student_task_id 
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view task images for their assignments" ON task_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_tasks st
      JOIN assignments a ON a.id = st.assignment_id
      WHERE st.id = student_task_id 
      AND a.created_by = auth.uid()
    )
  );