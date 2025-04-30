"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";
import { PLANS, CUSTOMER_PORTAL_LINK } from "@/plans/plans";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export function Usage() {
  const { user, loading } = useAuth();

  const currentPlan = PLANS[user?.plan?.toLowerCase() as keyof typeof PLANS] || PLANS.free;
  const usage = user?.usage || {
    agents: 0,
    connectedGmailAccounts: 0,
    emailSent: 0,
    workspaces: 0,
  };

  return (
    <div className='min-h-screen bg-white flex flex-col'>
      {/* Main Content */}
      <main className='flex-1 flex flex-col items-center justify-center py-16 px-4 md:px-6'>
        <div className='container max-w-6xl mx-auto text-center space-y-12'>
          <Link href='/'>
            <Image
              src='/wa-favicon.png'
              alt='Welcome Agent Logo'
              className='object-contain mx-auto'
              priority
              width={100}
              height={100}
            />
          </Link>
          <div className='space-y-4'>
            <h2 className='text-lg font-medium uppercase tracking-wider text-gray-500'>
              USAGE & BILLING
            </h2>
            <h1 className='text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl'>
              Manage your subscription and usage
            </h1>
          </div>

          {/* Usage Information */}
          <div className='grid gap-8 md:grid-cols-2'>
            {/* Current Plan */}
            {loading ? (
              <Skeleton className='h-full w-full rounded-xl' />
            ) : (
              <div className='relative flex flex-col p-8 bg-white rounded-xl border border-gray-200 shadow-md'>
                <div className='space-y-2 mb-6'>
                  <h3 className='text-sm font-medium uppercase tracking-wider text-gray-500'>
                    Your Current Plan
                  </h3>
                  <div className='flex items-baseline justify-center'>
                    <span className='text-4xl font-bold'>{currentPlan.name}</span>
                  </div>
                  <p className='text-sm text-gray-500'>{currentPlan.description}</p>
                </div>
                <div className='border-t border-gray-200 my-6'></div>
                <div className='space-y-4 mb-6 flex-1'>
                  <p className='font-medium text-left'>Current Usage</p>
                  <ul className='space-y-3 text-left'>
                    <li className='flex items-start'>
                      <Check className='h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5' />
                      <span>
                        {usage.agents}/{currentPlan.limits.agents} welcome agents used
                      </span>
                    </li>
                    <li className='flex items-start'>
                      <Check className='h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5' />
                      <span>
                        {usage.connectedGmailAccounts}/{currentPlan.limits.connectedGmailAccounts}{" "}
                        connected gmail accounts
                      </span>
                    </li>
                    <li className='flex items-start'>
                      <Check className='h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5' />
                      <span>
                        {usage.emailSent}/{currentPlan.limits.emailSent} emails sent this month
                      </span>
                    </li>
                    <li className='flex items-start'>
                      <Check className='h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5' />
                      <span>
                        {usage.workspaces}/{currentPlan.limits.workspaces} workspaces created
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Billing Management */}
            <div className='relative flex flex-col p-8 bg-gray-50 rounded-xl border border-gray-200 shadow-sm'>
              <div className='space-y-2 mb-6'>
                <h3 className='text-sm font-medium uppercase tracking-wider text-gray-500'>
                  Billing Management
                </h3>
                <h2 className='text-2xl font-bold'>Stripe Customer Portal</h2>
                <p className='text-sm text-gray-500'>
                  Manage your subscription, update payment methods, and view billing history
                </p>
              </div>
              <div className='border-t border-gray-200 my-6'></div>
              <div className='space-y-4 mb-6 flex-1'>
                <p className='font-medium text-left'>Available Actions</p>
                <ul className='space-y-3 text-left'>
                  <li className='flex items-start'>
                    <Check className='h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5' />
                    <span>Update payment methods</span>
                  </li>
                  <li className='flex items-start'>
                    <Check className='h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5' />
                    <span>View billing history</span>
                  </li>
                  <li className='flex items-start'>
                    <Check className='h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5' />
                    <span>Download invoices</span>
                  </li>
                  <li className='flex items-start'>
                    <Check className='h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5' />
                    <span>Change subscription plan</span>
                  </li>
                </ul>
              </div>
              <Button className='w-full' asChild>
                <Link
                  href={CUSTOMER_PORTAL_LINK + "?prefilled_email=" + user?.email}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Access Customer Portal
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
