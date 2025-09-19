'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (!user || !profile) {
    return <>{children}</>
  }

  const getNavigationItems = () => {
    const baseItems = [
      { href: '/dashboard', label: '대시보드', icon: '🏠' }
    ]

    if (profile.role.includes('student')) {
      baseItems.push(
        { href: '/student/tasks', label: '내 과제', icon: '📚' }
      )
    }

    if (profile.role.includes('teacher')) {
      baseItems.push(
        { href: '/teacher/workbooks', label: '문제집', icon: '📖' },
        { href: '/teacher/assign', label: '출제', icon: '✍️' },
        { href: '/teacher/assignments', label: '내 과제 현황', icon: '📊' },
        { href: '/teacher/classes', label: '반별 현황', icon: '👥' },
        { href: '/teacher/reviews', label: '서술형 평가', icon: '📝' }
      )
    }

    if (profile.role.includes('admin')) {
      baseItems.push(
        { href: '/admin/dashboard', label: '시스템 대시보드', icon: '📊' },
        { href: '/admin/users', label: '사용자 관리', icon: '👤' },
        { href: '/admin/classes', label: '반 관리', icon: '🏫' },
        { href: '/admin/print-queue', label: '인쇄 큐', icon: '🖨️' }
      )
    }

    return baseItems
  }

  const navigationItems = getNavigationItems()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and mobile menu button */}
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link href="/dashboard" className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900 ml-2">WoodieFilm Academy</h1>
              </Link>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{profile.name}</span>
                <span className="ml-2 text-gray-500">
                  ({profile.role.map(r => {
                    const roleLabels: { [key: string]: string } = {
                      student: '학생',
                      teacher: '선생님',
                      admin: '관리자'
                    }
                    return roleLabels[r] || r
                  }).join(', ')})
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full pt-16 md:pt-0">
            <div className="flex-1 px-4 py-6 overflow-y-auto">
              <ul className="space-y-2">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <span className="mr-3">{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </nav>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-h-screen">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}