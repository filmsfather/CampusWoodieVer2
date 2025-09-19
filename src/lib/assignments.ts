import { supabase } from './supabase'

export interface AssignmentWithDetails {
  id: number
  workbook_id: number
  target_type: string
  target_id: string
  session_no?: number
  due_at: string
  created_by: string
  created_at: string
  workbook: {
    id: number
    title: string
    subject: string
    type: string
    tags: string[]
    week?: number
    is_common: boolean
  }
  class_name?: string
  completion_rate: number
  total_students: number
  completed_students: number
  incomplete_students: number
}

export interface StudentTaskWithDetails {
  id: number
  assignment_id: number
  user_id: string
  status: string
  progress_pct: number
  created_at: string
  updated_at: string
  student: {
    id: string
    name: string
  }
  assignment: {
    id: number
    workbook: {
      title: string
      type: string
    }
  }
  // 유형별 제출물 정보
  pdf_upload?: {
    id: number
    file_path: string
    created_at: string
  }
  essay_review?: {
    id: number
    grade?: string
    feedback?: string
  }
  viewing_notes_count?: number
  lecture_summary?: {
    id: number
    summary: string
  }
}

export interface AssignmentFilters {
  week?: string
  subject?: string
  type?: string
  due_status?: 'overdue' | 'upcoming' | 'all'
  search?: string
}

