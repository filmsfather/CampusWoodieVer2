'use client'

// 정적 생성 방지
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Class {
  id: number
  name: string
}

interface Student {
  id: string
  name: string
}

interface Workbook {
  id: number
  title: string
  subject: 'directing' | 'writing' | 'research' | 'integrated'
  type: 'SRS' | 'PDF' | 'ESSAY' | 'VIEWING' | 'LECTURE'
  week: number | null
  is_common: boolean
  created_by: string | null
}

type TargetType = 'class' | 'individual'

export default function AssignPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // Form state
  const [targetType, setTargetType] = useState<TargetType>('class')
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedWorkbook, setSelectedWorkbook] = useState<number | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [sessionNo, setSessionNo] = useState<number | null>(null)
  
  // Data state
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [workbooks, setWorkbooks] = useState<Workbook[]>([])
  
  // Filter state
  const [subjectFilter, setSubjectFilter] = useState<string>('')
  const [weekFilter, setWeekFilter] = useState<string>('')
  const [titleSearch, setTitleSearch] = useState('')
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    loadClasses()
    loadWorkbooks()
  }, [])

  // Load students when class is selected
  useEffect(() => {
    if (selectedClassId && targetType === 'individual') {
      loadStudents(selectedClassId)
    }
  }, [selectedClassId, targetType])

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name')

      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error loading classes:', err)
      setError('반 목록을 불러오는데 실패했습니다.')
    }
  }

  const loadStudents = async (classId: number) => {
    try {
      const { data, error } = await supabase
        .from('class_members')
        .select(`
          user_id,
          profiles!inner(id, name)
        `)
        .eq('class_id', classId)

      if (error) throw error
      
      const studentList = data?.map((item: Record<string, unknown>) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
        return {
          id: item.user_id as string,
          name: (profile as Record<string, unknown>)?.name as string || ''
        }
      }) || []
      
      setStudents(studentList)
    } catch (err) {
      console.error('Error loading students:', err)
      setError('학생 목록을 불러오는데 실패했습니다.')
    }
  }

  const loadWorkbooks = async () => {
    try {
      const { data, error } = await supabase
        .from('workbooks')
        .select('id, title, subject, type, week, is_common, created_by')
        .order('created_at', { ascending: false })

      if (error) throw error
      setWorkbooks(data || [])
    } catch (err) {
      console.error('Error loading workbooks:', err)
      setError('문제집 목록을 불러오는데 실패했습니다.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedWorkbook || !dueDate) {
      setError('문제집과 마감일을 선택해주세요.')
      return
    }

    if (targetType === 'class' && !selectedClassId) {
      setError('반을 선택해주세요.')
      return
    }

    if (targetType === 'individual' && selectedStudents.length === 0) {
      setError('학생을 선택해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          workbook_id: selectedWorkbook,
          target_type: targetType,
          target_id: targetType === 'class' ? selectedClassId?.toString() : selectedStudents.join(','),
          session_no: sessionNo,
          due_at: new Date(dueDate).toISOString(),
          created_by: user?.id
        })
        .select()
        .single()

      if (assignmentError) throw assignmentError

      // Create student tasks
      let targetStudents: string[] = []
      
      if (targetType === 'class' && selectedClassId) {
        // Get all students in the class
        const { data: classMembers, error: classMembersError } = await supabase
          .from('class_members')
          .select('user_id')
          .eq('class_id', selectedClassId)

        if (classMembersError) throw classMembersError
        targetStudents = classMembers.map(member => member.user_id)
      } else if (targetType === 'individual') {
        targetStudents = selectedStudents
      }

      // Insert student tasks
      const studentTasks = targetStudents.map(studentId => ({
        assignment_id: assignment.id,
        user_id: studentId,
        status: 'pending' as const,
        progress_pct: 0
      }))

      const { error: tasksError } = await supabase
        .from('student_tasks')
        .insert(studentTasks)

      if (tasksError) throw tasksError

      // Success - redirect
      router.push('/teacher/classes')
      
    } catch (err) {
      console.error('Error creating assignment:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      
      // Supabase 에러인 경우 더 구체적인 메시지 표시
      if (err && typeof err === 'object' && 'message' in err) {
        setError(`과제 출제에 실패했습니다: ${err.message}`)
      } else {
        setError('과제 출제에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Filter workbooks
  const filteredWorkbooks = workbooks.filter(workbook => {
    if (subjectFilter && workbook.subject !== subjectFilter) return false
    if (weekFilter === 'common' && !workbook.is_common) return false
    if (weekFilter && weekFilter !== 'common' && workbook.week !== parseInt(weekFilter)) return false
    if (titleSearch && !workbook.title.toLowerCase().includes(titleSearch.toLowerCase())) return false
    return true
  })

  const subjectOptions = [
    { value: '', label: '전체 과목' },
    { value: 'directing', label: '연출' },
    { value: 'writing', label: '작법' },
    { value: 'research', label: '연구' },
    { value: 'integrated', label: '통합' }
  ]

  const typeLabels = {
    'SRS': 'SRS형',
    'PDF': 'PDF 제출형',
    'ESSAY': '서술형',
    'VIEWING': '영화감상형',
    'LECTURE': '인터넷강의시청형'
  }

  const subjectLabels = {
    'directing': '연출',
    'writing': '작법',
    'research': '연구',
    'integrated': '통합'
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">과제 출제</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target Selection */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">출제 대상</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="class"
                  checked={targetType === 'class'}
                  onChange={(e) => setTargetType(e.target.value as TargetType)}
                  className="mr-2"
                />
                반 전체
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="individual"
                  checked={targetType === 'individual'}
                  onChange={(e) => setTargetType(e.target.value as TargetType)}
                  className="mr-2"
                />
                개별 학생
              </label>
            </div>

            {/* Class Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">반 선택</label>
              <select
                value={selectedClassId || ''}
                onChange={(e) => setSelectedClassId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full p-2 border rounded-md"
                required={targetType === 'class'}
              >
                <option value="">반을 선택하세요</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Individual Student Selection */}
            {targetType === 'individual' && selectedClassId && (
              <div>
                <label className="block text-sm font-medium mb-2">학생 선택</label>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2">
                  {students.map(student => (
                    <label key={student.id} className="flex items-center mb-1">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id])
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                          }
                        }}
                        className="mr-2"
                      />
                      {student.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workbook Selection */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">문제집 선택</h2>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">과목</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {subjectOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">차시</label>
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">전체</option>
                <option value="common">공통</option>
                {Array.from({length: 16}, (_, i) => i + 1).map(week => (
                  <option key={week} value={week.toString()}>{week}주차</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">제목 검색</label>
              <input
                type="text"
                value={titleSearch}
                onChange={(e) => setTitleSearch(e.target.value)}
                placeholder="문제집 제목 검색"
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>

          {/* Workbook List */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredWorkbooks.map(workbook => (
              <div
                key={workbook.id}
                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                  selectedWorkbook === workbook.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedWorkbook(workbook.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{workbook.title}</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      <span className="mr-3">{subjectLabels[workbook.subject]}</span>
                      <span className="mr-3">{typeLabels[workbook.type]}</span>
                      <span>{workbook.is_common ? '공통' : `${workbook.week}주차`}</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    checked={selectedWorkbook === workbook.id}
                    onChange={() => setSelectedWorkbook(workbook.id)}
                    className="mt-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assignment Details */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">과제 설정</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">마감일 *</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">차시 번호</label>
              <input
                type="number"
                value={sessionNo || ''}
                onChange={(e) => setSessionNo(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="차시 번호 (선택사항)"
                className="w-full p-2 border rounded-md"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '출제 중...' : '과제 출제'}
          </button>
        </div>
      </form>
    </div>
  )
}

