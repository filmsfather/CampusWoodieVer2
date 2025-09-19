import { supabase } from './supabase'
import { logSuccess, logError, LOG_ACTIONS, RESOURCE_TYPES } from './monitoring'

export interface Class {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface ClassWithMembers extends Class {
  student_count: number
  teacher_count: number
  members?: Array<{
    user_id: string
    user: {
      id: string
      name: string
      role: string[]
    }
  }>
}

export interface ClassFilters {
  search?: string
}

export const classApi = {
  // 반 목록 조회 (학생 수 포함)
  async getClasses(filters: ClassFilters = {}): Promise<ClassWithMembers[]> {
    let query = supabase
      .from('classes')
      .select(`
        id,
        name,
        created_at,
        updated_at,
        class_members (
          user_id,
          profiles (
            id,
            name,
            role
          )
        )
      `)
      .order('name')

    // 검색 필터
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching classes:', error)
      throw error
    }

    // 멤버 정보 정리 및 카운트
    const classes = data?.map(cls => {
      const members = cls.class_members?.map((cm: Record<string, unknown>) => ({
        user_id: cm.user_id as string,
        user: cm.profiles ? {
          id: (cm.profiles as Record<string, unknown>).id as string,
          name: (cm.profiles as Record<string, unknown>).name as string,
          role: Array.isArray((cm.profiles as Record<string, unknown>).role) ? (cm.profiles as Record<string, unknown>).role : [(cm.profiles as Record<string, unknown>).role]
        } : null
      })).filter((member): member is {user_id: string, user: {id: string, name: string, role: string[]}} => member.user !== null) || []

      const student_count = members.filter(member => 
        member.user && member.user.role && member.user.role.includes('student')
      ).length

      const teacher_count = members.filter(member => 
        member.user && member.user.role && member.user.role.includes('teacher')
      ).length

      return {
        ...cls,
        members,
        student_count,
        teacher_count
      }
    }) || []

    return classes
  },

  // 특정 반 상세 정보 조회
  async getClassById(classId: number): Promise<ClassWithMembers | null> {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        created_at,
        updated_at,
        class_members (
          user_id,
          profiles (
            id,
            name,
            role
          )
        )
      `)
      .eq('id', classId)
      .single()

    if (error) {
      console.error('Error fetching class by id:', error)
      throw error
    }

    if (!data) return null

    // 멤버 정보 정리
    const members = data.class_members?.map((cm: Record<string, unknown>) => ({
      user_id: cm.user_id as string,
      user: cm.profiles ? {
        id: (cm.profiles as Record<string, unknown>).id as string,
        name: (cm.profiles as Record<string, unknown>).name as string,
        role: Array.isArray((cm.profiles as Record<string, unknown>).role) ? (cm.profiles as Record<string, unknown>).role : [(cm.profiles as Record<string, unknown>).role]
      } : null
    })).filter((member): member is {user_id: string, user: {id: string, name: string, role: string[]}} => member.user !== null) || []

    const student_count = members.filter(member => 
      member.user && member.user.role && member.user.role.includes('student')
    ).length

    const teacher_count = members.filter(member => 
      member.user && member.user.role && member.user.role.includes('teacher')
    ).length

    return {
      ...data,
      members,
      student_count,
      teacher_count
    }
  },

  // 반 생성
  async createClass(name: string): Promise<Class> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        await logError(LOG_ACTIONS.CLASS_CREATED, RESOURCE_TYPES.CLASS, error.message, undefined, { name })
        throw error
      }

      await logSuccess(LOG_ACTIONS.CLASS_CREATED, RESOURCE_TYPES.CLASS, data.id, { name })
      return data
    } catch (error: unknown) {
      console.error('Error creating class:', error)
      throw error
    }
  },

  // 반 이름 수정
  async updateClassName(classId: number, newName: string): Promise<void> {
    const { error } = await supabase
      .from('classes')
      .update({ 
        name: newName,
        updated_at: new Date().toISOString()
      })
      .eq('id', classId)

    if (error) {
      console.error('Error updating class name:', error)
      throw error
    }
  },

  // 반 삭제
  async deleteClass(classId: number): Promise<void> {
    // 먼저 관련 데이터 확인
    const { data: members } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)

    if (members && members.length > 0) {
      throw new Error('반에 학생이나 교사가 배정되어 있어서 삭제할 수 없습니다. 먼저 모든 멤버를 제거해주세요.')
    }

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)

    if (error) {
      console.error('Error deleting class:', error)
      throw error
    }
  },

  // 반에 사용자 추가
  async addMemberToClass(classId: number, userId: string): Promise<void> {
    // 이미 배정되어 있는지 확인
    const { data: existing } = await supabase
      .from('class_members')
      .select('*')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      throw new Error('이미 해당 반에 배정된 사용자입니다.')
    }

    const { error } = await supabase
      .from('class_members')
      .insert({
        class_id: classId,
        user_id: userId
      })

    if (error) {
      console.error('Error adding member to class:', error)
      throw error
    }
  },

  // 반에서 사용자 제거
  async removeMemberFromClass(classId: number, userId: string): Promise<void> {
    const { error } = await supabase
      .from('class_members')
      .delete()
      .eq('class_id', classId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing member from class:', error)
      throw error
    }
  },

  // 반 멤버 일괄 추가
  async addMultipleMembersToClass(classId: number, userIds: string[]): Promise<void> {
    const memberships = userIds.map(userId => ({
      class_id: classId,
      user_id: userId
    }))

    const { error } = await supabase
      .from('class_members')
      .insert(memberships)

    if (error) {
      console.error('Error adding multiple members to class:', error)
      throw error
    }
  },

  // 반 멤버 일괄 제거
  async removeMultipleMembersFromClass(classId: number, userIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('class_members')
      .delete()
      .eq('class_id', classId)
      .in('user_id', userIds)

    if (error) {
      console.error('Error removing multiple members from class:', error)
      throw error
    }
  },

  // 반 통계 조회
  async getClassStats(): Promise<{
    total_classes: number
    total_students: number
    total_teachers: number
    average_students_per_class: number
    classes_without_teacher: number
  }> {
    const classes = await this.getClasses()
    
    const total_classes = classes.length
    const total_students = classes.reduce((sum, cls) => sum + cls.student_count, 0)
    const total_teachers = classes.reduce((sum, cls) => sum + cls.teacher_count, 0)
    const average_students_per_class = total_classes > 0 ? total_students / total_classes : 0
    const classes_without_teacher = classes.filter(cls => cls.teacher_count === 0).length

    return {
      total_classes,
      total_students,
      total_teachers,
      average_students_per_class: Math.round(average_students_per_class * 10) / 10,
      classes_without_teacher
    }
  },

  // 사용자가 소속된 반 목록 조회
  async getClassesByUser(userId: string): Promise<Class[]> {
    const { data, error } = await supabase
      .from('class_members')
      .select(`
        classes (
          id,
          name,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching classes by user:', error)
      throw error
    }

    return data?.map((cm: Record<string, unknown>) => cm.classes as Class).filter(Boolean) || []
  },

  // 간단한 반 목록 (드롭다운용)
  async getSimpleClasses(): Promise<Array<{ id: number; name: string }>> {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('Error fetching simple classes:', error)
      throw error
    }

    return data || []
  }
}