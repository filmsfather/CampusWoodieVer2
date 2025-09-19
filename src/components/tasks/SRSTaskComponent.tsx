'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type StudentTaskDetail = Database['public']['Tables']['student_tasks']['Row'] & {
  assignment: Database['public']['Tables']['assignments']['Row'] & {
    workbook: Database['public']['Tables']['workbooks']['Row'] & {
      workbook_items: Database['public']['Tables']['workbook_items']['Row'][]
    }
  }
}

type Answer = Database['public']['Tables']['answers']['Row']
type SRSState = Database['public']['Tables']['srs_state']['Row']

interface SRSTaskComponentProps {
  task: StudentTaskDetail
  onStatusUpdate: (status: Database['public']['Enums']['task_status'], progressPct?: number) => void
}

interface QuestionWithState {
  item: Database['public']['Tables']['workbook_items']['Row']
  answer?: Answer
  srsState?: SRSState
  isDue: boolean
  streak: number
}

export default function SRSTaskComponent({ task, onStatusUpdate }: SRSTaskComponentProps) {
  const [questions, setQuestions] = useState<QuestionWithState[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<QuestionWithState | null>(null)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [resultCorrect, setResultCorrect] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadQuestions()
  }, [task.id])

  async function loadQuestions() {
    try {
      setLoading(true)
      
      // 문항별 답변과 SRS 상태 조회
      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .select('*, srs_state (*)')
        .eq('student_task_id', task.id)

      if (answersError) throw answersError

      // 문항들과 답변/상태 매핑
      const questionsWithState: QuestionWithState[] = task.assignment.workbook.workbook_items.map(item => {
        const answer = answers?.find(a => a.workbook_item_id === item.id)
        const srsState = answer?.srs_state?.[0]
        
        // 복습 시간이 된 문항인지 확인
        const isDue = !srsState || !srsState.next_due_at || new Date(srsState.next_due_at) <= new Date()
        
        return {
          item,
          answer,
          srsState,
          isDue,
          streak: srsState?.streak || 0
        }
      })

      setQuestions(questionsWithState)
      
      // 복습 대상 문항 중 첫 번째를 현재 문항으로 설정
      const dueQuestion = questionsWithState.find(q => q.isDue && q.streak < 3)
      setCurrentQuestion(dueQuestion || null)
      
      // 진행률 계산 및 업데이트
      calculateProgress(questionsWithState)
      
    } catch (error) {
      console.error('Error loading questions:', error)
      alert('문항을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function calculateProgress(questionsData: QuestionWithState[]) {
    const totalQuestions = questionsData.length
    const completedQuestions = questionsData.filter(q => q.streak >= 3).length
    const progressPct = totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0
    
    // 모든 문항이 완료되면 상태 업데이트
    if (completedQuestions === totalQuestions && progressPct === 100) {
      onStatusUpdate('completed', 100)
    } else if (progressPct > 0) {
      onStatusUpdate('in_progress', progressPct)
    }
  }

  async function submitAnswer() {
    if (!currentQuestion || submitting) return
    
    try {
      setSubmitting(true)
      
      const isCorrect = checkAnswer()
      const correctnessValue = isCorrect ? 
        (currentQuestion.streak === 0 ? 'once' : 
         currentQuestion.streak === 1 ? 'twice' : 'thrice') : 'wrong'
      
      // 답변 저장/업데이트
      let answer: Answer
      if (currentQuestion.answer) {
        const { data, error } = await supabase
          .from('answers')
          .update({
            response_text: currentAnswer,
            selected_option: selectedOption,
            correctness: correctnessValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentQuestion.answer.id)
          .select()
          .single()
        
        if (error) throw error
        answer = data
      } else {
        const { data, error } = await supabase
          .from('answers')
          .insert({
            student_task_id: task.id,
            workbook_item_id: currentQuestion.item.id,
            response_text: currentAnswer,
            selected_option: selectedOption,
            correctness: correctnessValue
          })
          .select()
          .single()
        
        if (error) throw error
        answer = data
      }

      // SRS 상태 계산
      const newStreak = isCorrect ? currentQuestion.streak + 1 : 0
      let nextDueAt: string

      if (newStreak === 0) {
        // 틀림: 1분 후
        nextDueAt = new Date(Date.now() + 1 * 60 * 1000).toISOString()
      } else if (newStreak === 1) {
        // 1회 정답: 10분 후
        nextDueAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      } else if (newStreak === 2) {
        // 2회 정답: 1일 후
        nextDueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      } else {
        // 3회 정답: 완료 (복습 불필요)
        nextDueAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }

      // SRS 상태 저장/업데이트
      if (currentQuestion.srsState) {
        await supabase
          .from('srs_state')
          .update({
            streak: newStreak,
            next_due_at: nextDueAt
          })
          .eq('id', currentQuestion.srsState.id)
      } else {
        await supabase
          .from('srs_state')
          .insert({
            answer_id: answer.id,
            streak: newStreak,
            next_due_at: nextDueAt
          })
      }

      // 결과 표시
      setResultCorrect(isCorrect)
      setShowResult(true)
      
    } catch (error) {
      console.error('Error submitting answer:', error)
      alert('답변 제출 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function checkAnswer(): boolean {
    if (!currentQuestion) return false
    
    if (currentQuestion.item.item_type === 'mcq') {
      return selectedOption === parseInt(currentQuestion.item.answer_key || '0')
    } else {
      // 단답형의 경우 정답 키와 비교 (대소문자 무시)
      const userAnswer = currentAnswer.trim().toLowerCase()
      const correctAnswer = (currentQuestion.item.answer_key || '').trim().toLowerCase()
      return userAnswer === correctAnswer
    }
  }

  function nextQuestion() {
    setShowResult(false)
    setCurrentAnswer('')
    setSelectedOption(null)
    
    // 문항 데이터 다시 로드
    loadQuestions()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">문항을 불러오는 중...</span>
      </div>
    )
  }

  if (!currentQuestion) {
    const completedCount = questions.filter(q => q.streak >= 3).length
    const totalCount = questions.length
    
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {completedCount === totalCount ? '모든 문항 완료!' : '현재 복습할 문항이 없습니다'}
          </h3>
          <p className="text-gray-600 mb-4">
            {completedCount === totalCount 
              ? '축하합니다! 모든 문항을 성공적으로 학습했습니다.'
              : '복습 시간이 되면 새로운 문항이 나타납니다.'
            }
          </p>
          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            <div className="text-sm text-gray-600 mb-2">학습 진행 상황</div>
            <div className="flex justify-between text-sm">
              <span>완료된 문항: {completedCount}/{totalCount}</span>
              <span>진행률: {Math.round((completedCount / totalCount) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{width: `${(completedCount / totalCount) * 100}%`}}
              ></div>
            </div>
          </div>
          <button 
            onClick={loadQuestions}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {!showResult ? (
        <>
          {/* 진행 상황 */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>문항 진행 상황</span>
              <span>{questions.filter(q => q.streak >= 3).length}/{questions.length} 완료</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{width: `${(questions.filter(q => q.streak >= 3).length / questions.length) * 100}%`}}
              ></div>
            </div>
          </div>

          {/* 현재 문항 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {currentQuestion.item.item_type === 'mcq' ? '객관식' : '단답형'}
              </span>
              <span className="text-sm text-gray-600">
                복습 횟수: {currentQuestion.streak}/3
              </span>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {currentQuestion.item.prompt}
            </h3>

            {/* 답변 입력 */}
            {currentQuestion.item.item_type === 'mcq' ? (
              <div className="space-y-3">
                {currentQuestion.item.options && 
                 JSON.parse(JSON.stringify(currentQuestion.item.options)).map((option: string, index: number) => (
                  <label key={index} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="answer"
                      value={index}
                      checked={selectedOption === index}
                      onChange={() => setSelectedOption(index)}
                      className="text-blue-600"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="답을 입력하세요"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !submitting) {
                    submitAnswer()
                  }
                }}
              />
            )}
          </div>

          {/* 제출 버튼 */}
          <button
            onClick={submitAnswer}
            disabled={submitting || (currentQuestion.item.item_type === 'mcq' ? selectedOption === null : !currentAnswer.trim())}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '제출 중...' : '답안 제출'}
          </button>
        </>
      ) : (
        /* 결과 화면 */
        <div className="text-center">
          <div className={`text-6xl mb-4 ${resultCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {resultCorrect ? '✅' : '❌'}
          </div>
          <h3 className={`text-xl font-bold mb-2 ${resultCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {resultCorrect ? '정답입니다!' : '틀렸습니다.'}
          </h3>
          
          {!resultCorrect && currentQuestion.item.answer_key && (
            <p className="text-gray-600 mb-4">
              정답: {currentQuestion.item.item_type === 'mcq' 
                ? JSON.parse(JSON.stringify(currentQuestion.item.options))[parseInt(currentQuestion.item.answer_key)]
                : currentQuestion.item.answer_key
              }
            </p>
          )}
          
          <p className="text-gray-600 mb-6">
            {resultCorrect 
              ? `복습 횟수: ${currentQuestion.streak + 1}/3` 
              : '1분 후 다시 복습할 수 있습니다.'
            }
          </p>
          
          <button
            onClick={nextQuestion}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            다음 문항
          </button>
        </div>
      )}
    </div>
  )
}