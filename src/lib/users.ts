import { supabase } from './supabase'
import { logSuccess, logError, LOG_ACTIONS, RESOURCE_TYPES } from './monitoring'

export interface User {
  id: string
  name: string
  role: string[]
  created_at: string
  updated_at: string
}

export interface UserWithClassInfo extends User {
  classes?: Array<{
    id: number
    name: string
  }>
}

export interface UserFilters {
  role?: string
  class_id?: string
  search?: string
}

export const userApi = {
  // 사용자 목록 조회 (필터링 포함)
  async getUsers(filters: UserFilters = {}): Promise<UserWithClassInfo[]> {
    let query = supabase
      .from('profiles')
      .select(`
        id,
        name,
        role,
        created_at,
        updated_at,
        class_members (
          classes (
            id,
            name
          )
        )
      `)
      .order('name')

    // 역할 필터
    if (filters.role && filters.role !== 'all') {
      query = query.contains('role', [filters.role])
    }

    // 이름 검색
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      throw error
    }

    // 클래스 정보 정리
    const users = data?.map(user => ({
      ...user,
      classes: user.class_members?.map((cm: Record<string, unknown>) => cm.classes as { id: number; name: string }).filter(Boolean) || []
    })) || []

    // 반 필터링 (클라이언트 사이드)
    if (filters.class_id) {
      return users.filter(user => 
        user.classes?.some((cls: { id: number; name: string }) => cls.id.toString() === filters.class_id)
      )
    }

    return users
  },

  // 사용자 역할 업데이트
  async updateUserRole(userId: string, newRoles: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: newRoles,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        await logError(LOG_ACTIONS.USER_ROLE_CHANGED, RESOURCE_TYPES.USER, error.message, userId, { newRoles })
        throw error
      }

      await logSuccess(LOG_ACTIONS.USER_ROLE_CHANGED, RESOURCE_TYPES.USER, userId, { newRoles })
    } catch (error: unknown) {
      console.error('Error updating user role:', error)
      throw error
    }
  },

  // 사용자 이름 업데이트
  async updateUserName(userId: string, newName: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        name: newName,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user name:', error)
      throw error
    }
  },

  // 사용자 반 배정
  async assignUserToClass(userId: string, classId: number): Promise<void> {
    const { error } = await supabase
      .from('class_members')
      .insert({
        user_id: userId,
        class_id: classId
      })

    if (error) {
      console.error('Error assigning user to class:', error)
      throw error
    }
  },

  // 사용자 반 배정 해제
  async removeUserFromClass(userId: string, classId: number): Promise<void> {
    const { error } = await supabase
      .from('class_members')
      .delete()
      .eq('user_id', userId)
      .eq('class_id', classId)

    if (error) {
      console.error('Error removing user from class:', error)
      throw error
    }
  },

  // 사용자 삭제 (소프트 삭제가 아닌 실제 삭제)
  async deleteUser(userId: string): Promise<void> {
    // 먼저 관련 데이터 정리
    const { error: classMembersError } = await supabase
      .from('class_members')
      .delete()
      .eq('user_id', userId)

    if (classMembersError) {
      console.error('Error removing class memberships:', classMembersError)
      throw classMembersError
    }

    // 프로필 삭제
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting user profile:', profileError)
      throw profileError
    }
  },

  // 사용자 통계 조회
  async getUserStats(): Promise<{
    total_users: number
    student_count: number
    teacher_count: number
    admin_count: number
    unassigned_users: number
  }> {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('role')

    if (error) {
      console.error('Error fetching user stats:', error)
      throw error
    }

    const stats = {
      total_users: users?.length || 0,
      student_count: 0,
      teacher_count: 0,
      admin_count: 0,
      unassigned_users: 0
    }

    users?.forEach(user => {
      if (user.role.includes('student')) stats.student_count++
      if (user.role.includes('teacher')) stats.teacher_count++
      if (user.role.includes('admin')) stats.admin_count++
      if (user.role.length === 0) stats.unassigned_users++
    })

    return stats
  },

  // 특정 역할의 사용자 목록 조회 (간단 버전)
  async getUsersByRole(role: string): Promise<Array<{ id: string; name: string }>> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .contains('role', [role])
      .order('name')

    if (error) {
      console.error('Error fetching users by role:', error)
      throw error
    }

    return data || []
  }
}

// 역할 관련 유틸리티 함수
export const roleUtils = {
  getRoleLabel(role: string): string {
    switch (role) {
      case 'student': return '학생'
      case 'teacher': return '교사'
      case 'admin': return '관리자'
      default: return role
    }
  },

  getRoleColor(role: string): string {
    switch (role) {
      case 'student': return 'text-blue-600 bg-blue-50'
      case 'teacher': return 'text-green-600 bg-green-50'
      case 'admin': return 'text-purple-600 bg-purple-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  },

  getAllRoles(): Array<{ value: string; label: string }> {
    return [
      { value: 'student', label: '학생' },
      { value: 'teacher', label: '교사' },
      { value: 'admin', label: '관리자' }
    ]
  },

  formatRoles(roles: string[]): string {
    return roles.map(role => this.getRoleLabel(role)).join(', ')
  }
}