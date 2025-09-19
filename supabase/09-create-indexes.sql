-- 09. 성능 최적화용 인덱스 생성
-- Supabase SQL Editor에서 실행

-- assignments 테이블 인덱스 (자주 조회되는 컬럼들)
CREATE INDEX IF NOT EXISTS idx_assignments_workbook_id ON assignments(workbook_id);
CREATE INDEX IF NOT EXISTS idx_assignments_target_type_id ON assignments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_at ON assignments(due_at);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);

-- student_tasks 테이블 인덱스 (가장 중요한 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_student_tasks_user_id ON student_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_student_tasks_assignment_id ON student_tasks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_tasks_status ON student_tasks(status);
CREATE INDEX IF NOT EXISTS idx_student_tasks_user_status ON student_tasks(user_id, status);

-- answers 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_answers_student_task_id ON answers(student_task_id);
CREATE INDEX IF NOT EXISTS idx_answers_workbook_item_id ON answers(workbook_item_id);

-- workbook_items 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_workbook_items_workbook_id ON workbook_items(workbook_id);

-- srs_state 테이블 인덱스 (SRS 로직에 중요)
CREATE INDEX IF NOT EXISTS idx_srs_state_next_due_at ON srs_state(next_due_at);
CREATE INDEX IF NOT EXISTS idx_srs_state_streak ON srs_state(streak);

-- class_members 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_class_members_user_id ON class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_class_members_class_id ON class_members(class_id);

-- 이미지 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_workbook_item_images_workbook_item_id ON workbook_item_images(workbook_item_id);
CREATE INDEX IF NOT EXISTS idx_task_images_student_task_id ON task_images(student_task_id);

-- pdf_uploads 및 print_requests 인덱스
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_student_task_id ON pdf_uploads(student_task_id);
CREATE INDEX IF NOT EXISTS idx_print_requests_pdf_upload_id ON print_requests(pdf_upload_id);
CREATE INDEX IF NOT EXISTS idx_print_requests_status ON print_requests(status);

-- workbooks 테이블 검색 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_workbooks_subject ON workbooks(subject);
CREATE INDEX IF NOT EXISTS idx_workbooks_type ON workbooks(type);
CREATE INDEX IF NOT EXISTS idx_workbooks_created_by ON workbooks(created_by);
CREATE INDEX IF NOT EXISTS idx_workbooks_week ON workbooks(week);

-- 복합 인덱스 (자주 같이 사용되는 조건들)
CREATE INDEX IF NOT EXISTS idx_student_tasks_assignment_user ON student_tasks(assignment_id, user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_status ON assignments(due_at, created_by);