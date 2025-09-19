-- 12. Storage 설정 및 제약조건 구성
-- 클라이언트에서 사용할 파일 제약조건 정보

-- 파일 제약조건 설정 테이블
CREATE TABLE storage_config (
  id BIGSERIAL PRIMARY KEY,
  bucket_name TEXT UNIQUE NOT NULL,
  max_file_size_mb INTEGER NOT NULL,
  allowed_file_types TEXT[] NOT NULL,
  max_files_per_upload INTEGER DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage 설정 기본값 입력
INSERT INTO storage_config (bucket_name, max_file_size_mb, allowed_file_types, max_files_per_upload, description)
VALUES 
  ('pdf-submissions', 10, '{pdf}', 1, 'PDF 과제 제출물 - 과제당 1개 파일'),
  ('item-images', 5, '{jpg,jpeg,png,webp}', 10, '문제집 문항 이미지 - 문항당 최대 10개'),
  ('task-images', 5, '{jpg,jpeg,png,webp}', 20, '학생 과제 첨부 이미지 - 과제당 최대 20개');

-- Storage 설정 RLS 적용
ALTER TABLE storage_config ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 설정 조회 가능
CREATE POLICY "Authenticated users can view storage config" ON storage_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- 관리자만 설정 수정 가능
CREATE POLICY "Admins can manage storage config" ON storage_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND 'admin' = ANY(role)
    )
  );

-- Storage 설정 updated_at 트리거
DROP TRIGGER IF EXISTS update_storage_config_updated_at ON storage_config;
CREATE TRIGGER update_storage_config_updated_at
  BEFORE UPDATE ON storage_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 파일 유효성 검사 함수
CREATE OR REPLACE FUNCTION validate_file_upload(
  p_bucket_name TEXT,
  p_file_name TEXT,
  p_file_size BIGINT,
  p_current_file_count INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  config_row storage_config;
  file_extension TEXT;
  result JSONB := '{"valid": true}'::jsonb;
BEGIN
  -- 설정 정보 조회
  SELECT * INTO config_row 
  FROM storage_config 
  WHERE bucket_name = p_bucket_name;
  
  IF NOT FOUND THEN
    RETURN '{"valid": false, "error": "Unknown bucket"}'::jsonb;
  END IF;
  
  -- 파일 크기 검사
  IF p_file_size > (config_row.max_file_size_mb * 1024 * 1024) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('File size exceeds limit of %s MB', config_row.max_file_size_mb)
    );
  END IF;
  
  -- 파일 확장자 검사
  file_extension := lower(split_part(p_file_name, '.', -1));
  IF NOT (file_extension = ANY(config_row.allowed_file_types)) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('File type .%s not allowed. Allowed types: %s', 
                     file_extension, array_to_string(config_row.allowed_file_types, ', '))
    );
  END IF;
  
  -- 업로드 파일 개수 검사
  IF p_current_file_count >= config_row.max_files_per_upload THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('Maximum %s files allowed per upload', config_row.max_files_per_upload)
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 버킷별 현재 파일 개수 조회 함수
CREATE OR REPLACE FUNCTION get_file_count_for_path(
  p_bucket_name TEXT,
  p_path_prefix TEXT
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM storage.objects
    WHERE bucket_id = p_bucket_name
    AND name LIKE p_path_prefix || '%'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage 통계 함수
CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS TABLE(
  bucket_name TEXT,
  total_files BIGINT,
  total_size_mb NUMERIC,
  avg_file_size_mb NUMERIC,
  config_max_size_mb INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.bucket_name,
    COALESCE(ss.file_count, 0) as total_files,
    COALESCE(ss.total_size_mb, 0) as total_size_mb,
    CASE 
      WHEN COALESCE(ss.file_count, 0) > 0 
      THEN ROUND(COALESCE(ss.total_size_mb, 0) / ss.file_count, 2)
      ELSE 0 
    END as avg_file_size_mb,
    sc.max_file_size_mb as config_max_size_mb
  FROM storage_config sc
  LEFT JOIN storage_status ss ON ss.bucket_id = sc.bucket_name
  ORDER BY sc.bucket_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;