//components/common/ErrorBoundary.tsx 

'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-6">
            <AlertCircle className="h-16 w-16 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-text dark:text-dark-text">
            Something went wrong
          </h3>
          <p className="text-text-light dark:text-dark-secondary mb-6 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <div className="flex gap-4">
            <button
              onClick={this.handleRetry}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="btn-outline"
            >
              Go Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}