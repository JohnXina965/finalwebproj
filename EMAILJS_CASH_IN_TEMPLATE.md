# EmailJS Cash-In Template - template_3wbzery

## 📧 Template Configuration

**Template ID:** `template_3wbzery`  
**Service ID:** `service_yaewyfi`  
**Public Key (User ID):** `Vdve3tFnBgXl-MH0o`

---

## 🎯 Purpose

This template is used for **Cash-In confirmation emails** when users add funds to their wallet.

---

## 📋 Template Parameters Being Sent

- `to_email` - Recipient email address
- `email` - Recipient email address (duplicate for compatibility)
- `name` - User's name
- `guest_name` - User's name (duplicate for compatibility)
- `amount` - Amount added (formatted as ₱X,XXX.XX)
- `amount_added` - Amount added (formatted as ₱X,XXX.XX)
- `new_balance` - New wallet balance (formatted as ₱X,XXX.XX)
- `new_wallet_balance` - New wallet balance (formatted as ₱X,XXX.XX)
- `date_time` - Transaction date and time
- `transaction_id` - Transaction ID
- `transaction_date` - Transaction date and time (duplicate)

---

## 🎨 EmailJS Template HTML Design

Copy this HTML into your EmailJS template `template_3wbzery`:

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <div style="position: relative; z-index: 2; margin-bottom: 20px;">
        <img src="https://i.ibb.co/Q3TwzGRT/logo.png" 
             alt="EcoExpress Logo" 
             style="width: 60px; height: 60px; border-radius: 10px; margin: 0 auto; display: block;" />
    </div>
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoExpress</h1>
  </div>

  <!-- Content -->
  <div style="padding: 30px;">
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">Cash-In Confirmation</h2>
    
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">Hi <strong>{{name}}</strong>,</p>
    
    <p style="color: #4b5563; margin: 20px 0; font-size: 18px;">
      This is a confirmation that you have successfully added funds to your EcoExpress e-wallet. 💰
    </p>

    <!-- Cash-In Details -->
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 20px; text-align: center;">Cash-In Details</h3>
      
      <div style="background: #ffffff; border-radius: 6px; padding: 20px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Amount Added</p>
        <p style="margin: 0; color: #059669; font-weight: 700; font-size: 32px;">{{amount_added}}</p>
      </div>

      <div style="background: #ffffff; border-radius: 6px; padding: 20px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">New Wallet Balance</p>
        <p style="margin: 0; color: #059669; font-weight: 700; font-size: 32px;">{{new_balance}}</p>
      </div>

      <div style="border-top: 1px solid #d1fae5; padding-top: 16px; margin-top: 16px;">
        <p style="margin: 8px 0; color: #374151; font-size: 14px;"><strong>Date & Time:</strong> {{date_time}}</p>
        <p style="margin: 8px 0; color: #6b7280; font-family: monospace; font-size: 12px;"><strong>Transaction ID:</strong> {{transaction_id}}</p>
      </div>
    </div>

    <!-- Info Message -->
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #1e40af; margin: 0; font-size: 14px; text-align: center;">
        💰 You can now use your wallet to book, host, or join exciting experiences on EcoExpress!
      </p>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin: 30px 0 20px;">
      Thank you for trusting us. If you have any questions, please contact our support team.
    </p>

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

---

## ✅ Template Settings in EmailJS

**Make sure these settings are correct:**

- **To Email:** `{{to_email}}` or `{{email}}`
- **Subject:** `Cash-In Confirmation - ₱{{amount}}`
- **From Name:** EcoExpress
- **From Email:** Use Default Email Address

---

## 🎨 Design Features

- ✅ Clean, modern design
- ✅ Green color scheme (for money/positive transaction)
- ✅ Large, prominent amount display
- ✅ Clear transaction details
- ✅ Transaction ID for reference
- ✅ Professional footer

---

**Copy this HTML into your EmailJS template `template_3wbzery` and save it!** 🎉

