interface HeaderProps {
  testMode?: boolean
}

export function Header({ testMode }: HeaderProps) {
  return (
    <div className="bg-gradient-to-r from-primary to-secondary text-primary-content">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📮 Fam Mail</h1>
            <p className="text-sm opacity-80">Send postcards to the people you love</p>
          </div>
          {testMode && (
            <div className="badge badge-warning gap-2">
              🧪 Test Mode
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
