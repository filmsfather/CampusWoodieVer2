'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ImageUploader from '@/components/upload/ImageUploader'
import type { Database } from '@/lib/supabase'

type TaskImage = Database['public']['Tables']['task_images']['Row']

interface TaskImageGalleryProps {
  studentTaskId: number
  disabled?: boolean
  maxImages?: number
}

export default function TaskImageGallery({ 
  studentTaskId, 
  disabled = false, 
  maxImages = 10 
}: TaskImageGalleryProps) {
  const [images, setImages] = useState<TaskImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadImages()
  }, [studentTaskId])

  async function loadImages() {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('task_images')
        .select('*')
        .eq('student_task_id', studentTaskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setImages(data || [])
    } catch (err) {
      console.error('Error loading task images:', err)
      setError('이미지를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUploadComplete(url: string, path: string) {
    try {
      const { data, error } = await supabase
        .from('task_images')
        .insert({
          student_task_id: studentTaskId,
          file_path: path
        })
        .select()
        .single()

      if (error) throw error

      setImages(prev => [data, ...prev])
    } catch (err) {
      console.error('Error saving image record:', err)
      setError('이미지 정보 저장 중 오류가 발생했습니다.')
    }
  }

  async function deleteImage(imageId: number, filePath: string) {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return

    try {
      // Storage에서 파일 삭제
      const fileName = filePath.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('task-images')
          .remove([`${studentTaskId}/${fileName}`])
      }

      // 데이터베이스에서 기록 삭제
      const { error } = await supabase
        .from('task_images')
        .delete()
        .eq('id', imageId)

      if (error) throw error

      setImages(prev => prev.filter(img => img.id !== imageId))
    } catch (err) {
      console.error('Error deleting image:', err)
      setError('이미지 삭제 중 오류가 발생했습니다.')
    }
  }

  async function getImageUrl(filePath: string): Promise<string> {
    const fileName = filePath.split('/').pop()
    if (!fileName) return ''

    const { data } = await supabase.storage
      .from('task-images')
      .createSignedUrl(`${studentTaskId}/${fileName}`, 3600) // 1시간 유효

    return data?.signedUrl || ''
  }

  function handleUploadError(errorMessage: string) {
    setError(errorMessage)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm">이미지를 불러오는 중...</span>
      </div>
    )
  }

  const canUploadMore = images.length < maxImages

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h5 className="font-medium text-gray-900">첨부 이미지</h5>
        <span className="text-sm text-gray-600">
          {images.length}/{maxImages}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 이미지 업로더 */}
      {canUploadMore && !disabled && (
        <ImageUploader
          studentTaskId={studentTaskId}
          onUploadComplete={handleUploadComplete}
          onError={handleUploadError}
          multiple={true}
          maxFiles={maxImages - images.length}
          disabled={disabled}
        />
      )}

      {/* 업로드된 이미지 목록 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              onDelete={() => deleteImage(image.id, image.file_path)}
              getImageUrl={getImageUrl}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {images.length === 0 && !canUploadMore && (
        <div className="text-center py-8 text-gray-500">
          첨부된 이미지가 없습니다.
        </div>
      )}
    </div>
  )
}

interface ImageCardProps {
  image: TaskImage
  onDelete: () => void
  getImageUrl: (filePath: string) => Promise<string>
  disabled: boolean
}

function ImageCard({ image, onDelete, getImageUrl, disabled }: ImageCardProps) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    loadImageUrl()
  }, [image.file_path])

  async function loadImageUrl() {
    try {
      setImageLoading(true)
      const url = await getImageUrl(image.file_path)
      setImageUrl(url)
    } catch (err) {
      console.error('Error loading image URL:', err)
      setImageError(true)
    } finally {
      setImageLoading(false)
    }
  }

  return (
    <div className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square">
      {imageLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : imageError ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <div className="text-2xl mb-1">❌</div>
            <div className="text-xs">로드 실패</div>
          </div>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt="첨부 이미지"
          className="w-full h-full object-cover"
        />
      )}

      {/* 삭제 버튼 */}
      {!disabled && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      )}

      {/* 업로드 날짜 */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {new Date(image.created_at).toLocaleDateString('ko-KR')}
      </div>
    </div>
  )
}