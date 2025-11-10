# EmailJS New Account Setup - Step by Step

## ✅ Yes, Creating a New EmailJS Account is Perfectly Fine!

Since you've reached the template limit, creating a new account is the best solution.

---

## 📋 Step-by-Step Setup

### Step 1: Create New EmailJS Account

1. Go to https://dashboard.emailjs.com
2. Click **"Sign Up"** (or use a different email if you already have an account)
3. Verify your email address
4. Complete the signup process

### Step 2: Create Email Service

1. In your new EmailJS account, go to **"Email Services"**
2. Click **"Add New Service"**
3. Choose your email provider (Gmail recommended)
4. Connect your email: `santosjerico420@gmail.com`
5. **Copy the Service ID** (e.g., `service_abc123xyz`)

### Step 3: Create Auto-Reply Template

1. Go to **"Email Templates"**
2. Click **"Create New Template"**
3. **Template Name**: `Auto-Reply Template`

#### Template Settings:
- **Subject**: `We've received your message`
- **To Email**: `{{email}}` ⬅️ **CRITICAL - SET THIS!**
- **From Name**: `EcoExpress`
- **From Email**: Use Default Email Address
- **Reply To**: `santosjerico420@gmail.com`

#### Template Content (Simple HTML):
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">EcoExpress</h1>
  </div>

  <!-- Content -->
  <div style="padding: 30px; background-color: #ffffff;">
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">
      We've Received Your Message! 📬
    </h2>
    
    <p style="color: #4b5563; margin: 20px 0; font-size: 16px;">
      Hi <strong>{{name}}</strong>,
    </p>
    
    <p style="color: #4b5563; margin: 20px 0; font-size: 16px;">
      Thank you for contacting EcoExpress! We've received your message and will get back to you as soon as possible.
    </p>

    <!-- Message Summary -->
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 12px;">Your Message:</h3>
      <p style="margin: 0; color: #374151; white-space: pre-wrap;">{{message}}</p>
    </div>

    <!-- Response Time Info -->
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #1e40af; margin: 0; font-size: 14px;">
        <strong>⏱️ Response Time:</strong> We typically respond within 24-48 hours during business days.
      </p>
    </div>

    <!-- What's Next -->
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 12px;">What's Next?</h3>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        <li>Our team will review your message</li>
        <li>We'll respond to <strong>{{email}}</strong></li>
        <li>You'll receive a notification when we reply</li>
      </ul>
    </div>

    <!-- Support Info -->
    <div style="text-align: center; margin: 30px 0;">
      <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
        Need immediate assistance?
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
        Email: <a href="mailto:santosjerico420@gmail.com" style="color: #14b8a6; text-decoration: none;">santosjerico420@gmail.com</a>
      </p>
    </div>

    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 30px; color: #6b7280; font-size: 14px;">
      Best regards,<br />
      <strong style="color: #14b8a6;">The EcoExpress Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea; border-radius: 0 0 8px 8px;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      © 2024 EcoExpress. All rights reserved.
    </p>
  </div>
</div>
```

#### Template Variables:
Add these 3 variables in EmailJS template settings:
- `email` - Recipient email (required)
- `name` - Sender name
- `message` - Message content

### Step 4: Get Credentials

After creating the template, copy these:

1. **Service ID**: From Step 2 (e.g., `service_abc123xyz`)
2. **Template ID**: From Step 3 (e.g., `template_xyz789abc`)
3. **User ID**: Go to **Account Settings** → **API Keys** → Copy **Public Key** (e.g., `Abc123Xyz789`)

### Step 5: Update Code

Update `src/services/EmailService.js` with your new credentials:

```javascript
const EMAILJS_CONFIG = {
  // Account 1: OTP and Booking Notifications
  SERVICE_ID: 'service_z8ms74u',
  TEMPLATE_ID: 'template_44e0uoq',
  USER_ID: 'GqhsogPCZps6-KE_V',
  TEMPLATE_BOOKING_NOTIFICATIONS: 'template_8kvqbzd',
  
  // Account 2: Auto-Reply (NEW - Replace with your new credentials)
  AUTO_REPLY_SERVICE_ID: 'service_abc123xyz', // ⬅️ Your new Service ID
  TEMPLATE_AUTO_REPLY: 'template_xyz789abc',  // ⬅️ Your new Template ID
  AUTO_REPLY_USER_ID: 'Abc123Xyz789'          // ⬅️ Your new User ID
};
```

---

## 🧪 Testing

### Test in EmailJS Dashboard:

1. Go to your new template in EmailJS
2. Click **"Test"**
3. Fill in:
   - `email`: `test@example.com`
   - `name`: `John Doe`
   - `message`: `This is a test message`
4. Click **"Send Test Email"**

### Test JavaScript Code:

```javascript
// Make sure EmailJS script is loaded
emailjs.init('YOUR_NEW_USER_ID'); // Initialize with new account

emailjs.send('YOUR_NEW_SERVICE_ID', 'YOUR_NEW_TEMPLATE_ID', {
  email: 'test@example.com',
  name: 'John Doe',
  message: 'This is a test auto-reply message'
});
```

---

## ✅ Summary

### Current Setup:
- **Account 1**: OTP + Booking Notifications
- **Templates Used**: 2/2 (limit reached)

### New Setup:
- **Account 1**: OTP + Booking Notifications (keep as is)
- **Account 2**: Auto-Reply (new account)

### What You Need:
1. ✅ New EmailJS account
2. ✅ New Service ID
3. ✅ New Template ID
4. ✅ New User ID
5. ✅ Update code with new credentials

---

## 🚀 Ready to Go!

Once you create the new account and get the credentials, just update the code and you're done!

The code is already set up to support multiple accounts. Just update the credentials in `EMAILJS_CONFIG` and it will work automatically.

