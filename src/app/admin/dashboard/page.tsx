'use client'

// 정적 생성 방지
export const dynamic = 'force-dynamic'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useState, useEffect } from 'react'
import { monitoringApi, SystemStats } from '@/lib/monitoring'

function AdminDashboardContent() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // 데이터 로드
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsData, healthData] = await Promise.all([
        monitoringApi.getSystemStats(),
        monitoringApi.getSystemHealth()
      ])
      
      setStats(statsData)
      setHealth(healthData)
      setError(null)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('대시보드 데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 새로고침
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  useEffect(() => {
    loadDashboardData()
    
    // 30초마다 자동 새로고침
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  // 상태별 색상
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCheckStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getCheckStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return '❓'
    }
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">시스템 대시보드</h1>
            <p className="text-gray-600 mt-2">시스템 현황과 통계를 확인하세요.</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {refreshing ? '새로고침 중...' : '새로고침'}
          </button>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">대시보드를 불러오는 중...</span>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={loadDashboardData}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && stats && health && (
          <>
            {/* 시스템 상태 */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">시스템 상태</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(health.overall as string)}`}>
                  {health.overall === 'healthy' ? '정상' : 
                   health.overall === 'warning' ? '주의' : '장애'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(health.checks as Record<string, unknown>[])?.map((check: Record<string, unknown>, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="mr-2">{getCheckStatusIcon(check.status as string)}</span>
                        <span className="font-medium">{check.name as string}</span>
                      </div>
                      <span className={`text-sm ${getCheckStatusColor(check.status as string)}`}>
                        {check.status === 'ok' ? '정상' : 
                         check.status === 'warning' ? '주의' : '오류'}
                      </span>
                    </div>
                    {(check.message as string) && (
                      <p className="text-sm text-gray-600 mt-2">{check.message as string}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 주요 통계 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">전체 사용자</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
                    <p className="text-xs text-gray-500">오늘 활성: {stats.active_users_today}명</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">🏫</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">전체 반</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_classes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">문제집</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_workbooks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <span className="text-2xl">📝</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">과제</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_assignments}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 과제 및 활동 통계 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* 과제 수행 현황 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">과제 수행 현황</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">진행 중인 과제</span>
                    <span className="font-bold text-blue-600">{stats.pending_tasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">완료된 과제</span>
                    <span className="font-bold text-green-600">{stats.completed_tasks}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ 
                        width: `${stats.pending_tasks + stats.completed_tasks > 0 
                          ? (stats.completed_tasks / (stats.pending_tasks + stats.completed_tasks)) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-500">
                    완료율: {stats.pending_tasks + stats.completed_tasks > 0 
                      ? Math.round((stats.completed_tasks / (stats.pending_tasks + stats.completed_tasks)) * 100)
                      : 0}%
                  </div>
                </div>
              </div>

              {/* 인쇄 요청 현황 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">인쇄 요청 현황</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">대기 중인 요청</span>
                    <span className="font-bold text-orange-600">{stats.print_requests_pending}</span>
                  </div>
                  {stats.print_requests_pending > 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-700">
                        처리가 필요한 인쇄 요청이 {stats.print_requests_pending}개 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Storage 사용량 */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage 사용량</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.storage_usage.total_files}</div>
                  <div className="text-sm text-gray-600">전체 파일</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.storage_usage.total_size_mb}</div>
                  <div className="text-sm text-gray-600">총 용량 (MB)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.storage_usage.pdf_files}</div>
                  <div className="text-sm text-gray-600">PDF 파일</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.storage_usage.image_files}</div>
                  <div className="text-sm text-gray-600">이미지 파일</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>참고:</strong> Storage 사용량 데이터는 Supabase Storage API를 통해 실시간으로 계산됩니다.
                </p>
              </div>
            </div>

            {/* 빠른 액션 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 액션</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a 
                  href="/admin/users"
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">👥</span>
                    <div>
                      <div className="font-medium text-gray-900">사용자 관리</div>
                      <div className="text-sm text-gray-600">권한 설정 및 반 배정</div>
                    </div>
                  </div>
                </a>

                <a 
                  href="/admin/classes"
                  className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🏫</span>
                    <div>
                      <div className="font-medium text-gray-900">반 관리</div>
                      <div className="text-sm text-gray-600">반 생성 및 멤버 관리</div>
                    </div>
                  </div>
                </a>

                <a 
                  href="/admin/print-queue"
                  className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🖨️</span>
                    <div>
                      <div className="font-medium text-gray-900">인쇄 큐</div>
                      <div className="text-sm text-gray-600">인쇄 요청 처리</div>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']} requireAuth={true}>
      <AdminDashboardContent />
    </ProtectedRoute>
  )
}