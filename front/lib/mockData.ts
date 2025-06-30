import { MintedToken } from "@/components/home/TokenCard";

// ============================================================================
// SIMULATION CONFIG - Easy to modify
// ============================================================================
export const SIMULATION_CONFIG = {
  // Wallet balances
  SOL_BALANCE: "2.3847",
  TOKEN_BALANCE: "856",

  // Quick amount suggestions for SOL
  SOL_AMOUNTS: {
    SMALL: "0.05",
    MEDIUM: "0.25",
    LARGE: "0.75",
    MAX: "2.3847",
  },

  // Price conversion example (1 SOL = X tokens approximately)
  SOL_TO_TOKEN_RATE: 1247 / 0.9485, // Based on current token price
};

// ============================================================================
// MOCK DATA - Phase 2 Minted Tokens
// ============================================================================
export const MINTED_TOKENS: MintedToken[] = [
  {
    id: "alpha-token",
    symbol: "ALPHA",
    name: "Alpha Protocol",
    image: "/tokenDemo/alpha.png",
    creator: {
      address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHrv",
      avatar: "/images/default-profile.png",
    },
    marketCap: 1247000,
    price: 0.0247,
    priceChange24h: 15.32,
    volume24h: 89420,
    holders: 1247,
    createdAt: new Date(Date.now() - 3600000), // il y a 1 heure
    lastTradeAt: new Date(Date.now() - 120000), // il y a 2 minutes
    description:
      "Revolutionary DeFi protocol bringing next-gen yield farming to Solana",
    liquidity: 445000,
    fdv: 2470000,
  },
  {
    id: "beta-token",
    symbol: "BETA",
    name: "Beta Networks",
    image: "/tokenDemo/beta.png",
    creator: {
      address: "9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHrv",
      avatar: "/images/default-profile.png",
    },
    marketCap: 892000,
    price: 0.0178,
    priceChange24h: -8.47,
    volume24h: 67200,
    holders: 892,
    createdAt: new Date(Date.now() - 7200000), // il y a 2 heures
    lastTradeAt: new Date(Date.now() - 300000), // il y a 5 minutes
    description: "Cross-chain infrastructure for seamless Web3 experiences",
    liquidity: 320000,
    fdv: 1780000,
  },
  {
    id: "gamma-token",
    symbol: "GAMMA",
    name: "Gamma Vision",
    image: "/tokenDemo/gamma.png",
    creator: {
      address: "5xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHrv",
      avatar: "/images/default-profile.png",
    },
    marketCap: 2145000,
    price: 0.0429,
    priceChange24h: 24.78,
    volume24h: 124500,
    holders: 2134,
    createdAt: new Date(Date.now() - 1800000), // il y a 30 minutes
    lastTradeAt: new Date(Date.now() - 60000), // il y a 1 minute
    description: "AI-powered analytics platform for DeFi trading strategies",
    liquidity: 675000,
    fdv: 4290000,
  },
];

// ============================================================================
// UTILITY FUNCTIONS - Data Generation
// ============================================================================

// Function to generate recent trades based on the token
export const generateRecentTrades = (token: MintedToken) => {
  const trades = [
    {
      type: "buy" as const,
      solPrice: token.price * 1.02,
      tokenAmount: 125.67,
      timestamp: new Date(Date.now() - 300000),
      txHash: "5KJp9X2zQw8uB3vR7nM4tE6yH1sL9kF2pA8dC3xG7mN",
      account: {
        avatar: "/images/default-profile.png",
        address: "8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJ",
      },
    },
    {
      type: "sell" as const,
      solPrice: token.price * 0.98,
      tokenAmount: 89.34,
      timestamp: new Date(Date.now() - 450000),
      txHash: "3MJp9X2zQw8uB3vR7nM4tE6yH1sL9kF2pA8dC3xG7mO",
      account: {
        avatar: "/images/default-profile.png",
        address: "6xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuK",
      },
    },
    {
      type: "buy" as const,
      solPrice: token.price * 1.01,
      tokenAmount: 234.12,
      timestamp: new Date(Date.now() - 600000),
      txHash: "7LJp9X2zQw8uB3vR7nM4tE6yH1sL9kF2pA8dC3xG7mP",
      account: {
        avatar: "/images/default-profile.png",
        address: "4xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuL",
      },
    },
    {
      type: "sell" as const,
      solPrice: token.price * 0.99,
      tokenAmount: 67.89,
      timestamp: new Date(Date.now() - 750000),
      txHash: "9NJp9X2zQw8uB3vR7nM4tE6yH1sL9kF2pA8dC3xG7mQ",
      account: {
        avatar: "/images/default-profile.png",
        address: "2xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuM",
      },
    },
    {
      type: "buy" as const,
      solPrice: token.price * 1.03,
      tokenAmount: 156.45,
      timestamp: new Date(Date.now() - 900000),
      txHash: "1PJp9X2zQw8uB3vR7nM4tE6yH1sL9kF2pA8dC3xG7mR",
      account: {
        avatar: "/images/default-profile.png",
        address: "9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuN",
      },
    },
  ];

  return trades;
};

// Function to generate simple top holders
export const generateTopHolders = (token: MintedToken) => {
  const holders = [
    {
      address: "FmJ5Ct2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHrv",
      percentage: 18.64,
    },
    {
      address: "GUHs6X8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJ",
      percentage: 15.42,
    },
    {
      address: "5TrUwK3xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuK",
      percentage: 12.4,
    },
    {
      address: "DwtkU76xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuL",
      percentage: 9.21,
    },
    {
      address: "EcErqZ4xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuM",
      percentage: 7.08,
    },
    {
      address: "BQ5dHx2xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuN",
      percentage: 5.73,
    },
    {
      address: "7KxivV9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuO",
      percentage: 4.01,
    },
    {
      address: "96sMvy7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuP",
      percentage: 3.89,
    },
    {
      address: "G2z3iu5xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuQ",
      percentage: 2.67,
    },
    {
      address: "Gm1wb8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuR",
      percentage: 2.45,
    },
    {
      address: "4BwL7M1xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuS",
      percentage: 1.23,
    },
  ];

  return holders.map((holder, i) => ({
    rank: i + 1,
    address: holder.address,
    percentage: holder.percentage,
    displayName: `${holder.address.slice(0, 6)}...${holder.address.slice(-6)}`,
  }));
};

// Function to find a token by ID
export const findTokenById = (tokenId: string): MintedToken | undefined => {
  return MINTED_TOKENS.find((t) => t.id === tokenId);
};
