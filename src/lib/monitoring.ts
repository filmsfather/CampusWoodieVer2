import { supabase } from './supabase'

// 시스템 로그 타입
export interface SystemLog {
  id: number
  user_id?: string
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  success: boolean
  error_message?: string
  created_at: string
  user?: {
    id: string
    name: string
    role: string[]
  }
}

export interface SystemStats {
  total_users: number
  active_users_today: number
  total_classes: number
  total_workbooks: number
  total_assignments: number
  pending_tasks: number
  completed_tasks: number
  print_requests_pending: number
  storage_usage: {
    total_files: number
    total_size_mb: number
    pdf_files: number
    image_files: number
  }
}

export interface ActivityFilters {
  user_id?: string
  action?: string
  resource_type?: string
  success?: boolean
  start_date?: string
  end_date?: string
  limit?: number
}

// 로그 액션 타입들
export const LOG_ACTIONS = {
  // 인증 관련
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  
  // 사용자 관리
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_ROLE_CHANGED: 'user_role_changed',
  
  // 반 관리
  CLASS_CREATED: 'class_created',
  CLASS_UPDATED: 'class_updated',
  CLASS_DELETED: 'class_deleted',
  CLASS_MEMBER_ADDED: 'class_member_added',
  CLASS_MEMBER_REMOVED: 'class_member_removed',
  
  // 문제집 관리
  WORKBOOK_CREATED: 'workbook_created',
  WORKBOOK_UPDATED: 'workbook_updated',
  WORKBOOK_DELETED: 'workbook_deleted',
  
  // 과제 관리
  ASSIGNMENT_CREATED: 'assignment_created',
  ASSIGNMENT_UPDATED: 'assignment_updated',
  ASSIGNMENT_DELETED: 'assignment_deleted',
  
  // 학생 작업
  TASK_STARTED: 'task_started',
  TASK_COMPLETED: 'task_completed',
  TASK_SUBMITTED: 'task_submitted',
  
  // 파일 관리
  FILE_UPLOADED: 'file_uploaded',
  FILE_DELETED: 'file_deleted',
  
  // 인쇄 요청
  PRINT_REQUESTED: 'print_requested',
  PRINT_COMPLETED: 'print_completed',
  PRINT_CANCELED: 'print_canceled',
  
  // 시스템
  SYSTEM_ERROR: 'system_error',
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import'
} as const

export const RESOURCE_TYPES = {
  USER: 'user',
  CLASS: 'class',
  WORKBOOK: 'workbook',
  ASSIGNMENT: 'assignment',
  TASK: 'task',
  FILE: 'file',
  PRINT_REQUEST: 'print_request',
  SYSTEM: 'system'
} as const

