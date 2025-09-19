# Supabase 데이터베이스 설정 가이드

## 실행 순서

Supabase SQL Editor에서 다음 순서대로 실행하세요:

### 1. 01-setup-enums.sql
- ENUM 타입 생성 (subject, workbook_type, role, task_status, print_status, color_opt)

### 2. 02-create-tables.sql  
- 모든 테이블 생성
- 외래키 관계 설정

### 3. 03-setup-rls.sql
- 모든 테이블에 Row Level Security 활성화

### 4. 04-rls-policies.sql
- 각 테이블별 보안 정책 생성
- 역할별 접근 권한 설정

### 5. 05-functions-triggers.sql
- 사용자 프로필 자동 생성 함수/트리거
- updated_at 자동 업데이트 함수/트리거

### 6. 06-create-storage.sql
- Storage 버킷 생성 (pdf-submissions, item-images, task-images)
- Storage 정책 설정

### 7. 07-utility-views.sql
- 관리용 뷰 생성 (RLS 상태, 정책 정보, 완료율)
- 테스트 함수 생성

## 실행 후 확인

모든 스크립트 실행 후 다음 명령으로 확인:

```sql
-- RLS 상태 확인
SELECT * FROM rls_status;

-- 정책 확인  
SELECT * FROM table_policies;

-- 데이터베이스 설정 테스트
SELECT * FROM test_database_setup();
```

## 주요 특징

- **보안**: 모든 테이블에 RLS 적용, 역할별 접근 제어
- **자동화**: 사용자 생성 시 프로필 자동 생성, updated_at 자동 업데이트
- **Storage**: 파일 업로드를 위한 3개 버킷과 정책
- **모니터링**: 시스템 상태 확인을 위한 뷰와 함수

## 데이터베이스 스키마

```
profiles (사용자 프로필)
├── classes (반)
│   └── class_members (반 구성원)
├── workbooks (문제집)
│   ├── workbook_items (문제)
│   │   └── workbook_item_images (문제 이미지)
│   └── assignments (출제)
│       └── student_tasks (학생 과제)
│           ├── answers (답안)
│           │   └── srs_state (SRS 상태)
│           ├── essay_reviews (서술형 리뷰)
│           ├── viewing_notes (감상노트)
│           ├── lecture_summaries (강의 요약)
│           ├── pdf_uploads (PDF 업로드)
│           │   └── print_requests (인쇄 요청)
│           └── task_images (과제 이미지)
```