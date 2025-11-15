interface StatusCardProps {
  isLoading: boolean
  connected?: boolean
  message?: string
  testMode?: boolean
  error?: string
}

export function StatusCard({ isLoading, connected, message, testMode, error }: StatusCardProps) {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Backend Connection Status</h2>
        
        {isLoading && (
          <div className="flex items-center gap-3">
            <span className="loading loading-spinner loading-md"></span>
            <span>Connecting to backend...</span>
          </div>
        )}

        {!isLoading && connected && (
          <div className="space-y-3">
            <div className="text-5xl">✅</div>
            <p className="text-lg">{message}</p>
            <div className="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Frontend and backend are communicating successfully!</span>
            </div>
            {testMode && (
              <div className="alert alert-warning">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Running in test mode - no real postcards will be sent</span>
              </div>
            )}
          </div>
        )}

        {!isLoading && !connected && (
          <div className="space-y-3">
            <div className="text-5xl">❌</div>
            <p className="text-lg">Failed to connect to backend</p>
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
