'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['student'])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  
  const { signIn, signUp, signOut, user } = useAuth()
  const router = useRouter()

  const roleOptions = [
    { value: 'student', label: '학생' },
    { value: 'teacher', label: '선생님' },
    { value: 'admin', label: '관리자' }
  ]

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setMessage('이름을 입력해주세요.')
          return
        }
        
        const { error } = await signUp(email, password, name, selectedRoles)
        
        if (error) throw error
        
        setMessage('회원가입이 완료되었습니다! 이메일을 확인해주세요.')
      } else {
        const { error } = await signIn(email, password)
        
        if (error) throw error
        
        setMessage('로그인이 완료되었습니다!')
        // 로그인 성공 시 대시보드로 리다이렉트
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Authentication error:', error)
      const errorMessage = error instanceof Error ? error.message : '인증 중 문제가 발생했습니다.'
      setMessage(`오류: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setMessage('로그아웃되었습니다.')
      router.push('/')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그아웃 중 문제가 발생했습니다.'
      setMessage(`로그아웃 오류: ${errorMessage}`)
    }
  }

  const handleRoleChange = (role: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role)
      } else {
        return [...prev, role]
      }
    })
  }

  // 이미 로그인된 경우
  if (user) {
    return (
      <div className="max-w-md mx-auto p-6 border rounded-lg bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-4">로그인 상태</h2>
        <p className="text-gray-600 mb-4">
          {user.email}로 로그인되어 있습니다.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            대시보드로 이동
          </button>
          <button
            onClick={handleSignOut}
            className="w-full py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            로그아웃
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-6 border rounded-lg bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-4 text-center">
        {isSignUp ? '회원가입' : '로그인'}
      </h2>
      
      <form onSubmit={handleAuth} className="space-y-4">
        {isSignUp && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1 text-gray-700">
              이름
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="홍길동"
            />
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-700">
            이메일
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="example@email.com"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-700">
            비밀번호
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="최소 8자"
          />
        </div>

        {isSignUp && (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              역할 선택
            </label>
            <div className="space-y-2">
              {roleOptions.map((role) => (
                <label key={role.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.value)}
                    onChange={() => handleRoleChange(role.value)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{role.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              하나 이상의 역할을 선택해주세요.
            </p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading || (isSignUp && selectedRoles.length === 0)}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '처리 중...' : (isSignUp ? '회원가입' : '로그인')}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp)
            setMessage('')
            setName('')
            setSelectedRoles(['student'])
          }}
          className="text-blue-600 hover:underline text-sm"
        >
          {isSignUp ? '이미 계정이 있나요? 로그인' : '계정이 없나요? 회원가입'}
        </button>
      </div>
      
      {message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${
          message.includes('오류') ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}