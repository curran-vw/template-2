import { Loader } from 'lucide-react'

export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-full">
      <Loader className="animate-spin size-6 text-gray-500" />
    </div>
  )
}
