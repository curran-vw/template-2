import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";
import { PLANS } from "@/plans/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  //   const user = await requireAuth();
  const body = await req.text();

  const signature = headers().get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let data;
  let eventType;
  let event;

  // verify Stripe event is legit
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error(`Webhook signature verification failed. ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  data = event.data;
  eventType = event.type;

  try {
    switch (eventType) {
      case "checkout.session.completed": {
        // @ts-ignore
        const session = await stripe.checkout.sessions.retrieve(data.object.id, {
          expand: ["line_items"],
        });
        const customerId = session?.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        const priceId = session?.line_items?.data[0]?.price?.id;

        // get plan from PLANS object
        const plan = Object.values(PLANS).find((plan) => plan.price.monthly.priceId === priceId);
        if (!plan) {
          throw new Error("No plan found");
        }

        // get user by customer email
        // @ts-ignore
        const userRef = adminDb.collection("users").where("email", "==", customer.email);
        const user = await userRef.get();
        if (user.empty) {
          throw new Error("No user found");
        }
        const userData = user.docs[0].data();

        // update user plan attribute
        userData.plan = plan.id;
        userData.limits = {
          agents: plan.limits.agents,
          connectedGmailAccounts: plan.limits.connectedGmailAccounts,
          emailSent: plan.limits.emailSent,
          workspaces: plan.limits.workspaces,
        };
        userData.stripeCustomerId = customerId;
        await user.docs[0].ref.update(userData);

        break;
      }

      case "customer.subscription.updated": {
        // @ts-ignore
        const session = await stripe.checkout.sessions.retrieve(data.object.id, {
          expand: ["line_items"],
        });
        const customerId = session?.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        const priceId = session?.line_items?.data[0]?.price?.id;

        // get plan from PLANS object
        const plan = Object.values(PLANS).find((plan) => plan.price.monthly.priceId === priceId);
        if (!plan) {
          throw new Error("No plan found");
        }

        // get user by customer email
        // @ts-ignore
        const userRef = adminDb.collection("users").where("email", "==", customer.email);
        const user = await userRef.get();
        if (user.empty) {
          throw new Error("No user found");
        }
        const userData = user.docs[0].data();

        // update user plan attribute
        userData.plan = plan.id;
        userData.limits = {
          agents: plan.limits.agents,
          connectedGmailAccounts: plan.limits.connectedGmailAccounts,
          emailSent: plan.limits.emailSent,
          workspaces: plan.limits.workspaces,
        };
        await user.docs[0].ref.update(userData);

        break;
      }

      case "customer.subscription.deleted": {
        // @ts-ignore
        const subscription = await stripe.subscriptions.retrieve(data.object.id);
        const customerId = subscription.customer as string;

        // get user by customer ID
        const userRef = adminDb.collection("users").where("stripeCustomerId", "==", customerId);
        const user = await userRef.get();
        if (user.empty) {
          throw new Error("No user found");
        }

        const userData = user.docs[0].data();

        // Get the free plan from PLANS object
        const freePlan = PLANS.free;

        // Revoke access by setting plan back to free
        userData.plan = freePlan.id;
        userData.limits = {
          agents: freePlan.limits.agents,
          connectedGmailAccounts: freePlan.limits.connectedGmailAccounts,
          emailSent: freePlan.limits.emailSent,
          workspaces: freePlan.limits.workspaces,
        };

        await user.docs[0].ref.update(userData);

        break;
      }
    }
  } catch (e: any) {
    console.error("stripe error: " + e.message + " | EVENT TYPE: " + eventType);
  }

  return NextResponse.json({});
}
