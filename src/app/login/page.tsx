import AuthForm from '@/components/auth/AuthForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">WoodieFilm Academy</h1>
          <p className="text-gray-600 mt-2">영화 교육을 위한 학습 관리 시스템</p>
        </div>
        <AuthForm />
      </div>
    </div>
  )
}