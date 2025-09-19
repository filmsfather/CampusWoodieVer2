'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useState, useEffect } from 'react'
import { printRequestApi, PrintRequest, PrintRequestFilters } from '@/lib/print-requests'
import { supabase } from '@/lib/supabase'

function AdminPrintQueueContent() {
  const [printRequests, setPrintRequests] = useState<PrintRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PrintRequestFilters>({
    status: 'all',
    class_id: '',
    period: '',
    preferred_date: '',
    teacher_id: ''
  })
  const [stats, setStats] = useState({
    total_requests: 0,
    pending_requests: 0,
    completed_requests: 0,
    canceled_requests: 0
  })

  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([])
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string }>>([])
  const [selectedRequests, setSelectedRequests] = useState<number[]>([])

  // 기초 데이터 로드
  const loadBasicData = async () => {
    // 반 목록 로드
    const { data: classData } = await supabase
      .from('classes')
      .select('id, name')
      .order('name')

    if (classData) setClasses(classData)

    // 교사 목록 로드
    const { data: teacherData } = await supabase
      .from('profiles')
      .select('id, name')
      .contains('role', ['teacher'])
      .order('name')

    if (teacherData) setTeachers(teacherData)
  }

  // 인쇄 요청 목록 로드
  const loadPrintRequests = async () => {
    try {
      setLoading(true)
      const data = await printRequestApi.getPrintRequests(filters)
      setPrintRequests(data)
      setError(null)
    } catch (err) {
      console.error('Error loading print requests:', err)
      setError('인쇄 요청 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 통계 로드
  const loadStats = async () => {
    try {
      const data = await printRequestApi.getPrintQueueStats()
      setStats(data)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  useEffect(() => {
    loadBasicData()
    loadStats()
  }, [])

  useEffect(() => {
    loadPrintRequests()
  }, [filters])

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof PrintRequestFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 인쇄 요청 상태 변경
  const handleStatusChange = async (requestId: number, status: 'requested' | 'done' | 'canceled') => {
    try {
      await printRequestApi.updatePrintRequestStatus(requestId, status)
      loadPrintRequests()
      loadStats()
    } catch (err) {
      console.error('Error updating status:', err)
      alert('상태 변경에 실패했습니다.')
    }
  }

  // 다중 선택 처리
  const handleSelectRequest = (requestId: number, checked: boolean) => {
    setSelectedRequests(prev => 
      checked 
        ? [...prev, requestId]
        : prev.filter(id => id !== requestId)
    )
  }

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    setSelectedRequests(
      checked ? printRequests.map(req => req.id) : []
    )
  }

  // 선택된 요청들 일괄 처리
  const handleBulkStatusChange = async (status: 'done' | 'canceled') => {
    if (selectedRequests.length === 0) {
      alert('처리할 요청을 선택해주세요.')
      return
    }

    if (!confirm(`선택된 ${selectedRequests.length}개 요청을 ${status === 'done' ? '완료' : '취소'} 처리하시겠습니까?`)) {
      return
    }

    try {
      await Promise.all(
        selectedRequests.map(id => 
          printRequestApi.updatePrintRequestStatus(id, status)
        )
      )
      
      alert(`${selectedRequests.length}개 요청이 처리되었습니다.`)
      setSelectedRequests([])
      loadPrintRequests()
      loadStats()
    } catch (err) {
      console.error('Error bulk updating status:', err)
      alert('일괄 처리에 실패했습니다.')
    }
  }

  // 인쇄 요청 삭제
  const handleDeleteRequest = async (requestId: number) => {
    if (!confirm('정말 이 인쇄 요청을 삭제하시겠습니까?')) return

    try {
      await printRequestApi.deletePrintRequest(requestId)
      loadPrintRequests()
      loadStats()
    } catch (err) {
      console.error('Error deleting request:', err)
      alert('삭제에 실패했습니다.')
    }
  }

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'text-orange-600 bg-orange-50'
      case 'done': return 'text-green-600 bg-green-50'
      case 'canceled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'requested': return '요청됨'
      case 'done': return '완료'
      case 'canceled': return '취소됨'
      default: return status
    }
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">인쇄 큐 관리</h1>
            <p className="text-gray-600 mt-2">PDF 인쇄 요청을 관리하고 처리하세요.</p>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📄</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전체 요청</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_requests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">대기 중</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_requests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">완료</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed_requests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-2xl">❌</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">취소</p>
                <p className="text-2xl font-bold text-gray-900">{stats.canceled_requests}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <select 
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">전체 상태</option>
              <option value="requested">요청됨</option>
              <option value="done">완료</option>
              <option value="canceled">취소됨</option>
            </select>

            <select 
              value={filters.class_id || ''}
              onChange={(e) => handleFilterChange('class_id', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체 반</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id.toString()}>{cls.name}</option>
              ))}
            </select>

            <select 
              value={filters.teacher_id || ''}
              onChange={(e) => handleFilterChange('teacher_id', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체 교사</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="교시 (예: 1교시)"
              value={filters.period || ''}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />

            <input
              type="date"
              value={filters.preferred_date || ''}
              onChange={(e) => handleFilterChange('preferred_date', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />

            <button
              onClick={loadPrintRequests}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* 일괄 처리 도구바 */}
        {selectedRequests.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedRequests.length}개 요청 선택됨
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => handleBulkStatusChange('done')}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  일괄 완료
                </button>
                <button
                  onClick={() => handleBulkStatusChange('canceled')}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
                >
                  일괄 취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">인쇄 요청을 불러오는 중...</span>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={loadPrintRequests}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 인쇄 요청 목록 */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRequests.length === printRequests.length && printRequests.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="form-checkbox"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      학생/과제
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      요청 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      인쇄 옵션
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {printRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRequests.includes(request.id)}
                          onChange={(e) => handleSelectRequest(request.id, e.target.checked)}
                          className="form-checkbox"
                        />
                      </td>
                      
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.pdf_upload.student_task.student.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.pdf_upload.student_task.assignment.workbook.title}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {request.preferred_date && (
                            <div>희망일: {new Date(request.preferred_date).toLocaleDateString('ko-KR')}</div>
                          )}
                          {request.period && (
                            <div>교시: {request.period}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            요청일: {new Date(request.created_at).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div>부수: {request.copies}부</div>
                          <div>
                            색상: {request.color === 'bw' ? '흑백' : '컬러'}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 text-sm font-medium space-x-2">
                        {request.status === 'requested' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(request.id, 'done')}
                              className="text-green-600 hover:text-green-900"
                            >
                              완료
                            </button>
                            <button
                              onClick={() => handleStatusChange(request.id, 'canceled')}
                              className="text-red-600 hover:text-red-900"
                            >
                              취소
                            </button>
                          </>
                        )}
                        
                        {request.status !== 'requested' && (
                          <button
                            onClick={() => handleStatusChange(request.id, 'requested')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            재요청
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteRequest(request.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !error && printRequests.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">🖨️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">인쇄 요청이 없습니다</h3>
            <p className="text-gray-600">PDF 제출물에 대한 인쇄 요청이 생성되면 여기에 표시됩니다.</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function AdminPrintQueuePage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'teacher']} requireAuth={true}>
      <AdminPrintQueueContent />
    </ProtectedRoute>
  )
}