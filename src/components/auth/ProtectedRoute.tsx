'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
  requireAuth?: boolean
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // 인증이 필요한 페이지인데 로그인하지 않은 경우
    if (requireAuth && !user) {
      router.push('/login')
      return
    }

    // 로그인했지만 프로필이 없는 경우 (드물지만 발생할 수 있음)
    if (requireAuth && user && !profile) {
      router.push('/login')
      return
    }

    // 특정 역할이 필요한 페이지인 경우
    if (requireAuth && allowedRoles.length > 0 && profile) {
      const hasRequiredRole = allowedRoles.some(role => 
        profile.role.includes(role as 'student' | 'teacher' | 'admin')
      )
      
      if (!hasRequiredRole) {
        // 권한이 없으면 대시보드로 리다이렉트
        router.push('/dashboard')
        return
      }
    }
  }, [user, profile, loading, requireAuth, allowedRoles, router])

  // 로딩 중일 때 표시할 컴포넌트
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 인증이 필요하지 않거나, 인증되었고 권한이 있는 경우 자식 컴포넌트 렌더링
  if (!requireAuth || (user && profile && (allowedRoles.length === 0 || allowedRoles.some(role => profile.role.includes(role as 'student' | 'teacher' | 'admin'))))) {
    return <>{children}</>
  }

  // 권한이 없는 경우 빈 화면 (리다이렉트 중)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">페이지를 이동 중...</p>
      </div>
    </div>
  )
}