import { supabase } from './supabase'

// UUID 생성 함수
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 파일명 정규화 함수 (Storage 호환 파일명 생성)
const sanitizeFileName = (fileName: string): string => {
  // 파일 확장자 분리
  const lastDotIndex = fileName.lastIndexOf('.')
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : ''
  
  // 안전한 파일명 생성: 한글, 특수문자, 공백 등을 제거/변환
  const safeName = name
    .replace(/[^\w\-_.]/g, '_') // 영문, 숫자, -, _, . 외의 모든 문자를 _로 변경
    .replace(/_{2,}/g, '_')     // 연속된 _를 하나로 통합
    .replace(/^_+|_+$/g, '')   // 시작과 끝의 _를 제거
  
  // 파일명이 너무 짧거나 비어있으면 UUID 사용
  const finalName = safeName.length < 3 ? generateUUID() : safeName
  
  return finalName + extension
}

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

export const uploadApi = {
  // 문항 이미지 업로드
  async uploadItemImage(file: File, workbookItemId: number): Promise<UploadResult> {
    try {
      // 파일 크기 체크 (최대 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: '파일 크기는 5MB 이하여야 합니다.' }
      }

      // 이미지 파일 체크
      if (!file.type.startsWith('image/')) {
        return { success: false, error: '이미지 파일만 업로드 가능합니다.' }
      }

      // 파일명 생성 (UUID + 확장자)
      const fileExt = file.name.split('.').pop()
      const fileName = `${generateUUID()}.${fileExt}`
      const filePath = `${workbookItemId}/${fileName}`

      // Supabase Storage에 업로드
      const { error } = await supabase.storage
        .from('item-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Storage upload error:', error)
        return { success: false, error: '파일 업로드에 실패했습니다.' }
      }

      // 공개 URL 생성
      const { data: publicUrl } = supabase.storage
        .from('item-images')
        .getPublicUrl(filePath)

      // 데이터베이스에 이미지 정보 저장
      const { error: dbError } = await supabase
        .from('workbook_item_images')
        .insert({
          workbook_item_id: workbookItemId,
          file_path: filePath
        })

      if (dbError) {
        console.error('Database insert error:', dbError)
        // 업로드된 파일 삭제
        await supabase.storage.from('item-images').remove([filePath])
        return { success: false, error: '이미지 정보 저장에 실패했습니다.' }
      }

      return {
        success: true,
        url: publicUrl.publicUrl,
        path: filePath
      }
    } catch (error) {
      console.error('Upload error:', error)
      return { success: false, error: '업로드 중 오류가 발생했습니다.' }
    }
  },

  // 과제 이미지 업로드
  async uploadTaskImage(file: File, studentTaskId: number): Promise<UploadResult> {
    try {
      // 파일 크기 체크 (최대 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return { success: false, error: '파일 크기는 10MB 이하여야 합니다.' }
      }

      // 이미지 파일 체크
      if (!file.type.startsWith('image/')) {
        return { success: false, error: '이미지 파일만 업로드 가능합니다.' }
      }

      // 파일명 생성 (UUID + 확장자)
      const fileExt = file.name.split('.').pop()
      const fileName = `${generateUUID()}.${fileExt}`
      const filePath = `${studentTaskId}/${fileName}`

      // Supabase Storage에 업로드
      const { error } = await supabase.storage
        .from('task-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Storage upload error:', error)
        return { success: false, error: '파일 업로드에 실패했습니다.' }
      }

      // 공개 URL 생성
      const { data: publicUrl } = supabase.storage
        .from('task-images')
        .getPublicUrl(filePath)

      // 데이터베이스에 이미지 정보 저장
      const { error: dbError } = await supabase
        .from('task_images')
        .insert({
          student_task_id: studentTaskId,
          file_path: filePath
        })

      if (dbError) {
        console.error('Database insert error:', dbError)
        // 업로드된 파일 삭제
        await supabase.storage.from('task-images').remove([filePath])
        return { success: false, error: '이미지 정보 저장에 실패했습니다.' }
      }

      return {
        success: true,
        url: publicUrl.publicUrl,
        path: filePath
      }
    } catch (error) {
      console.error('Upload error:', error)
      return { success: false, error: '업로드 중 오류가 발생했습니다.' }
    }
  },

  // 이미지 삭제
  async deleteImage(bucket: 'item-images' | 'task-images', filePath: string, imageId: number): Promise<boolean> {
    try {
      // Storage에서 파일 삭제
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([filePath])

      if (storageError) {
        console.error('Storage delete error:', storageError)
      }

      // 데이터베이스에서 이미지 정보 삭제
      const tableName = bucket === 'item-images' ? 'workbook_item_images' : 'task_images'
      const { error: dbError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', imageId)

      if (dbError) {
        console.error('Database delete error:', dbError)
        return false
      }

      return true
    } catch (error) {
      console.error('Delete error:', error)
      return false
    }
  },

  // 문항 이미지 목록 조회
  async getItemImages(workbookItemId: number) {
    try {
      const { data, error } = await supabase
        .from('workbook_item_images')
        .select('*')
        .eq('workbook_item_id', workbookItemId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching item images:', error)
        return []
      }

      // 공개 URL 추가
      return data.map(img => ({
        ...img,
        url: supabase.storage.from('item-images').getPublicUrl(img.file_path).data.publicUrl
      }))
    } catch (error) {
      console.error('Error fetching item images:', error)
      return []
    }
  },

  // PDF 파일 업로드 (과제 제출용)
  async uploadPDF(file: File, studentTaskId: number): Promise<UploadResult> {
    try {
      // 파일 크기 체크 (최대 50MB)
      if (file.size > 50 * 1024 * 1024) {
        return { success: false, error: '파일 크기는 50MB 이하여야 합니다.' }
      }

      // PDF 파일 체크
      if (file.type !== 'application/pdf') {
        return { success: false, error: 'PDF 파일만 업로드 가능합니다.' }
      }

      // 안전한 파일명 생성
      const sanitizedFileName = sanitizeFileName(file.name)
      const filePath = `${studentTaskId}/${sanitizedFileName}`

      // Supabase Storage에 업로드
      const { error } = await supabase.storage
        .from('pdf-submissions')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // 같은 학생이 재제출하는 경우 덮어쓰기
          contentType: 'application/pdf'
        })

      if (error) {
        console.error('Storage upload error:', error)
        return { success: false, error: '파일 업로드에 실패했습니다.' }
      }

      // 공개 URL 생성
      const { data: publicUrl } = supabase.storage
        .from('pdf-submissions')
        .getPublicUrl(filePath)

      // 기존 PDF 업로드 정보가 있는지 확인
      const { data: existingUpload } = await supabase
        .from('pdf_uploads')
        .select('id')
        .eq('student_task_id', studentTaskId)
        .single()

      if (existingUpload) {
        // 기존 정보 업데이트
        const { error: dbError } = await supabase
          .from('pdf_uploads')
          .update({
            file_path: filePath
          })
          .eq('id', existingUpload.id)

        if (dbError) {
          console.error('Database update error:', dbError)
          return { success: false, error: 'PDF 정보 업데이트에 실패했습니다.' }
        }
      } else {
        // 새로운 정보 저장
        const { error: dbError } = await supabase
          .from('pdf_uploads')
          .insert({
            student_task_id: studentTaskId,
            file_path: filePath
          })

        if (dbError) {
          console.error('Database insert error:', dbError)
          // 업로드된 파일 삭제
          await supabase.storage.from('pdf-submissions').remove([filePath])
          return { success: false, error: 'PDF 정보 저장에 실패했습니다.' }
        }
      }

      return {
        success: true,
        url: publicUrl.publicUrl,
        path: filePath
      }
    } catch (error) {
      console.error('PDF upload error:', error)
      return { success: false, error: '업로드 중 오류가 발생했습니다.' }
    }
  },

  // PDF 파일 조회
  async getPDFUpload(studentTaskId: number) {
    try {
      const { data, error } = await supabase
        .from('pdf_uploads')
        .select('*')
        .eq('student_task_id', studentTaskId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // 데이터 없음
          return null
        }
        console.error('Error fetching PDF upload:', error)
        return null
      }

      // 공개 URL 추가
      return {
        ...data,
        url: supabase.storage.from('pdf-submissions').getPublicUrl(data.file_path).data.publicUrl
      }
    } catch (error) {
      console.error('Error fetching PDF upload:', error)
      return null
    }
  },

  // 과제 이미지 목록 조회
  async getTaskImages(studentTaskId: number) {
    try {
      const { data, error } = await supabase
        .from('task_images')
        .select('*')
        .eq('student_task_id', studentTaskId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching task images:', error)
        return []
      }

      // 공개 URL 추가
      return data.map(img => ({
        ...img,
        url: supabase.storage.from('task-images').getPublicUrl(img.file_path).data.publicUrl
      }))
    } catch (error) {
      console.error('Error fetching task images:', error)
      return []
    }
  }
}