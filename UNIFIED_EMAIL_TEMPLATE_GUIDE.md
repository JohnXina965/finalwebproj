# Unified Email Template Guide - ONE Template for ALL Notifications

## ✅ Yes, You Can Use ONE Template!

You can use **ONE EmailJS template** (`template_8kvqbzd`) for **ALL** notification types:
- ✅ Booking (approval, rejection, cancellation)
- ✅ Cash-in
- ✅ Cash-out (withdrawal)
- ✅ Messages

---

## 🎯 How It Works

The template uses the `email_type` parameter to determine what content to show:
- `email_type: 'approval'` → Booking approval
- `email_type: 'rejection'` → Booking rejection
- `email_type: 'cancellation'` → Booking cancellation with refund
- `email_type: 'cash_in'` → Cash-in confirmation
- `email_type: 'cash_out'` → Withdrawal confirmation
- `email_type: 'message'` → New message notification

---

## 📧 EmailJS Template HTML (Unified for All Types)

Copy this HTML into your EmailJS template `template_8kvqbzd`:

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <div style="position: relative; z-index: 2; margin-bottom: 20px;">
        <img src="https://i.ibb.co/Q3TwzGRT/logo.png" 
             alt="EcoExpress Logo" 
             style="width: 60px; height: 60px; border-radius: 10px; margin: 0 auto; display: block;" />
    </div>
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
  </div>

  <!-- Content -->
  <div style="padding: 30px;">
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">{{booking_status}}</h2>
    
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">Hi <strong>{{guest_name}}</strong>,</p>
    
    <p style="color: #4b5563; margin: 20px 0; font-size: 18px;">
      {{status_message}}
    </p>

    <!-- Status Badge -->
    <p style="color: #059669; font-weight: 600; font-size: 16px; margin: 20px 0; background: #ecfdf5; padding: 12px; border-radius: 8px; text-align: center;">
      Status: {{booking_status}}
    </p>

    <!-- BOOKING INFORMATION (for approval, rejection, cancellation) -->
    {{#if check_in}}
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Booking Information</h3>
      
      <p style="margin: 8px 0; color: #374151;"><strong>Listing:</strong> {{listing_title}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-in:</strong> {{check_in}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-out:</strong> {{check_out}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Total Amount:</strong> <span style="color: #059669; font-weight: 700; font-size: 18px;">{{total_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Host:</strong> {{host_name}}</p>
      <p style="margin: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;"><strong>Booking ID:</strong> {{booking_id}}</p>
      
      <!-- Rejection Reason (only for rejection) -->
      {{#if rejection_reason}}
      {{#unless email_type}}
      <p style="margin: 8px 0; color: #78350f;"><strong>Reason:</strong> {{rejection_reason}}</p>
      {{/unless}}
      {{/if}}
    </div>
    {{/if}}

    <!-- CASH-IN INFORMATION (for cash_in) -->
    {{#if (eq email_type "cash_in")}}
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Cash-In Details</h3>
      
      <p style="margin: 8px 0; color: #374151;"><strong>Amount Added:</strong> <span style="color: #059669; font-weight: 700; font-size: 18px;">{{total_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>New Wallet Balance:</strong> <span style="color: #059669; font-weight: 700; font-size: 18px;">{{refund_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Date & Time:</strong> {{cancellation_date}}</p>
      <p style="margin: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;"><strong>Transaction ID:</strong> {{booking_id}}</p>
    </div>
    {{/if}}

    <!-- WITHDRAWAL INFORMATION (for cash_out) -->
    {{#if (eq email_type "cash_out")}}
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Withdrawal Details</h3>
      
      <p style="margin: 8px 0; color: #374151;"><strong>Amount Withdrawn:</strong> <span style="color: #dc2626; font-weight: 700; font-size: 18px;">{{total_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>New Wallet Balance:</strong> <span style="color: #059669; font-weight: 700; font-size: 18px;">{{refund_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>PayPal Email:</strong> {{host_name}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Date & Time:</strong> {{cancellation_date}}</p>
      <p style="margin: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;"><strong>Payout ID:</strong> {{booking_id}}</p>
    </div>
    {{/if}}

    <!-- MESSAGE INFORMATION (for message) -->
    {{#if (eq email_type "message")}}
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Message Details</h3>
      
      <p style="margin: 8px 0; color: #374151;"><strong>From:</strong> {{host_name}}</p>
      {{#if listing_title}}
      <p style="margin: 8px 0; color: #374151;"><strong>About:</strong> {{listing_title}}</p>
      {{/if}}
      <p style="margin: 8px 0; color: #374151;"><strong>Message Preview:</strong></p>
      <p style="margin: 8px 0; color: #6b7280; padding: 12px; background: #ffffff; border-radius: 4px; border: 1px solid #e5e7eb;">{{rejection_reason}}</p>
    </div>
    {{/if}}

    <!-- REJECTION REASON (for rejection) -->
    {{#if (eq email_type "rejection")}}
    {{#if rejection_reason}}
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 30px 0;">
      <p style="margin: 0; color: #991b1b; font-weight: 600;">Reason for Rejection:</p>
      <p style="margin: 8px 0 0 0; color: #7f1d1d;">{{rejection_reason}}</p>
    </div>
    {{/if}}
    {{/if}}

    <!-- REFUND BREAKDOWN (for cancellation) -->
    {{#if (eq email_type "cancellation")}}
    {{#if refund_amount}}
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 20px;">Refund Breakdown</h3>
      <p style="margin: 10px 0; color: #374151;"><strong>Original Amount:</strong> <span style="float: right; font-weight: 600;">{{original_amount}}</span></p>
      <p style="margin: 10px 0; color: #374151;"><strong>Cancellation Fee:</strong> <span style="float: right; color: #dc2626;">- {{cancellation_fee}}</span></p>
      <p style="margin: 10px 0; color: #374151;"><strong>Admin Deduction (10%):</strong> <span style="float: right; color: #dc2626;">- {{admin_deduction}}</span></p>
      <div style="border-top: 2px solid #3b82f6; margin-top: 15px; padding-top: 15px;">
        <p style="margin: 0; color: #1e40af; font-weight: 700; font-size: 18px;"><strong>Refund Amount:</strong> <span style="float: right; color: #059669; font-size: 20px;">{{refund_amount}}</span></p>
      </div>
    </div>

    <!-- Policy Info -->
    {{#if cancellation_policy}}
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>📋 Policy Applied:</strong> {{cancellation_policy}}
      </p>
    </div>
    {{/if}}
    {{/if}}
    {{/if}}

    <p style="color: #6b7280; font-size: 14px; margin: 30px 0 20px;">
      If you have any questions, please contact our support team or your host directly through the messaging system.
    </p>

    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 30px; color: #6b7280; font-size: 14px;">
      Best regards,<br />
      <strong style="color: #14b8a6;">The EcoExpress Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      © 2024 EcoEscape. All rights reserved.
    </p>
  </div>
</div>
```

---

## ⚠️ Simple Version (If Conditionals Don't Work)

If your EmailJS plan doesn't support Handlebars conditionals like `{{#if (eq email_type "cash_in")}}`, use this simpler version that shows/hides sections based on whether fields have values:

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <div style="position: relative; z-index: 2; margin-bottom: 20px;">
        <img src="https://i.ibb.co/Q3TwzGRT/logo.png" 
             alt="EcoExpress Logo" 
             style="width: 60px; height: 60px; border-radius: 10px; margin: 0 auto; display: block;" />
    </div>
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
  </div>

  <!-- Content -->
  <div style="padding: 30px;">
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">{{booking_status}}</h2>
    
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">Hi <strong>{{guest_name}}</strong>,</p>
    
    <p style="color: #4b5563; margin: 20px 0; font-size: 18px;">
      {{status_message}}
    </p>

    <!-- Status Badge -->
    <p style="color: #059669; font-weight: 600; font-size: 16px; margin: 20px 0; background: #ecfdf5; padding: 12px; border-radius: 8px; text-align: center;">
      Status: {{booking_status}}
    </p>

    <!-- Booking Details (shows if check_in exists) -->
    {{#if check_in}}
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Booking Information</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Listing:</strong> {{listing_title}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-in:</strong> {{check_in}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-out:</strong> {{check_out}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Total Amount:</strong> <span style="color: #059669; font-weight: 700; font-size: 18px;">{{total_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Host:</strong> {{host_name}}</p>
      <p style="margin: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;"><strong>Booking ID:</strong> {{booking_id}}</p>
    </div>
    {{/if}}

    <!-- Cash-In/Withdrawal Details (shows if cancellation_date exists but no check_in) -->
    {{#if cancellation_date}}
    {{#unless check_in}}
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Transaction Details</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Amount:</strong> <span style="color: #059669; font-weight: 700; font-size: 18px;">{{total_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>New Balance:</strong> <span style="color: #059669; font-weight: 700; font-size: 18px;">{{refund_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Date & Time:</strong> {{cancellation_date}}</p>
      {{#if host_name}}
      <p style="margin: 8px 0; color: #374151;"><strong>PayPal Email:</strong> {{host_name}}</p>
      {{/if}}
      <p style="margin: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;"><strong>Transaction ID:</strong> {{booking_id}}</p>
    </div>
    {{/unless}}
    {{/if}}

    <!-- Message Details (shows if rejection_reason exists but no check_in) -->
    {{#if rejection_reason}}
    {{#unless check_in}}
    {{#unless cancellation_date}}
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Message Details</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>From:</strong> {{host_name}}</p>
      {{#if listing_title}}
      <p style="margin: 8px 0; color: #374151;"><strong>About:</strong> {{listing_title}}</p>
      {{/if}}
      <p style="margin: 8px 0; color: #374151;"><strong>Message:</strong></p>
      <p style="margin: 8px 0; color: #6b7280; padding: 12px; background: #ffffff; border-radius: 4px; border: 1px solid #e5e7eb;">{{rejection_reason}}</p>
    </div>
    {{/unless}}
    {{/unless}}
    {{/if}}

    <!-- Rejection Reason (for booking rejection) -->
    {{#if rejection_reason}}
    {{#if check_in}}
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 30px 0;">
      <p style="margin: 0; color: #991b1b; font-weight: 600;">Reason for Rejection:</p>
      <p style="margin: 8px 0 0 0; color: #7f1d1d;">{{rejection_reason}}</p>
    </div>
    {{/if}}
    {{/if}}

    <!-- Refund Breakdown (for cancellation) -->
    {{#if refund_amount}}
    {{#if check_in}}
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 20px;">Refund Breakdown</h3>
      <p style="margin: 10px 0; color: #374151;"><strong>Original Amount:</strong> <span style="float: right; font-weight: 600;">{{original_amount}}</span></p>
      <p style="margin: 10px 0; color: #374151;"><strong>Cancellation Fee:</strong> <span style="float: right; color: #dc2626;">- {{cancellation_fee}}</span></p>
      <p style="margin: 10px 0; color: #374151;"><strong>Admin Deduction (10%):</strong> <span style="float: right; color: #dc2626;">- {{admin_deduction}}</span></p>
      <div style="border-top: 2px solid #3b82f6; margin-top: 15px; padding-top: 15px;">
        <p style="margin: 0; color: #1e40af; font-weight: 700; font-size: 18px;"><strong>Refund Amount:</strong> <span style="float: right; color: #059669; font-size: 20px;">{{refund_amount}}</span></p>
      </div>
    </div>
    {{/if}}
    {{/if}}

    <p style="color: #6b7280; font-size: 14px; margin: 30px 0 20px;">
      If you have any questions, please contact our support team.
    </p>

    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 30px; color: #6b7280; font-size: 14px;">
      Best regards,<br />
      <strong style="color: #14b8a6;">The EcoEscape Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      © 2024 EcoEscape. All rights reserved.
    </p>
  </div>
</div>
```

---

## ✅ Template Settings

**EmailJS Template Settings:**
- **To Email:** `{{to_email}}` or `{{email}}`
- **Subject:** `{{booking_status}} - EcoExpress`
- **From Name:** EcoExpress
- **From Email:** Use Default Email Address

---

## 🎯 Summary

**YES, you can use ONE template for ALL notifications!**

- ✅ **No need to create separate templates**
- ✅ **One template handles everything**
- ✅ **Uses `email_type` parameter to show different content**
- ✅ **Code is already updated to support all notification types**

Just copy the HTML template above into your EmailJS template and you're good to go! 🎉

