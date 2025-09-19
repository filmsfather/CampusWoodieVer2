import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 배포 최적화 설정
  experimental: {
    // 성능 향상을 위한 실험적 기능들
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js']
  },
  
  // 이미지 최적화 설정
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**'
      },
      {
        protocol: 'https', 
        hostname: '*.supabase.com',
        pathname: '/storage/v1/object/public/**'
      }
    ],
    formats: ['image/webp', 'image/avif']
  },

  // Vercel에서는 기본 출력 설정 사용

  // TypeScript 설정
  typescript: {
    ignoreBuildErrors: false
  },

  // ESLint 설정
  eslint: {
    ignoreDuringBuilds: false
  },

  // 환경변수 검증
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  }
};

export default nextConfig;
