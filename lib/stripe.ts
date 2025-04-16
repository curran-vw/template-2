import { loadStripe } from "@stripe/stripe-js";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

// Frontend Stripe instance
export const getStripe = () => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
  }
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
};

// Backend Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil", // Use the latest API version
});
