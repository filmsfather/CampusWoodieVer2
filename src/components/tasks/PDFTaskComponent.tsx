'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadApi } from '@/lib/upload'
import type { Database } from '@/lib/supabase'

type StudentTaskDetail = Database['public']['Tables']['student_tasks']['Row'] & {
  assignment: Database['public']['Tables']['assignments']['Row'] & {
    workbook: Database['public']['Tables']['workbooks']['Row'] & {
      workbook_items: Database['public']['Tables']['workbook_items']['Row'][]
    }
  }
}

type PDFUpload = Database['public']['Tables']['pdf_uploads']['Row']

interface PDFTaskComponentProps {
  task: StudentTaskDetail
  onStatusUpdate: (status: Database['public']['Enums']['task_status'], progressPct?: number) => void
}

export default function PDFTaskComponent({ task, onStatusUpdate }: PDFTaskComponentProps) {
  const [pdfUpload, setPdfUpload] = useState<PDFUpload | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadPDFUpload()
  }, [task.id])

  async function loadPDFUpload() {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('pdf_uploads')
        .select('*')
        .eq('student_task_id', task.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      setPdfUpload(data || null)
    } catch (error) {
      console.error('Error loading PDF upload:', error)
    } finally {
      setLoading(false)
    }
  }

  // 파일명 정규화 함수 (한글 및 특수문자 처리)
  const sanitizeFileName = (fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf('.')
    const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
    const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : ''
    
    const safeName = name
      .replace(/[^\w\-_.]/g, '_') // 영문, 숫자, -, _, . 외의 모든 문자를 _로 변경
      .replace(/_{2,}/g, '_')     // 연속된 _를 하나로 통합
      .replace(/^_+|_+$/g, '')   // 시작과 끝의 _를 제거
    
    const finalName = safeName.length < 3 ? `file_${Date.now()}` : safeName
    return finalName + extension
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // PDF 파일 형식 검증
    if (file.type !== 'application/pdf') {
      alert('PDF 파일만 업로드할 수 있습니다.')
      return
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)

      // 안전한 파일명 생성
      const sanitizedFileName = sanitizeFileName(file.name)
      const timestamp = Date.now()
      const fileName = `${task.id}/${timestamp}_${sanitizedFileName}`
      const filePath = `pdf-submissions/${fileName}`

      // 기존 파일이 있다면 삭제
      if (pdfUpload) {
        const oldFileName = pdfUpload.file_path.split('/').pop()
        if (oldFileName) {
          await supabase.storage
            .from('pdf-submissions')
            .remove([`${task.id}/${oldFileName}`])
        }
      }

      // 파일을 ArrayBuffer로 변환하여 업로드
      const fileBuffer = await file.arrayBuffer()
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdf-submissions')
        .upload(fileName, fileBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        })

      if (uploadError) throw uploadError

      setUploadProgress(100)

      // 데이터베이스에 기록
      if (pdfUpload) {
        // 기존 기록 업데이트
        const { data, error } = await supabase
          .from('pdf_uploads')
          .update({
            file_path: filePath,
            created_at: new Date().toISOString()
          })
          .eq('id', pdfUpload.id)
          .select()
          .single()

        if (error) throw error
        setPdfUpload(data)
      } else {
        // 새 기록 생성
        const { data, error } = await supabase
          .from('pdf_uploads')
          .insert({
            student_task_id: task.id,
            file_path: filePath
          })
          .select()
          .single()

        if (error) throw error
        setPdfUpload(data)
      }

      // 과제 상태 완료로 업데이트
      onStatusUpdate('completed', 100)
      
      alert('PDF 파일이 성공적으로 업로드되었습니다!')

    } catch (error) {
      console.error('Error uploading PDF:', error)
      alert('파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleDelete() {
    if (!pdfUpload) return

    if (!confirm('업로드된 파일을 삭제하시겠습니까?')) return

    try {
      // Storage에서 파일 삭제
      const fileName = pdfUpload.file_path.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('pdf-submissions')
          .remove([`${task.id}/${fileName}`])
      }

      // 데이터베이스에서 기록 삭제
      await supabase
        .from('pdf_uploads')
        .delete()
        .eq('id', pdfUpload.id)

      setPdfUpload(null)
      
      // 과제 상태를 대기 중으로 업데이트
      onStatusUpdate('pending', 0)
      
      alert('파일이 삭제되었습니다.')

    } catch (error) {
      console.error('Error deleting PDF:', error)
      alert('파일 삭제 중 오류가 발생했습니다.')
    }
  }

  async function downloadFile() {
    if (!pdfUpload) return

    try {
      const fileName = pdfUpload.file_path.split('/').pop()
      if (!fileName) return

      const { data, error } = await supabase.storage
        .from('pdf-submissions')
        .download(`${task.id}/${fileName}`)

      if (error) throw error

      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.split('_').slice(1).join('_') // timestamp 제거
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('파일 다운로드 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">파일 정보를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">PDF 파일 제출</h3>
      
      {!pdfUpload ? (
        /* 업로드 영역 */
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">PDF 파일을 업로드하세요</h4>
          <p className="text-gray-600 mb-4">
            PDF 형식의 파일만 업로드 가능하며, 최대 크기는 10MB입니다.
          </p>
          
          {uploading ? (
            <div className="space-y-4">
              <div className="text-blue-600">업로드 중... {uploadProgress}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all" 
                  style={{width: `${uploadProgress}%`}}
                ></div>
              </div>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
              >
                파일 선택
              </label>
            </>
          )}
        </div>
      ) : (
        /* 업로드된 파일 표시 */
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-green-600 text-2xl">✅</div>
                <div>
                  <div className="font-medium text-green-900">파일 업로드 완료</div>
                  <div className="text-sm text-green-600">
                    업로드 시간: {new Date(pdfUpload.created_at).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={downloadFile}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  다운로드
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>

          {/* 재업로드 옵션 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">파일 재업로드</h5>
            <p className="text-gray-600 text-sm mb-3">
              새 파일을 업로드하면 기존 파일이 교체됩니다.
            </p>
            
            {uploading ? (
              <div className="space-y-2">
                <div className="text-blue-600 text-sm">업로드 중... {uploadProgress}%</div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-blue-600 h-1 rounded-full transition-all" 
                    style={{width: `${uploadProgress}%`}}
                  ></div>
                </div>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-reupload"
                />
                <label
                  htmlFor="pdf-reupload"
                  className="inline-block bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  다른 파일 선택
                </label>
              </>
            )}
          </div>
        </div>
      )}

      {/* 과제 상태 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-2">과제 상태</div>
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          pdfUpload 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {pdfUpload ? '제출 완료' : '제출 대기'}
        </div>
      </div>
    </div>
  )
}