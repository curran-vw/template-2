export type User = {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  plan: string;
  usage: {
    agents: number;
    connectedGmailAccounts: number;
    emailSent: number;
    workspaces: number;
  };
  limits: {
    agents: number;
    connectedGmailAccounts: number;
    emailSent: number;
    workspaces: number;
  };
  stripeCustomerId: string | null;
};
