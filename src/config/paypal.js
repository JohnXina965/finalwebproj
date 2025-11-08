// Direct configuration - no process.env for now
export const paypalConfig = {
  clientId: 'AWHufdBboQ2yUslVUa_0-zhwYCiQUtCvEXgae0Ne3UVges3Yx-9ncS6O4r3npqbhee9bKmxFNdVXjmRw', // Your Sandbox Client ID
  environment: 'sandbox',
  currency: 'PHP',
  intent: 'subscription' // For subscriptions
};

// For one-time payments (wallet cash-in), use 'intent: "CAPTURE"'
export const paypalPaymentConfig = {
  clientId: 'AWHufdBboQ2yUslVUa_0-zhwYCiQUtCvEXgae0Ne3UVges3Yx-9ncS6O4r3npqbhee9bKmxFNdVXjmRw',
  environment: 'sandbox',
  currency: 'PHP',
  intent: 'CAPTURE' // For one-time payments
};

// Sandbox test accounts (for reference only - passwords not stored here)
export const sandboxTestAccounts = {
  // Guest/Personal Account (for testing payments)
  buyer: {
    email: 'sb-tpv8s47376253@personal.example.com',
    note: 'Use this account to test payments as a guest'
  },
  // Host Business Account (for receiving payments from guests)
  host: {
    email: 'sb-xivle46740431@business.example.com', // or sb-bbsz447207047@business.example.com
    note: 'This account receives payments from guests'
  },
  // Admin Business Account (for platform fees/service fees)
  admin: {
    email: 'sb-bbsz447207047@business.example.com', // or sb-xivle46740431@business.example.com
    note: 'This account receives platform/service fees'
  }
};