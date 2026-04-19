interface LoadingSpinnerProps {
  /** Optional text label below the spinner */
  label?: string
}

export function LoadingSpinner({ label = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      {label && (
        <p className="mt-3 text-sm opacity-70">{label}</p>
      )}
    </div>
  )
}
