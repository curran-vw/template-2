import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function EmptyWelcomeAgents() {
  const router = useRouter();

  return (
    <div className='flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted p-8'>
      <div className='h-24 w-24'>
        <RobotAnimation />
      </div>
      <h2 className='mb-3 text-center text-2xl font-semibold'>No welcome agents yet</h2>
      <p className='mb-8 max-w-md text-center text-muted-foreground'>
        Create your first welcome agent to start automating your personalized welcome emails
      </p>
      <Button size='lg' className='gap-2' onClick={() => router.push("/agents/new")}>
        <PlusCircle className='h-5 w-5' />
        Create Your First Agent
      </Button>
    </div>
  );
}

function RobotAnimation() {
  return (
    <div className='robot-animation'>
      <svg viewBox='0 0 200 200' className='h-full w-full'>
        {/* Robot head */}
        <rect
          className='robot-head'
          x='60'
          y='60'
          width='80'
          height='80'
          rx='10'
          fill='currentColor'
        />
        {/* Robot eyes container */}
        <g className='robot-eyes'>
          <circle cx='85' cy='90' r='8' fill='currentColor' /> {/* Eye sockets */}
          <circle cx='115' cy='90' r='8' fill='currentColor' />
          <circle className='robot-eye' cx='85' cy='90' r='6' fill='#3b82f6' /> {/* Actual eyes */}
          <circle className='robot-eye' cx='115' cy='90' r='6' fill='#3b82f6' />
        </g>
        {/* Robot antenna */}
        <line
          className='robot-antenna'
          x1='100'
          y1='60'
          x2='100'
          y2='40'
          stroke='#94a3b8'
          strokeWidth='4'
        />
        <circle className='robot-antenna-tip' cx='100' cy='35' r='6' fill='#3b82f6' />
      </svg>
      <style jsx>{`
        .robot-animation {
          animation: float 3s ease-in-out infinite;
          color: var(--muted);
        }
        .robot-eye {
          transform-origin: center;
          animation: blink 4s infinite;
        }
        .robot-antenna-tip {
          animation: pulse 2s infinite;
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes blink {
          0%,
          96%,
          98% {
            transform: scaleY(1);
          }
          97% {
            transform: scaleY(0.1);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            fill: #3b82f6;
          }
          50% {
            fill: #60a5fa;
          }
        }
      `}</style>
    </div>
  );
}
