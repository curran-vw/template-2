import Image from 'next/image'
import { Button } from '../components/common/button'
import { Check } from 'lucide-react'
import Link from 'next/link'
import CreatePaymentSessionButton from '../components/stripe/create-payment-session'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center py-16 px-4 md:px-6">
        <div className="container max-w-6xl mx-auto text-center space-y-12">
          <Image
            src="/wa-favicon.png"
            alt="Welcome Agent Logo"
            className="object-contain mx-auto"
            priority
            width={100}
            height={100}
          />
          <div className="space-y-4">
            <h2 className="text-lg font-medium uppercase tracking-wider text-gray-500">
              PRICING
            </h2>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Pricing guaranteed to get you an ROI
            </h1>
          </div>

          {/* Pricing Cards */}
          <div className="grid gap-8 md:grid-cols-3">
            {/* Mini Plan */}
            <div className="relative flex flex-col p-8 bg-gray-50 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
              <div className="space-y-2 mb-6">
                <h3 className="text-sm font-medium uppercase tracking-wider text-gray-500">
                  MINI
                </h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">Free</span>
                </div>
                <p className="text-sm text-gray-500">
                  Try it out, no credit card needed
                </p>
              </div>
              <div className="border-t border-gray-200 my-6"></div>
              <div className="space-y-4 mb-6 flex-1">
                <p className="font-medium text-left">Includes</p>
                <ul className="space-y-3 text-left">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Pro two-week trial</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>5 automations</span>
                  </li>
                </ul>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard">Get Started</Link>
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="relative flex flex-col p-8 bg-white rounded-xl border border-gray-200 shadow-md">
              <div className="absolute -top-3 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                Popular
              </div>
              <div className="space-y-2 mb-6">
                <h3 className="text-sm font-medium uppercase tracking-wider text-gray-500">
                  PRO
                </h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">$20</span>
                  <span className="text-gray-500 ml-1">/ month</span>
                </div>
                <p className="text-sm text-gray-500">Unlock all the features</p>
              </div>
              <div className="border-t border-gray-200 my-6"></div>
              <div className="space-y-4 mb-6 flex-1">
                <p className="font-medium text-left">
                  Everything in Mini, plus
                </p>
                <ul className="space-y-3 text-left">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Access to all features</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>20 automations / month*</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Unlimited agents</span>
                  </li>
                </ul>
              </div>
              <CreatePaymentSessionButton tier="pro" />
            </div>

            {/* Scale Plan */}
            <div className="relative flex flex-col p-8 bg-gray-50 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
              <div className="space-y-2 mb-6">
                <h3 className="text-sm font-medium uppercase tracking-wider text-gray-500">
                  SCALE
                </h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">$200</span>
                  <span className="text-gray-500 ml-1">/ month</span>
                </div>
                <p className="text-sm text-gray-500">
                  Unlimited accounts & workspaces
                </p>
              </div>
              <div className="border-t border-gray-200 my-6"></div>
              <div className="space-y-4 mb-6 flex-1">
                <p className="font-medium text-left">Everything in Pro, plus</p>
                <ul className="space-y-3 text-left">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Access to all features</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>800 automations / month*</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Unlimited agents</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Unlimited users & workspaces</span>
                  </li>
                </ul>
              </div>
              <Button variant="outline" className="w-full">
                Choose Scale
              </Button>
            </div>
          </div>

          {/* Additional Note */}
          <p className="text-sm text-gray-500 mt-4">
            *Additional automations charged at $0.25 each for overage
          </p>
        </div>
      </main>
    </div>
  )
}
