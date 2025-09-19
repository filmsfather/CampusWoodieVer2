'use client'

// 정적 생성 방지
export const dynamic = 'force-dynamic'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { workbookApi, WorkbookWithDetails, WorkbookFilters, subjectLabels, typeLabels, typeColors, subjectColors } from '@/lib/workbooks'
import { useAuth } from '@/contexts/AuthContext'

function TeacherWorkbooksContent() {
  const { user } = useAuth()
  const [workbooks, setWorkbooks] = useState<WorkbookWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<WorkbookFilters>({
    subject: '',
    type: '',
    week: '',
    search: ''
  })

  // 문제집 목록 로드
  const loadWorkbooks = async () => {
    try {
      setLoading(true)
      const data = await workbookApi.getWorkbooks(filters)
      setWorkbooks(data)
      setError(null)
    } catch (err) {
      console.error('Error loading workbooks:', err)
      setError('문제집을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkbooks()
  }, [filters])

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof WorkbookFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 문제집 삭제 핸들러
  const handleDeleteWorkbook = async (id: number) => {
    if (!confirm('정말 이 문제집을 삭제하시겠습니까?')) {
      return
    }

    try {
      await workbookApi.deleteWorkbook(id)
      await loadWorkbooks() // 목록 새로고침
    } catch (err) {
      console.error('Error deleting workbook:', err)
      alert('문제집 삭제에 실패했습니다.')
    }
  }

  // 문항 수 계산
  const getItemCount = (workbook: WorkbookWithDetails) => {
    if (workbook.type === 'VIEWING') {
      return `${workbook.required_count || 0}개 감상노트`
    }
    if (workbook.type === 'LECTURE') {
      return '요약 제출'
    }
    if (workbook.type === 'PDF') {
      return 'PDF 제출'
    }
    return `${workbook.item_count || 0}개 문항`
  }
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">문제집 관리</h1>
            <p className="text-gray-600 mt-2">문제집을 생성하고 관리하세요.</p>
          </div>
          <Link
            href="/teacher/workbooks/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            + 새 문제집 만들기
          </Link>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="문제집 제목 검색..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 min-w-64"
            />
            
            <select 
              value={filters.subject || ''}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체 과목</option>
              <option value="연출">연출</option>
              <option value="작법">작법</option>
              <option value="연구">연구</option>
              <option value="통합">통합</option>
            </select>
            
            <select 
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체 유형</option>
              <option value="SRS형">SRS형</option>
              <option value="PDF 제출형">PDF 제출형</option>
              <option value="서술형">서술형</option>
              <option value="영화감상형">영화감상형</option>
              <option value="인터넷강의시청형">인터넷강의시청형</option>
            </select>
            
            <select 
              value={filters.week || ''}
              onChange={(e) => handleFilterChange('week', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체 주차</option>
              <option value="1주차">1주차</option>
              <option value="2주차">2주차</option>
              <option value="3주차">3주차</option>
              <option value="4주차">4주차</option>
              <option value="5주차">5주차</option>
              <option value="공통">공통</option>
            </select>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">문제집을 불러오는 중...</span>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={loadWorkbooks}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 문제집 목록 */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {workbooks.map((workbook) => (
              <div key={workbook.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{workbook.title}</h3>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${subjectColors[workbook.subject]}`}>
                        {subjectLabels[workbook.subject]}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${typeColors[workbook.type]}`}>
                        {typeLabels[workbook.type]}
                      </span>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                        {workbook.is_common ? '공통' : `${workbook.week}주차`}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/teacher/workbooks/edit/${workbook.id}`}
                      className="text-gray-600 hover:text-gray-900 p-1"
                      title="수정"
                    >
                      ✏️
                    </Link>
                    <button 
                      onClick={() => handleDeleteWorkbook(workbook.id)}
                      className="text-red-600 hover:text-red-900 p-1" 
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                  <span>{getItemCount(workbook)}</span>
                  <span>
                    {workbook.tags && workbook.tags.length > 0 
                      ? `태그: ${workbook.tags.join(', ')}` 
                      : '태그 없음'
                    }
                  </span>
                </div>
                
                <div className="flex space-x-3">
                  <Link
                    href={`/teacher/workbooks/preview/${workbook.id}`}
                    className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded-md hover:bg-blue-100 transition-colors text-sm text-center"
                  >
                    미리보기
                  </Link>
                  <Link
                    href={`/teacher/assign?workbook=${workbook.id}`}
                    className="flex-1 bg-green-50 text-green-700 px-3 py-2 rounded-md hover:bg-green-100 transition-colors text-sm text-center"
                  >
                    출제하기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !error && workbooks.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📖</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 생성된 문제집이 없습니다</h3>
            <p className="text-gray-600 mb-6">첫 번째 문제집을 만들어보세요!</p>
            <Link
              href="/teacher/workbooks/new"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              새 문제집 만들기
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function TeacherWorkbooksPage() {
  return (
    <ProtectedRoute allowedRoles={['teacher']} requireAuth={true}>
      <TeacherWorkbooksContent />
    </ProtectedRoute>
  )
}