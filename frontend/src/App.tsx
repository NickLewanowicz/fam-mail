import { useState, useEffect } from 'react'

interface BackendStatus {
  message?: string
  connected?: boolean
  testMode?: boolean
  error?: string
}

function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setBackendStatus({ ...data, connected: true })
        setIsLoading(false)
      })
      .catch(err => {
        setBackendStatus({ error: err.message })
        setIsLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-12 px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">📮 Fam Mail</h1>
          <p className="text-lg md:text-xl text-purple-100">Send postcards to the people you love</p>
          {backendStatus.testMode && (
            <div className="absolute top-4 right-4 md:static md:mt-4 bg-amber-500 text-white px-4 py-2 rounded-lg font-semibold shadow-lg inline-block">
              🧪 Test Mode Active
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Backend Connection Status</h2>
          {isLoading ? (
            <p className="text-gray-600">Connecting to backend...</p>
          ) : backendStatus.connected ? (
            <div className="space-y-3">
              <p className="text-4xl">✅</p>
              <p className="text-gray-700">{backendStatus.message}</p>
              <p className="text-green-600 font-medium">Frontend and backend are communicating successfully!</p>
              {backendStatus.testMode && (
                <p className="text-amber-600 font-medium bg-amber-50 p-3 rounded-lg border border-amber-200">
                  ⚠️ Running in test mode - no real postcards will be sent
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-4xl">❌</p>
              <p className="text-gray-700">Failed to connect to backend</p>
              <p className="text-red-600 font-medium">{backendStatus.error}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Getting Started</h2>
          <p className="text-gray-700 mb-4">This is a starter template for Fam Mail. The project structure includes:</p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start"><span className="mr-2">✅</span><span>Bun backend with TypeScript</span></li>
            <li className="flex items-start"><span className="mr-2">✅</span><span>Vite + React frontend with TypeScript</span></li>
            <li className="flex items-start"><span className="mr-2">✅</span><span>Docker support for easy deployment</span></li>
            <li className="flex items-start"><span className="mr-2">✅</span><span>pnpm workspace configuration</span></li>
            <li className="flex items-start"><span className="mr-2">✅</span><span>Test mode enabled with PostGrid test API key</span></li>
            <li className="flex items-start"><span className="mr-2">⏳</span><span>PostGrid API integration (coming soon)</span></li>
            <li className="flex items-start"><span className="mr-2">⏳</span><span>Postcard creation UI (coming soon)</span></li>
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Next Steps</h2>
          <ol className="space-y-2 text-gray-700 list-decimal list-inside">
            <li>Get your PostGrid API key from <a href="https://www.postgrid.com/" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 underline">postgrid.com</a></li>
            <li>Your test API key is configured in <code className="bg-gray-100 px-2 py-1 rounded text-sm">backend/.env</code></li>
            <li>Build the postcard creation form</li>
            <li>Integrate with PostGrid API</li>
            <li>Deploy with Docker!</li>
          </ol>
        </div>
      </main>

      <footer className="bg-gray-100 border-t border-gray-200 py-6 text-center text-gray-600">
        <p>Built with ❤️ for keeping in touch</p>
      </footer>
    </div>
  )
}

export default App
