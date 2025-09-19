'use client'

// 정적 생성 방지
export const dynamic = 'force-dynamic'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { workbookApi, WorkbookWithDetails } from '@/lib/workbooks'
import WorkbookItemEditor from '@/components/workbook/WorkbookItemEditor'

function EditWorkbookContent() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const workbookId = parseInt(params.id as string)
  
  const [workbook, setWorkbook] = useState<WorkbookWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 문제집 정보 로드
  const loadWorkbook = async () => {
    try {
      setLoading(true)
      const data = await workbookApi.getWorkbook(workbookId)
      setWorkbook(data)
      setError(null)
    } catch (err) {
      console.error('Error loading workbook:', err)
      setError('문제집을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (workbookId) {
      loadWorkbook()
    }
  }, [workbookId])

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">문제집을 불러오는 중...</span>
        </div>
      </AppLayout>
    )
  }

  if (error || !workbook) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error || '문제집을 찾을 수 없습니다.'}</p>
            <Link
              href="/teacher/workbooks"
              className="mt-2 inline-block text-sm text-red-600 hover:text-red-800 underline"
            >
              문제집 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href="/teacher/workbooks" className="hover:text-gray-900">
              문제집 관리
            </Link>
            <span>›</span>
            <span className="text-gray-900">{workbook.title}</span>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{workbook.title}</h1>
              <p className="text-gray-600 mt-2">문제집 편집 및 문항 관리</p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/teacher/workbooks/preview/${workbook.id}`}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
              >
                미리보기
              </Link>
              <Link
                href={`/teacher/assign?workbook=${workbook.id}`}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                출제하기
              </Link>
            </div>
          </div>
        </div>

        {/* 문제집 정보 요약 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-gray-600">과목</span>
              <p className="font-medium">{workbook.subject}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">유형</span>
              <p className="font-medium">{workbook.type}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">주차</span>
              <p className="font-medium">
                {workbook.is_common ? '공통' : `${workbook.week}주차`}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">태그</span>
              <p className="font-medium">
                {workbook.tags?.length ? workbook.tags.join(', ') : '없음'}
              </p>
            </div>
          </div>
        </div>

        {/* 문항 편집기 */}
        <WorkbookItemEditor 
          workbook={workbook}
          onUpdate={loadWorkbook}
        />
      </div>
    </AppLayout>
  )
}

export default function EditWorkbookPage() {
  return (
    <ProtectedRoute allowedRoles={['teacher']} requireAuth={true}>
      <EditWorkbookContent />
    </ProtectedRoute>
  )
}