'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export default function SupabaseTest() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        // 인증 상태 확인으로 연결 테스트
        const { data: { user }, error } = await supabase.auth.getUser()
        
        // AuthSessionMissingError는 정상적인 상황 (로그인 안됨)
        if (error && error.message !== 'Auth session missing!') {
          console.error('Supabase auth error:', error)
          setError(`인증 오류: ${error.message}`)
          setConnected(false)
        } else {
          // 연결은 성공, 사용자만 없을 수 있음
          setConnected(true)
          setError(null)
          setAuthUser(user)
          console.log('Supabase connection successful, user:', user)
        }
      } catch (err) {
        console.error('Connection error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setConnected(false)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Supabase 연결 테스트</h3>
      
      {connected === null && (
        <p className="text-yellow-600">연결을 테스트 중...</p>
      )}
      
      {connected === true && (
        <p className="text-green-600">✅ Supabase에 성공적으로 연결되었습니다!</p>
      )}
      
      {connected === false && (
        <div className="text-red-600">
          <p>❌ Supabase 연결에 실패했습니다.</p>
          {error && <p className="text-sm mt-1">오류: {error}</p>}
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>프로젝트 URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p><strong>환경변수 로드:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}</p>
        <p><strong>인증 상태:</strong> {authUser ? `로그인됨 (${authUser.email})` : '로그인 안됨'}</p>
      </div>
    </div>
  )
}