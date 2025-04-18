"use client";

import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { CUSTOMER_PORTAL_LINK } from "@/plans/plans";
import Link from "next/link";

export default function Subscribe({ tier, url }: { tier: "pro" | "scale"; url: string }) {
  const { user, loading } = useAuth();
  const userPlan = user?.plan;
  const isSubscribed =
    (userPlan === "pro" && tier === "pro") || (userPlan === "scale" && tier === "scale");
  const isUpgrade = userPlan === "pro" && tier === "scale";

  let label = "";
  if (isSubscribed) {
    label = "Manage Subscription";
  } else if (isUpgrade) {
    label = "Upgrade to Scale";
  } else if (tier === "pro") {
    label = "Choose Pro";
  } else if (tier === "scale") {
    label = "Choose Scale";
  }

  return (
    <Button className='w-full' variant={tier === "pro" ? "default" : "outline"} asChild>
      {loading ? (
        <span>
          <LoadingSpinner />
        </span>
      ) : isSubscribed || isUpgrade ? (
        <Link href={CUSTOMER_PORTAL_LINK + `?prefilled_email=${user?.email}`}>{label}</Link>
      ) : (
        <Link href={url + `?prefilled_email=${user?.email}`}>{label}</Link>
      )}
    </Button>
  );
}
