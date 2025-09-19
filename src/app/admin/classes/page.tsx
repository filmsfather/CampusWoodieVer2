'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useState, useEffect } from 'react'
import { classApi, ClassWithMembers, ClassFilters } from '@/lib/classes'
import { userApi } from '@/lib/users'

function AdminClassesContent() {
  const [classes, setClasses] = useState<ClassWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ClassFilters>({
    search: ''
  })
  const [stats, setStats] = useState({
    total_classes: 0,
    total_students: 0,
    total_teachers: 0,
    average_students_per_class: 0,
    classes_without_teacher: 0
  })

  // 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [editingClass, setEditingClass] = useState<ClassWithMembers | null>(null)
  const [editClassName, setEditClassName] = useState('')

  // 멤버 관리 관련 상태
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; role: string[] }>>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // 데이터 로드
  const loadClasses = async () => {
    try {
      setLoading(true)
      const data = await classApi.getClasses(filters)
      setClasses(data)
      setError(null)
    } catch (err) {
      console.error('Error loading classes:', err)
      setError('반 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await classApi.getClassStats()
      setStats(data)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const loadAvailableUsers = async () => {
    try {
      const students = await userApi.getUsersByRole('student')
      const teachers = await userApi.getUsersByRole('teacher')
      setAvailableUsers([
        ...students.map(u => ({ ...u, role: ['student'] })),
        ...teachers.map(u => ({ ...u, role: ['teacher'] }))
      ])
    } catch (err) {
      console.error('Error loading available users:', err)
    }
  }

  useEffect(() => {
    loadStats()
    loadAvailableUsers()
  }, [])

  useEffect(() => {
    loadClasses()
  }, [filters])

  // 필터 변경
  const handleFilterChange = (key: keyof ClassFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 반 생성
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassName.trim()) return

    try {
      await classApi.createClass(newClassName.trim())
      setNewClassName('')
      setShowCreateModal(false)
      loadClasses()
      loadStats()
      alert('반이 생성되었습니다.')
    } catch (err) {
      console.error('Error creating class:', err)
      alert('반 생성에 실패했습니다.')
    }
  }

  // 반 수정 모달 열기
  const openEditModal = (classItem: ClassWithMembers) => {
    setEditingClass(classItem)
    setEditClassName(classItem.name)
    setShowEditModal(true)
  }

  // 멤버 관리 모달 열기
  const openMembersModal = (classItem: ClassWithMembers) => {
    setEditingClass(classItem)
    setSelectedUsers([])
    setShowMembersModal(true)
  }

  // 반 이름 수정
  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClass || !editClassName.trim()) return

    try {
      await classApi.updateClassName(editingClass.id, editClassName.trim())
      setShowEditModal(false)
      setEditingClass(null)
      setEditClassName('')
      loadClasses()
      alert('반 이름이 수정되었습니다.')
    } catch (err) {
      console.error('Error updating class:', err)
      alert('반 이름 수정에 실패했습니다.')
    }
  }

  // 반 삭제
  const handleDeleteClass = async (classItem: ClassWithMembers) => {
    if (!confirm(`정말 "${classItem.name}" 반을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return

    try {
      await classApi.deleteClass(classItem.id)
      loadClasses()
      loadStats()
      alert('반이 삭제되었습니다.')
    } catch (err: unknown) {
      console.error('Error deleting class:', err)
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  // 멤버 추가/제거
  const handleMembershipChange = async (userId: string, isCurrentMember: boolean) => {
    if (!editingClass) return

    try {
      if (isCurrentMember) {
        await classApi.removeMemberFromClass(editingClass.id, userId)
      } else {
        await classApi.addMemberToClass(editingClass.id, userId)
      }
      
      // 현재 반 정보 다시 로드
      const updatedClass = await classApi.getClassById(editingClass.id)
      if (updatedClass) {
        setEditingClass(updatedClass)
      }
      
      loadClasses()
    } catch (err: unknown) {
      console.error('Error changing membership:', err)
      alert(err instanceof Error ? err.message : '멤버십 변경에 실패했습니다.')
    }
  }

  // 담임 교사 찾기 (첫 번째 교사)
  const getClassTeacher = (classItem: ClassWithMembers) => {
    const teacher = classItem.members?.find(member => 
      member.user.role.includes('teacher')
    )
    return teacher ? teacher.user.name : '미배정'
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">반 관리</h1>
            <p className="text-gray-600 mt-2">반을 생성하고 학생을 배정하세요.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            + 새 반 만들기
          </button>
        </div>

        {/* 통계 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">🏫</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전체 반</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_classes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전체 학생</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_students}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">👨‍🏫</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전체 교사</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_teachers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">평균 학생 수</p>
                <p className="text-2xl font-bold text-gray-900">{stats.average_students_per_class}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">담임 미배정</p>
                <p className="text-2xl font-bold text-gray-900">{stats.classes_without_teacher}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="반 이름 검색..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 min-w-64"
            />
            <button
              onClick={loadClasses}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* 로딩/에러 상태 */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">반 목록을 불러오는 중...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={loadClasses}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 반 목록 */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      반 이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      학생 수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      담임 교사
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      생성일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {classes.map((classItem) => (
                    <tr key={classItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{classItem.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{classItem.student_count}명</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getClassTeacher(classItem)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(classItem.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => openMembersModal(classItem)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          멤버 관리
                        </button>
                        <button
                          onClick={() => openEditModal(classItem)}
                          className="text-green-600 hover:text-green-900"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteClass(classItem)}
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
        {!loading && !error && classes.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">🏫</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">반이 없습니다</h3>
            <p className="text-gray-600">새 반을 만들어 학생들을 배정해보세요.</p>
          </div>
        )}
      </div>

      {/* 새 반 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">새 반 만들기</h2>
            <form onSubmit={handleCreateClass}>
              <div className="mb-4">
                <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-2">
                  반 이름
                </label>
                <input
                  type="text"
                  id="className"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 영화연출과 3반"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewClassName('')
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 반 이름 수정 모달 */}
      {showEditModal && editingClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">반 이름 수정</h2>
            <form onSubmit={handleEditClass}>
              <div className="mb-4">
                <label htmlFor="editClassName" className="block text-sm font-medium text-gray-700 mb-2">
                  반 이름
                </label>
                <input
                  type="text"
                  id="editClassName"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingClass(null)
                    setEditClassName('')
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 멤버 관리 모달 */}
      {showMembersModal && editingClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-w-90vw max-h-80vh overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingClass.name} 멤버 관리
            </h2>
            
            {/* 현재 멤버 */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-2">
                현재 멤버 ({editingClass.members?.length || 0}명)
              </h3>
              <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
                {editingClass.members && editingClass.members.length > 0 ? (
                  <div className="space-y-2">
                    {editingClass.members.map(member => (
                      <div key={member.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <span className="text-sm font-medium">{member.user.name}</span>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                            member.user.role.includes('teacher') 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {member.user.role.includes('teacher') ? '교사' : '학생'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleMembershipChange(member.user_id, true)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          제거
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">멤버가 없습니다</p>
                )}
              </div>
            </div>

            {/* 추가 가능한 사용자 */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-2">
                추가 가능한 사용자
              </h3>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                {availableUsers.filter(user => 
                  !editingClass.members?.some(member => member.user_id === user.id)
                ).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center">
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        user.role.includes('teacher') 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role.includes('teacher') ? '교사' : '학생'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleMembershipChange(user.id, false)}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      추가
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowMembersModal(false)
                  setEditingClass(null)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

export default function AdminClassesPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']} requireAuth={true}>
      <AdminClassesContent />
    </ProtectedRoute>
  )
}