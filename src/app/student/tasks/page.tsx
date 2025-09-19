'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/contexts/AuthContext'
import { 
  getStudentTasks,
  getWorkbookTypeLabel,
  getSubjectLabel,
  getStatusLabel,
  getStatusColor,
  getWorkbookTypeColor,
  getSubjectColor,
  calculateProgress,
  formatDueDate,
  getDaysUntilDue
} from '@/lib/student-tasks'
import type { Database } from '@/lib/supabase'

type StudentTask = Database['public']['Tables']['student_tasks']['Row'] & {
  assignment: Database['public']['Tables']['assignments']['Row'] & {
    workbook: Database['public']['Tables']['workbooks']['Row']
  }
}

function StudentTasksContent() {
  const [tasks, setTasks] = useState<StudentTask[]>([])
  const [filteredTasks, setFilteredTasks] = useState<StudentTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('due_date')
  
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user?.id) {
      loadTasks()
    }
  }, [user?.id])

  useEffect(() => {
    filterAndSortTasks()
  }, [tasks, subjectFilter, statusFilter, sortBy])

  async function loadTasks() {
    try {
      setLoading(true)
      const data = await getStudentTasks(user!.id)
      setTasks(data)
    } catch (err) {
      console.error('Error loading tasks:', err)
      setError('과제를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function filterAndSortTasks() {
    let filtered = [...tasks]

    // 과목 필터
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(task => task.assignment.workbook.subject === subjectFilter)
    }

    // 상태 필터
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter)
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          return new Date(a.assignment.due_at).getTime() - new Date(b.assignment.due_at).getTime()
        case 'created_date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'subject':
          return a.assignment.workbook.subject.localeCompare(b.assignment.workbook.subject)
        default:
          return 0
      }
    })

    setFilteredTasks(filtered)
  }

  function handleTaskClick(taskId: number) {
    router.push(`/student/task/${taskId}`)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">과제를 불러오는 중...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 text-lg font-medium mb-2">오류 발생</div>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={loadTasks}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">내 과제</h1>
          <p className="text-gray-600 mt-2">현재 진행 중인 과제를 확인하고 제출하세요.</p>
        </div>

        {/* 필터 및 정렬 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="all">전체 과목</option>
              <option value="directing">연출</option>
              <option value="writing">작법</option>
              <option value="research">연구</option>
              <option value="integrated">통합</option>
            </select>
            
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">전체 상태</option>
              <option value="pending">대기 중</option>
              <option value="in_progress">진행 중</option>
              <option value="completed">완료</option>
            </select>
            
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="due_date">마감일 순</option>
              <option value="created_date">생성일 순</option>
              <option value="subject">과목 순</option>
            </select>
          </div>
        </div>

        {/* 과제 목록 */}
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const progress = calculateProgress(task)
            const daysUntil = getDaysUntilDue(task.assignment.due_at)
            const isOverdue = daysUntil < 0
            const borderColor = getStatusColor(task.status).split(' ')[0].replace('bg-', 'border-')
            
            return (
              <div 
                key={task.id} 
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${borderColor} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => handleTaskClick(task.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{task.assignment.workbook.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                      <span className={`px-2 py-1 rounded-full ${getSubjectColor(task.assignment.workbook.subject)}`}>
                        {getSubjectLabel(task.assignment.workbook.subject)}
                      </span>
                      <span className={`px-2 py-1 rounded-full ${getWorkbookTypeColor(task.assignment.workbook.type)}`}>
                        {getWorkbookTypeLabel(task.assignment.workbook.type)}
                      </span>
                      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                        마감: {formatDueDate(task.assignment.due_at)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status).replace('border-', '')}`}>
                      {getStatusLabel(task.status)}
                    </span>
                    <div className="text-sm text-gray-600 mt-2">진행률: {progress}%</div>
                    {progress > 0 && progress < 100 && (
                      <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{width: `${progress}%`}}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 과제 설명 (있는 경우) */}
                {task.assignment.workbook.tags && task.assignment.workbook.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {task.assignment.workbook.tags.map((tag, index) => (
                      <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {task.assignment.workbook.week && (
                      <span>{task.assignment.workbook.week}주차 • </span>
                    )}
                    {task.assignment.session_no && (
                      <span>{task.assignment.session_no}교시</span>
                    )}
                  </div>
                  
                  <button 
                    className={`px-4 py-2 rounded-md transition-colors ${
                      task.status === 'completed' 
                        ? 'bg-gray-300 text-gray-700 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={task.status === 'completed'}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTaskClick(task.id)
                    }}
                  >
                    {task.status === 'completed' ? '완료됨' : 
                     task.status === 'pending' ? '과제 시작하기' : '과제 계속하기'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 빈 상태 */}
        {filteredTasks.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {tasks.length === 0 ? '배정된 과제가 없습니다' : '필터 조건에 맞는 과제가 없습니다'}
            </h3>
            <p className="text-gray-600">
              {tasks.length === 0 ? '새로운 과제가 배정되면 여기에 표시됩니다.' : '다른 필터 조건을 선택해보세요.'}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function StudentTasksPage() {
  return (
    <ProtectedRoute allowedRoles={['student']} requireAuth={true}>
      <StudentTasksContent />
    </ProtectedRoute>
  )
}