-- 01. ENUM 타입 생성
-- Supabase SQL Editor에서 실행

-- 과목 타입
CREATE TYPE subject AS ENUM ('directing', 'writing', 'research', 'integrated');

-- 문제집 타입  
CREATE TYPE workbook_type AS ENUM ('SRS', 'PDF', 'ESSAY', 'VIEWING', 'LECTURE');

-- 사용자 역할
CREATE TYPE role AS ENUM ('student', 'teacher', 'admin');

-- 과제 상태
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');

-- 인쇄 상태
CREATE TYPE print_status AS ENUM ('requested', 'done', 'canceled');

-- 색상 옵션
CREATE TYPE color_opt AS ENUM ('bw', 'color');