"use client";

import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { stripeUtils } from "@/firebase/stripe-utils";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import Link from "next/link";
interface CreateSessionButtonProps {
  tier: "pro" | "scale";
}

const CreatePaymentSessionButton = ({ tier }: CreateSessionButtonProps) => {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchUrl = async () => {
      const url = await stripeUtils.getCheckoutUrl(
        tier === "pro"
          ? "price_1RDA7VDNYPwWd6ckd8v4VRNR"
          : "price_1RDAAfDNYPwWd6ckn57Fn73j",
      );
      setUrl(url);
    };
    if (!loading) {
      fetchUrl();
    }
  }, [loading]);

  let label = "";

  if (
    (user?.plan === "pro" && tier === "pro") ||
    (user?.plan === "scale" && tier === "scale")
  ) {
    label = "Subscribed";
  } else if (user?.plan === "pro" && tier === "scale") {
    label = "Upgrade to Scale";
  } else if (tier === "pro") {
    label = "Choose Pro";
  } else if (tier === "scale") {
    label = "Choose Scale";
  }

  return (
    <Button
      className='w-full'
      variant={tier === "pro" ? "default" : "outline"}
      asChild
    >
      <Link href={url || ""}>{label}</Link>
    </Button>
  );
};

export default CreatePaymentSessionButton;
