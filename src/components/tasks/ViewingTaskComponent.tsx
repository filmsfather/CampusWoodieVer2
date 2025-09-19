'use client'

import { useState, useEffect } from 'react'
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

type ViewingNote = Database['public']['Tables']['viewing_notes']['Row']

interface ViewingTaskComponentProps {
  task: StudentTaskDetail
  onStatusUpdate: (status: Database['public']['Enums']['task_status'], progressPct?: number) => void
}

interface NoteForm {
  title: string
  country: string
  director: string
  genre: string
  subgenre: string
  notes: string
}

const COUNTRIES = ['한국', '미국', '일본', '중국', '프랑스', '영국', '독일', '이탈리아', '스페인', '기타']
const GENRES = ['드라마', '코미디', '액션', '스릴러', '호러', '로맨스', 'SF', '판타지', '애니메이션', '다큐멘터리']
const SUBGENRES = {
  '드라마': ['가족', '사회', '성장', '역사', '전쟁', '범죄'],
  '코미디': ['로맨틱', '블랙', '액션', '가족', '판타지'],
  '액션': ['어드벤처', '무술', '스파이', '슈퍼히어로', 'SF'],
  '스릴러': ['심리', '정치', '법정', '의료', '범죄'],
  '호러': ['심리', '슬래셔', '초자연', '좀비', '고딕'],
  '로맨스': ['드라마', '코미디', '멜로', '판타지', '역사'],
  'SF': ['디스토피아', '우주', '사이버펑크', '시간여행', '외계인'],
  '판타지': ['다크', '어드벤처', '로맨스', '판타지', '신화'],
  '애니메이션': ['가족', '어드벤처', '코미디', 'SF', '판타지'],
  '다큐멘터리': ['사회', '자연', '역사', '인물', '예술']
}

