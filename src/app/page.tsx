export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">WoodieFilm Academy</h1>
        <p className="text-gray-600 mb-8">영화 교육을 위한 학습 관리 시스템</p>
        
        <div className="bg-white p-8 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">시스템 준비 중</h2>
          <p className="text-gray-600 mb-4">
            환경 설정을 완료하고 있습니다.
          </p>
          <div className="text-sm text-gray-500">
            잠시만 기다려주세요...
          </div>
        </div>
        
        <div className="mt-8">
          <p className="text-sm text-gray-500">
            © 2025 WoodieFilm Academy. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
