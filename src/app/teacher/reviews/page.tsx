'use client'

// 정적 생성 방지
export const dynamic = 'force-dynamic'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams } from 'next/navigation'
import { essayReviewApi, EssaySubmission, EssayFilters } from '@/lib/essay-reviews'
import { supabase } from '@/lib/supabase'

function TeacherReviewsContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [submissions, setSubmissions] = useState<EssaySubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<EssaySubmission | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    grade: '',
    feedback: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [stats, setStats] = useState({
    total_submissions: 0,
    reviewed_submissions: 0,
    pending_reviews: 0,
    review_rate: 0
  })

  const [filters, setFilters] = useState<EssayFilters>({
    class_id: '',
    subject: '',
    reviewed: undefined,
    search: ''
  })

  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([])

  // 반 목록 로드
  const loadClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name')
      .order('name')

    if (!error && data) {
      setClasses(data)
    }
  }

  // 서술형 제출물 목록 로드
  const loadSubmissions = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const data = await essayReviewApi.getEssaySubmissions(user.id, filters)
      setSubmissions(data)
      setError(null)
    } catch (err) {
      console.error('Error loading submissions:', err)
      setError('서술형 제출물을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 통계 로드
  const loadStats = async () => {
    if (!user?.id) return

    try {
      const data = await essayReviewApi.getReviewStats(user.id)
      setStats(data)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  useEffect(() => {
    loadClasses()
    loadStats()
  }, [user])

  useEffect(() => {
    loadSubmissions()
  }, [user, filters])

  // URL 파라미터로 특정 과제나 학생 필터링
  useEffect(() => {
    const assignmentId = searchParams.get('assignment')
    const studentTaskId = searchParams.get('student_task')

    if (assignmentId || studentTaskId) {
      // 특정 과제 또는 학생 과제로 필터링 로직 추가
      console.log('Filtering by assignment:', assignmentId, 'or student task:', studentTaskId)
    }
  }, [searchParams])

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof EssayFilters, value: string | boolean | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 리뷰 모달 열기
  const handleOpenReviewModal = (submission: EssaySubmission) => {
    setSelectedSubmission(submission)
    setReviewForm({
      grade: submission.review?.grade || '',
      feedback: submission.review?.feedback || ''
    })
    setShowReviewModal(true)
  }

  // 리뷰 제출
  const handleSubmitReview = async () => {
    if (!selectedSubmission) return

    try {
      setSubmitting(true)
      await essayReviewApi.submitEssayReview(
        selectedSubmission.student_task_id,
        reviewForm.grade || undefined,
        reviewForm.feedback || undefined
      )

      alert('평가가 저장되었습니다.')
      setShowReviewModal(false)
      loadSubmissions() // 목록 새로고침
      loadStats() // 통계 새로고침
    } catch (err) {
      console.error('Error submitting review:', err)
      alert('평가 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 리뷰 삭제
  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('정말 이 평가를 삭제하시겠습니까?')) return

    try {
      await essayReviewApi.deleteEssayReview(reviewId)
      alert('평가가 삭제되었습니다.')
      loadSubmissions()
      loadStats()
    } catch (err) {
      console.error('Error deleting review:', err)
      alert('평가 삭제에 실패했습니다.')
    }
  }

  // 등급별 색상
  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case '상': return 'text-green-600 bg-green-50'
      case '중상': return 'text-blue-600 bg-blue-50'
      case '중': return 'text-yellow-600 bg-yellow-50'
      case '중하': return 'text-orange-600 bg-orange-50'
      case '하': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">서술형 과제 평가</h1>
            <p className="text-gray-600 mt-2">학생들의 서술형 답안을 평가하고 피드백을 제공하세요.</p>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📝</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전체 제출물</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_submissions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">평가 완료</p>
                <p className="text-2xl font-bold text-gray-900">{stats.reviewed_submissions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">평가 대기</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_reviews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">평가율</p>
                <p className="text-2xl font-bold text-gray-900">{stats.review_rate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="학생명 또는 과제명 검색..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />

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
              value={filters.reviewed === undefined ? 'all' : filters.reviewed ? 'reviewed' : 'pending'}
              onChange={(e) => {
                const value = e.target.value
                handleFilterChange('reviewed', 
                  value === 'all' ? undefined : value === 'reviewed' ? true : false
                )
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">전체 상태</option>
              <option value="pending">평가 대기</option>
              <option value="reviewed">평가 완료</option>
            </select>

            <button
              onClick={loadSubmissions}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">제출물을 불러오는 중...</span>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={loadSubmissions}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 제출물 목록 */}
        {!loading && !error && (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {submission.student_task.student.name}
                      </h3>
                      {submission.review && (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getGradeColor(submission.review.grade)}`}>
                          {submission.review.grade || '평가완료'}
                        </span>
                      )}
                      {!submission.review && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600">
                          평가 대기
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      과제: {submission.student_task.assignment.workbook.title}
                    </p>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      문제: {submission.workbook_item.prompt}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      제출일: {new Date(submission.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>

                {/* 학생 답안 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">학생 답안:</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{submission.response_text}</p>
                </div>

                {/* 기존 평가 표시 */}
                {submission.review && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">평가 내용:</h4>
                    {submission.review.grade && (
                      <p className="text-sm text-gray-700 mb-2">
                        등급: <span className="font-semibold">{submission.review.grade}</span>
                      </p>
                    )}
                    {submission.review.feedback && (
                      <p className="text-gray-700">{submission.review.feedback}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      평가일: {new Date(submission.review.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleOpenReviewModal(submission)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    {submission.review ? '평가 수정' : '평가하기'}
                  </button>

                  {submission.review && (
                    <button
                      onClick={() => handleDeleteReview(submission.review!.id)}
                      className="bg-red-50 text-red-600 px-4 py-2 rounded-md hover:bg-red-100 transition-colors text-sm"
                    >
                      평가 삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !error && submissions.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">서술형 제출물이 없습니다</h3>
            <p className="text-gray-600">학생들이 서술형 과제를 제출하면 여기에 표시됩니다.</p>
          </div>
        )}

        {/* 평가 모달 */}
        {showReviewModal && selectedSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    {selectedSubmission.student_task.student.name} - 평가
                  </h2>
                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-96 p-6">
                {/* 문제 */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">문제:</h4>
                  <p className="text-gray-700">{selectedSubmission.workbook_item.prompt}</p>
                </div>

                {/* 학생 답안 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">학생 답안:</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedSubmission.response_text}</p>
                </div>

                {/* 평가 폼 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      등급 (선택사항)
                    </label>
                    <select
                      value={reviewForm.grade}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, grade: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">등급 선택</option>
                      <option value="상">상</option>
                      <option value="중상">중상</option>
                      <option value="중">중</option>
                      <option value="중하">중하</option>
                      <option value="하">하</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      피드백
                    </label>
                    <textarea
                      value={reviewForm.feedback}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, feedback: e.target.value }))}
                      placeholder="학생에게 전달할 피드백을 작성해주세요..."
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t p-6 flex space-x-3">
                <button
                  onClick={handleSubmitReview}
                  disabled={submitting || (!reviewForm.grade && !reviewForm.feedback)}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? '저장 중...' : '평가 저장'}
                </button>
                
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function TeacherReviewsPage() {
  return (
    <ProtectedRoute allowedRoles={['teacher']} requireAuth={true}>
      <TeacherReviewsContent />
    </ProtectedRoute>
  )
}