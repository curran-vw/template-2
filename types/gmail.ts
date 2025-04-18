export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface GmailConnectionStatus {
  isActive: boolean;
  lastChecked: number;
  error?: string;
}

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export const GMAIL_API_ENDPOINTS = {
  TOKEN: "https://oauth2.googleapis.com/token",
  USER_INFO: "https://www.googleapis.com/oauth2/v2/userinfo",
  SEND_EMAIL: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
};

export const GMAIL_ERROR_CODES = {
  INVALID_GRANT: "invalid_grant",
  INVALID_CLIENT: "invalid_client",
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
};

export const GMAIL_CONNECTION_LIMITS = {
  MAX_ERRORS: 5,
  REFRESH_THRESHOLD_MINUTES: 5,
  RATE_LIMIT_WINDOW_MINUTES: 60,
  MAX_REQUESTS_PER_WINDOW: 100,
};