export default function ViewingTaskComponent({ task, onStatusUpdate }: ViewingTaskComponentProps) {
  const [viewingNotes, setViewingNotes] = useState<ViewingNote[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingNote, setEditingNote] = useState<ViewingNote | null>(null)
  const [formData, setFormData] = useState<NoteForm>({
    title: '',
    country: '',
    director: '',
    genre: '',
    subgenre: '',
    notes: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const requiredCount = task.assignment.workbook.required_count || 1

  useEffect(() => {
    loadViewingNotes()
  }, [task.id])

  async function loadViewingNotes() {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('viewing_notes')
        .select('*')
        .eq('student_task_id', task.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setViewingNotes(data || [])
      
      // 진행률 계산
      const progressPct = Math.round((data?.length || 0) / requiredCount * 100)
      if (data && data.length >= requiredCount) {
        onStatusUpdate('completed', 100)
      } else if (data && data.length > 0) {
        onStatusUpdate('in_progress', progressPct)
      }

    } catch (error) {
      console.error('Error loading viewing notes:', error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      country: '',
      director: '',
      genre: '',
      subgenre: '',
      notes: ''
    })
    setEditingNote(null)
    setShowForm(false)
  }

  function startEdit(note: ViewingNote) {
    setFormData({
      title: note.title || '',
      country: note.country || '',
      director: note.director || '',
      genre: note.genre || '',
      subgenre: note.subgenre || '',
      notes: note.notes || ''
    })
    setEditingNote(note)
    setShowForm(true)
  }

  async function saveNote() {
    if (!formData.title.trim() || !formData.notes.trim()) {
      alert('영화 제목과 감상 내용은 필수입니다.')
      return
    }

    try {
      setSaving(true)

      if (editingNote) {
        // 기존 노트 수정
        const { data, error } = await supabase
          .from('viewing_notes')
          .update({
            title: formData.title,
            country: formData.country,
            director: formData.director,
            genre: formData.genre,
            subgenre: formData.subgenre,
            notes: formData.notes
          })
          .eq('id', editingNote.id)
          .select()
          .single()

        if (error) throw error

        setViewingNotes(prev => prev.map(note => 
          note.id === editingNote.id ? data : note
        ))
      } else {
        // 새 노트 추가
        const { data, error } = await supabase
          .from('viewing_notes')
          .insert({
            student_task_id: task.id,
            title: formData.title,
            country: formData.country,
            director: formData.director,
            genre: formData.genre,
            subgenre: formData.subgenre,
            notes: formData.notes
          })
          .select()
          .single()

        if (error) throw error

        setViewingNotes(prev => [data, ...prev])
      }

      resetForm()
      
      // 진행률 재계산
      const newCount = editingNote ? viewingNotes.length : viewingNotes.length + 1
      const progressPct = Math.round(newCount / requiredCount * 100)
      
      if (newCount >= requiredCount) {
        onStatusUpdate('completed', 100)
      } else {
        onStatusUpdate('in_progress', progressPct)
      }

    } catch (error) {
      console.error('Error saving viewing note:', error)
      alert('감상노트 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteNote(noteId: number) {
    if (!confirm('이 감상노트를 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('viewing_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      setViewingNotes(prev => prev.filter(note => note.id !== noteId))
      
      // 진행률 재계산
      const newCount = viewingNotes.length - 1
      const progressPct = Math.round(newCount / requiredCount * 100)
      
      if (newCount >= requiredCount) {
        onStatusUpdate('completed', 100)
      } else if (newCount > 0) {
        onStatusUpdate('in_progress', progressPct)
      } else {
        onStatusUpdate('pending', 0)
      }

    } catch (error) {
      console.error('Error deleting viewing note:', error)
      alert('감상노트 삭제 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">감상노트를 불러오는 중...</span>
      </div>
    )
  }

  const progressPct = Math.round(viewingNotes.length / requiredCount * 100)
  const isCompleted = viewingNotes.length >= requiredCount

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">영화 감상 과제</h3>
        
        {/* 진행률 표시 */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>감상노트 작성 진행 상황</span>
            <span>{viewingNotes.length}/{requiredCount} 완료</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{width: `${Math.min(progressPct, 100)}%`}}
            ></div>
          </div>
        </div>

        {/* 완료 상태 표시 */}
        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="text-green-600 text-xl">✅</div>
              <div>
                <div className="font-medium text-green-900">과제 완료</div>
                <div className="text-sm text-green-600">
                  필요한 감상노트 {requiredCount}개를 모두 작성했습니다.
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-gray-600">
          영화를 감상하고 감상노트를 작성해주세요. 총 {requiredCount}개의 감상노트가 필요합니다.
        </p>
      </div>

      {/* 감상노트 추가 버튼 */}
      {!showForm && !isCompleted && (
        <div className="mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            + 새 감상노트 작성
          </button>
        </div>
      )}

      {/* 감상노트 작성 폼 */}
      {showForm && (
        <div className="border border-gray-200 rounded-lg p-6 mb-6">
          <h4 className="font-medium text-gray-900 mb-4">
            {editingNote ? '감상노트 수정' : '새 감상노트 작성'}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                영화 제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="영화 제목을 입력하세요"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                감독
              </label>
              <input
                type="text"
                value={formData.director}
                onChange={(e) => setFormData(prev => ({ ...prev, director: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="감독명을 입력하세요"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제작 국가
              </label>
              <select
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">선택하세요</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                장르
              </label>
              <select
                value={formData.genre}
                onChange={(e) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    genre: e.target.value, 
                    subgenre: '' // 장르 변경시 하위장르 초기화
                  }))
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">선택하세요</option>
                {GENRES.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                하위 장르
              </label>
              <select
                value={formData.subgenre}
                onChange={(e) => setFormData(prev => ({ ...prev, subgenre: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!formData.genre}
              >
                <option value="">선택하세요</option>
                {formData.genre && SUBGENRES[formData.genre as keyof typeof SUBGENRES]?.map(subgenre => (
                  <option key={subgenre} value={subgenre}>{subgenre}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              감상 내용 *
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={6}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="영화를 보고 느낀 점, 인상 깊었던 장면, 메시지 등을 자유롭게 작성하세요..."
            />
            <div className="text-sm text-gray-500 mt-1">
              글자 수: {formData.notes.length}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={saveNote}
              disabled={saving || !formData.title.trim() || !formData.notes.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? '저장 중...' : (editingNote ? '수정' : '저장')}
            </button>
            <button
              onClick={resetForm}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 작성된 감상노트 목록 */}
      <div className="space-y-4">
        {viewingNotes.map((note) => (
          <div key={note.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium text-gray-900 text-lg">{note.title}</h4>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-1">
                  {note.director && <span>감독: {note.director}</span>}
                  {note.country && <span>제작국가: {note.country}</span>}
                  {note.genre && <span>장르: {note.genre}</span>}
                  {note.subgenre && <span>하위장르: {note.subgenre}</span>}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => startEdit(note)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  수정
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  삭제
                </button>
              </div>
            </div>
            
            <div className="text-gray-700 whitespace-pre-wrap">{note.notes}</div>
            
            <div className="text-xs text-gray-500 mt-3">
              작성일: {new Date(note.created_at).toLocaleString('ko-KR')}
            </div>
          </div>
        ))}
      </div>

      {/* 빈 상태 */}
      {viewingNotes.length === 0 && !showForm && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎬</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">아직 작성된 감상노트가 없습니다</h4>
          <p className="text-gray-600 mb-4">영화를 감상하고 첫 번째 감상노트를 작성해보세요.</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            감상노트 작성하기
          </button>
        </div>
      )}

      {/* 이미지 첨부 */}
      <div className="mt-6 border-t pt-6">
        <TaskImageGallery 
          studentTaskId={task.id}
          disabled={false}
          maxImages={8}
        />
      </div>
    </div>
  )
}