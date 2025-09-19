-- 10. 추가 제약조건 및 검증 규칙
-- Supabase SQL Editor에서 실행

-- workbooks 테이블 제약조건
ALTER TABLE workbooks 
ADD CONSTRAINT chk_workbooks_required_count 
CHECK (required_count IS NULL OR required_count > 0);

ALTER TABLE workbooks 
ADD CONSTRAINT chk_workbooks_youtube_url 
CHECK (type != 'LECTURE' OR youtube_url IS NOT NULL);

ALTER TABLE workbooks 
ADD CONSTRAINT chk_workbooks_week 
CHECK (week IS NULL OR week > 0);

-- student_tasks 테이블 제약조건
ALTER TABLE student_tasks 
ADD CONSTRAINT chk_student_tasks_progress 
CHECK (progress_pct >= 0 AND progress_pct <= 100);

-- assignments 테이블 제약조건
ALTER TABLE assignments 
ADD CONSTRAINT chk_assignments_target_type 
CHECK (target_type IN ('class', 'user'));

ALTER TABLE assignments 
ADD CONSTRAINT chk_assignments_due_at 
CHECK (due_at > created_at);

-- print_requests 테이블 제약조건
ALTER TABLE print_requests 
ADD CONSTRAINT chk_print_requests_copies 
CHECK (copies > 0 AND copies <= 100);

ALTER TABLE print_requests 
ADD CONSTRAINT chk_print_requests_preferred_date 
CHECK (preferred_date >= CURRENT_DATE);

-- workbook_items 테이블 제약조건
ALTER TABLE workbook_items 
ADD CONSTRAINT chk_workbook_items_type 
CHECK (item_type IN ('short', 'mcq', 'essay', 'pdf_task'));

-- answers 테이블 제약조건 
ALTER TABLE answers 
ADD CONSTRAINT chk_answers_correctness 
CHECK (correctness IS NULL OR correctness IN ('wrong', 'once', 'twice', 'thrice'));

-- srs_state 테이블 제약조건
ALTER TABLE srs_state 
ADD CONSTRAINT chk_srs_state_streak 
CHECK (streak >= 0 AND streak <= 3);

-- essay_reviews 테이블 제약조건
ALTER TABLE essay_reviews 
ADD CONSTRAINT chk_essay_reviews_grade 
CHECK (grade IS NULL OR grade IN ('상', '중상', '중', '중하', '하'));

-- 고유 제약조건들
ALTER TABLE class_members 
ADD CONSTRAINT unique_class_user 
UNIQUE (class_id, user_id);

ALTER TABLE srs_state 
ADD CONSTRAINT unique_answer_srs 
UNIQUE (answer_id);

-- 추가 비즈니스 규칙 제약조건
ALTER TABLE answers 
ADD CONSTRAINT chk_answer_response 
CHECK (
  (response_text IS NOT NULL AND selected_option IS NULL) OR
  (response_text IS NULL AND selected_option IS NOT NULL) OR
  (response_text IS NULL AND selected_option IS NULL)
);