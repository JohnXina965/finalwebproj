# EmailJS Auto-Reply Setup Guide

## ✅ Answer: 1 EmailJS Account is Enough!

**You DON'T need to create another EmailJS account.** You can create multiple templates in the same account.

## 📋 Current EmailJS Setup

### Existing Templates:
1. **`template_44e0uoq`** - OTP/Email Verification
2. **`template_8kvqbzd`** - Booking Notifications (approval, rejection, cancellation, refund)

### New Template Needed:
3. **Auto-Reply Template** - For contact form/inquiry auto-replies

---

## 🎯 Auto-Reply Template Setup

### Step 1: Create New Template in EmailJS

1. Go to EmailJS Dashboard → **Email Templates**
2. Click **"Create New Template"**
3. Name it: `Auto-Reply Template` or `Contact Form Auto-Reply`

### Step 2: Template Configuration

**Template Settings:**
- **Template Name**: `Auto-Reply Template`
- **Subject**: `We've received your message`
- **From Name**: `EcoExpress` (or `EcoEscape`)
- **From Email**: Use Default Email Address
- **Reply To**: `santosjerico420@gmail.com`

### Step 3: Template Content (HTML)

Copy this HTML into your template:

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoExpress</h1>
  </div>

  <!-- Content -->
  <div style="padding: 30px;">
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">
      We've Received Your Message! 📬
    </h2>
    
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">
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
  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      © 2024 EcoExpress. All rights reserved.
    </p>
  </div>
</div>
```

### Step 4: Template Variables

Add these variables in EmailJS template settings:

**Required Variables:**
- `to_email` or `email` - Recipient email ({{email}})
- `name` - Sender's name
- `message` - Message content

**Optional Variables:**
- `subject` - Message subject (if you have a contact form with subject)
- `phone` - Phone number (if collected)

### Step 5: Get Template ID

After creating the template, copy the **Template ID** (it will look like `template_xxxxxxxxx`)

---

## 🔧 Code Integration

### Update EmailService.js

Add this function to `src/services/EmailService.js`:

```javascript
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_z8ms74u',
  TEMPLATE_ID: 'template_44e0uoq', // OTP template
  USER_ID: 'GqhsogPCZps6-KE_V',
  TEMPLATE_BOOKING_NOTIFICATIONS: 'template_8kvqbzd', // Booking notifications
  TEMPLATE_AUTO_REPLY: 'template_xxxxxxxxx' // ⬅️ ADD YOUR NEW TEMPLATE ID HERE
};

/**
 * Send auto-reply email for contact form/inquiry
 */
export const sendAutoReplyEmail = async (email, name, message, subject = '') => {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      console.warn('EmailJS not available. Skipping auto-reply.');
      return;
    }

    // Initialize EmailJS if needed
    try {
      window.emailjs.init(EMAILJS_CONFIG.USER_ID);
    } catch (initError) {
      console.warn('EmailJS already initialized or init failed:', initError);
    }

    const templateParams = {
      to_email: email,
      email: email,
      name: name || 'Guest',
      message: message || 'Thank you for contacting us.',
      subject: subject || 'Inquiry'
    };

    console.log('📧 Sending auto-reply to:', email);

    const response = await window.emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_AUTO_REPLY, // Use the new template
      templateParams
    );

    console.log('✅ Auto-reply sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending auto-reply:', error);
    // Don't throw - auto-reply is non-critical
  }
};
```

---

## 📊 Template Summary

### All Templates in 1 Account:

| Template | Template ID | Purpose | Variables |
|----------|-------------|---------|-----------|
| **OTP** | `template_44e0uoq` | Email verification | `email`, `passcode`, `time`, `fullName` |
| **Booking Notifications** | `template_8kvqbzd` | Booking, cancellation, refund | `to_email`, `guest_name`, `email_type`, etc. |
| **Auto-Reply** | `template_xxxxxxxxx` | Contact form auto-reply | `email`, `name`, `message` |

---

## ✅ Summary

### Do You Need Another EmailJS Account?
**NO!** 1 account is enough. You can create multiple templates in the same account.

### How Many Templates Do You Need?
**3 templates total:**
1. ✅ OTP template (already exists)
2. ✅ Booking notifications template (already exists)
3. ⬅️ Auto-reply template (need to create)

### Your Auto-Reply Setup:
- ✅ Subject: "We've received your message" ✓
- ✅ From Name: "EcoExpress" ✓
- ✅ Reply To: "santosjerico420@gmail.com" ✓
- ✅ To Email: {{email}} ✓

### Next Steps:
1. Create the new template in EmailJS (same account)
2. Copy the Template ID
3. Add it to `EMAILJS_CONFIG` in `EmailService.js`
4. Add the `sendAutoReplyEmail` function
5. Use it in your contact form/message handler

---

## 💡 Tips

- **Free Plan**: EmailJS free plan allows multiple templates
- **Template Reuse**: You can reuse templates with different parameters
- **Same Service**: Use the same `SERVICE_ID` for all templates
- **Same User ID**: Use the same `USER_ID` for all templates

---

## 🚀 Ready to Use

Once you create the template and add the Template ID to the code, you can use it like this:

```javascript
import { sendAutoReplyEmail } from './services/EmailService';

// When someone sends a message/contact form
await sendAutoReplyEmail(
  userEmail,
  userName,
  userMessage,
  messageSubject // optional
);
```

---

**You're all set!** Just create the template in your existing EmailJS account and add the Template ID to the code. No need for a new account! 🎉

