'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useState, useEffect } from 'react'
import { assignmentApi } from '@/lib/assignments'

interface ClassStudent {
  id: string
  name: string
  completion_rate: number
  incomplete_count: number
  assignments: unknown[]
}

interface ClassInfo {
  id: number
  name: string
  students: ClassStudent[]
}

interface ClassFilters {
  class_id?: string
  subject?: string
  type?: string
  period?: string
}

function TeacherClassesContent() {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ClassFilters>({
    class_id: '',
    subject: '',
    type: '',
    period: 'all'
  })

  // 반별 현황 로드
  const loadClassesData = async () => {
    try {
      setLoading(true)
      const data = await assignmentApi.getAllClassesAssignments(filters)
      setClasses(data.classes)
      
      // 첫 번째 반을 기본 선택
      if (data.classes.length > 0) {
        setSelectedClass(data.classes[0])
      }
      
      setError(null)
    } catch (err) {
      console.error('Error loading classes data:', err)
      setError('반별 현황을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClassesData()
  }, [filters])

  // 반 선택 핸들러
  const handleClassSelect = (classInfo: ClassInfo) => {
    setSelectedClass(classInfo)
    setFilters(prev => ({ ...prev, class_id: classInfo.id.toString() }))
  }

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof ClassFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 완료율별 색상
  const getCompletionColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 bg-green-50'
    if (rate >= 70) return 'text-yellow-600 bg-yellow-50'
    if (rate >= 50) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  // 완료율별 진행바 색상
  const getProgressBarColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500'
    if (rate >= 70) return 'bg-yellow-500'
    if (rate >= 50) return 'bg-orange-500'
    return 'bg-red-500'
  }

  // 학생 상세 보기
  const handleStudentDetail = (student: ClassStudent) => {
    // 학생별 과제 상세 모달 또는 페이지로 이동
    window.open(`/teacher/student-detail/${student.id}`, '_blank')
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">반별 과제 현황</h1>
            <p className="text-gray-600 mt-2">모든 반의 학생별 과제 완료 현황을 확인하세요.</p>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              value={filters.period || ''}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">전체 기간</option>
              <option value="this_week">이번주</option>
              <option value="last_week">지난주</option>
              <option value="overdue">마감 지남</option>
            </select>

            <button
              onClick={loadClassesData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              새로고침
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">데이터를 불러오는 중...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={loadClassesData}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 왼쪽 사이드바: 반 목록 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-900">반 목록</h3>
                </div>
                
                <div className="divide-y">
                  {classes.map((classInfo) => (
                    <button
                      key={classInfo.id}
                      onClick={() => handleClassSelect(classInfo)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                        selectedClass?.id === classInfo.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{classInfo.name}</span>
                        <span className="text-sm text-gray-500">{classInfo.students.length}명</span>
                      </div>
                      
                      {/* 반 전체 완료율 표시 */}
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>평균 완료율</span>
                          <span>
                            {classInfo.students.length > 0
                              ? Math.round(
                                  classInfo.students.reduce((sum, student) => sum + student.completion_rate, 0) / 
                                  classInfo.students.length
                                )
                              : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getProgressBarColor(
                              classInfo.students.length > 0
                                ? classInfo.students.reduce((sum, student) => sum + student.completion_rate, 0) / 
                                  classInfo.students.length
                                : 0
                            )}`}
                            style={{
                              width: `${
                                classInfo.students.length > 0
                                  ? classInfo.students.reduce((sum, student) => sum + student.completion_rate, 0) / 
                                    classInfo.students.length
                                  : 0
                              }%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 오른쪽 메인: 선택된 반의 학생 목록 */}
            <div className="lg:col-span-3">
              {selectedClass ? (
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selectedClass.name} 학생 현황
                      </h3>
                      <div className="text-sm text-gray-600">
                        총 {selectedClass.students.length}명
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {selectedClass.students.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        이 반에 등록된 학생이 없습니다.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedClass.students.map((student) => (
                          <div 
                            key={student.id} 
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleStudentDetail(student)}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-semibold text-gray-900">{student.name}</h4>
                              <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getCompletionColor(student.completion_rate)}`}>
                                {student.completion_rate}%
                              </div>
                            </div>

                            {/* 완료율 진행바 */}
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>완료율</span>
                                <span>{student.completion_rate}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${getProgressBarColor(student.completion_rate)}`}
                                  style={{ width: `${student.completion_rate}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* 미완료 과제 수 */}
                            {student.incomplete_count > 0 && (
                              <div className="flex items-center text-sm text-red-600">
                                <span className="mr-2">⚠️</span>
                                <span>미완료 과제 {student.incomplete_count}개</span>
                              </div>
                            )}

                            {student.incomplete_count === 0 && (
                              <div className="flex items-center text-sm text-green-600">
                                <span className="mr-2">✅</span>
                                <span>모든 과제 완료</span>
                              </div>
                            )}

                            {/* 과제 요약 정보 */}
                            <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                              클릭하여 상세 정보 보기
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <div className="text-gray-400 text-6xl mb-4">🏫</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">반을 선택해주세요</h3>
                  <p className="text-gray-600">왼쪽에서 반을 선택하면 해당 반의 학생 현황을 확인할 수 있습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !error && classes.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">🏫</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 반이 없습니다</h3>
            <p className="text-gray-600">Admin 페이지에서 반을 생성하고 학생을 배정해주세요.</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function TeacherClassesPage() {
  return (
    <ProtectedRoute allowedRoles={['teacher']} requireAuth={true}>
      <TeacherClassesContent />
    </ProtectedRoute>
  )
}