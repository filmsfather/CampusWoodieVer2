'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { assignmentApi, AssignmentWithDetails, AssignmentFilters, StudentTaskWithDetails } from '@/lib/assignments'
import { printRequestApi } from '@/lib/print-requests'

function TeacherAssignmentsContent() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithDetails | null>(null)
  const [incompleteStudents, setIncompleteStudents] = useState<StudentTaskWithDetails[]>([])
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [filters, setFilters] = useState<AssignmentFilters>({
    due_status: 'all',
    subject: '',
    type: '',
    week: '',
    search: ''
  })

  const [bulkPrintData, setBulkPrintData] = useState({
    selectedPdfIds: [] as number[],
    preferred_date: '',
    period: '',
    copies: 1,
    color: 'bw' as 'bw' | 'color'
  })

  // 과제 목록 로드
  const loadAssignments = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const data = await assignmentApi.getMyAssignments(user.id, filters)
      setAssignments(data)
      setError(null)
    } catch (err) {
      console.error('Error loading assignments:', err)
      setError('과제 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssignments()
  }, [user, filters])

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof AssignmentFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 미완료 학생 보기
  const handleViewIncompleteStudents = async (assignment: AssignmentWithDetails) => {
    try {
      setSelectedAssignment(assignment)
      const students = await assignmentApi.getIncompleteStudents(assignment.id)
      setIncompleteStudents(students)
      setShowStudentModal(true)
    } catch (err) {
      console.error('Error loading incomplete students:', err)
      alert('미완료 학생 목록을 불러오는데 실패했습니다.')
    }
  }

  // 과제 유형별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SRS': return '🧠'
      case 'PDF': return '📄'
      case 'ESSAY': return '✍️'
      case 'VIEWING': return '🎬'
      case 'LECTURE': return '📹'
      default: return '📚'
    }
  }

  // 상태별 색상
  const getStatusColor = (completionRate: number) => {
    if (completionRate === 100) return 'text-green-600 bg-green-50'
    if (completionRate >= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  // 마감일 표시
  const formatDueDate = (dueAt: string) => {
    const due = new Date(dueAt)
    const now = new Date()
    const isOverdue = due < now

    return (
      <span className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
        {due.toLocaleDateString('ko-KR', { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
        {isOverdue && ' (마감)'}
      </span>
    )
  }

  // 일괄 인쇄 요청
  const handleBulkPrintRequest = async () => {
    if (bulkPrintData.selectedPdfIds.length === 0) {
      alert('인쇄할 PDF를 선택해주세요.')
      return
    }

    try {
      await printRequestApi.createBulkPrintRequests(bulkPrintData.selectedPdfIds, {
        preferred_date: bulkPrintData.preferred_date,
        period: bulkPrintData.period,
        copies: bulkPrintData.copies,
        color: bulkPrintData.color
      })

      alert(`${bulkPrintData.selectedPdfIds.length}개의 인쇄 요청이 생성되었습니다.`)
      setBulkPrintData(prev => ({ ...prev, selectedPdfIds: [] }))
      setShowStudentModal(false)
    } catch (err) {
      console.error('Error creating bulk print requests:', err)
      alert('인쇄 요청 생성에 실패했습니다.')
    }
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 과제 현황</h1>
            <p className="text-gray-600 mt-2">출제한 과제의 진행 상황을 확인하고 관리하세요.</p>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="과제 제목 또는 학생명 검색..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            
            <select 
              value={filters.due_status || ''}
              onChange={(e) => handleFilterChange('due_status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">전체 마감상태</option>
              <option value="overdue">마감 지남</option>
              <option value="upcoming">마감 예정</option>
            </select>

            <select 
              value={filters.subject || ''}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체 과목</option>
              <option value="directing">연출</option>
              <option value="writing">작법</option>
              <option value="research">연구</option>
              <option value="integrated">통합</option>
            </select>
            
            <select 
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체 유형</option>
              <option value="SRS">SRS형</option>
              <option value="PDF">PDF 제출형</option>
              <option value="ESSAY">서술형</option>
              <option value="VIEWING">영화감상형</option>
              <option value="LECTURE">인터넷강의형</option>
            </select>

            <select 
              value={filters.week || ''}
              onChange={(e) => handleFilterChange('week', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체 주차</option>
              <option value="1">1주차</option>
              <option value="2">2주차</option>
              <option value="3">3주차</option>
              <option value="4">4주차</option>
              <option value="5">5주차</option>
              <option value="common">공통</option>
            </select>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">과제를 불러오는 중...</span>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={loadAssignments}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 과제 목록 */}
        {!loading && !error && (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{getTypeIcon(assignment.workbook.type)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {assignment.workbook.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {assignment.class_name} • {assignment.workbook.subject}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                      <span>마감일: {formatDueDate(assignment.due_at)}</span>
                      <span>•</span>
                      <span>총 {assignment.total_students}명</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(assignment.completion_rate)}`}>
                      {assignment.completion_rate}% 완료
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      완료 {assignment.completed_students}명 / 미완료 {assignment.incomplete_students}명
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3 mt-4">
                  {assignment.incomplete_students > 0 && (
                    <button
                      onClick={() => handleViewIncompleteStudents(assignment)}
                      className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-100 transition-colors text-sm"
                    >
                      미완료 {assignment.incomplete_students}명 보기
                    </button>
                  )}
                  
                  {assignment.workbook.type === 'ESSAY' && (
                    <button
                      onClick={() => window.open(`/teacher/reviews?assignment=${assignment.id}`, '_blank')}
                      className="bg-green-50 text-green-700 px-4 py-2 rounded-md hover:bg-green-100 transition-colors text-sm"
                    >
                      서술형 평가
                    </button>
                  )}
                  
                  {assignment.workbook.type === 'PDF' && (
                    <button
                      onClick={() => handleViewIncompleteStudents(assignment)}
                      className="bg-purple-50 text-purple-700 px-4 py-2 rounded-md hover:bg-purple-100 transition-colors text-sm"
                    >
                      인쇄 요청 관리
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !error && assignments.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">출제한 과제가 없습니다</h3>
            <p className="text-gray-600">문제집을 만들고 과제를 출제해보세요!</p>
          </div>
        )}

        {/* 미완료 학생 모달 */}
        {showStudentModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    {selectedAssignment.workbook.title} - 미완료 학생 ({incompleteStudents.length}명)
                  </h2>
                  <button
                    onClick={() => setShowStudentModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-96 p-6">
                {incompleteStudents.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">미완료 학생이 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {incompleteStudents.map((student) => (
                      <div key={student.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{student.student.name}</h4>
                            <p className="text-sm text-gray-600">
                              상태: <span className="font-medium">{student.status}</span>
                            </p>
                            {student.progress_pct > 0 && (
                              <p className="text-sm text-gray-600">
                                진행률: {student.progress_pct}%
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            {/* PDF 제출형 처리 */}
                            {selectedAssignment.workbook.type === 'PDF' && student.pdf_upload && (
                              <div className="space-y-2">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={bulkPrintData.selectedPdfIds.includes(student.pdf_upload.id)}
                                    onChange={(e) => {
                                      const pdfId = student.pdf_upload!.id
                                      setBulkPrintData(prev => ({
                                        ...prev,
                                        selectedPdfIds: e.target.checked
                                          ? [...prev.selectedPdfIds, pdfId]
                                          : prev.selectedPdfIds.filter(id => id !== pdfId)
                                      }))
                                    }}
                                    className="form-checkbox"
                                  />
                                  <span className="text-sm">인쇄 요청</span>
                                </label>
                                <p className="text-xs text-gray-500">
                                  업로드됨: {new Date(student.pdf_upload.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            )}

                            {/* 서술형 처리 */}
                            {selectedAssignment.workbook.type === 'ESSAY' && (
                              <button
                                onClick={() => window.open(`/teacher/reviews?student_task=${student.id}`, '_blank')}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                답안 보기
                              </button>
                            )}

                            {/* 영화감상형 처리 */}
                            {selectedAssignment.workbook.type === 'VIEWING' && (
                              <p className="text-sm text-gray-600">
                                감상노트: {student.viewing_notes_count || 0}개
                              </p>
                            )}

                            {/* 강의형 처리 */}
                            {selectedAssignment.workbook.type === 'LECTURE' && student.lecture_summary && (
                              <button
                                onClick={() => alert(student.lecture_summary?.summary)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                요약 보기
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PDF 일괄 인쇄 요청 폼 */}
              {selectedAssignment.workbook.type === 'PDF' && bulkPrintData.selectedPdfIds.length > 0 && (
                <div className="border-t p-6 bg-gray-50">
                  <h3 className="font-semibold mb-4">
                    선택된 {bulkPrintData.selectedPdfIds.length}개 파일 일괄 인쇄 요청
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <input
                      type="date"
                      value={bulkPrintData.preferred_date}
                      onChange={(e) => setBulkPrintData(prev => ({ ...prev, preferred_date: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="희망일"
                    />
                    
                    <input
                      type="text"
                      value={bulkPrintData.period}
                      onChange={(e) => setBulkPrintData(prev => ({ ...prev, period: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="교시 (예: 1교시)"
                    />
                    
                    <input
                      type="number"
                      min="1"
                      value={bulkPrintData.copies}
                      onChange={(e) => setBulkPrintData(prev => ({ ...prev, copies: parseInt(e.target.value) || 1 }))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="부수"
                    />
                    
                    <select
                      value={bulkPrintData.color}
                      onChange={(e) => setBulkPrintData(prev => ({ ...prev, color: e.target.value as 'bw' | 'color' }))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="bw">흑백</option>
                      <option value="color">컬러</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={handleBulkPrintRequest}
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    인쇄 요청 생성
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function TeacherAssignmentsPage() {
  return (
    <ProtectedRoute allowedRoles={['teacher']} requireAuth={true}>
      <TeacherAssignmentsContent />
    </ProtectedRoute>
  )
}