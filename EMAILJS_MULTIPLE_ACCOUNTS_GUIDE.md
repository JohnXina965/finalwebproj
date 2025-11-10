# EmailJS Multiple Accounts Setup Guide

## ✅ Yes, You Can Create Another EmailJS Account!

If you've reached the maximum number of templates in your current account, creating a new EmailJS account is perfectly fine!

## 📋 Current Setup

### Account 1 (Current):
- **Service ID**: `service_z8ms74u`
- **User ID**: `GqhsogPCZps6-KE_V`
- **Template 1**: `template_44e0uoq` - OTP/Email Verification
- **Template 2**: `template_8kvqbzd` - Booking Notifications (approval, rejection, cancellation)

### Account 2 (New - For Auto-Reply):
- **Service ID**: `service_xxxxxxxxx` (new service)
- **User ID**: `xxxxxxxxxxxxx` (new user ID)
- **Template 1**: `template_xxxxxxxxx` - Auto-Reply Template

---

## 🎯 Option 1: Create New EmailJS Account (Recommended if you hit template limit)

### Step 1: Create New EmailJS Account
1. Go to https://dashboard.emailjs.com
2. Sign up with a different email (or use the same email if allowed)
3. Verify your email

### Step 2: Create New Email Service
1. Go to **Email Services**
2. Click **"Add New Service"**
3. Choose your email provider (Gmail, Outlook, etc.)
4. Connect your email: `santosjerico420@gmail.com`
5. **Copy the Service ID** (e.g., `service_abc123xyz`)

### Step 3: Create Auto-Reply Template
1. Go to **Email Templates**
2. Click **"Create New Template"**
3. Name: `Auto-Reply Template`
4. **Template Settings:**
   - **Subject**: `We've received your message`
   - **To Email**: `{{email}}` ⬅️ **MUST SET THIS!**
   - **From Name**: `EcoExpress`
   - **From Email**: Use Default Email Address
   - **Reply To**: `santosjerico420@gmail.com`

### Step 4: Template Content (Simple HTML)
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #14b8a6;">We've Received Your Message! 📬</h2>
  <p>Hi <strong>{{name}}</strong>,</p>
  <p>Thank you for contacting EcoExpress! We've received your message and will get back to you as soon as possible.</p>
  <div style="background: #f0fdfa; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3>Your Message:</h3>
    <p>{{message}}</p>
  </div>
  <p>We typically respond within 24-48 hours during business days.</p>
  <p>Best regards,<br>The EcoExpress Team</p>
</div>
```

### Step 5: Template Variables
Add these variables:
- `email` - Recipient email (required)
- `name` - Sender name
- `message` - Message content

### Step 6: Get Credentials
- **Service ID**: `service_xxxxxxxxx` (from Step 2)
- **Template ID**: `template_xxxxxxxxx` (from Step 3)
- **User ID**: `xxxxxxxxxxxxx` (from Account Settings → API Keys)

### Step 7: Update Code
Update `src/services/EmailService.js`:

```javascript
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_z8ms74u',
  TEMPLATE_ID: 'template_44e0uoq', // OTP template
  USER_ID: 'GqhsogPCZps6-KE_V',
  TEMPLATE_BOOKING_NOTIFICATIONS: 'template_8kvqbzd', // Booking notifications
  
  // NEW ACCOUNT for Auto-Reply
  AUTO_REPLY_SERVICE_ID: 'service_xxxxxxxxx', // ⬅️ NEW SERVICE ID
  TEMPLATE_AUTO_REPLY: 'template_xxxxxxxxx', // ⬅️ NEW TEMPLATE ID
  AUTO_REPLY_USER_ID: 'xxxxxxxxxxxxx' // ⬅️ NEW USER ID
};
```

Update `sendAutoReplyEmail` function:

```javascript
export const sendAutoReplyEmail = async (email, name, message, subject = '') => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      console.warn('EmailJS not available. Skipping auto-reply.');
      return;
    }

    // Initialize EmailJS with NEW account for auto-reply
    try {
      window.emailjs.init(EMAILJS_CONFIG.AUTO_REPLY_USER_ID); // ⬅️ Use new User ID
    } catch (initError) {
      console.warn('EmailJS already initialized or init failed:', initError);
    }

    const templateParams = {
      email: email,
      name: name || 'Guest',
      message: message || 'Thank you for contacting us.'
    };

    console.log('📧 Sending auto-reply to:', email);

    // Use NEW Service ID and Template ID
    const response = await window.emailjs.send(
      EMAILJS_CONFIG.AUTO_REPLY_SERVICE_ID, // ⬅️ New Service ID
      EMAILJS_CONFIG.TEMPLATE_AUTO_REPLY,   // ⬅️ New Template ID
      templateParams
    );

    console.log('✅ Auto-reply sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending auto-reply:', error);
  }
};
```

---

## 🎯 Option 2: Reuse Existing Template (If you want to avoid new account)

You can reuse `template_8kvqbzd` for auto-reply! The code I just updated already supports this.

### How It Works:
- Use `template_8kvqbzd` for both booking notifications AND auto-reply
- The code sends different parameters based on the email type
- Empty fields will just show as blank in the email

### Current Code Already Supports This:
- `sendAutoReplyEmail` already uses `template_8kvqbzd`
- It includes all booking template parameters
- Empty fields won't break the email

---

## 📊 Comparison

### Option 1: New Account (Cleaner)
- ✅ Dedicated template for auto-reply
- ✅ Cleaner code (only 3 variables needed)
- ✅ Better organization
- ❌ Requires new account setup
- ❌ Two User IDs to manage

### Option 2: Reuse Template (Simpler)
- ✅ No new account needed
- ✅ Works immediately
- ✅ One User ID to manage
- ❌ Template has unused fields
- ❌ Less clean (but works fine)

---

## 🚀 Recommended: Create New Account

**Why?**
1. Cleaner separation of concerns
2. Dedicated template for auto-reply
3. Easier to maintain
4. Better organization

**Steps:**
1. Create new EmailJS account
2. Create new service
3. Create auto-reply template
4. Update code with new credentials
5. Test!

---

## 📝 Summary

### Current Setup:
- **Account 1**: OTP + Booking Notifications
- **Template Limit Reached**: ✅

### New Setup:
- **Account 1**: OTP + Booking Notifications (keep as is)
- **Account 2**: Auto-Reply (new account)

### Code Changes Needed:
1. Add new Service ID, Template ID, and User ID to config
2. Update `sendAutoReplyEmail` to use new account
3. Initialize EmailJS with new User ID for auto-reply

---

## ✅ Yes, Creating a New Account is Perfectly Fine!

Multiple EmailJS accounts are allowed and common for organizing different types of emails. Go ahead and create a new account for the auto-reply template!

