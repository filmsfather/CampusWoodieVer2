import { supabase } from './supabase'

export interface PrintRequest {
  id: number
  pdf_upload_id: number
  preferred_date?: string
  period?: string
  copies: number
  color: 'bw' | 'color'
  status: 'requested' | 'done' | 'canceled'
  created_at: string
  pdf_upload: {
    id: number
    file_path: string
    student_task: {
      id: number
      user_id: string
      assignment: {
        id: number
        workbook: {
          title: string
        }
      }
      student: {
        id: string
        name: string
      }
    }
  }
}

export interface PrintRequestFilters {
  class_id?: string
  status?: 'requested' | 'done' | 'canceled' | 'all'
  period?: string
  preferred_date?: string
  teacher_id?: string
}

export interface CreatePrintRequestData {
  pdf_upload_id: number
  preferred_date?: string
  period?: string
  copies?: number
  color?: 'bw' | 'color'
}

export const printRequestApi = {
  // 인쇄 요청 생성
  async createPrintRequest(data: CreatePrintRequestData): Promise<PrintRequest> {
    const { data: result, error } = await supabase
      .from('print_requests')
      .insert({
        pdf_upload_id: data.pdf_upload_id,
        preferred_date: data.preferred_date,
        period: data.period,
        copies: data.copies || 1,
        color: data.color || 'bw',
        status: 'requested'
      })
      .select(`
        id,
        pdf_upload_id,
        preferred_date,
        period,
        copies,
        color,
        status,
        created_at,
        pdf_upload:pdf_uploads(
          id,
          file_path,
          student_task:student_tasks(
            id,
            user_id,
            assignment:assignments(
              id,
              workbook:workbooks(
                title
              )
            ),
            student:profiles(
              id,
              name
            )
          )
        )
      `)
      .single()

    if (error) {
      console.error('Error creating print request:', error)
      throw error
    }

    const pdfUpload = Array.isArray(result.pdf_upload) ? result.pdf_upload[0] : result.pdf_upload
    const studentTask = Array.isArray(pdfUpload?.student_task) ? pdfUpload.student_task[0] : pdfUpload?.student_task
    const assignment = Array.isArray(studentTask?.assignment) ? studentTask.assignment[0] : studentTask?.assignment
    const workbook = Array.isArray(assignment?.workbook) ? assignment.workbook[0] : assignment?.workbook
    const student = Array.isArray(studentTask?.student) ? studentTask.student[0] : studentTask?.student

    return {
      ...result,
      pdf_upload: {
        ...pdfUpload,
        student_task: {
          ...studentTask,
          assignment: {
            ...assignment,
            workbook
          },
          student
        }
      }
    } as PrintRequest
  },

  // 다중 인쇄 요청 생성 (반별 일괄 요청)
  async createBulkPrintRequests(
    pdfUploadIds: number[],
    requestData: Omit<CreatePrintRequestData, 'pdf_upload_id'>
  ): Promise<PrintRequest[]> {
    const insertData = pdfUploadIds.map(pdfUploadId => ({
      pdf_upload_id: pdfUploadId,
      preferred_date: requestData.preferred_date,
      period: requestData.period,
      copies: requestData.copies || 1,
      color: requestData.color || 'bw',
      status: 'requested' as const
    }))

    const { data, error } = await supabase
      .from('print_requests')
      .insert(insertData)
      .select(`
        id,
        pdf_upload_id,
        preferred_date,
        period,
        copies,
        color,
        status,
        created_at,
        pdf_upload:pdf_uploads(
          id,
          file_path,
          student_task:student_tasks(
            id,
            user_id,
            assignment:assignments(
              id,
              workbook:workbooks(
                title
              )
            ),
            student:profiles(
              id,
              name
            )
          )
        )
      `)

    if (error) {
      console.error('Error creating bulk print requests:', error)
      throw error
    }

    return (data || []).map((item: Record<string, unknown>) => {
      const pdfUpload = Array.isArray(item.pdf_upload) ? item.pdf_upload[0] : item.pdf_upload
      const studentTask = Array.isArray(pdfUpload?.student_task) ? pdfUpload.student_task[0] : pdfUpload?.student_task
      const assignment = Array.isArray(studentTask?.assignment) ? studentTask.assignment[0] : studentTask?.assignment
      const workbook = Array.isArray(assignment?.workbook) ? assignment.workbook[0] : assignment?.workbook
      const student = Array.isArray(studentTask?.student) ? studentTask.student[0] : studentTask?.student

      return {
        ...item,
        pdf_upload: {
          ...pdfUpload,
          student_task: {
            ...studentTask,
            assignment: {
              ...assignment,
              workbook
            },
            student
          }
        }
      } as PrintRequest
    })
  },

  // 인쇄 요청 목록 조회
  async getPrintRequests(filters: PrintRequestFilters = {}): Promise<PrintRequest[]> {
    let query = supabase
      .from('print_requests')
      .select(`
        id,
        pdf_upload_id,
        preferred_date,
        period,
        copies,
        color,
        status,
        created_at,
        pdf_upload:pdf_uploads(
          id,
          file_path,
          student_task:student_tasks(
            id,
            user_id,
            assignment:assignments(
              id,
              created_by,
              workbook:workbooks(
                title
              )
            ),
            student:profiles(
              id,
              name
            )
          )
        )
      `)
      .order('created_at', { ascending: false })

    // 상태 필터
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    // 교시 필터
    if (filters.period) {
      query = query.eq('period', filters.period)
    }

    // 희망일 필터
    if (filters.preferred_date) {
      query = query.eq('preferred_date', filters.preferred_date)
    }

    // 교사 필터
    if (filters.teacher_id) {
      query = query.eq('pdf_upload.student_task.assignment.created_by', filters.teacher_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching print requests:', error)
      throw error
    }

    let filteredData = (data || []).map((item: Record<string, unknown>) => {
      const pdfUpload = Array.isArray(item.pdf_upload) ? item.pdf_upload[0] : item.pdf_upload
      const studentTask = Array.isArray(pdfUpload?.student_task) ? pdfUpload.student_task[0] : pdfUpload?.student_task
      const assignment = Array.isArray(studentTask?.assignment) ? studentTask.assignment[0] : studentTask?.assignment
      const workbook = Array.isArray(assignment?.workbook) ? assignment.workbook[0] : assignment?.workbook
      const student = Array.isArray(studentTask?.student) ? studentTask.student[0] : studentTask?.student

      return {
        ...item,
        pdf_upload: {
          ...pdfUpload,
          student_task: {
            ...studentTask,
            assignment: {
              ...assignment,
              workbook
            },
            student
          }
        }
      } as PrintRequest
    })

    // 반별 필터링 (class_members 조인 필요)
    if (filters.class_id) {
      const { data: classMembers } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', filters.class_id)

      const classUserIds = classMembers?.map(member => member.user_id) || []
      filteredData = filteredData.filter(request =>
        classUserIds.includes(request.pdf_upload.student_task.user_id)
      )
    }

    return filteredData
  },

  // 인쇄 요청 상태 업데이트
  async updatePrintRequestStatus(requestId: number, status: 'requested' | 'done' | 'canceled'): Promise<PrintRequest> {
    const { data, error } = await supabase
      .from('print_requests')
      .update({ status })
      .eq('id', requestId)
      .select(`
        id,
        pdf_upload_id,
        preferred_date,
        period,
        copies,
        color,
        status,
        created_at,
        pdf_upload:pdf_uploads(
          id,
          file_path,
          student_task:student_tasks(
            id,
            user_id,
            assignment:assignments(
              id,
              workbook:workbooks(
                title
              )
            ),
            student:profiles(
              id,
              name
            )
          )
        )
      `)
      .single()

    if (error) {
      console.error('Error updating print request status:', error)
      throw error
    }

    const pdfUpload = Array.isArray(data.pdf_upload) ? data.pdf_upload[0] : data.pdf_upload
    const studentTask = Array.isArray(pdfUpload?.student_task) ? pdfUpload.student_task[0] : pdfUpload?.student_task
    const assignment = Array.isArray(studentTask?.assignment) ? studentTask.assignment[0] : studentTask?.assignment
    const workbook = Array.isArray(assignment?.workbook) ? assignment.workbook[0] : assignment?.workbook
    const student = Array.isArray(studentTask?.student) ? studentTask.student[0] : studentTask?.student

    return {
      ...data,
      pdf_upload: {
        ...pdfUpload,
        student_task: {
          ...studentTask,
          assignment: {
            ...assignment,
            workbook
          },
          student
        }
      }
    } as PrintRequest
  },

  // 인쇄 요청 삭제
  async deletePrintRequest(requestId: number): Promise<void> {
    const { error } = await supabase
      .from('print_requests')
      .delete()
      .eq('id', requestId)

    if (error) {
      console.error('Error deleting print request:', error)
      throw error
    }
  },

  // 과제별 PDF 업로드 목록 조회 (인쇄 요청용)
  async getAssignmentPdfUploads(assignmentId: number): Promise<Array<{
    id: number
    file_path: string
    student_task_id: number
    student_name: string
    has_print_request: boolean
  }>> {
    const { data, error } = await supabase
      .from('pdf_uploads')
      .select(`
        id,
        file_path,
        student_task_id,
        student_task:student_tasks(
          user_id,
          student:profiles(
            name
          )
        )
      `)
      .eq('student_task.assignment_id', assignmentId)

    if (error) {
      console.error('Error fetching PDF uploads:', error)
      throw error
    }

    // 각 PDF 업로드에 대한 인쇄 요청 존재 여부 확인
    const uploadsWithRequestStatus = await Promise.all(
      (data || []).map(async (upload: Record<string, unknown>) => {
        const { data: printRequest } = await supabase
          .from('print_requests')
          .select('id')
          .eq('pdf_upload_id', upload.id)
          .single()

        const studentTask = Array.isArray(upload.student_task) ? upload.student_task[0] : upload.student_task
        const student = Array.isArray(studentTask?.student) ? studentTask.student[0] : studentTask?.student

        return {
          id: upload.id as number,
          file_path: upload.file_path as string,
          student_task_id: upload.student_task_id as number,
          student_name: student?.name as string || '',
          has_print_request: !!printRequest
        }
      })
    )

    return uploadsWithRequestStatus
  },

  // 인쇄 큐 통계 조회
  async getPrintQueueStats(): Promise<{
    total_requests: number
    pending_requests: number
    completed_requests: number
    canceled_requests: number
  }> {
    const { data, error } = await supabase
      .from('print_requests')
      .select('status')

    if (error) {
      console.error('Error fetching print queue stats:', error)
      throw error
    }

    const stats = (data || []).reduce(
      (acc, request) => {
        acc.total_requests++
        if (request.status === 'requested') acc.pending_requests++
        else if (request.status === 'done') acc.completed_requests++
        else if (request.status === 'canceled') acc.canceled_requests++
        return acc
      },
      {
        total_requests: 0,
        pending_requests: 0,
        completed_requests: 0,
        canceled_requests: 0
      }
    )

    return stats
  }
}