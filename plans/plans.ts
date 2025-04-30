export type Plan = {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: {
      priceId: string;
      link: string;
      amount: number;
    };
  };
  limits: {
    agents: number;
    connectedGmailAccounts: number;
    emailSent: number;
    workspaces: number;
  };
  features: string[];
};

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    description: "For personal use",
    features: [
      "3 welcome agents",
      "3 connected gmail accounts",
      "30 emails per month",
      "3 workspaces",
    ],
    limits: {
      agents: 3,
      connectedGmailAccounts: 3,
      emailSent: 30,
      workspaces: 3,
    },
    price: {
      monthly: {
        priceId: null,
        link: null,
        amount: 0,
      },
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For small teams",
    price: {
      monthly: {
        priceId: "price_1RJdWGDNYPwWd6ckATOIdF1x",
        link: "https://buy.stripe.com/test_00g5l1gcLbSZgNy9AM",
        amount: 20,
      },
    },
    limits: {
      agents: 5,
      connectedGmailAccounts: 5,
      emailSent: 5,
      workspaces: 5,
    },
    features: [
      "5 welcome agents",
      "5 connected gmail accounts",
      "50 emails per month",
      "5 workspaces",
    ],
  },
  scale: {
    id: "scale",
    name: "Scale",
    description: "For large teams",
    price: {
      monthly: {
        priceId: "price_1RJdZZDNYPwWd6ckKZ1h4Rp0",
        link: "https://buy.stripe.com/test_dR614L4u30ah54Q6oB",
        amount: 200,
      },
    },
    limits: {
      agents: 10,
      connectedGmailAccounts: 10,
      emailSent: 100,
      workspaces: 10,
    },
    features: [
      "10 welcome agents",
      "10 connected gmail accounts",
      "100 emails per month",
      "10 workspaces",
    ],
  },
};

export const CUSTOMER_PORTAL_LINK = "https://billing.stripe.com/p/login/test_aEU6s0e1C7JE9B67ss";
