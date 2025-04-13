import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  const headersList = headers();
  const host = headersList.get("host");

  let redirectUri = "";

  // Get the production URL from environment
  const productionUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.welcomeagent.ai";

  if (host?.includes("localhost")) {
    redirectUri = "http://localhost:3000/api/google/callback";
  } else if (host?.includes("replit.app")) {
    // Published Replit app domain
    redirectUri = `https://${host}/api/google/callback`;
  } else if (host?.includes("worf.replit.dev")) {
    // Staging Replit domain for development
    redirectUri = `https://${host}/api/google/callback`;
  } else {
    // Production domain
    redirectUri = `${productionUrl}/api/google/callback`;
  }
  console.log("Redirect URI:", redirectUri);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured");
  }

  // Configure OAuth 2.0 parameters
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope:
      "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    access_type: "offline",
    prompt: "consent",
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(googleAuthUrl);
}
