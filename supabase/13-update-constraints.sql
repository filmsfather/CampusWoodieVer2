-- 13. 제약조건 업데이트 (PDF 유형 지원)
-- Supabase SQL Editor에서 실행

-- 기존 workbook_items 테이블 제약조건 삭제
ALTER TABLE workbook_items 
DROP CONSTRAINT IF EXISTS chk_workbook_items_type;

-- 새로운 제약조건 추가 (pdf_task 포함)
ALTER TABLE workbook_items 
ADD CONSTRAINT chk_workbook_items_type 
CHECK (item_type IN ('short', 'mcq', 'essay', 'pdf_task'));