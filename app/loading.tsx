import { Loader } from "lucide-react";

export default function Loading() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-white'>
      <Loader className='animate-spin size-6 text-gray-500' />
    </div>
  );
}
