"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function SignIn() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    try {
      setError(null);
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-background'>
      <Card className='max-w-md w-full py-10'>
        <CardHeader className='space-y-1 items-center text-center'>
          <div className='flex justify-center mb-4'>
            <Link href='https://welcomeagent.ai' target='_blank' rel='noopener noreferrer'>
              <Image
                src='/wa-favicon.png'
                alt='Welcome Agent Logo'
                className='object-contain'
                priority
                width={50}
                height={50}
              />
            </Link>
          </div>
          <CardTitle className='text-2xl font-bold'>Welcome Back</CardTitle>
          <CardDescription>Sign in to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Button
            size='lg'
            onClick={handleSignIn}
            disabled={isSigningIn}
            variant='outline'
            className='w-full flex items-center justify-center gap-3'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              xmlnsXlink='http://www.w3.org/1999/xlink'
              width='20px'
              height='20px'
              viewBox='0 0 118 120'
              version='1.1'
            >
              <title>google_buttn</title>
              <desc>Created with Sketch.</desc>
              <defs />
              <g id='Page-1' stroke='none' strokeWidth='1' fill='none' fillRule='evenodd'>
                <g id='Artboard-1' transform='translate(-332.000000, -639.000000)'>
                  <g id='google_buttn' transform='translate(332.000000, 639.000000)'>
                    <g id='logo_googleg_48dp'>
                      <path
                        d='M117.6,61.3636364 C117.6,57.1090909 117.218182,53.0181818 116.509091,49.0909091 L60,49.0909091 L60,72.3 L92.2909091,72.3 C90.9,79.8 86.6727273,86.1545455 80.3181818,90.4090909 L80.3181818,105.463636 L99.7090909,105.463636 C111.054545,95.0181818 117.6,79.6363636 117.6,61.3636364 L117.6,61.3636364 Z'
                        id='Shape'
                        fill='#4285F4'
                      />
                      <path
                        d='M60,120 C76.2,120 89.7818182,114.627273 99.7090909,105.463636 L80.3181818,90.4090909 C74.9454545,94.0090909 68.0727273,96.1363636 60,96.1363636 C44.3727273,96.1363636 31.1454545,85.5818182 26.4272727,71.4 L6.38181818,71.4 L6.38181818,86.9454545 C16.2545455,106.554545 36.5454545,120 60,120 L60,120 Z'
                        id='Shape'
                        fill='#34A853'
                      />
                      <path
                        d='M26.4272727,71.4 C25.2272727,67.8 24.5454545,63.9545455 24.5454545,60 C24.5454545,56.0454545 25.2272727,52.2 26.4272727,48.6 L26.4272727,33.0545455 L6.38181818,33.0545455 C2.31818182,41.1545455 0,50.3181818 0,60 C0,69.6818182 2.31818182,78.8454545 6.38181818,86.9454545 L26.4272727,71.4 L26.4272727,71.4 Z'
                        id='Shape'
                        fill='#FBBC05'
                      />
                      <path
                        d='M60,23.8636364 C68.8090909,23.8636364 76.7181818,26.8909091 82.9363636,32.8363636 L100.145455,15.6272727 C89.7545455,5.94545455 76.1727273,0 60,0 C36.5454545,0 16.2545455,13.4454545 6.38181818,33.0545455 L26.4272727,48.6 C31.1454545,34.4181818 44.3727273,23.8636364 60,23.8636364 L60,23.8636364 Z'
                        id='Shape'
                        fill='#EA4335'
                      />
                      <path d='M0,0 L120,0 L120,120 L0,120 L0,0 Z' id='Shape' />
                    </g>
                  </g>
                </g>
              </g>
            </svg>
            <span>{isSigningIn ? "Signing in..." : "Continue with Google"}</span>
          </Button>

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className='text-center text-xs text-muted-foreground'>
          <p>
            By signing in, you agree to our{" "}
            <Link
              href='https://welcomeagent.ai/tos'
              className='font-medium text-primary hover:underline'
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href='https://welcomeagent.ai/privacy-policy'
              className='font-medium text-primary hover:underline'
            >
              Privacy Policy
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
