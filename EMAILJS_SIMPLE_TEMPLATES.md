# EmailJS Simple Templates (No Conditionals Needed)

## Template 1: Booking Status Update (Approval/Rejection)
**Template ID**: `template_booking_status` (or your actual template ID)

**Copy this HTML into EmailJS:**

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
  </div>

  <!-- Content -->
  <div style="padding: 30px;">
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">Hi <strong>{{guest_name}}</strong>,</p>
    
    <p style="color: #4b5563; margin: 20px 0; font-size: 18px;">
      {{status_message}}
    </p>

    <p style="color: #059669; font-weight: 600; font-size: 16px; margin: 20px 0;">
      Booking Status: {{booking_status}}
    </p>

    <!-- Booking Details -->
    <div style="background: #f0fdfa; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Booking Details</h3>
      
      <p style="margin: 8px 0; color: #374151;"><strong>Listing:</strong> {{listing_title}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-in:</strong> {{check_in}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Check-out:</strong> {{check_out}}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Total Amount:</strong> <span style="color: #059669; font-weight: 700; font-size: 18px;">{{total_amount}}</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Host:</strong> {{host_name}}</p>
      <p style="margin: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;"><strong>Booking ID:</strong> {{booking_id}}</p>
      
      {{#rejection_reason}}
      <p style="margin: 8px 0; color: #78350f;"><strong>Reason:</strong> {{rejection_reason}}</p>
      {{/rejection_reason}}
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

**Variables to add in EmailJS:**
- `guest_name`
- `status_message`
- `booking_status`
- `listing_title`
- `check_in`
- `check_out`
- `total_amount`
- `host_name`
- `booking_id`
- `rejection_reason` (optional - leave empty if approved)
- `action_button_text`
- `action_button_link`

---

## Template 2: Cancellation Refund
**Template ID**: `template_cancellation_refund` (or your actual template ID)

**Copy this HTML into EmailJS:**

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EcoEscape</h1>
  </div>

  <!-- Content -->
  <div style="padding: 30px;">
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px;">Booking Cancellation & Refund Confirmation</h2>
    
    <p style="padding-top: 16px; border-top: 1px solid #eaeaea; margin-top: 20px;">Hi <strong>{{guest_name}}</strong>,</p>
    
    <p style="color: #4b5563; margin: 20px 0;">
      Your booking has been cancelled. Here are your refund details:
    </p>

    <!-- Booking Info -->
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
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>📋 Policy Applied:</strong> {{cancellation_policy}}
      </p>
    </div>

    <!-- Wallet Notice -->
    <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: 600;">
        ✅ Your refund of <strong style="font-size: 20px;">{{refund_amount}}</strong> has been added to your wallet.
      </p>
    </div>

    <!-- Call to Action -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://yourwebsite.com/wallet" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 0 8px 8px 0;">
        View Wallet
      </a>
      <a href="https://yourwebsite.com/guest/homes" style="display: inline-block; background: #ffffff; color: #14b8a6; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; border: 2px solid #14b8a6; margin: 0 0 8px 8px;">
        Explore Listings
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

**Variables to add in EmailJS:**
- `guest_name`
- `listing_title`
- `booking_id`
- `cancellation_date`
- `original_amount`
- `refund_amount`
- `admin_deduction`
- `cancellation_fee`
- `cancellation_policy`

---

## Quick Setup Steps

1. **In EmailJS Dashboard:**
   - Go to Email Templates
   - Create New Template
   - Name: "Booking Status Update"
   - Copy Template 1 HTML above
   - Add all variables listed
   - Copy the Template ID (e.g., `template_abc123`)

2. **Create Second Template:**
   - Name: "Cancellation Refund"
   - Copy Template 2 HTML above
   - Add all variables listed
   - Copy the Template ID

3. **Update Code:**
   - Edit `src/services/EmailService.js`
   - Replace `template_booking_status` with your actual Template ID
   - Replace `template_cancellation_refund` with your actual Template ID

4. **Test:**
   - Use EmailJS test feature
   - Verify variables display correctly

---

## What You Need to Tell Me

Please provide:
1. Your Template ID for "Booking Status Update" template
2. Your Template ID for "Cancellation Refund" template

Then I'll update the code with your actual template IDs!

