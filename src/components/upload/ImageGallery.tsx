'use client'

import { useState, useEffect } from 'react'
import { uploadApi } from '@/lib/upload'

interface ImageItem {
  id: number
  url: string
  file_path: string
  created_at: string
}

interface ImageGalleryProps {
  workbookItemId?: number
  studentTaskId?: number
  onDelete?: (imageId: number) => void
  editable?: boolean
}

export default function ImageGallery({
  workbookItemId,
  studentTaskId,
  onDelete,
  editable = true
}: ImageGalleryProps) {
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // 이미지 목록 로드
  const loadImages = async () => {
    try {
      setLoading(true)
      let imageData: ImageItem[] = []

      if (workbookItemId) {
        imageData = await uploadApi.getItemImages(workbookItemId)
      } else if (studentTaskId) {
        imageData = await uploadApi.getTaskImages(studentTaskId)
      }

      setImages(imageData)
    } catch (error) {
      console.error('Error loading images:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadImages()
  }, [workbookItemId, studentTaskId])

  // 이미지 삭제
  const handleDelete = async (image: ImageItem) => {
    if (!confirm('정말 이 이미지를 삭제하시겠습니까?')) {
      return
    }

    try {
      const bucket = workbookItemId ? 'item-images' : 'task-images'
      const success = await uploadApi.deleteImage(bucket, image.file_path, image.id)
      
      if (success) {
        setImages(prev => prev.filter(img => img.id !== image.id))
        onDelete?.(image.id)
      } else {
        alert('이미지 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('이미지 삭제 중 오류가 발생했습니다.')
    }
  }

  // 이미지 순서 변경 (드래그 앤 드롭 - 추후 구현 가능)
  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images]
    const movedImage = newImages.splice(fromIndex, 1)[0]
    newImages.splice(toIndex, 0, movedImage)
    setImages(newImages)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">이미지를 불러오는 중...</span>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-4xl mb-2">🖼️</div>
        <p className="text-sm text-gray-600">업로드된 이미지가 없습니다.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div key={image.id} className="relative group">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={image.url}
                alt={`이미지 ${index + 1}`}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedImage(image.url)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/placeholder-image.png' // 기본 이미지 설정
                }}
              />
            </div>
            
            {editable && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDelete(image)}
                  className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  title="삭제"
                >
                  ×
                </button>
              </div>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {new Date(image.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* 이미지 모달 */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedImage}
              alt="확대 이미지"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}