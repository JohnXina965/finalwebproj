# PayPal Sandbox Setup Complete Guide

## ✅ What You've Done
- Created 3 PayPal Sandbox accounts:
  1. Personal Account: `sb-tpv8s47376253@personal.example.com`
  2. Business Account 1: `sb-xivle46740431@business.example.com`
  3. Business Account 2: `sb-bbsz447207047@business.example.com`

## 📋 What You Need to Do Next

### Step 1: Create PayPal App & Get Client ID
1. Go to: https://developer.paypal.com
2. Log in with your PayPal account
3. Navigate to: **Dashboard** → **My Apps & Credentials**
4. Under **Sandbox** section, click **"Create App"**
5. Fill in:
   - **App Name**: `EcoExpress Sandbox` (or any name)
   - **Merchant Account**: Select one of your Business accounts (e.g., `sb-xivle46740431@business.example.com`)
   - **Features**: Make sure **Subscriptions** is enabled
6. Click **"Create App"**
7. **Copy the Client ID** (starts with `AY...`) - You'll need this!

### Step 2: Update Config File
Edit `src/config/paypal.js`:

```javascript
export const paypalConfig = {
  clientId: 'YOUR_CLIENT_ID_HERE', // Replace with your Client ID from Step 1
  environment: 'sandbox',
  currency: 'PHP',
  intent: 'subscription'
};

// Sandbox test accounts
export const sandboxTestAccounts = {
  buyer: {
    email: 'sb-tpv8s47376253@personal.example.com', // Your personal account
    password: 'YOUR_PASSWORD_HERE' // The password you set for this account
  },
  seller: {
    email: 'sb-xivle46740431@business.example.com', // Your business account
    password: 'YOUR_PASSWORD_HERE' // The password you set for this account
  }
};
```

### Step 3: Get Account Passwords
1. Go to: https://developer.paypal.com
2. Navigate to: **Dashboard** → **Sandbox** → **Accounts**
3. Click on each account to view details
4. Click **"Show"** next to password to reveal it
5. Copy the passwords for:
   - Personal account (for testing payments)
   - Business account (for receiving payments)

### Step 4: Test Your Setup

#### Test Host Subscription Payment:
1. Start your app: `npm run dev`
2. Go through host onboarding until you reach the subscription page
3. Select a plan and click "Subscribe with PayPal"
4. When PayPal popup opens, login with:
   - **Email**: `sb-tpv8s47376253@personal.example.com`
   - **Password**: (the password from Step 3)
5. Complete the payment flow

#### Test Wallet Cash-In:
1. Go to `/wallet` page
2. Enter an amount and click "Cash In"
3. Click "Pay with PayPal"
4. Login with your personal account
5. Complete the payment

## 🎯 Account Usage

- **Personal Account** (`sb-tpv8s47376253@personal.example.com`): 
  - Use for testing payments (as a guest/host paying)
  - Simulates buyers making payments
  
- **Business Account** (`sb-xivle46740431@business.example.com` or `sb-bbsz447207047@business.example.com`):
  - Use for receiving payments (as a host)
  - Attach to your PayPal App (Client ID)
  - This is where "money" will be received in sandbox

## ⚠️ Important Notes

1. **All transactions are FAKE** - No real money involved
2. **Sandbox is separate** - Your real PayPal account won't be affected
3. **Client ID is public** - Safe to use in frontend code (it's just for sandbox)
4. **For production**, you'll need to:
   - Create a Live App (not Sandbox)
   - Get Live Client ID
   - Update config to use `environment: 'production'`

## 🔍 Troubleshooting

### "Invalid Client ID" Error:
- Make sure you copied the Client ID correctly (starts with `AY...`)
- Verify you're using Sandbox Client ID, not Live
- Check that the app is created under Sandbox section

### "Payment Failed" Error:
- Verify your test account email and password are correct
- Make sure you're logging in with Sandbox accounts, not real PayPal
- Check browser console for detailed error messages

### Can't Login to Sandbox:
- Use the exact email from your Sandbox accounts
- Passwords are case-sensitive
- Click "Show" in PayPal dashboard to reveal password

### PayPal Asking for One-Time Code (2FA):
- **Option 1**: Click "Try another way" - PayPal may offer email verification or skip
- **Option 2**: Disable 2FA in Sandbox account:
  1. Go to PayPal Developer Dashboard → Sandbox → Accounts
  2. Click on your account → Edit
  3. Disable 2FA/Security settings
  4. Save and try again
- **Option 3**: Use "Pay with Debit or Credit Card" instead:
  - Card: `4111 1111 1111 1111`
  - Expiry: Any future date (e.g., `12/2025`)
  - CVV: `123`
  - Name/Address: Any test data

## 📚 Additional Resources

- PayPal Sandbox Docs: https://developer.paypal.com/docs/api-basics/sandbox/
- PayPal Subscriptions: https://developer.paypal.com/docs/subscriptions/
- React PayPal SDK: https://www.npmjs.com/package/@paypal/react-paypal-js


