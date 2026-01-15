//components/common/LoadingSpinner.tsx

'use client'

import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  fullScreen?: boolean
  className?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  text, 
  fullScreen = false,
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  }

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        <Loader2 className={`${sizeClasses[size]} text-primary animate-spin`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${sizeClasses[size]} bg-primary/10 rounded-full`} />
        </div>
      </div>
      {text && (
        <p className="mt-3 text-sm text-text-light dark:text-dark-secondary animate-pulse">
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 dark:bg-dark-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    )
  }

  return content
}

// Skeleton loader for content
export function SkeletonLoader({ count = 1, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-5/6"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
        </div>
      ))}
    </div>
  )
}

// Card skeleton
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`card ${className}`}>
      <div className="animate-pulse space-y-4">
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  )
}
