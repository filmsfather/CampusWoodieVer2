-- 18. Storage 로깅 함수 타입 오류 수정
-- Supabase SQL Editor에서 실행

-- 기존 트리거 삭제
DROP TRIGGER IF EXISTS log_storage_operations ON storage.objects;

-- 수정된 파일 업로드 로깅 함수 (타입 오류 해결)
CREATE OR REPLACE FUNCTION log_file_operation()
RETURNS TRIGGER AS $$
DECLARE
  file_size_val BIGINT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- metadata의 size를 안전하게 BIGINT로 변환
    BEGIN
      file_size_val := COALESCE((NEW.metadata->>'size')::BIGINT, 0);
    EXCEPTION WHEN OTHERS THEN
      file_size_val := 0;
    END;
    
    INSERT INTO file_upload_logs (user_id, bucket_name, file_path, file_size, action)
    VALUES (auth.uid(), NEW.bucket_id, NEW.name, file_size_val, 'upload');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO file_upload_logs (user_id, bucket_name, file_path, action)
    VALUES (auth.uid(), OLD.bucket_id, OLD.name, 'delete');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 다시 생성
CREATE TRIGGER log_storage_operations
  AFTER INSERT OR DELETE ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION log_file_operation();

-- Storage 상태 확인 뷰도 수정 (타입 안전성 향상)
CREATE OR REPLACE VIEW storage_status AS
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  COALESCE(SUM(
    CASE 
      WHEN metadata->>'size' ~ '^[0-9]+$' 
      THEN (metadata->>'size')::BIGINT 
      ELSE 0 
    END
  ), 0) as total_size_bytes,
  ROUND(
    COALESCE(SUM(
      CASE 
        WHEN metadata->>'size' ~ '^[0-9]+$' 
        THEN (metadata->>'size')::BIGINT 
        ELSE 0 
      END
    ), 0)::DECIMAL / 1024 / 1024, 2
  ) as total_size_mb
FROM storage.objects 
GROUP BY bucket_id;