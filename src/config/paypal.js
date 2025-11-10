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

// PayPal Payouts API credentials (Admin account - money comes from here)
export const paypalPayoutConfig = {
  clientId: 'AWHufdBboQ2yUslVUa_0-zhwYCiQUtCvEXgae0Ne3UVges3Yx-9ncS6O4r3npqbhee9bKmxFNdVXjmRw',
  clientSecret: 'EEWK1sbP4WqhYnyq0fsmGb1nop4hRoNxm4tYASc0_XdUfcM4VjO-nQcQJas141Y09zaFRkSjYl0BXWXe',
  apiBase: 'https://api-m.sandbox.paypal.com', // Sandbox API
  environment: 'sandbox'
};

// Admin PayPal email (where subscription payments and platform fees go)
// IMPORTANT: PayPal sandbox emails MUST use @business.example.com format
export const adminPayPalEmail = 'sb-xivle46740431@business.example.com'; // Admin business account

// Sandbox test accounts (for reference only - passwords not stored here)
export const sandboxTestAccounts = {
  // Guest/Personal Account (for testing payments)
  buyer: {
    email: 'sb-tpv8s47376253@personal.example.com',
    password: '1n4:aV!y',
    note: 'Use this account to test payments as a guest'
  },
  // Host Business Account (for receiving withdrawal payouts from admin)
  host: {
    email: 'sb-bbsz447207047@business.example.com',
    password: 'G:?Khx-0',
    note: 'This account receives withdrawal payouts from admin (via PayPal Payouts API)'
  },
  // Admin Business Account (for platform fees/service fees)
  admin: {
    email: 'sb-xivle46740431@business.example.com',
    password: 'lT9r_mA3',
    note: 'This account receives platform/service fees and subscription payments'
  }
};