'use client'

import { useState, useRef, DragEvent } from 'react'
import { uploadApi } from '@/lib/upload'

interface ImageUploaderProps {
  workbookItemId?: number
  studentTaskId?: number
  onUploadComplete?: (url: string, path: string) => void
  onError?: (error: string) => void
  multiple?: boolean
  maxFiles?: number
  disabled?: boolean
}

interface UploadedImage {
  id: number
  url: string
  path: string
  name: string
}

export default function ImageUploader({
  workbookItemId,
  studentTaskId,
  onUploadComplete,
  onError,
  multiple = true,
  maxFiles = 10,
  disabled = false
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    if (disabled || uploading) return

    const fileArray = Array.from(files)
    
    // 파일 개수 제한 체크
    if (fileArray.length > maxFiles) {
      onError?.(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`)
      return
    }

    setUploading(true)

    try {
      for (const file of fileArray) {
        let result
        
        if (workbookItemId) {
          result = await uploadApi.uploadItemImage(file, workbookItemId)
        } else if (studentTaskId) {
          result = await uploadApi.uploadTaskImage(file, studentTaskId)
        } else {
          onError?.('업로드 대상이 지정되지 않았습니다.')
          return
        }

        if (result.success && result.url && result.path) {
          onUploadComplete?.(result.url, result.path)
        } else {
          onError?.(result.error || '업로드에 실패했습니다.')
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      onError?.('업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const openFileDialog = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div
        onClick={openFileDialog}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled || uploading 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-gray-50'
          }
        `}
      >
        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600">업로드 중...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl text-gray-400">📷</div>
            <div className="text-sm text-gray-600">
              <p className="font-medium">클릭하거나 파일을 드래그해서 이미지 업로드</p>
              <p className="text-xs mt-1">
                JPG, PNG, GIF 등 이미지 파일 지원
                {workbookItemId && ' (최대 5MB)'}
                {studentTaskId && ' (최대 10MB)'}
                {multiple && ` • 최대 ${maxFiles}개`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}