interface StatusCardProps {
  isLoading: boolean
  connected?: boolean
  message?: string
  error?: string
}

export function StatusCard({ isLoading, connected, message, error }: StatusCardProps) {
  if (isLoading) {
    return (
      <div className="alert">
        <span className="loading loading-spinner loading-sm"></span>
        <span>Connecting to backend...</span>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Backend connection failed: {error}</span>
      </div>
    )
  }

  return (
    <div className="alert alert-success">
      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Connected • {message}</span>
    </div>
  )
}