export const assignmentApi = {
  // 교사가 출제한 과제 목록 조회 (My Assignments)
  async getMyAssignments(teacherId: string, filters: AssignmentFilters = {}): Promise<AssignmentWithDetails[]> {
    let query = supabase
      .from('assignments')
      .select(`
        id,
        workbook_id,
        target_type,
        target_id,
        session_no,
        due_at,
        created_by,
        created_at,
        workbook:workbooks(
          id,
          title,
          subject,
          type,
          tags,
          week,
          is_common
        )
      `)
      .eq('created_by', teacherId)
      .order('due_at', { ascending: true })

    // 필터 적용
    if (filters.subject) {
      query = query.eq('workbook.subject', filters.subject)
    }
    
    if (filters.type) {
      query = query.eq('workbook.type', filters.type)
    }

    if (filters.week) {
      if (filters.week === 'common') {
        query = query.eq('workbook.is_common', true)
      } else {
        const weekNumber = parseInt(filters.week.replace('주차', ''))
        query = query.eq('workbook.week', weekNumber)
      }
    }

    if (filters.search) {
      query = query.ilike('workbook.title', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching assignments:', error)
      throw error
    }

    // 각 과제의 완료율 계산
    const assignmentsWithStats = await Promise.all(
      (data || []).map(async (assignment: Record<string, unknown>) => {
        const stats = await this.getAssignmentCompletionStats(assignment.id as number)
        
        // 반 이름 조회 (target_type이 'class'인 경우)
        let className = ''
        if (assignment.target_type === 'class') {
          const { data: classData } = await supabase
            .from('classes')
            .select('name')
            .eq('id', assignment.target_id)
            .single()
          
          className = classData?.name || ''
        }

        return {
          ...assignment,
          workbook: Array.isArray(assignment.workbook) ? assignment.workbook[0] : assignment.workbook,
          class_name: className,
          completion_rate: stats.completion_rate,
          total_students: stats.total_students,
          completed_students: stats.completed_students,
          incomplete_students: stats.incomplete_students
        } as AssignmentWithDetails
      })
    )

    // 마감일 필터 적용
    if (filters.due_status) {
      const now = new Date()
      return assignmentsWithStats.filter(assignment => {
        const dueDate = new Date(assignment.due_at)
        if (filters.due_status === 'overdue') {
          return dueDate < now
        } else if (filters.due_status === 'upcoming') {
          return dueDate >= now
        }
        return true
      })
    }

    return assignmentsWithStats
  },

  // 과제의 완료율 통계 계산
  async getAssignmentCompletionStats(assignmentId: number): Promise<{
    completion_rate: number
    total_students: number
    completed_students: number
    incomplete_students: number
  }> {
    const { data, error } = await supabase
      .from('student_tasks')
      .select('status')
      .eq('assignment_id', assignmentId)

    if (error) {
      console.error('Error fetching completion stats:', error)
      throw error
    }

    const totalStudents = data?.length || 0
    const completedStudents = data?.filter(task => task.status === 'completed').length || 0
    const incompleteStudents = totalStudents - completedStudents
    const completionRate = totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0

    return {
      completion_rate: completionRate,
      total_students: totalStudents,
      completed_students: completedStudents,
      incomplete_students: incompleteStudents
    }
  },

  // 과제의 미완료 학생 목록 조회
  async getIncompleteStudents(assignmentId: number): Promise<StudentTaskWithDetails[]> {
    const { data, error } = await supabase
      .from('student_tasks')
      .select(`
        id,
        assignment_id,
        user_id,
        status,
        progress_pct,
        created_at,
        updated_at,
        student:profiles(
          id,
          name
        ),
        assignment:assignments(
          id,
          workbook:workbooks(
            title,
            type
          )
        )
      `)
      .eq('assignment_id', assignmentId)
      .neq('status', 'completed')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching incomplete students:', error)
      throw error
    }

    // 각 학생 과제의 제출물 정보 조회
    const studentsWithSubmissions = await Promise.all(
      (data || []).map(async (studentTask: Record<string, unknown>) => {
        const assignment = Array.isArray(studentTask.assignment) ? studentTask.assignment[0] : studentTask.assignment
        const workbook = Array.isArray(assignment?.workbook) ? assignment.workbook[0] : assignment?.workbook
        const student = Array.isArray(studentTask.student) ? studentTask.student[0] : studentTask.student
        const workbookType = workbook?.type

        let additionalData = {}

        // PDF 제출형인 경우 업로드 파일 정보 조회
        if (workbookType === 'PDF') {
          const { data: pdfData } = await supabase
            .from('pdf_uploads')
            .select('id, file_path, created_at')
            .eq('student_task_id', studentTask.id)
            .single()
          
          if (pdfData) {
            additionalData = { pdf_upload: pdfData }
          }
        }

        // 서술형인 경우 리뷰 정보 조회
        if (workbookType === 'ESSAY') {
          const { data: reviewData } = await supabase
            .from('essay_reviews')
            .select('id, grade, feedback')
            .eq('student_task_id', studentTask.id)
            .single()
          
          if (reviewData) {
            additionalData = { essay_review: reviewData }
          }
        }

        // 영화감상형인 경우 감상노트 개수 조회
        if (workbookType === 'VIEWING') {
          const { count } = await supabase
            .from('viewing_notes')
            .select('*', { count: 'exact', head: true })
            .eq('student_task_id', studentTask.id)
          
          additionalData = { viewing_notes_count: count || 0 }
        }

        // 인터넷강의형인 경우 요약 정보 조회
        if (workbookType === 'LECTURE') {
          const { data: summaryData } = await supabase
            .from('lecture_summaries')
            .select('id, summary')
            .eq('student_task_id', studentTask.id)
            .single()
          
          if (summaryData) {
            additionalData = { lecture_summary: summaryData }
          }
        }

        return {
          ...studentTask,
          assignment: {
            ...assignment,
            workbook
          },
          student,
          ...additionalData
        } as StudentTaskWithDetails
      })
    )

    return studentsWithSubmissions
  },

  // 모든 반의 과제 현황 조회 (All Classes)
  async getAllClassesAssignments(filters: AssignmentFilters = {}): Promise<{
    classes: Array<{
      id: number
      name: string
      students: Array<{
        id: string
        name: string
        completion_rate: number
        incomplete_count: number
        assignments: AssignmentWithDetails[]
      }>
    }>
  }> {
    // 모든 반 조회
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .order('name')

    if (classError) {
      console.error('Error fetching classes:', classError)
      throw classError
    }

    // 각 반의 학생과 과제 정보 조회
    const classesWithStudents = await Promise.all(
      (classes || []).map(async (classItem) => {
        // 반 학생 목록 조회
        const { data: members } = await supabase
          .from('class_members')
          .select(`
            user_id,
            profiles:user_id(
              id,
              name
            )
          `)
          .eq('class_id', classItem.id)

        // 각 학생의 완료율 계산
        const studentsWithStats = await Promise.all(
          (members || []).map(async (member: Record<string, unknown>) => {
            const student = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
            if (!student) return null

            // 학생의 모든 과제 조회
            const { data: studentTasks } = await supabase
              .from('student_tasks')
              .select(`
                id,
                status,
                assignment:assignments(
                  id,
                  due_at,
                  workbook:workbooks(
                    title,
                    type
                  )
                )
              `)
              .eq('user_id', student.id)

            const totalTasks = studentTasks?.length || 0
            const completedTasks = studentTasks?.filter(task => task.status === 'completed').length || 0
            const incompleteTasks = totalTasks - completedTasks
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

            return {
              id: student.id as string,
              name: student.name as string,
              completion_rate: completionRate,
              incomplete_count: incompleteTasks,
              assignments: [] as AssignmentWithDetails[]
            }
          })
        )

        return {
          id: classItem.id as number,
          name: classItem.name as string,
          students: studentsWithStats.filter(Boolean) as {
            id: string
            name: string
            completion_rate: number
            incomplete_count: number
            assignments: AssignmentWithDetails[]
          }[]
        }
      })
    )

    return { classes: classesWithStudents }
  }
}