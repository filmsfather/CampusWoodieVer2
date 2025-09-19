-- 02. 테이블 생성
-- Supabase SQL Editor에서 실행

-- profiles 테이블
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role role[] NOT NULL DEFAULT '{student}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- classes 테이블
CREATE TABLE classes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- class_members 테이블
CREATE TABLE class_members (
  class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, user_id)
);

-- workbooks 테이블
CREATE TABLE workbooks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subject subject NOT NULL,
  type workbook_type NOT NULL,
  tags TEXT[] DEFAULT '{}',
  week INT,
  is_common BOOLEAN DEFAULT FALSE,
  required_count INT,
  youtube_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- workbook_items 테이블
CREATE TABLE workbook_items (
  id BIGSERIAL PRIMARY KEY,
  workbook_id BIGINT REFERENCES workbooks(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  item_type TEXT NOT NULL,
  options JSONB,
  answer_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- assignments 테이블
CREATE TABLE assignments (
  id BIGSERIAL PRIMARY KEY,
  workbook_id BIGINT REFERENCES workbooks(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  session_no INT,
  due_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- student_tasks 테이블
CREATE TABLE student_tasks (
  id BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status task_status DEFAULT 'pending',
  progress_pct INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- answers 테이블
CREATE TABLE answers (
  id BIGSERIAL PRIMARY KEY,
  student_task_id BIGINT REFERENCES student_tasks(id) ON DELETE CASCADE,
  workbook_item_id BIGINT REFERENCES workbook_items(id) ON DELETE CASCADE,
  response_text TEXT,
  selected_option INT,
  correctness TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- srs_state 테이블
CREATE TABLE srs_state (
  id BIGSERIAL PRIMARY KEY,
  answer_id BIGINT REFERENCES answers(id) ON DELETE CASCADE,
  streak INT DEFAULT 0,
  next_due_at TIMESTAMPTZ
);

-- essay_reviews 테이블
CREATE TABLE essay_reviews (
  id BIGSERIAL PRIMARY KEY,
  student_task_id BIGINT REFERENCES student_tasks(id) ON DELETE CASCADE,
  grade TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- viewing_notes 테이블
CREATE TABLE viewing_notes (
  id BIGSERIAL PRIMARY KEY,
  student_task_id BIGINT REFERENCES student_tasks(id) ON DELETE CASCADE,
  title TEXT,
  country TEXT,
  director TEXT,
  genre TEXT,
  subgenre TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- lecture_summaries 테이블
CREATE TABLE lecture_summaries (
  id BIGSERIAL PRIMARY KEY,
  student_task_id BIGINT REFERENCES student_tasks(id) ON DELETE CASCADE,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- pdf_uploads 테이블
CREATE TABLE pdf_uploads (
  id BIGSERIAL PRIMARY KEY,
  student_task_id BIGINT REFERENCES student_tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- print_requests 테이블
CREATE TABLE print_requests (
  id BIGSERIAL PRIMARY KEY,
  pdf_upload_id BIGINT REFERENCES pdf_uploads(id) ON DELETE CASCADE,
  preferred_date DATE,
  period TEXT,
  copies INT DEFAULT 1,
  color color_opt DEFAULT 'bw',
  status print_status DEFAULT 'requested',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- workbook_item_images 테이블 (문항 이미지)
CREATE TABLE workbook_item_images (
  id BIGSERIAL PRIMARY KEY,
  workbook_item_id BIGINT REFERENCES workbook_items(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- task_images 테이블 (과제 첨부 이미지)
CREATE TABLE task_images (
  id BIGSERIAL PRIMARY KEY,
  student_task_id BIGINT REFERENCES student_tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);