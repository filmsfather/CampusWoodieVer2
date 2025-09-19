import { supabase } from './supabase'
import type { Database } from './supabase'

type StudentTask = Database['public']['Tables']['student_tasks']['Row'] & {
  assignment: Database['public']['Tables']['assignments']['Row'] & {
    workbook: Database['public']['Tables']['workbooks']['Row']
  }
}

// 학생의 과제 목록을 가져오는 함수
export async function getStudentTasks(userId: string) {
  const { data, error } = await supabase
    .from('student_tasks')
    .select(`
      *,
      assignment:assignments (
        *,
        workbook:workbooks (*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching student tasks:', error)
    throw error
  }

  return data as StudentTask[]
}

// 특정 학생 과제 상세 정보를 가져오는 함수
export async function getStudentTask(taskId: number, userId: string) {
  const { data, error } = await supabase
    .from('student_tasks')
    .select(`
      *,
      assignment:assignments (
        *,
        workbook:workbooks (
          *,
          workbook_items (*)
        )
      )
    `)
    .eq('id', taskId)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching student task:', error)
    throw error
  }

  return data as StudentTask & {
    assignment: Database['public']['Tables']['assignments']['Row'] & {
      workbook: Database['public']['Tables']['workbooks']['Row'] & {
        workbook_items: Database['public']['Tables']['workbook_items']['Row'][]
      }
    }
  }
}

// 과제 상태 업데이트 함수
export async function updateStudentTaskStatus(
  taskId: number, 
  status: Database['public']['Enums']['task_status'],
  progressPct?: number
) {
  const updateData: Record<string, unknown> = { 
    status,
    updated_at: new Date().toISOString()
  }
  
  if (progressPct !== undefined) {
    updateData.progress_pct = progressPct
  }

  const { data, error } = await supabase
    .from('student_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    console.error('Error updating student task status:', error)
    throw error
  }

  return data
}

// 과제 진행률 계산 함수
export function calculateProgress(task: StudentTask): number {
  const workbookType = task.assignment.workbook.type
  
  switch (workbookType) {
    case 'SRS':
      // SRS는 모든 문항이 완료되어야 100%
      return task.progress_pct || 0
    case 'PDF':
      // PDF는 파일 업로드 시 100%
      return task.status === 'completed' ? 100 : 0
    case 'ESSAY':
      // 서술형은 텍스트 제출 시 100%
      return task.status === 'completed' ? 100 : 0
    case 'VIEWING':
      // 영화감상은 required_count만큼 노트 작성 시 100%
      return task.progress_pct || 0
    case 'LECTURE':
      // 인터넷강의는 요약 제출 시 100%
      return task.status === 'completed' ? 100 : 0
    default:
      return 0
  }
}

// 과제 유형별 라벨 반환 함수
export function getWorkbookTypeLabel(type: Database['public']['Enums']['workbook_type']): string {
  const labels = {
    'SRS': 'SRS형',
    'PDF': 'PDF 제출형',
    'ESSAY': '서술형',
    'VIEWING': '영화감상형',
    'LECTURE': '인터넷강의형'
  }
  return labels[type]
}

// 과목별 라벨 반환 함수
export function getSubjectLabel(subject: Database['public']['Enums']['subject']): string {
  const labels = {
    'directing': '연출',
    'writing': '작법',
    'research': '연구',
    'integrated': '통합'
  }
  return labels[subject]
}

// 상태별 라벨 반환 함수
export function getStatusLabel(status: Database['public']['Enums']['task_status']): string {
  const labels = {
    'pending': '대기 중',
    'in_progress': '진행 중',
    'completed': '완료'
  }
  return labels[status]
}

// 상태별 색상 클래스 반환 함수
export function getStatusColor(status: Database['public']['Enums']['task_status']): string {
  const colors = {
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-500',
    'in_progress': 'bg-red-100 text-red-800 border-red-500', 
    'completed': 'bg-green-100 text-green-800 border-green-500'
  }
  return colors[status]
}

// 과제 유형별 색상 클래스 반환 함수  
export function getWorkbookTypeColor(type: Database['public']['Enums']['workbook_type']): string {
  const colors = {
    'SRS': 'bg-purple-100 text-purple-800',
    'PDF': 'bg-orange-100 text-orange-800',
    'ESSAY': 'bg-teal-100 text-teal-800',
    'VIEWING': 'bg-pink-100 text-pink-800',
    'LECTURE': 'bg-indigo-100 text-indigo-800'
  }
  return colors[type]
}

// 과목별 색상 클래스 반환 함수
export function getSubjectColor(subject: Database['public']['Enums']['subject']): string {
  const colors = {
    'directing': 'bg-blue-100 text-blue-800',
    'writing': 'bg-green-100 text-green-800',
    'research': 'bg-red-100 text-red-800',
    'integrated': 'bg-gray-100 text-gray-800'
  }
  return colors[subject]
}

// 마감일까지 남은 시간 계산 함수
export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date()
  const diffTime = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// 마감일 표시 함수
export function formatDueDate(dueDate: string): string {
  const daysUntil = getDaysUntilDue(dueDate)
  const date = new Date(dueDate).toLocaleDateString('ko-KR')
  
  if (daysUntil < 0) {
    return `${date} (${Math.abs(daysUntil)}일 지남)`
  } else if (daysUntil === 0) {
    return `${date} (오늘 마감)`
  } else if (daysUntil === 1) {
    return `${date} (내일 마감)`
  } else {
    return `${date} (${daysUntil}일 남음)`
  }
}