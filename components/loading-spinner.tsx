import { Loader, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className='flex justify-center items-center h-full'>
      {/* <Loader className={cn("animate-spin size-6 text-gray-500", className)} /> */}
      <Loader2 className={cn("animate-spin size-6 text-gray-500", className)} />
    </div>
  );
}
