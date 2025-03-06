'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useWorkspace } from '@/app/lib/hooks/useWorkspace';

export default function SignIn() {
  const { user, signInWithGoogle, loading } = useAuth();
  const { refreshWorkspaces } = useWorkspace();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (user) {
      console.log('User authenticated, attempting to refresh workspaces before redirect');
      const redirectToDashboard = async () => {
        try {
          await refreshWorkspaces();
          console.log('Workspaces refreshed, redirecting to dashboard');
          router.push('/dashboard');
        } catch (error) {
          console.error('Error refreshing workspaces:', error);
          // Still redirect even if workspace refresh fails
          router.push('/dashboard');
        }
      };
      
      redirectToDashboard();
    }
  }, [user, router, refreshWorkspaces]);

  const handleSignIn = async () => {
    try {
      setError(null);
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="flex justify-center">
            <a href="https://welcomeagent.ai" target="_blank" rel="noopener noreferrer">
              <div className="">
                <Image
                  src="/wa-favicon.png"
                  alt="Welcome Agent Logo"
                  className="object-contain"
                  priority
                  width={50}
                  height={50}
                />
              </div>
            </a>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your dashboard
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={handleSignIn}
            disabled={isSigningIn || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Image
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google logo"
              width={20}
              height={20}
            />
            <span className="text-sm font-medium">
              {isSigningIn ? 'Signing in...' : 'Continue with Google'}
            </span>
          </button>
          
          {error && (
            <p className="mt-2 text-sm text-red-600 text-center">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            By signing in, you agree to our{' '}
            <a href="https://welcomeagent.ai/tos" className="font-medium text-blue-600 hover:text-blue-500">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="https://welcomeagent.ai/privacy-policy" className="font-medium text-blue-600 hover:text-blue-500">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 