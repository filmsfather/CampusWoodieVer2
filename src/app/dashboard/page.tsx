'use client'

import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

function DashboardContent() {
  const { profile } = useAuth()

  if (!profile) return null

  const getRoleSpecificContent = () => {
    const content = []

    if (profile.role.includes('student')) {
      content.push(
        <div key="student" className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">학생 메뉴</h2>
          <div className="space-y-3">
            <Link
              href="/student/tasks"
              className="block p-3 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">📚</span>
                <div>
                  <h3 className="font-medium text-gray-900">내 과제</h3>
                  <p className="text-sm text-gray-600">현재 진행 중인 과제를 확인하고 제출하세요.</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )
    }

    if (profile.role.includes('teacher')) {
      content.push(
        <div key="teacher" className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">선생님 메뉴</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              href="/teacher/workbooks"
              className="block p-3 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">📖</span>
                <div>
                  <h3 className="font-medium text-gray-900">문제집</h3>
                  <p className="text-sm text-gray-600">문제집을 생성하고 관리하세요.</p>
                </div>
              </div>
            </Link>
            
            <Link
              href="/teacher/assign"
              className="block p-3 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">✍️</span>
                <div>
                  <h3 className="font-medium text-gray-900">출제</h3>
                  <p className="text-sm text-gray-600">반이나 개별 학생에게 과제를 출제하세요.</p>
                </div>
              </div>
            </Link>
            
            <Link
              href="/teacher/classes"
              className="block p-3 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">👥</span>
                <div>
                  <h3 className="font-medium text-gray-900">반 현황</h3>
                  <p className="text-sm text-gray-600">반별 과제 진행 상황을 확인하세요.</p>
                </div>
              </div>
            </Link>
            
            <Link
              href="/teacher/reviews"
              className="block p-3 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">📝</span>
                <div>
                  <h3 className="font-medium text-gray-900">평가</h3>
                  <p className="text-sm text-gray-600">서술형 과제를 평가하고 피드백을 작성하세요.</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )
    }

    if (profile.role.includes('admin')) {
      content.push(
        <div key="admin" className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">관리자 메뉴</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/admin/classes"
              className="block p-3 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">🏫</span>
                <div>
                  <h3 className="font-medium text-gray-900">반 관리</h3>
                  <p className="text-sm text-gray-600">반을 생성하고 학생을 배정하세요.</p>
                </div>
              </div>
            </Link>
            
            <Link
              href="/admin/users"
              className="block p-3 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">👤</span>
                <div>
                  <h3 className="font-medium text-gray-900">사용자 관리</h3>
                  <p className="text-sm text-gray-600">사용자 권한을 관리하세요.</p>
                </div>
              </div>
            </Link>
            
            <Link
              href="/admin/print-queue"
              className="block p-3 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">🖨️</span>
                <div>
                  <h3 className="font-medium text-gray-900">인쇄 큐</h3>
                  <p className="text-sm text-gray-600">인쇄 요청을 관리하세요.</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )
    }

    return content
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            안녕하세요, {profile.name}님! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            오늘도 즐거운 영화 학습 되세요!
          </p>
        </div>

        <div className="space-y-6">
          {getRoleSpecificContent()}
        </div>

        {/* 최근 활동 섹션 */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h2>
          <div className="text-sm text-gray-600">
            <p>아직 활동 내역이 없습니다.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <DashboardContent />
    </ProtectedRoute>
  )
}