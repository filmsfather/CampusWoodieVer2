import { supabase } from './supabase'

export interface EssaySubmission {
  id: number
  student_task_id: number
  workbook_item_id: number
  response_text: string
  created_at: string
  student_task: {
    id: number
    user_id: string
    assignment: {
      id: number
      workbook: {
        title: string
        type: string
      }
    }
    student: {
      id: string
      name: string
    }
  }
  workbook_item: {
    id: number
    prompt: string
  }
  review?: {
    id: number
    grade?: string
    feedback?: string
    created_at: string
  }
}

export interface EssayReview {
  id: number
  student_task_id: number
  grade?: string
  feedback?: string
  created_at: string
}

export interface EssayFilters {
  class_id?: string
  subject?: string
  reviewed?: boolean // true: 평가완료, false: 미평가
  search?: string
}

export const essayReviewApi = {
  // 서술형 과제 제출물 목록 조회
  async getEssaySubmissions(teacherId: string, filters: EssayFilters = {}): Promise<EssaySubmission[]> {
    const query = supabase
      .from('answers')
      .select(`
        id,
        student_task_id,
        workbook_item_id,
        response_text,
        created_at,
        student_task:student_tasks(
          id,
          user_id,
          assignment:assignments(
            id,
            created_by,
            workbook:workbooks(
              title,
              type
            )
          ),
          student:profiles(
            id,
            name
          )
        ),
        workbook_item:workbook_items(
          id,
          prompt
        )
      `)
      .eq('student_task.assignment.created_by', teacherId)
      .eq('student_task.assignment.workbook.type', 'ESSAY')
      .not('response_text', 'is', null)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching essay submissions:', error)
      throw error
    }

    // 각 제출물의 리뷰 정보 조회
    const submissionsWithReviews = await Promise.all(
      (data || []).map(async (submission: Record<string, unknown>) => {
        const { data: reviewData } = await supabase
          .from('essay_reviews')
          .select('id, grade, feedback, created_at')
          .eq('student_task_id', submission.student_task_id)
          .single()

        const studentTask = Array.isArray(submission.student_task) ? submission.student_task[0] : submission.student_task
        const assignment = Array.isArray(studentTask?.assignment) ? studentTask.assignment[0] : studentTask?.assignment
        const workbook = Array.isArray(assignment?.workbook) ? assignment.workbook[0] : assignment?.workbook
        const student = Array.isArray(studentTask?.student) ? studentTask.student[0] : studentTask?.student
        const workbookItem = Array.isArray(submission.workbook_item) ? submission.workbook_item[0] : submission.workbook_item

        return {
          ...submission,
          student_task: {
            ...studentTask,
            assignment: {
              ...assignment,
              workbook
            },
            student
          },
          workbook_item: workbookItem,
          review: reviewData || undefined
        } as EssaySubmission
      })
    )

    // 필터 적용
    let filteredSubmissions = submissionsWithReviews

    if (filters.class_id) {
      // 반별 필터링 (class_members 테이블 조인 필요)
      const { data: classMembers } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', filters.class_id)

      const classUserIds = classMembers?.map(member => member.user_id) || []
      filteredSubmissions = filteredSubmissions.filter(submission => 
        classUserIds.includes(submission.student_task.user_id)
      )
    }

    if (filters.subject) {
      filteredSubmissions = filteredSubmissions.filter(submission =>
        (submission.student_task.assignment.workbook as Record<string, unknown>)?.subject === filters.subject
      )
    }

    if (filters.reviewed !== undefined) {
      filteredSubmissions = filteredSubmissions.filter(submission => {
        const hasReview = !!submission.review
        return filters.reviewed ? hasReview : !hasReview
      })
    }

    if (filters.search) {
      filteredSubmissions = filteredSubmissions.filter(submission =>
        submission.student_task.student.name.includes(filters.search || '') ||
        submission.student_task.assignment.workbook.title.includes(filters.search || '') ||
        (submission.response_text || '').includes(filters.search || '')
      )
    }

    return filteredSubmissions
  },

  // 서술형 과제 평가 생성/업데이트
  async submitEssayReview(studentTaskId: number, grade?: string, feedback?: string): Promise<EssayReview> {
    // 기존 리뷰가 있는지 확인
    const { data: existingReview } = await supabase
      .from('essay_reviews')
      .select('id')
      .eq('student_task_id', studentTaskId)
      .single()

    let result

    if (existingReview) {
      // 기존 리뷰 업데이트
      const { data, error } = await supabase
        .from('essay_reviews')
        .update({
          grade,
          feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingReview.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating essay review:', error)
        throw error
      }

      result = data
    } else {
      // 새 리뷰 생성
      const { data, error } = await supabase
        .from('essay_reviews')
        .insert({
          student_task_id: studentTaskId,
          grade,
          feedback
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating essay review:', error)
        throw error
      }

      result = data
    }

    return result
  },

  // 서술형 과제 리뷰 삭제
  async deleteEssayReview(reviewId: number): Promise<void> {
    const { error } = await supabase
      .from('essay_reviews')
      .delete()
      .eq('id', reviewId)

    if (error) {
      console.error('Error deleting essay review:', error)
      throw error
    }
  },

  // 특정 학생 과제의 서술형 제출물과 리뷰 조회
  async getStudentEssaySubmission(studentTaskId: number): Promise<EssaySubmission | null> {
    const { data: answerData, error: answerError } = await supabase
      .from('answers')
      .select(`
        id,
        student_task_id,
        workbook_item_id,
        response_text,
        created_at,
        student_task:student_tasks(
          id,
          user_id,
          assignment:assignments(
            id,
            workbook:workbooks(
              title,
              type
            )
          ),
          student:profiles(
            id,
            name
          )
        ),
        workbook_item:workbook_items(
          id,
          prompt
        )
      `)
      .eq('student_task_id', studentTaskId)
      .single()

    if (answerError || !answerData) {
      return null
    }

    // 리뷰 정보 조회
    const { data: reviewData } = await supabase
      .from('essay_reviews')
      .select('id, grade, feedback, created_at')
      .eq('student_task_id', studentTaskId)
      .single()

    const studentTask = Array.isArray(answerData.student_task) ? answerData.student_task[0] : answerData.student_task
    const assignment = Array.isArray(studentTask?.assignment) ? studentTask.assignment[0] : studentTask?.assignment
    const workbook = Array.isArray(assignment?.workbook) ? assignment.workbook[0] : assignment?.workbook
    const student = Array.isArray(studentTask?.student) ? studentTask.student[0] : studentTask?.student
    const workbookItem = Array.isArray(answerData.workbook_item) ? answerData.workbook_item[0] : answerData.workbook_item

    return {
      ...answerData,
      student_task: {
        ...studentTask,
        assignment: {
          ...assignment,
          workbook
        },
        student
      },
      workbook_item: workbookItem,
      review: reviewData || undefined
    } as EssaySubmission
  },

  // 평가 통계 조회
  async getReviewStats(teacherId: string): Promise<{
    total_submissions: number
    reviewed_submissions: number
    pending_reviews: number
    review_rate: number
  }> {
    // 총 서술형 제출물 수
    const { count: totalCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('student_task.assignment.created_by', teacherId)
      .eq('student_task.assignment.workbook.type', 'ESSAY')
      .not('response_text', 'is', null)

    // 평가 완료된 제출물 수
    const { count: reviewedCount } = await supabase
      .from('essay_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('student_task.assignment.created_by', teacherId)

    const totalSubmissions = totalCount || 0
    const reviewedSubmissions = reviewedCount || 0
    const pendingReviews = totalSubmissions - reviewedSubmissions
    const reviewRate = totalSubmissions > 0 ? Math.round((reviewedSubmissions / totalSubmissions) * 100) : 0

    return {
      total_submissions: totalSubmissions,
      reviewed_submissions: reviewedSubmissions,
      pending_reviews: pendingReviews,
      review_rate: reviewRate
    }
  }
}