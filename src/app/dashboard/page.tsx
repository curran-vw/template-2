import Link from "next/link";

export default function Dashboard() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8">
      <div>
        <h1 className="text-6xl font-bold text-center">Go and get 'em' 🪄</h1>
        <h2 className="text-2xl text-center font-light text-gray-500 pt-4">
          Don't forget to update firebase config stuff. Also inviting to workspaces doesn't work out of the box
        </h2>
      </div>
    </main>
  );
} 