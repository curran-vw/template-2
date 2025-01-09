export function RobotIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="25" y="45" width="90" height="75" rx="8" fill="currentColor" fillOpacity="0.1" />
      <rect x="25" y="45" width="90" height="75" rx="8" stroke="currentColor" strokeWidth="4" />
      <circle cx="55" cy="80" r="8" fill="currentColor" />
      <circle cx="85" cy="80" r="8" fill="currentColor" />
      <path d="M50 105h40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 30v15M80 30v15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 20h40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
} 