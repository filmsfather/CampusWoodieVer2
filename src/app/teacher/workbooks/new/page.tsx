'use client'

// 정적 생성 방지
export const dynamic = 'force-dynamic'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { workbookApi, WorkbookInsert } from '@/lib/workbooks'

interface WorkbookFormData {
  title: string
  subject: 'directing' | 'writing' | 'research' | 'integrated'
  type: 'SRS' | 'PDF' | 'ESSAY' | 'VIEWING' | 'LECTURE'
  tags: string[]
  week: number | null
  is_common: boolean
  required_count: number | null
  youtube_url: string | null
}

function NewWorkbookContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  
  const [formData, setFormData] = useState<WorkbookFormData>({
    title: '',
    subject: 'directing',
    type: 'SRS',
    tags: [],
    week: null,
    is_common: false,
    required_count: null,
    youtube_url: null
  })

  // 폼 데이터 업데이트
  const updateFormData = (field: keyof WorkbookFormData, value: string | number | boolean | null | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 태그 추가
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      updateFormData('tags', [...formData.tags, tagInput.trim()])
      setTagInput('')
    }
  }

  // 태그 제거
  const removeTag = (tagToRemove: string) => {
    updateFormData('tags', formData.tags.filter(tag => tag !== tagToRemove))
  }

  // 태그 입력 시 엔터키 처리
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  // 폼 검증
  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return '제목을 입력해주세요.'
    }
    if (formData.type === 'VIEWING' && (!formData.required_count || formData.required_count < 1)) {
      return '영화감상형은 필요한 감상노트 수를 입력해주세요.'
    }
    if (formData.type === 'LECTURE' && !formData.youtube_url?.trim()) {
      return '인터넷강의시청형은 유튜브 URL을 입력해주세요.'
    }
    if (!formData.is_common && (!formData.week || formData.week < 1)) {
      return '주차를 선택하거나 공통으로 설정해주세요.'
    }
    return null
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const workbookData: WorkbookInsert = {
        ...formData,
        created_by: user?.id || null
      }

      const newWorkbook = await workbookApi.createWorkbook(workbookData)
      
      // 생성 완료 후 편집 페이지로 이동 (SRS/ESSAY/PDF는 문항/과제 추가 필요)
      if (['SRS', 'ESSAY', 'PDF'].includes(formData.type)) {
        router.push(`/teacher/workbooks/edit/${newWorkbook.id}`)
      } else {
        // VIEWING, LECTURE 유형은 바로 목록으로
        router.push('/teacher/workbooks')
      }
    } catch (err) {
      console.error('Error creating workbook:', err)
      setError('문제집 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href="/teacher/workbooks" className="hover:text-gray-900">
              문제집 관리
            </Link>
            <span>›</span>
            <span className="text-gray-900">새 문제집 만들기</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">새 문제집 만들기</h1>
          <p className="text-gray-600 mt-2">새로운 문제집을 생성하고 설정하세요.</p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 기본 정보 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 제목 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목 *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="문제집 제목을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* 과목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  과목 *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => updateFormData('subject', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="directing">연출</option>
                  <option value="writing">작법</option>
                  <option value="research">연구</option>
                  <option value="integrated">통합</option>
                </select>
              </div>

              {/* 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문제집 유형 *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => updateFormData('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SRS">SRS형 (간격반복학습)</option>
                  <option value="PDF">PDF 제출형</option>
                  <option value="ESSAY">서술형</option>
                  <option value="VIEWING">영화감상형</option>
                  <option value="LECTURE">인터넷강의시청형</option>
                </select>
              </div>
            </div>

            {/* 주차 설정 */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                주차 설정
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_common}
                    onChange={(e) => {
                      updateFormData('is_common', e.target.checked)
                      if (e.target.checked) {
                        updateFormData('week', null)
                      }
                    }}
                    className="mr-2"
                  />
                  공통 (모든 주차에 해당)
                </label>
                {!formData.is_common && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">또는</span>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      value={formData.week || ''}
                      onChange={(e) => updateFormData('week', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="주차"
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-sm text-gray-600">주차</span>
                  </div>
                )}
              </div>
            </div>

            {/* 태그 */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                태그
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  placeholder="태그를 입력하고 엔터를 누르세요"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  추가
                </button>
              </div>
            </div>
          </div>

          {/* 유형별 추가 설정 */}
          {(formData.type === 'VIEWING' || formData.type === 'LECTURE') && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">추가 설정</h2>
              
              {formData.type === 'VIEWING' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    필요한 감상노트 수 *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.required_count || ''}
                    onChange={(e) => updateFormData('required_count', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="감상노트 개수"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    학생이 작성해야 할 감상노트의 개수를 입력하세요.
                  </p>
                </div>
              )}

              {formData.type === 'LECTURE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    유튜브 URL *
                  </label>
                  <input
                    type="url"
                    value={formData.youtube_url || ''}
                    onChange={(e) => updateFormData('youtube_url', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    학생이 시청할 강의 영상의 유튜브 URL을 입력하세요.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 설명 텍스트 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">유형별 설명</h3>
            <div className="text-sm text-blue-800 space-y-1">
              {formData.type === 'SRS' && (
                <p>• SRS형: 간격반복학습 방식으로 오답 시 1분 후, 정답 시 점진적으로 간격이 늘어납니다.</p>
              )}
              {formData.type === 'PDF' && (
                <p>• PDF 제출형: 과제 내용을 작성하고 학생이 PDF 파일 1개를 업로드하면 완료됩니다.</p>
              )}
              {formData.type === 'ESSAY' && (
                <p>• 서술형: 학생이 텍스트로 답안을 제출하고 교사가 평가합니다.</p>
              )}
              {formData.type === 'VIEWING' && (
                <p>• 영화감상형: 학생이 설정된 개수만큼 감상노트를 작성하면 완료됩니다.</p>
              )}
              {formData.type === 'LECTURE' && (
                <p>• 인터넷강의시청형: 학생이 영상을 시청하고 요약을 제출하면 완료됩니다.</p>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/teacher/workbooks"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '생성 중...' : '문제집 생성'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}

export default function NewWorkbookPage() {
  return (
    <ProtectedRoute allowedRoles={['teacher']} requireAuth={true}>
      <NewWorkbookContent />
    </ProtectedRoute>
  )
}