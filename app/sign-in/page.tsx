import SignIn from "./sign-in";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Welcome Agent account to manage your welcome email campaigns",
};

export default function SignInPage() {
  return <SignIn />;
}
