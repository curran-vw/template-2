'use client'

import { getApp } from '@firebase/app'
import { getStripePayments } from '@invertase/firestore-stripe-payments'
import { createCheckoutSession } from '@invertase/firestore-stripe-payments'
import { Button } from '../common/button'
import { app } from '../../lib/firebase/firebase'

interface CreateSessionButtonProps {
  tier: 'pro' | 'scale'
}

const CreatePaymentSessionButton = ({ tier }: CreateSessionButtonProps) => {
  const handleCheckout = async () => {
    try {
      const payments = getStripePayments(app, {
        productsCollection: 'products',
        customersCollection: 'customers',
      })
      const session = await createCheckoutSession(payments, {
        price:
          tier === 'pro'
            ? 'price_1RCnIoDNYPwWd6ck4RV4kS8L'
            : 'price_1RCnJGDNYPwWd6ck1EboksOI',
      })
      window.location.assign(session.url)
    } catch (error) {
      console.error('Error creating checkout session:', error)
    }
  }

  return (
    <Button onClick={handleCheckout} className="w-full">
      Choose {tier === 'pro' ? 'Pro' : 'Scale'}
    </Button>
  )
}

export default CreatePaymentSessionButton
