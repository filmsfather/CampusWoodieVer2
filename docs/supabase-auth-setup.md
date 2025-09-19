# Supabase 인증 설정 가이드

## Task 1.2: 이메일/비밀번호 인증 활성화 및 설정

### 1. Supabase 대시보드 접속
- URL: https://app.supabase.com/project/tenwdeilwnzunhngppho
- 프로젝트명: CampusWoodieVer2

### 2. Authentication 설정 확인

#### 2.1 Authentication 탭 접속
1. 좌측 메뉴에서 **Authentication** 클릭
2. **Settings** 탭 선택

#### 2.2 Email Provider 활성화
1. **Providers** 섹션으로 이동
2. **Email** 항목에서 **Enable** 토글이 활성화되어 있는지 확인
3. 비활성화되어 있다면 활성화

#### 2.3 이메일 확인 설정
1. **Email** 섹션에서 다음 설정 확인/구성:
   - **Enable email confirmations**: 체크 (사용자 가입 시 이메일 확인 필수)
   - **Secure email change**: 체크 (이메일 변경 시 확인 필요)

#### 2.4 비밀번호 정책 설정
1. **Auth** 섹션에서 다음 설정:
   - **Minimum password length**: 8
   - **Password requirements**: 
     - Include symbols: 체크
     - Include numbers: 체크
     - Include uppercase letters: 체크
     - Include lowercase letters: 체크

#### 2.5 URL 설정
1. **URL Configuration** 섹션에서:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: 
     ```
     http://localhost:3000
     http://localhost:3000/auth/callback
     http://localhost:3000/login
     ```

### 3. 이메일 템플릿 설정 (선택사항)
1. **Email Templates** 탭으로 이동
2. 필요에 따라 **Confirm signup**, **Reset password** 등의 템플릿 커스터마이징

### 4. 설정 저장
- 모든 설정 변경사항은 자동으로 저장됩니다
- **Save** 버튼이 있는 경우 클릭하여 저장

### 5. 테스트 계정 생성 (선택사항)
1. **Users** 탭으로 이동
2. **Add user** 버튼 클릭
3. 테스트용 이메일/비밀번호 입력하여 계정 생성

## 현재 상태
- ✅ Supabase 프로젝트 생성됨
- ✅ API 키 설정됨 
- ✅ Next.js 클라이언트 설치 및 설정됨
- 🔄 Authentication 설정 확인 필요
- ⏳ RLS 설정 대기 중

## 다음 단계
Task 1.2 완료 후 Task 1.4 (RLS 활성화 및 기본 정책 설정)로 진행