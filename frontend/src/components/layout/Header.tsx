interface HeaderProps {
  testMode?: boolean
}

export function Header({ testMode }: HeaderProps) {
  return (
    <div className="bg-gradient-to-r from-primary to-secondary text-primary-content">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-5xl font-bold">📮 Fam Mail</h1>
            {testMode && (
              <div className="badge badge-warning badge-lg gap-2">
                🧪 Test Mode
              </div>
            )}
          </div>
          <p className="text-xl opacity-90">
            Send postcards to the people you love
          </p>
        </div>
      </div>
    </div>
  )
}
