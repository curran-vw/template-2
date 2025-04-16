export type User = {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  plan: string;
  usage: {
    [key: string]: number;
  };
  limits: {
    [key: string]: number;
  };
  stripeCustomerId: string | null;
};
