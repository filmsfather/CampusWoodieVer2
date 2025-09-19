'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useState, useEffect } from 'react'
import { userApi, roleUtils, UserWithClassInfo, UserFilters } from '@/lib/users'
import { classApi } from '@/lib/classes'

function AdminUsersContent() {
  const [users, setUsers] = useState<UserWithClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<UserFilters>({
    role: 'all',
    class_id: '',
    search: ''
  })
  const [stats, setStats] = useState({
    total_users: 0,
    student_count: 0,
    teacher_count: 0,
    admin_count: 0,
    unassigned_users: 0
  })
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([])
  
  // 모달 상태
  const [editingUser, setEditingUser] = useState<UserWithClassInfo | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showClassModal, setShowClassModal] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [newUserName, setNewUserName] = useState('')

  // 데이터 로드
  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await userApi.getUsers(filters)
      setUsers(data)
      setError(null)
    } catch (err) {
      console.error('Error loading users:', err)
      setError('사용자 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await userApi.getUserStats()
      setStats(data)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const loadClasses = async () => {
    try {
      const data = await classApi.getSimpleClasses()
      setClasses(data)
    } catch (err) {
      console.error('Error loading classes:', err)
    }
  }

  useEffect(() => {
    loadStats()
    loadClasses()
  }, [])

  useEffect(() => {
    loadUsers()
  }, [filters])

  // 필터 변경
  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 역할 수정 모달 열기
  const openRoleModal = (user: UserWithClassInfo) => {
    setEditingUser(user)
    setSelectedRoles([...user.role])
    setNewUserName(user.name)
    setShowRoleModal(true)
  }

  // 반 관리 모달 열기
  const openClassModal = (user: UserWithClassInfo) => {
    setEditingUser(user)
    setShowClassModal(true)
  }

  // 역할 업데이트
  const handleUpdateRole = async () => {
    if (!editingUser) return

    try {
      await userApi.updateUserRole(editingUser.id, selectedRoles)
      
      // 이름도 변경된 경우 업데이트
      if (newUserName !== editingUser.name) {
        await userApi.updateUserName(editingUser.id, newUserName)
      }

      setShowRoleModal(false)
      setEditingUser(null)
      loadUsers()
      loadStats()
      alert('사용자 정보가 업데이트되었습니다.')
    } catch (err) {
      console.error('Error updating user:', err)
      alert('업데이트에 실패했습니다.')
    }
  }

  // 반 배정/해제
  const handleClassAssignment = async (classId: number, assign: boolean) => {
    if (!editingUser) return

    try {
      if (assign) {
        await userApi.assignUserToClass(editingUser.id, classId)
      } else {
        await userApi.removeUserFromClass(editingUser.id, classId)
      }
      
      loadUsers()
      alert(`반 ${assign ? '배정' : '해제'}이 완료되었습니다.`)
    } catch (err) {
      console.error('Error managing class assignment:', err)
      alert(`반 ${assign ? '배정' : '해제'}에 실패했습니다.`)
    }
  }

  // 사용자 삭제
  const handleDeleteUser = async (user: UserWithClassInfo) => {
    if (!confirm(`정말 "${user.name}" 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return

    try {
      await userApi.deleteUser(user.id)
      loadUsers()
      loadStats()
      alert('사용자가 삭제되었습니다.')
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('삭제에 실패했습니다.')
    }
  }

  // 역할 체크박스 토글
  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
            <p className="text-gray-600 mt-2">사용자 권한과 반 배정을 관리하세요.</p>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전체 사용자</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">🎓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">학생</p>
                <p className="text-2xl font-bold text-gray-900">{stats.student_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">👨‍🏫</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">교사</p>
                <p className="text-2xl font-bold text-gray-900">{stats.teacher_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">⚙️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">관리자</p>
                <p className="text-2xl font-bold text-gray-900">{stats.admin_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <span className="text-2xl">❓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">미배정</p>
                <p className="text-2xl font-bold text-gray-900">{stats.unassigned_users}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="이름 검색..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />

            <select 
              value={filters.role || 'all'}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">전체 역할</option>
              {roleUtils.getAllRoles().map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
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

            <button
              onClick={loadUsers}
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
            <span className="ml-2 text-gray-600">사용자를 불러오는 중...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={loadUsers}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 사용자 목록 */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      역할
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      소속 반
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500 font-mono">{user.id}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.role.map(role => (
                            <span 
                              key={role}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleUtils.getRoleColor(role)}`}
                            >
                              {roleUtils.getRoleLabel(role)}
                            </span>
                          ))}
                          {user.role.length === 0 && (
                            <span className="text-sm text-gray-400">역할 없음</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {user.classes && user.classes.length > 0 ? (
                            user.classes.map(cls => cls.name).join(', ')
                          ) : (
                            <span className="text-gray-400">미배정</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      
                      <td className="px-6 py-4 text-sm font-medium space-x-2">
                        <button
                          onClick={() => openRoleModal(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          권한 수정
                        </button>
                        <button
                          onClick={() => openClassModal(user)}
                          className="text-green-600 hover:text-green-900"
                        >
                          반 관리
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
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
        {!loading && !error && users.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">사용자가 없습니다</h3>
            <p className="text-gray-600">필터 조건을 변경하거나 새로고침을 시도해보세요.</p>
          </div>
        )}

        {/* 역할 수정 모달 */}
        {showRoleModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingUser.name} 권한 수정
              </h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  역할 (복수 선택 가능)
                </label>
                <div className="space-y-2">
                  {roleUtils.getAllRoles().map(role => (
                    <label key={role.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.value)}
                        onChange={() => toggleRole(role.value)}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRoleModal(false)
                    setEditingUser(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleUpdateRole}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 반 관리 모달 */}
        {showClassModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-90vw max-h-80vh overflow-y-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingUser.name} 반 관리
              </h2>
              
              <div className="space-y-2">
                {classes.map(cls => {
                  const isAssigned = editingUser.classes?.some(userClass => userClass.id === cls.id)
                  return (
                    <div key={cls.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm text-gray-700">{cls.name}</span>
                      <button
                        onClick={() => handleClassAssignment(cls.id, !isAssigned)}
                        className={`px-3 py-1 rounded text-xs ${
                          isAssigned 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {isAssigned ? '해제' : '배정'}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowClassModal(false)
                    setEditingUser(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']} requireAuth={true}>
      <AdminUsersContent />
    </ProtectedRoute>
  )
}