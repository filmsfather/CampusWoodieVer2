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

type LectureSummary = Database['public']['Tables']['lecture_summaries']['Row']

interface LectureTaskComponentProps {
  task: StudentTaskDetail
  onStatusUpdate: (status: Database['public']['Enums']['task_status'], progressPct?: number) => void
}

export default function LectureTaskComponent({ task, onStatusUpdate }: LectureTaskComponentProps) {
  const [lectureSummary, setLectureSummary] = useState<LectureSummary | null>(null)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  const youtubeUrl = task.assignment.workbook.youtube_url
  const isCompleted = task.status === 'completed'

  useEffect(() => {
    loadLectureSummary()
  }, [task.id])

  async function loadLectureSummary() {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('lecture_summaries')
        .select('*')
        .eq('student_task_id', task.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      setLectureSummary(data || null)
      setSummary(data?.summary || '')

    } catch (error) {
      console.error('Error loading lecture summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const debouncedSave = useCallback((text: string) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }

    const timeout = setTimeout(() => {
      saveSummary(text, true) // auto save
    }, 3000) // 3초 후 자동 저장

    setAutoSaveTimeout(timeout)
  }, [autoSaveTimeout])

  function handleTextChange(text: string) {
    setSummary(text)
    
    // 자동 저장 트리거 (완료되지 않은 경우에만)
    if (!isCompleted && text.trim()) {
      debouncedSave(text)
    }
  }

  async function saveSummary(text: string, isAutoSave = false) {
    if (!text.trim()) return

    try {
      if (!isAutoSave) {
        setSaving(true)
      }

      if (lectureSummary) {
        // 기존 요약 업데이트
        const { data, error } = await supabase
          .from('lecture_summaries')
          .update({
            summary: text
          })
          .eq('id', lectureSummary.id)
          .select()
          .single()

        if (error) throw error
        setLectureSummary(data)
      } else {
        // 새 요약 생성
        const { data, error } = await supabase
          .from('lecture_summaries')
          .insert({
            student_task_id: task.id,
            summary: text
          })
          .select()
          .single()

        if (error) throw error
        setLectureSummary(data)
      }

      if (!isAutoSave) {
        // 진행률 업데이트
        onStatusUpdate('in_progress', 90) // 저장되면 90%
      }

    } catch (error) {
      console.error('Error saving summary:', error)
      if (!isAutoSave) {
        alert('요약 저장 중 오류가 발생했습니다.')
      }
    } finally {
      if (!isAutoSave) {
        setSaving(false)
      }
    }
  }

  async function submitFinal() {
    if (!summary.trim()) {
      alert('요약 내용을 입력해주세요.')
      return
    }

    if (!confirm('최종 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.')) return

    try {
      setSaving(true)
      
      // 요약 저장
      await saveSummary(summary)
      
      // 과제 상태를 완료로 업데이트
      onStatusUpdate('completed', 100)
      
      alert('강의 요약이 성공적으로 제출되었습니다!')

    } catch (error) {
      console.error('Error submitting summary:', error)
      alert('제출 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // YouTube URL에서 비디오 ID 추출
  function getYouTubeVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  // YouTube 임베드 URL 생성
  function getYouTubeEmbedUrl(url: string): string | null {
    const videoId = getYouTubeVideoId(url)
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">강의 정보를 불러오는 중...</span>
      </div>
    )
  }

  const wordCount = summary.length
  const embedUrl = youtubeUrl ? getYouTubeEmbedUrl(youtubeUrl) : null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">인터넷 강의 시청 과제</h3>
        
        {/* 제출 상태 표시 */}
        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="text-green-600 text-xl">✅</div>
              <div>
                <div className="font-medium text-green-900">제출 완료</div>
                <div className="text-sm text-green-600">강의 요약이 성공적으로 제출되었습니다.</div>
              </div>
            </div>
          </div>
        )}

        <p className="text-gray-600">
          강의 영상을 시청하고 주요 내용을 요약해주세요.
        </p>
      </div>

      {/* 강의 영상 */}
      {youtubeUrl && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">강의 영상</h4>
          
          {embedUrl ? (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={embedUrl}
                title="강의 영상"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full rounded-lg"
              ></iframe>
            </div>
          ) : (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
              <p className="text-gray-600 mb-2">강의 영상 링크:</p>
              <a 
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline break-all"
              >
                {youtubeUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {/* 요약 작성 영역 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900">강의 내용 요약</h4>
          <div className="text-sm text-gray-600">
            글자 수: {wordCount}
          </div>
        </div>
        
        <textarea
          value={summary}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="강의의 주요 내용, 핵심 개념, 인상 깊었던 부분 등을 자유롭게 요약해주세요..."
          disabled={isCompleted}
          rows={12}
          className={`w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y ${
            isCompleted ? 'bg-gray-50 cursor-not-allowed' : ''
          }`}
        />
        
        <div className="flex justify-between items-center mt-3">
          <div className="text-sm text-gray-500">
            {isCompleted ? '' : '3초마다 자동 저장됩니다'}
          </div>
          
          {!isCompleted && (
            <div className="flex space-x-3">
              <button
                onClick={() => saveSummary(summary)}
                disabled={!summary.trim() || saving}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              
              <button
                onClick={submitFinal}
                disabled={!summary.trim() || saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                최종 제출
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 작성 가이드 */}
      {!isCompleted && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-medium text-blue-900 mb-2">💡 요약 작성 가이드</h5>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• 강의의 주요 주제와 핵심 내용을 정리해주세요</li>
            <li>• 새로 배운 개념이나 용어가 있다면 간단히 설명해주세요</li>
            <li>• 인상 깊었던 부분이나 중요하다고 생각되는 내용을 포함해주세요</li>
            <li>• 강의 내용과 관련된 본인의 생각이나 느낀 점을 추가해도 좋습니다</li>
          </ul>
        </div>
      )}

      {/* 이미지 첨부 */}
      <div className="mt-6 border-t pt-6">
        <TaskImageGallery 
          studentTaskId={task.id}
          disabled={isCompleted}
          maxImages={5}
        />
      </div>

      {/* 진행률 표시 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-2">과제 진행 상황</div>
        <div className="flex justify-between text-sm mb-2">
          <span>
            {isCompleted ? '제출 완료' : 
             summary.trim() ? '작성 중' : '시작 전'}
          </span>
          <span>
            {isCompleted ? '100%' : 
             summary.trim() ? '90%' : '0%'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all" 
            style={{
              width: isCompleted ? '100%' : 
                     summary.trim() ? '90%' : '0%'
            }}
          ></div>
        </div>
      </div>
    </div>
  )
}