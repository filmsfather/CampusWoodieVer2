-- 08. profiles 테이블 정책 수정 (무한 재귀 해결)
-- Supabase SQL Editor에서 실행

-- 기존 정책들 제거
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin and teachers can view all profiles" ON profiles;

-- 수정된 정책들 생성
-- 1. 사용자는 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 2. 사용자는 자신의 프로필만 업데이트 가능
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. 관리자와 교사는 모든 프로필 조회 가능 (재귀 문제 해결)
-- auth.uid()를 직접 사용하여 role 체크
CREATE POLICY "Admin and teachers can view all profiles" ON profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE id = auth.uid() 
      AND ('admin' = ANY(role) OR 'teacher' = ANY(role))
    )
  );

-- 대안: 더 단순한 정책 (추천)
-- 위 정책이 여전히 문제가 있다면 아래 주석을 해제하고 위 정책을 제거하세요

/*
-- 모든 정책 제거
DROP POLICY IF EXISTS "Admin and teachers can view all profiles" ON profiles;

-- 단순한 정책: 모든 인증된 사용자가 모든 프로필 조회 가능 (임시)
CREATE POLICY "Authenticated users can view profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
*/