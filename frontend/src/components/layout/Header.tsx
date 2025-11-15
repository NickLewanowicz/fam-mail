interface HeaderProps {
  testMode?: boolean
  connected?: boolean
  isLoading?: boolean
}

export function Header({ testMode, connected, isLoading }: HeaderProps) {
  return (
    <div className="bg-gradient-to-r from-primary to-secondary text-primary-content">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📮 Fam Mail</h1>
            <p className="text-sm opacity-80">Send postcards to the people you love</p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="badge badge-ghost gap-2">
                <span className="loading loading-spinner loading-xs"></span>
                Connecting...
              </div>
            ) : connected ? (
              <div className="badge badge-success gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Connected
              </div>
            ) : (
              <div className="badge badge-error gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Disconnected
              </div>
            )}
            {testMode && (
              <div className="badge badge-warning gap-2">
                🧪 Test Mode
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
