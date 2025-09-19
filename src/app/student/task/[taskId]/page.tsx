'use client'

// 정적 생성 방지
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/contexts/AuthContext'
import { 
  getStudentTask,
  getWorkbookTypeLabel,
  getSubjectLabel,
  getStatusLabel,
  updateStudentTaskStatus
} from '@/lib/student-tasks'
import SRSTaskComponent from '@/components/tasks/SRSTaskComponent'
import PDFTaskComponent from '@/components/tasks/PDFTaskComponent'
import EssayTaskComponent from '@/components/tasks/EssayTaskComponent'
import ViewingTaskComponent from '@/components/tasks/ViewingTaskComponent'
import LectureTaskComponent from '@/components/tasks/LectureTaskComponent'
import type { Database } from '@/lib/supabase'

type StudentTaskDetail = Database['public']['Tables']['student_tasks']['Row'] & {
  assignment: Database['public']['Tables']['assignments']['Row'] & {
    workbook: Database['public']['Tables']['workbooks']['Row'] & {
      workbook_items: Database['public']['Tables']['workbook_items']['Row'][]
    }
  }
}

function StudentTaskContent() {
  const [task, setTask] = useState<StudentTaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { taskId } = useParams()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user?.id && taskId) {
      loadTask()
    }
  }, [user?.id, taskId])

  async function loadTask() {
    try {
      setLoading(true)
      const data = await getStudentTask(Number(taskId), user!.id)
      setTask(data)
    } catch (err) {
      console.error('Error loading task:', err)
      setError('과제를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusUpdate(
    status: Database['public']['Enums']['task_status'], 
    progressPct?: number
  ) {
    if (!task) return

    try {
      await updateStudentTaskStatus(task.id, status, progressPct)
      setTask(prev => prev ? { ...prev, status, progress_pct: progressPct || prev.progress_pct } : null)
    } catch (err) {
      console.error('Error updating task status:', err)
      alert('상태 업데이트 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">과제를 불러오는 중...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !task) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 text-lg font-medium mb-2">오류 발생</div>
            <p className="text-red-600">{error || '과제를 찾을 수 없습니다.'}</p>
            <div className="flex gap-4 justify-center mt-4">
              <button 
                onClick={loadTask}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                다시 시도
              </button>
              <button 
                onClick={() => router.push('/student/tasks')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                과제 목록으로
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  function renderTaskComponent() {
    if (!task) return null
    const workbookType = task.assignment.workbook.type
    
    switch (workbookType) {
      case 'SRS':
        return (
          <SRSTaskComponent 
            task={task!} 
            onStatusUpdate={handleStatusUpdate}
          />
        )
      case 'PDF':
        return (
          <PDFTaskComponent 
            task={task!} 
            onStatusUpdate={handleStatusUpdate}
          />
        )
      case 'ESSAY':
        return (
          <EssayTaskComponent 
            task={task!} 
            onStatusUpdate={handleStatusUpdate}
          />
        )
      case 'VIEWING':
        return (
          <ViewingTaskComponent 
            task={task!} 
            onStatusUpdate={handleStatusUpdate}
          />
        )
      case 'LECTURE':
        return (
          <LectureTaskComponent 
            task={task!} 
            onStatusUpdate={handleStatusUpdate}
          />
        )
      default:
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <div className="text-yellow-600 text-lg font-medium mb-2">지원하지 않는 과제 유형</div>
            <p className="text-yellow-600">이 과제 유형은 아직 지원되지 않습니다.</p>
          </div>
        )
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => router.push('/student/tasks')}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              ← 과제 목록으로
            </button>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {task.assignment.workbook.title}
          </h1>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className={`px-2 py-1 rounded-full bg-blue-100 text-blue-800`}>
              {getSubjectLabel(task.assignment.workbook.subject)}
            </span>
            <span className={`px-2 py-1 rounded-full bg-purple-100 text-purple-800`}>
              {getWorkbookTypeLabel(task.assignment.workbook.type)}
            </span>
            <span>마감: {new Date(task.assignment.due_at).toLocaleString('ko-KR')}</span>
            <span className={`px-2 py-1 rounded-full ${
              task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              task.status === 'in_progress' ? 'bg-red-100 text-red-800' :
              'bg-green-100 text-green-800'
            }`}>
              {getStatusLabel(task.status)}
            </span>
          </div>

          {/* 과제 태그 */}
          {task.assignment.workbook.tags && task.assignment.workbook.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {task.assignment.workbook.tags.map((tag, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 주차/교시 정보 */}
          {(task.assignment.workbook.week || task.assignment.session_no) && (
            <div className="text-sm text-gray-600 mt-2">
              {task.assignment.workbook.week && `${task.assignment.workbook.week}주차`}
              {task.assignment.workbook.week && task.assignment.session_no && ' • '}
              {task.assignment.session_no && `${task.assignment.session_no}교시`}
            </div>
          )}

          {/* YouTube URL (강의형인 경우) */}
          {task.assignment.workbook.type === 'LECTURE' && task.assignment.workbook.youtube_url && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">강의 영상</p>
              <a 
                href={task.assignment.workbook.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                {task.assignment.workbook.youtube_url}
              </a>
            </div>
          )}
        </div>

        {/* 과제 수행 컴포넌트 */}
        {renderTaskComponent()}
      </div>
    </AppLayout>
  )
}

export default function StudentTaskPage() {
  return (
    <ProtectedRoute allowedRoles={['student']} requireAuth={true}>
      <StudentTaskContent />
    </ProtectedRoute>
  )
}