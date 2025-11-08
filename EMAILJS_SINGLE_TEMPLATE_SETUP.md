# EmailJS Single Template Setup (All Booking Notifications)

## Overview
Since you only have **1 template available** (`template_8kvqbzd`), we'll use it for ALL booking notifications (approval, rejection, and cancellation).

## Template ID
**Use this Template ID**: `template_8kvqbzd`

---

## Single Template Design

**Copy this HTML into your EmailJS template (`template_8kvqbzd`):**

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
  </div>

  <!-- Content -->
  <div style="padding: 30px;">
    
    <!-- Title based on email type -->
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">
      {{#if_eq email_type "approval"}}🎉 Your Booking Has Been Approved!{{/if_eq}}
      {{#if_eq email_type "rejection"}}Booking Request Update{{/if_eq}}
      {{#if_eq email_type "cancellation"}}Booking Cancellation & Refund Confirmation{{/if_eq}}
    </h2>
    
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">Hi <strong>{{guest_name}}</strong>,</p>
    
    <p style="color: #4b5563; margin: 20px 0; font-size: 18px;">
      {{status_message}}
    </p>

    <!-- Show booking status for approval/rejection -->
    {{#if_eq email_type "approval"}}
    <p style="color: #059669; font-weight: 600; font-size: 16px; margin: 20px 0; background: #ecfdf5; padding: 12px; border-radius: 8px; text-align: center;">
      ✅ Booking Status: {{booking_status}}
    </p>
    {{/if_eq}}

    {{#if_eq email_type "rejection"}}
    <p style="color: #d97706; font-weight: 600; font-size: 16px; margin: 20px 0; background: #fef3c7; padding: 12px; border-radius: 8px; text-align: center;">
      ⚠️ Booking Status: {{booking_status}}
    </p>
    {{/if_eq}}

    <!-- Booking Details (for approval/rejection) -->
    {{#if_eq email_type "approval"}}
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Booking Details</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Listing:</strong> {{listing_title}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-in:</strong> {{check_in}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-out:</strong> {{check_out}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Total Amount:</strong> <span style="color: #059669; font-weight: 700; font-size: 18px;">{{total_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Host:</strong> {{host_name}}</p>
      <p style="margin: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;"><strong>Booking ID:</strong> {{booking_id}}</p>
    </div>
    {{/if_eq}}

    {{#if_eq email_type "rejection"}}
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #92400e; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Booking Details</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Listing:</strong> {{listing_title}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-in:</strong> {{check_in}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-out:</strong> {{check_out}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Total Amount:</strong> <span style="color: #92400e; font-weight: 700; font-size: 18px;">{{total_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Host:</strong> {{host_name}}</p>
      {{#if rejection_reason}}
      <p style="margin: 8px 0; color: #78350f;"><strong>Reason:</strong> {{rejection_reason}}</p>
      {{/if}}
      <p style="margin: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;"><strong>Booking ID:</strong> {{booking_id}}</p>
    </div>
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>💳 Refund Information:</strong> If you paid for this booking, your payment will be fully refunded to your wallet within 3-5 business days.
      </p>
    </div>
    {{/if_eq}}

    <!-- Cancellation Details -->
    {{#if_eq email_type "cancellation"}}
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 8px 0; color: #374151;"><strong>Listing:</strong> {{listing_title}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Booking ID:</strong> <span style="font-family: monospace; font-size: 14px;">{{booking_id}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Cancellation Date:</strong> {{cancellation_date}}</p>
    </div>

    <!-- Refund Breakdown -->
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

    <!-- Wallet Notice -->
    <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: 600;">
        ✅ Your refund of <strong style="font-size: 20px;">{{refund_amount}}</strong> has been added to your wallet.
      </p>
    </div>
    {{/if_eq}}

    <!-- Call to Action -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_button_link}}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
        {{action_button_text}}
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin: 30px 0 20px;">
      {{#if_eq email_type "approval"}}If you have any questions or need to make changes to your booking, please contact your host directly through the messaging system.{{/if_eq}}
      {{#if_eq email_type "rejection"}}Don't worry! There are many other amazing listings available. We're here to help you find the perfect stay.{{/if_eq}}
      {{#if_eq email_type "cancellation"}}If you have any questions about your refund, please contact our support team. We're here to help!{{/if_eq}}
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

**Note**: EmailJS free plan may not support Handlebars conditionals (`{{#if_eq}}`). Use this simpler version instead:

---

## Simplified Version (No Conditionals)

**Copy this HTML if conditionals don't work:**

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
  </div>

  <!-- Content -->
  <div style="padding: 30px;">
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">{{status_message}}</h2>
    
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">Hi <strong>{{guest_name}}</strong>,</p>
    
    <p style="color: #4b5563; margin: 20px 0; font-size: 18px;">
      {{status_message}}
    </p>

    <!-- Booking Status Badge -->
    <p style="color: #059669; font-weight: 600; font-size: 16px; margin: 20px 0; background: #ecfdf5; padding: 12px; border-radius: 8px; text-align: center;">
      Status: {{booking_status}}
    </p>

    <!-- Booking Details Card -->
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Booking Details</h3>
      
      <p style="margin: 8px 0; color: #374151;"><strong>Listing:</strong> {{listing_title}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-in:</strong> {{check_in}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-out:</strong> {{check_out}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Total Amount:</strong> <span style="color: #059669; font-weight: 700; font-size: 18px;">{{total_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Host:</strong> {{host_name}}</p>
      <p style="margin: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;"><strong>Booking ID:</strong> {{booking_id}}</p>
      
      <!-- Show rejection reason if provided -->
      <p style="margin: 8px 0; color: #78350f;"><strong>Reason:</strong> {{rejection_reason}}</p>
      
      <!-- Cancellation-specific fields (will be empty for approval/rejection) -->
      <p style="margin: 8px 0; color: #374151;"><strong>Cancellation Date:</strong> {{cancellation_date}}</p>
    </div>

    <!-- Refund Breakdown (for cancellations) -->
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
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>📋 Policy Applied:</strong> {{cancellation_policy}}
      </p>
    </div>

    <!-- Call to Action -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_button_link}}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
        {{action_button_text}}
      </a>
    </div>

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

## All Variables Needed

Add these variables in EmailJS template settings:

**Required Variables:**
- `to_email` - Recipient email
- `guest_name` - Guest's name
- `email_type` - "approval", "rejection", or "cancellation"
- `status_message` - Dynamic message
- `booking_status` - "Approved", "Rejected", or empty
- `listing_title` - Listing name
- `check_in` - Check-in date (empty for cancellation)
- `check_out` - Check-out date (empty for cancellation)
- `total_amount` - Total amount (empty for cancellation)
- `host_name` - Host name
- `booking_id` - Booking ID
- `rejection_reason` - Reason for rejection (empty if approved/cancelled)
- `action_button_text` - Button text
- `action_button_link` - Button URL

**Cancellation-only Variables (will be empty for approval/rejection):**
- `original_amount` - Original booking amount
- `refund_amount` - Final refund amount
- `admin_deduction` - Admin deduction amount
- `cancellation_fee` - Cancellation fee
- `cancellation_policy` - Policy description
- `cancellation_date` - Date cancelled

---

## Setup Steps

1. **Open EmailJS Dashboard** → Email Templates → Edit `template_8kvqbzd`

2. **Copy the Simplified HTML** above (the one without conditionals)

3. **Add all variables** listed above in EmailJS template settings

4. **Save the template**

5. **Test** with different email types:
   - Test with `email_type: "approval"`
   - Test with `email_type: "rejection"`
   - Test with `email_type: "cancellation"`

---

## How It Works

The code will send different content based on `email_type`:
- **Approval**: Shows booking details, "Approved" status
- **Rejection**: Shows booking details, "Rejected" status, refund notice
- **Cancellation**: Shows refund breakdown, policy info

Empty fields will just show as blank in the email, which is fine!

---

## Code Already Updated ✅

The code in `src/services/EmailService.js` is already updated to use `template_8kvqbzd` for all three email types. Just paste the HTML template above into your EmailJS template and you're good to go!

