# Withdrawal Troubleshooting Guide

## ✅ Fixed Issues

### 1. PayPal Email Format
- **Problem:** PayPal sandbox emails must use `@business.example.com` or `@personal.example.com` format
- **Fixed:** Updated email format in config to use correct PayPal sandbox format
- **Note:** Emails like `@business.admin.com` or `@business.host.com` won't work with PayPal

### 2. Error Handling
- **Problem:** Errors weren't being shown clearly
- **Fixed:** Added detailed error handling with helpful error messages
- **Added:** Console logging to help debug issues

## 🔍 How to Test Withdrawal

### Step 1: Check Admin PayPal Account
1. Go to https://sandbox.paypal.com
2. Log in with admin account: `sb-xivle46740431@business.example.com`
3. Password: `lT9r_mA3`
4. Make sure the account has sufficient balance for testing

### Step 2: Test Withdrawal
1. As a host, go to Wallet
2. Enter PayPal email: `sb-bbsz447207047@business.example.com` (host account)
3. Enter amount (minimum ₱100)
4. Click "Withdraw to PayPal"
5. Check browser console for detailed logs

### Step 3: Check Results
1. Check browser console for PayPal API responses
2. Check PayPal sandbox dashboard for the payout transaction
3. Check the host's PayPal account (`sb-bbsz447207047@business.example.com`)

## 🐛 Common Errors and Solutions

### Error: "PayPal authentication failed"
- **Cause:** Client ID or Secret is incorrect
- **Solution:** Check `src/config/paypal.js` - make sure Client ID and Secret are correct

### Error: "Admin PayPal account has insufficient funds"
- **Cause:** Admin PayPal account doesn't have enough balance
- **Solution:** 
  1. Log in to https://sandbox.paypal.com with admin account
  2. Add funds to the account
  3. Or use PayPal sandbox's test funding feature

### Error: "PayPal account not found" or "Invalid email"
- **Cause:** PayPal email format is incorrect or account doesn't exist
- **Solution:** 
  1. Use correct PayPal sandbox email format: `@business.example.com` or `@personal.example.com`
  2. Make sure the email is a valid PayPal sandbox account
  3. Test accounts:
     - Host: `sb-bbsz447207047@business.example.com`
     - Admin: `sb-xivle46740431@business.example.com`
     - Guest: `sb-tpv8s47376253@personal.example.com`

### Error: "Nothing happens when I withdraw"
- **Possible Causes:**
  1. JavaScript error in console
  2. PayPal API error not being displayed
  3. Network/CORS issue
- **Solution:**
  1. Open browser console (F12)
  2. Check for errors (red messages)
  3. Look for PayPal API responses
  4. Check network tab for failed requests

## 📋 Testing Checklist

- [ ] Admin PayPal account has sufficient balance
- [ ] Host PayPal email is correct format (`@business.example.com`)
- [ ] Browser console shows PayPal API calls
- [ ] No JavaScript errors in console
- [ ] PayPal API returns success response
- [ ] Transaction appears in Firestore
- [ ] Wallet balance is updated
- [ ] Payout appears in PayPal sandbox dashboard

## 🔧 Debug Steps

1. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for PayPal API logs (🔄, ✅, ❌ emojis)
   - Check for any error messages

2. **Check Network Tab:**
   - Open Developer Tools (F12)
   - Go to Network tab
   - Filter by "paypal"
   - Check if requests are being made
   - Check response status and data

3. **Check Firestore:**
   - Go to Firebase Console
   - Check `walletTransactions` collection
   - Look for the withdrawal transaction
   - Check if status is "completed" or "pending"

4. **Check PayPal Sandbox:**
   - Log in to https://sandbox.paypal.com
   - Check admin account for outgoing payouts
   - Check host account for incoming payments

## 📝 PayPal Account Credentials

### Admin Account (Money comes from here)
- Email: `sb-xivle46740431@business.example.com`
- Password: `lT9r_mA3`
- Use: Receives subscription payments, sends payouts to hosts

### Host Account (Money goes here)
- Email: `sb-bbsz447207047@business.example.com`
- Password: `G:?Khx-0`
- Use: Receives withdrawal payouts from admin

### Guest Account (For testing payments)
- Email: `sb-tpv8s47376253@personal.example.com`
- Password: `1n4:aV!y`
- Use: Testing guest payments and wallet cash-in

## 🚀 Next Steps

If withdrawal still doesn't work:
1. Check browser console for specific error messages
2. Verify PayPal credentials are correct
3. Make sure admin PayPal account has balance
4. Verify PayPal email format is correct
5. Check PayPal sandbox account status

## 💡 Tips

- Always check browser console first
- PayPal sandbox transactions are instant (no waiting)
- All transactions are fake (no real money)
- Use correct email format: `@business.example.com`
- Make sure admin account has sufficient balance

