'use client'

import { useState, useEffect } from 'react'
import { WorkbookWithDetails, WorkbookItem } from '@/lib/workbooks'
import { supabase } from '@/lib/supabase'
import ImageUploader from '@/components/upload/ImageUploader'
import ImageGallery from '@/components/upload/ImageGallery'

interface WorkbookItemEditorProps {
  workbook: WorkbookWithDetails
  onUpdate: () => void
}

interface WorkbookItemFormData {
  prompt: string
  item_type: string
  options: string[] | null
  answer_key: string
}

export default function WorkbookItemEditor({ workbook, onUpdate }: WorkbookItemEditorProps) {
  const [items, setItems] = useState<WorkbookItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<WorkbookItem | null>(null)
  
  const [formData, setFormData] = useState<WorkbookItemFormData>({
    prompt: '',
    item_type: getDefaultItemType(workbook.type),
    options: null,
    answer_key: ''
  })

  // 문제집 유형별 기본 문항 타입 설정
  function getDefaultItemType(workbookType: string): string {
    switch (workbookType) {
      case 'SRS':
        return 'mcq' // 객관식
      case 'ESSAY':
        return 'essay' // 서술형
      case 'PDF':
        return 'pdf_task' // PDF 과제
      default:
        return 'short' // 단답형
    }
  }

  // 문항 목록 로드
  const loadItems = async () => {
    try {
      setLoading(true)
      console.log('Loading items for workbook:', workbook.id)
      
      const { data, error } = await supabase
        .from('workbook_items')
        .select('*')
        .eq('workbook_id', workbook.id)
        .order('created_at', { ascending: true })

      console.log('Load items result:', { data, error })

      if (error) {
        console.error('Load items error details:', error)
        throw error
      }
      
      setItems(data || [])
      setError(null)
    } catch (err) {
      console.error('Error loading items - full error:', err)
      console.error('Error message:', (err as Error)?.message)
      setError(`문항을 불러오는데 실패했습니다: ${(err as Error)?.message || '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 데이터베이스 연결 및 테이블 존재 여부 확인
    const checkDatabase = async () => {
      try {
        console.log('Checking database connection...')
        const { data, error } = await supabase
          .from('workbooks')
          .select('id')
          .eq('id', workbook.id)
          .single()
        
        console.log('Workbook exists check:', { data, error })
        
        if (error && error.code === 'PGRST116') {
          setError('workbooks 테이블이 존재하지 않습니다. 데이터베이스 스키마를 먼저 생성해주세요.')
          return
        }
        
        if (!data) {
          setError('해당 문제집을 찾을 수 없습니다.')
          return
        }
        
        loadItems()
      } catch (err) {
        console.error('Database check error:', err)
        setError('데이터베이스 연결에 실패했습니다.')
      }
    }
    
    checkDatabase()
  }, [workbook.id])

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      prompt: '',
      item_type: getDefaultItemType(workbook.type),
      options: null,
      answer_key: ''
    })
    setEditingItem(null)
    setShowAddForm(false)
  }

  // 편집 모드 시작
  const startEdit = (item: WorkbookItem) => {
    setFormData({
      prompt: item.prompt,
      item_type: item.item_type,
      options: Array.isArray(item.options) ? item.options : null,
      answer_key: item.answer_key || ''
    })
    setEditingItem(item)
    setShowAddForm(true)
  }

  // 문항 저장
  const saveItem = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!formData.prompt.trim()) {
        setError('문항 내용을 입력해주세요.')
        return
      }

      const itemData = {
        workbook_id: workbook.id,
        prompt: formData.prompt.trim(),
        item_type: formData.item_type,
        options: formData.options,
        answer_key: formData.answer_key || null
      }

      console.log('Saving item data:', itemData)

      let result
      if (editingItem) {
        // 수정
        result = await supabase
          .from('workbook_items')
          .update(itemData)
          .eq('id', editingItem.id)
          .select()
      } else {
        // 새로 추가
        result = await supabase
          .from('workbook_items')
          .insert(itemData)
          .select()
      }

      console.log('Supabase result:', result)

      if (result.error) {
        console.error('Supabase error details:', result.error)
        throw result.error
      }

      resetForm()
      await loadItems()
      onUpdate()
    } catch (err) {
      console.error('Error saving item - full error:', err)
      console.error('Error message:', (err as Error)?.message)
      console.error('Error details:', (err as Record<string, unknown>)?.details)
      console.error('Error hint:', (err as Record<string, unknown>)?.hint)
      setError(`문항 저장에 실패했습니다: ${(err as Error)?.message || '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  // 문항 삭제
  const deleteItem = async (itemId: number) => {
    if (!confirm('정말 이 문항을 삭제하시겠습니까?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('workbook_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      loadItems()
      onUpdate()
    } catch (err) {
      console.error('Error deleting item:', err)
      setError('문항 삭제에 실패했습니다.')
    }
  }

  // 선택지 관리 (객관식용)
  const addOption = () => {
    const currentOptions = Array.isArray(formData.options) ? formData.options : []
    setFormData({
      ...formData,
      options: [...currentOptions, '']
    })
  }

  const updateOption = (index: number, value: string) => {
    const currentOptions = Array.isArray(formData.options) ? [...formData.options] : []
    currentOptions[index] = value
    setFormData({
      ...formData,
      options: currentOptions
    })
  }

  const removeOption = (index: number) => {
    const currentOptions = Array.isArray(formData.options) ? [...formData.options] : []
    currentOptions.splice(index, 1)
    setFormData({
      ...formData,
      options: currentOptions
    })
  }

  // VIEWING, LECTURE 유형만 문항 관리 불필요
  if (['VIEWING', 'LECTURE'].includes(workbook.type)) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">문항 관리</h2>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            이 유형은 별도의 문항 관리가 필요하지 않습니다
          </h3>
          <p className="text-gray-600">
            {workbook.type === 'VIEWING' && '영화감상형은 감상노트 작성만 필요합니다.'}
            {workbook.type === 'LECTURE' && '인터넷강의시청형은 요약 제출만 필요합니다.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 문항 목록 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {workbook.type === 'PDF' ? `과제 관리 (${items.length}개)` : `문항 관리 (${items.length}개)`}
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {workbook.type === 'PDF' ? '+ 새 과제 추가' : '+ 새 문항 추가'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 문항 목록 */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                      문항 {index + 1}
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {item.item_type === 'mcq' ? '객관식' : 
                       item.item_type === 'short' ? '단답형' : 
                       item.item_type === 'essay' ? '서술형' :
                       item.item_type === 'pdf_task' ? 'PDF 과제' : '기타'}
                    </span>
                  </div>
                  <p className="text-gray-900 mb-2">{item.prompt}</p>
                  
                  {/* 객관식 선택지 표시 */}
                  {item.item_type === 'mcq' && item.options && (
                    <div className="ml-4 space-y-1">
                      {Array.isArray(item.options) && item.options.map((option: string, idx: number) => (
                        <div key={idx} className="text-sm text-gray-600">
                          {idx + 1}. {option}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* 정답 표시 (PDF 과제는 제외) */}
                  {item.answer_key && item.item_type !== 'pdf_task' && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">정답: </span>
                      <span className="font-medium text-green-700">{item.answer_key}</span>
                    </div>
                  )}

                  {/* 문항 이미지 갤러리 */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">문항 이미지</h4>
                    <ImageGallery 
                      workbookItemId={item.id}
                      editable={true}
                    />
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => startEdit(item)}
                    className="text-gray-600 hover:text-gray-900 p-1"
                    title="수정"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="삭제"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {workbook.type === 'PDF' ? '아직 추가된 과제가 없습니다' : '아직 추가된 문항이 없습니다'}
              </h3>
              <p className="text-gray-600 mb-6">
                {workbook.type === 'PDF' ? '첫 번째 과제를 만들어보세요!' : '첫 번째 문항을 만들어보세요!'}
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {workbook.type === 'PDF' ? '새 과제 추가' : '새 문항 추가'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 문항 추가/편집 폼 */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {workbook.type === 'PDF' 
              ? (editingItem ? '과제 수정' : '새 과제 추가')
              : (editingItem ? '문항 수정' : '새 문항 추가')
            }
          </h3>

          <div className="space-y-4">
            {/* 문항 유형 선택 */}
            {workbook.type === 'SRS' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문항 유형
                </label>
                <select
                  value={formData.item_type}
                  onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mcq">객관식</option>
                  <option value="short">단답형</option>
                </select>
              </div>
            )}

            {/* PDF 유형 설명 */}
            {workbook.type === 'PDF' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">PDF 제출형 과제</h4>
                <p className="text-sm text-blue-800">
                  학생들이 읽고 이해해야 할 과제 내용을 작성하세요. 학생들은 이 내용을 바탕으로 PDF 파일을 제출합니다.
                </p>
              </div>
            )}

            {/* 문항 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {workbook.type === 'PDF' ? '과제 내용 *' : 
                 workbook.type === 'ESSAY' ? '서술형 문제 *' : '문항 내용 *'}
              </label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder={
                  workbook.type === 'PDF' ? '학생들이 수행해야 할 과제 내용을 상세히 작성하세요...' :
                  workbook.type === 'ESSAY' ? '서술형 문제를 입력하세요...' :
                  '문항 내용을 입력하세요...'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={workbook.type === 'PDF' ? 5 : 3}
                required
              />
            </div>

            {/* 객관식 선택지 */}
            {formData.item_type === 'mcq' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  선택지
                </label>
                <div className="space-y-2">
                  {(Array.isArray(formData.options) ? formData.options : []).map((option: string, index: number) => (
                    <div key={index} className="flex space-x-2">
                      <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`선택지 ${index + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-600 hover:text-red-800 p-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + 선택지 추가
                  </button>
                </div>
              </div>
            )}

            {/* 정답 (PDF 유형은 제외) */}
            {formData.item_type !== 'pdf_task' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  정답 {formData.item_type === 'mcq' ? '(번호)' : ''}
                </label>
                <input
                  type="text"
                  value={formData.answer_key}
                  onChange={(e) => setFormData({ ...formData, answer_key: e.target.value })}
                  placeholder={
                    formData.item_type === 'mcq' 
                      ? "정답 번호 (예: 1)" 
                      : "정답을 입력하세요"
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* 이미지 업로드 (편집 모드일 때만) */}
            {editingItem && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문항 이미지
                </label>
                <div className="space-y-4">
                  <ImageUploader
                    workbookItemId={editingItem.id}
                    onUploadComplete={() => {
                      // 이미지 업로드 완료 시 갤러리 새로고침을 위해 키를 변경
                      setEditingItem({ ...editingItem })
                    }}
                    onError={(error) => setError(error)}
                    multiple={true}
                    maxFiles={5}
                  />
                  <ImageGallery 
                    workbookItemId={editingItem.id}
                    editable={true}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={saveItem}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '저장 중...' : editingItem ? '수정' : '추가'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}