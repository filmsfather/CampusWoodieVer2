'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import TaskImageGallery from './TaskImageGallery'
import type { Database } from '@/lib/supabase'

type StudentTaskDetail = Database['public']['Tables']['student_tasks']['Row'] & {
  assignment: Database['public']['Tables']['assignments']['Row'] & {
    workbook: Database['public']['Tables']['workbooks']['Row'] & {
      workbook_items: Database['public']['Tables']['workbook_items']['Row'][]
    }
  }
}

type Answer = Database['public']['Tables']['answers']['Row']
type EssayReview = Database['public']['Tables']['essay_reviews']['Row']

interface EssayTaskComponentProps {
  task: StudentTaskDetail
  onStatusUpdate: (status: Database['public']['Enums']['task_status'], progressPct?: number) => void
}

export default function EssayTaskComponent({ task, onStatusUpdate }: EssayTaskComponentProps) {
  const [answers, setAnswers] = useState<Answer[]>([])
  const [essayReview, setEssayReview] = useState<EssayReview | null>(null)
  const [responses, setResponses] = useState<{[key: number]: string}>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<{[key: number]: boolean}>({})
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadAnswers()
    loadEssayReview()
  }, [task.id])

  async function loadAnswers() {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .eq('student_task_id', task.id)
        .order('workbook_item_id')

      if (error) throw error

      setAnswers(data || [])
      
      // 기존 답변들을 responses 상태에 설정
      const initialResponses: {[key: number]: string} = {}
      data?.forEach(answer => {
        if (answer.workbook_item_id) {
          initialResponses[answer.workbook_item_id] = answer.response_text || ''
        }
      })
      setResponses(initialResponses)

    } catch (error) {
      console.error('Error loading answers:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadEssayReview() {
    try {
      const { data, error } = await supabase
        .from('essay_reviews')
        .select('*')
        .eq('student_task_id', task.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      setEssayReview(data || null)
    } catch (error) {
      console.error('Error loading essay review:', error)
    }
  }

  const debouncedSave = useCallback((itemId: number, text: string) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }

    const timeout = setTimeout(() => {
      saveAnswer(itemId, text, true) // auto save
    }, 2000) // 2초 후 자동 저장

    setAutoSaveTimeout(timeout)
  }, [autoSaveTimeout])

  function handleTextChange(itemId: number, text: string) {
    setResponses(prev => ({
      ...prev,
      [itemId]: text
    }))

    // 자동 저장 트리거
    debouncedSave(itemId, text)
  }

  async function saveAnswer(itemId: number, text: string, isAutoSave = false) {
    if (!text.trim()) return

    try {
      if (!isAutoSave) {
        setSaving(prev => ({ ...prev, [itemId]: true }))
      }

      const existingAnswer = answers.find(a => a.workbook_item_id === itemId)

      if (existingAnswer) {
        // 기존 답변 업데이트
        const { data, error } = await supabase
          .from('answers')
          .update({
            response_text: text,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAnswer.id)
          .select()
          .single()

        if (error) throw error

        setAnswers(prev => prev.map(a => a.id === existingAnswer.id ? data : a))
      } else {
        // 새 답변 생성
        const { data, error } = await supabase
          .from('answers')
          .insert({
            student_task_id: task.id,
            workbook_item_id: itemId,
            response_text: text
          })
          .select()
          .single()

        if (error) throw error

        setAnswers(prev => [...prev, data])
      }

      if (!isAutoSave) {
        // 진행률 체크 및 업데이트
        checkProgress()
      }

    } catch (error) {
      console.error('Error saving answer:', error)
      if (!isAutoSave) {
        alert('답변 저장 중 오류가 발생했습니다.')
      }
    } finally {
      if (!isAutoSave) {
        setSaving(prev => ({ ...prev, [itemId]: false }))
      }
    }
  }

  async function submitFinal() {
    if (!confirm('최종 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.')) return

    try {
      // 모든 답변이 저장되었는지 확인
      for (const item of task.assignment.workbook.workbook_items) {
        const response = responses[item.id]
        if (response && response.trim()) {
          await saveAnswer(item.id, response)
        }
      }

      // 과제 상태를 완료로 업데이트
      onStatusUpdate('completed', 100)
      
      alert('과제가 성공적으로 제출되었습니다!')

    } catch (error) {
      console.error('Error submitting essay:', error)
      alert('제출 중 오류가 발생했습니다.')
    }
  }

  function checkProgress() {
    const totalItems = task.assignment.workbook.workbook_items.length
    const answeredItems = task.assignment.workbook.workbook_items.filter(item => {
      const response = responses[item.id]
      return response && response.trim().length > 0
    }).length

    const progressPct = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0

    if (answeredItems > 0) {
      onStatusUpdate('in_progress', progressPct)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">문항을 불러오는 중...</span>
      </div>
    )
  }

  const totalItems = task.assignment.workbook.workbook_items.length
  const answeredItems = task.assignment.workbook.workbook_items.filter(item => {
    const response = responses[item.id]
    return response && response.trim().length > 0
  }).length
  const progressPct = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0
  const isCompleted = task.status === 'completed'

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">서술형 과제</h3>
        
        {/* 진행률 표시 */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>답변 진행 상황</span>
            <span>{answeredItems}/{totalItems} 완료</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{width: `${progressPct}%`}}
            ></div>
          </div>
        </div>

        {/* 제출 상태 표시 */}
        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="text-green-600 text-xl">✅</div>
              <div>
                <div className="font-medium text-green-900">제출 완료</div>
                <div className="text-sm text-green-600">과제가 성공적으로 제출되었습니다.</div>
              </div>
            </div>
          </div>
        )}

        {/* 교사 피드백 표시 */}
        {essayReview && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-2">교사 피드백</h4>
            {essayReview.grade && (
              <div className="mb-2">
                <span className="text-sm text-blue-600">평가: </span>
                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                  essayReview.grade === '상' ? 'bg-green-100 text-green-800' :
                  essayReview.grade === '중상' ? 'bg-blue-100 text-blue-800' :
                  essayReview.grade === '중' ? 'bg-yellow-100 text-yellow-800' :
                  essayReview.grade === '중하' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {essayReview.grade}
                </span>
              </div>
            )}
            {essayReview.feedback && (
              <div>
                <span className="text-sm text-blue-600">피드백: </span>
                <p className="text-blue-900 mt-1">{essayReview.feedback}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 문항들 */}
      <div className="space-y-6">
        {task.assignment.workbook.workbook_items.map((item, index) => {
          const wordCount = responses[item.id]?.length || 0
          const isSaving = saving[item.id]
          
          return (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
              <div className="mb-3">
                <h4 className="font-medium text-gray-900 mb-2">
                  문항 {index + 1}
                </h4>
                <p className="text-gray-700">{item.prompt}</p>
              </div>

              <div className="mb-2">
                <textarea
                  value={responses[item.id] || ''}
                  onChange={(e) => handleTextChange(item.id, e.target.value)}
                  placeholder="답변을 입력하세요..."
                  disabled={isCompleted}
                  className={`w-full h-40 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y ${
                    isCompleted ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>글자 수: {wordCount}</span>
                <div className="flex items-center space-x-2">
                  {isSaving && (
                    <span className="text-blue-600">저장 중...</span>
                  )}
                  {!isCompleted && (
                    <button
                      onClick={() => saveAnswer(item.id, responses[item.id] || '')}
                      disabled={!responses[item.id]?.trim() || isSaving}
                      className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      저장
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 이미지 첨부 */}
      <div className="mt-6 border-t pt-6">
        <TaskImageGallery 
          studentTaskId={task.id}
          disabled={isCompleted}
          maxImages={5}
        />
      </div>

      {/* 최종 제출 버튼 */}
      {!isCompleted && (
        <div className="mt-6 text-center">
          <button
            onClick={submitFinal}
            disabled={answeredItems === 0}
            className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            최종 제출
          </button>
          <p className="text-sm text-gray-600 mt-2">
            * 2초마다 자동 저장됩니다. 최종 제출 전까지 수정 가능합니다.
          </p>
        </div>
      )}
    </div>
  )
}