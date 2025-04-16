"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/server/auth";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";

export async function createCheckoutSession(plan: "pro" | "scale") {
  const user = await requireAuth();
  let url = "";

  try {
    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Update user with Stripe customer ID
      await adminDb.collection("users").doc(user.id).update({
        stripeCustomerId: customerId,
      });
    }

    // Create a checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price:
            plan === "pro"
              ? process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
              : process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      client_reference_id: user.id,
      customer: customerId,
      metadata: {
        userId: user.id,
      },
    });

    if (!session.url) {
      throw new Error("No session URL");
    }

    url = session.url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return { error: "Error creating checkout session" };
  }

  redirect(url);
}

export async function createCustomerPortalSession() {
  const user = await requireAuth();

  const customerId = user.stripeCustomerId;

  if (!customerId) {
    return { error: "No Stripe customer ID" };
  }

  // Create customer portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
  });

  redirect(session.url);
}