export const monitoringApi = {
  // 시스템 로그 기록
  async logActivity(data: {
    action: string
    resource_type: string
    resource_id?: string | number
    details?: Record<string, unknown>
    success?: boolean
    error_message?: string
  }): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const logData = {
        user_id: user?.id,
        action: data.action,
        resource_type: data.resource_type,
        resource_id: data.resource_id?.toString(),
        details: data.details ? JSON.stringify(data.details) : null,
        success: data.success !== false, // 기본값 true
        error_message: data.error_message,
        ip_address: null, // 클라이언트에서는 IP 주소를 직접 얻기 어려움
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : null,
        created_at: new Date().toISOString()
      }

      // 실제 환경에서는 별도 로그 테이블에 저장
      // 현재는 콘솔 로그로 대체 (실제 구현 시 테이블 생성 필요)
      console.log('System Log:', logData)
      
      // TODO: system_logs 테이블 생성 후 실제 저장
      // await supabase.from('system_logs').insert(logData)
      
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  },

  // 시스템 통계 조회
  async getSystemStats(): Promise<SystemStats> {
    try {
      const [
        usersResult,
        classesResult,
        workbooksResult,
        assignmentsResult,
        tasksResult,
        printRequestsResult
      ] = await Promise.all([
        // 사용자 통계
        supabase.from('profiles').select('id, created_at'),
        
        // 반 통계
        supabase.from('classes').select('id'),
        
        // 문제집 통계
        supabase.from('workbooks').select('id'),
        
        // 과제 통계
        supabase.from('assignments').select('id'),
        
        // 과제 수행 통계
        supabase.from('student_tasks').select('id, status'),
        
        // 인쇄 요청 통계
        supabase.from('print_requests').select('id, status')
      ])

      const users = usersResult.data || []
      const tasks = tasksResult.data || []
      const printRequests = printRequestsResult.data || []
      
      // 오늘 활성 사용자 (임시로 오늘 가입한 사용자로 계산)
      const today = new Date().toISOString().split('T')[0]
      const activeUsersToday = users.filter(user => 
        user.created_at?.startsWith(today)
      ).length

      return {
        total_users: users.length,
        active_users_today: activeUsersToday,
        total_classes: classesResult.data?.length || 0,
        total_workbooks: workbooksResult.data?.length || 0,
        total_assignments: assignmentsResult.data?.length || 0,
        pending_tasks: tasks.filter(task => task.status === 'pending' || task.status === 'in_progress').length,
        completed_tasks: tasks.filter(task => task.status === 'completed').length,
        print_requests_pending: printRequests.filter(req => req.status === 'requested').length,
        storage_usage: {
          total_files: 0, // Storage API로 계산 필요
          total_size_mb: 0,
          pdf_files: 0,
          image_files: 0
        }
      }
    } catch (error) {
      console.error('Error fetching system stats:', error)
      throw error
    }
  },

  // 시스템 상태 체크
  async getSystemHealth(): Promise<{
    database: boolean
    storage: boolean
    auth: boolean
    overall: 'healthy' | 'warning' | 'critical'
    checks: Array<{
      name: string
      status: 'ok' | 'warning' | 'error'
      message?: string
      response_time?: number
    }>
  }> {
    const checks: Array<{
      name: string
      status: 'ok' | 'warning' | 'error'
      message?: string
      response_time?: number
    }> = []
    let overallHealthy = true
    
    try {
      // 데이터베이스 연결 체크
      const dbStart = Date.now()
      const { error: dbError } = await supabase.from('profiles').select('id').limit(1)
      const dbTime = Date.now() - dbStart
      
      checks.push({
        name: 'Database',
        status: dbError ? 'error' : (dbTime > 2000 ? 'warning' : 'ok'),
        message: dbError ? dbError.message : `Response time: ${dbTime}ms`,
        response_time: dbTime
      })
      
      if (dbError) overallHealthy = false

      // Auth 서비스 체크
      const authStart = Date.now()
      const { error: authError } = await supabase.auth.getSession()
      const authTime = Date.now() - authStart
      
      checks.push({
        name: 'Authentication',
        status: authError ? 'error' : (authTime > 1000 ? 'warning' : 'ok'),
        message: authError ? authError.message : `Response time: ${authTime}ms`,
        response_time: authTime
      })
      
      if (authError) overallHealthy = false

      // Storage 서비스 체크 (간단히 bucket 목록 조회)
      const storageStart = Date.now()
      const { error: storageError } = await supabase.storage.listBuckets()
      const storageTime = Date.now() - storageStart
      
      checks.push({
        name: 'Storage',
        status: storageError ? 'error' : (storageTime > 2000 ? 'warning' : 'ok'),
        message: storageError ? storageError.message : `Response time: ${storageTime}ms`,
        response_time: storageTime
      })
      
      if (storageError) overallHealthy = false

      return {
        database: !dbError,
        storage: !storageError,
        auth: !authError,
        overall: overallHealthy ? 'healthy' : 'critical',
        checks
      }
    } catch (error) {
      console.error('Error checking system health:', error)
      return {
        database: false,
        storage: false,
        auth: false,
        overall: 'critical',
        checks: [{
          name: 'System',
          status: 'error',
          message: 'Failed to perform health check'
        }]
      }
    }
  },

  // 최근 활동 로그 조회 (임시로 빈 배열 반환, 실제로는 system_logs 테이블에서 조회)
  async getRecentActivity(filters: ActivityFilters = {}): Promise<SystemLog[]> {
    // TODO: system_logs 테이블 구현 후 실제 데이터 반환
    return []
  },

  // 사용량 리포트 생성
  async generateUsageReport(startDate: string, endDate: string): Promise<{
    period: { start: string; end: string }
    user_activity: {
      total_logins: number
      unique_users: number
      most_active_users: Array<{ name: string; activity_count: number }>
    }
    content_creation: {
      workbooks_created: number
      assignments_created: number
      tasks_completed: number
    }
    system_usage: {
      files_uploaded: number
      print_requests: number
      storage_used_mb: number
    }
  }> {
    try {
      const [workbooksResult, assignmentsResult, tasksResult, printRequestsResult] = await Promise.all([
        supabase
          .from('workbooks')
          .select('id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        
        supabase
          .from('assignments')
          .select('id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        
        supabase
          .from('student_tasks')
          .select('id, status, updated_at')
          .eq('status', 'completed')
          .gte('updated_at', startDate)
          .lte('updated_at', endDate),
        
        supabase
          .from('print_requests')
          .select('id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
      ])

      return {
        period: { start: startDate, end: endDate },
        user_activity: {
          total_logins: 0, // 로그에서 계산 필요
          unique_users: 0, // 로그에서 계산 필요
          most_active_users: [] // 로그에서 계산 필요
        },
        content_creation: {
          workbooks_created: workbooksResult.data?.length || 0,
          assignments_created: assignmentsResult.data?.length || 0,
          tasks_completed: tasksResult.data?.length || 0
        },
        system_usage: {
          files_uploaded: 0, // Storage에서 계산 필요
          print_requests: printRequestsResult.data?.length || 0,
          storage_used_mb: 0 // Storage에서 계산 필요
        }
      }
    } catch (error) {
      console.error('Error generating usage report:', error)
      throw error
    }
  }
}

// 편의 함수들
export const logSuccess = (action: string, resourceType: string, resourceId?: string | number, details?: Record<string, unknown>) => {
  return monitoringApi.logActivity({
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    success: true
  })
}

export const logError = (action: string, resourceType: string, error: string, resourceId?: string | number, details?: Record<string, unknown>) => {
  return monitoringApi.logActivity({
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    success: false,
    error_message: error
  })
}